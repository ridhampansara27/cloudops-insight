"""HTTP regression tests for cloud-account tenant object boundaries."""

import os
from datetime import UTC, datetime
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import (
    create_access_token,
    password_state_version,
)
from app.main import app
from app.models.cloud_account import CloudAccount
from app.models.organization import (
    Organization,
    OrganizationMembership,
)
from app.models.user import User
from app.providers.aws.connection import AwsConnectionService
from app.services.cost_sync_service import CostSyncService
from app.services.monitoring_sync_service import MonitoringSyncService
from app.tasks.aws_sync import sync_aws_account_task

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)


pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason="TENANT_TEST_DATABASE_URL is required.",
)


@pytest.mark.asyncio
async def test_foreign_cloud_account_id_is_rejected_before_side_effects(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Prove Tenant A cannot operate on Tenant B's cloud-account UUID."""

    assert TENANT_TEST_DATABASE_URL is not None

    # HTTP requests below use the application's normal database dependency.
    # Fail closed unless both settings point to this disposable test database.
    assert settings.database_url == TENANT_TEST_DATABASE_URL, (
        "DATABASE_URL must equal TENANT_TEST_DATABASE_URL for this "
        "HTTP tenant-boundary regression test."
    )

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    Session = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    suffix = uuid4().hex[:12]
    now = datetime.now(
        UTC,
    )

    # Generate a valid 12-digit provider account identifier unique to this run.
    external_account_id = f"{uuid4().int % 1_000_000_000_000:012d}"

    user_a = User(
        email=f"object-boundary-a-{suffix}@example.com",
        full_name="Object Boundary Tenant A",
        password_hash="test-only",
        role="viewer",
        is_active=True,
        email_verified_at=now,
        password_changed_at=now,
    )

    user_b = User(
        email=f"object-boundary-b-{suffix}@example.com",
        full_name="Object Boundary Tenant B",
        password_hash="test-only",
        role="viewer",
        is_active=True,
        email_verified_at=now,
        password_changed_at=now,
    )

    org_a = Organization(
        name=f"Object Boundary Tenant A {suffix}",
    )

    org_b = Organization(
        name=f"Object Boundary Tenant B {suffix}",
    )

    account_b = None

    try:
        # ------------------------------------------------------
        # Arrange two unrelated customer tenants.
        # ------------------------------------------------------
        async with Session() as session:
            session.add_all(
                [
                    user_a,
                    user_b,
                    org_a,
                    org_b,
                ]
            )

            await session.flush()

            membership_a = OrganizationMembership(
                organization_id=org_a.id,
                user_id=user_a.id,
                role="owner",
                is_active=True,
            )

            membership_b = OrganizationMembership(
                organization_id=org_b.id,
                user_id=user_b.id,
                role="owner",
                is_active=True,
            )

            account_b = CloudAccount(
                organization_id=org_b.id,
                provider="aws",
                name="Tenant B Protected AWS",
                external_account_id=external_account_id,
                role_arn=(
                    f"arn:aws:iam::{external_account_id}:"
                    "role/CloudOpsInsightReadOnlyRole"
                ),
                external_id=f"coi_object_boundary_{uuid4().hex}",
                enabled_regions=[
                    "eu-central-1",
                ],
                status="connected",
                sync_status="idle",
                connection_revision=7,
                created_by_id=user_b.id,
            )

            session.add_all(
                [
                    membership_a,
                    membership_b,
                    account_b,
                ]
            )

            await session.commit()

            account_b_id = account_b.id
            original_external_id = account_b.external_id
            original_role_arn = account_b.role_arn
            original_regions = list(
                account_b.enabled_regions,
            )
            original_revision = account_b.connection_revision

        # ------------------------------------------------------
        # Build real password-state-bound application JWTs.
        # ------------------------------------------------------
        token_a = create_access_token(
            str(
                user_a.id,
            ),
            password_version=password_state_version(
                user_a.password_changed_at,
            ),
        )

        token_b = create_access_token(
            str(
                user_b.id,
            ),
            password_version=password_state_version(
                user_b.password_changed_at,
            ),
        )

        # ------------------------------------------------------
        # Tripwires.
        #
        # If tenant scoping regresses, these functions would be reached.
        # The test must fail before any AWS/task/sync side effect occurs.
        # ------------------------------------------------------
        def unexpected_provider_or_task_call(
            *_args,
            **_kwargs,
        ):
            raise AssertionError(
                "Cross-tenant request reached AWS/Celery side effects.",
            )

        async def unexpected_sync_service_call(
            *_args,
            **_kwargs,
        ):
            raise AssertionError(
                "Cross-tenant request reached metric/cost sync side effects.",
            )

        monkeypatch.setattr(
            AwsConnectionService,
            "validate_account",
            unexpected_provider_or_task_call,
        )

        monkeypatch.setattr(
            sync_aws_account_task,
            "delay",
            unexpected_provider_or_task_call,
        )

        monkeypatch.setattr(
            MonitoringSyncService,
            "sync_account",
            unexpected_sync_service_call,
        )

        monkeypatch.setattr(
            CostSyncService,
            "sync_account",
            unexpected_sync_service_call,
        )

        transport = httpx.ASGITransport(
            app=app,
        )

        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://tenant-object-boundary-test",
        ) as client:
            headers_a = {
                "Authorization": f"Bearer {token_a}",
                "X-Organization-ID": str(
                    org_a.id,
                ),
            }

            headers_b = {
                "Authorization": f"Bearer {token_b}",
                "X-Organization-ID": str(
                    org_b.id,
                ),
            }

            # --------------------------------------------------
            # Positive control:
            # Tenant B can read its own integration.
            # --------------------------------------------------
            legitimate = await client.get(
                f"/api/v1/cloud-accounts/{account_b_id}",
                headers=headers_b,
            )

            assert legitimate.status_code == 200
            assert legitimate.json()["id"] == str(
                account_b_id,
            )

            # --------------------------------------------------
            # Attack matrix:
            # Tenant A uses its own valid organization context
            # while substituting Tenant B's object UUID.
            # --------------------------------------------------
            async def assert_foreign_account_not_found(
                *,
                label: str,
                method: str,
                suffix: str = "",
                payload: dict[str, object] | None = None,
            ) -> None:
                """Require one foreign cloud-account object request to fail closed."""

                response = await client.request(
                    method,
                    (f"/api/v1/cloud-accounts/{account_b_id}{suffix}"),
                    headers=headers_a,
                    json=payload,
                )

                assert response.status_code == 404, (
                    f"{label}: expected HTTP 404, "
                    f"received {response.status_code}: {response.text}"
                )

                assert response.json() == {
                    "detail": "Cloud account not found.",
                }, (
                    f"{label}: cross-tenant response was not the generic "
                    "not-found contract."
                )

            # Execute attacks sequentially so a failing assertion never leaves
            # unawaited HTTP request coroutines behind.
            await assert_foreign_account_not_found(
                label="GET account",
                method="GET",
            )

            await assert_foreign_account_not_found(
                label="GET onboarding",
                method="GET",
                suffix="/onboarding",
            )

            await assert_foreign_account_not_found(
                label="GET sync-status",
                method="GET",
                suffix="/sync-status",
            )

            await assert_foreign_account_not_found(
                label="PATCH account",
                method="PATCH",
                payload={
                    "enabled_regions": [
                        "us-east-1",
                    ],
                },
            )

            await assert_foreign_account_not_found(
                label="POST validate",
                method="POST",
                suffix="/validate",
            )

            await assert_foreign_account_not_found(
                label="POST resource sync",
                method="POST",
                suffix="/sync",
            )

            await assert_foreign_account_not_found(
                label="POST metric sync",
                method="POST",
                suffix="/metrics/sync",
            )

            await assert_foreign_account_not_found(
                label="POST cost sync",
                method="POST",
                suffix="/costs/sync",
            )

            await assert_foreign_account_not_found(
                label="POST disconnect",
                method="POST",
                suffix="/disconnect",
            )

            await assert_foreign_account_not_found(
                label="POST remove",
                method="POST",
                suffix="/remove",
                payload={
                    "confirmation": "REMOVE",
                },
            )

        # ------------------------------------------------------
        # Database postcondition:
        # every attack must leave Tenant B's integration unchanged.
        # ------------------------------------------------------
        async with Session() as session:
            preserved = await session.scalar(
                select(
                    CloudAccount,
                ).where(
                    CloudAccount.id == account_b_id,
                )
            )

            assert preserved is not None

            assert preserved.organization_id == org_b.id
            assert preserved.status == "connected"
            assert preserved.sync_status == "idle"
            assert preserved.connection_revision == original_revision

            assert preserved.external_id == original_external_id
            assert preserved.role_arn == original_role_arn
            assert preserved.enabled_regions == original_regions

    finally:
        # ------------------------------------------------------
        # Delete only records created by this regression test.
        # ------------------------------------------------------
        async with Session() as session:
            if account_b is not None:
                await session.execute(
                    delete(
                        CloudAccount,
                    ).where(
                        CloudAccount.id == account_b.id,
                    )
                )

            await session.execute(
                delete(
                    OrganizationMembership,
                ).where(
                    OrganizationMembership.user_id.in_(
                        [
                            user_a.id,
                            user_b.id,
                        ]
                    )
                )
            )

            await session.execute(
                delete(
                    Organization,
                ).where(
                    Organization.id.in_(
                        [
                            org_a.id,
                            org_b.id,
                        ]
                    )
                )
            )

            await session.execute(
                delete(
                    User,
                ).where(
                    User.id.in_(
                        [
                            user_a.id,
                            user_b.id,
                        ]
                    )
                )
            )

            await session.commit()

        await engine.dispose()

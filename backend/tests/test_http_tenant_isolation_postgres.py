"""HTTP-level PostgreSQL tenant-isolation regression tests."""

import os
from datetime import UTC, datetime
from uuid import uuid4

import httpx
import pytest
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import (
    create_access_token,
    password_state_version,
)
from app.main import app
from app.models.organization import (
    Organization,
    OrganizationMembership,
)
from app.models.user import User

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)


pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason="TENANT_TEST_DATABASE_URL is required.",
)


@pytest.mark.asyncio
async def test_http_jwt_cannot_select_foreign_organization(
    isolated_app_db_pool: None,
) -> None:
    """Prevent a valid JWT from selecting another customer's organization."""

    assert TENANT_TEST_DATABASE_URL is not None

    # FastAPI uses DATABASE_URL through its normal database dependency.
    # Refuse to run unless it is the same disposable tenant-test database.
    assert settings.database_url == TENANT_TEST_DATABASE_URL, (
        "DATABASE_URL must equal TENANT_TEST_DATABASE_URL for this "
        "HTTP tenant-isolation regression test."
    )

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    Session = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    suffix = uuid4().hex[:12]
    now = datetime.now(UTC)

    user_a = User(
        email=f"http-tenant-a-{suffix}@example.com",
        full_name="HTTP Tenant A",
        password_hash="test-only",
        role="viewer",
        is_active=True,
        email_verified_at=now,
        password_changed_at=now,
    )

    user_b = User(
        email=f"http-tenant-b-{suffix}@example.com",
        full_name="HTTP Tenant B",
        password_hash="test-only",
        role="viewer",
        is_active=True,
        email_verified_at=now,
        password_changed_at=now,
    )

    org_a = Organization(
        name=f"HTTP Tenant A {suffix}",
    )

    org_b = Organization(
        name=f"HTTP Tenant B {suffix}",
    )

    try:
        # Create two completely separate customers.
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

            session.add_all(
                [
                    OrganizationMembership(
                        organization_id=org_a.id,
                        user_id=user_a.id,
                        role="owner",
                        is_active=True,
                    ),
                    OrganizationMembership(
                        organization_id=org_b.id,
                        user_id=user_b.id,
                        role="owner",
                        is_active=True,
                    ),
                ]
            )

            await session.commit()

        # Create genuine application JWTs tied to each user's password state.
        token_a = create_access_token(
            str(user_a.id),
            password_version=password_state_version(
                user_a.password_changed_at,
            ),
        )

        token_b = create_access_token(
            str(user_b.id),
            password_version=password_state_version(
                user_b.password_changed_at,
            ),
        )

        transport = httpx.ASGITransport(
            app=app,
        )

        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://tenant-isolation-test",
        ) as client:

            async def get(
                token: str,
                path: str,
                organization_id,
            ) -> httpx.Response:
                return await client.get(
                    path,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "X-Organization-ID": str(
                            organization_id,
                        ),
                    },
                )

            # --------------------------------------------------
            # Legitimate tenant access must succeed.
            # --------------------------------------------------
            a_workspace = await get(
                token_a,
                "/api/v1/workspace/organization",
                org_a.id,
            )

            b_workspace = await get(
                token_b,
                "/api/v1/workspace/organization",
                org_b.id,
            )

            a_members = await get(
                token_a,
                "/api/v1/workspace/members",
                org_a.id,
            )

            b_members = await get(
                token_b,
                "/api/v1/workspace/members",
                org_b.id,
            )

            a_accounts = await get(
                token_a,
                "/api/v1/cloud-accounts",
                org_a.id,
            )

            b_accounts = await get(
                token_b,
                "/api/v1/cloud-accounts",
                org_b.id,
            )

            assert a_workspace.status_code == 200
            assert b_workspace.status_code == 200
            assert a_members.status_code == 200
            assert b_members.status_code == 200
            assert a_accounts.status_code == 200
            assert b_accounts.status_code == 200

            assert a_workspace.json()["id"] == str(org_a.id)
            assert b_workspace.json()["id"] == str(org_b.id)

            # --------------------------------------------------
            # Tenant A must not select Tenant B.
            # --------------------------------------------------
            assert (
                await get(
                    token_a,
                    "/api/v1/workspace/organization",
                    org_b.id,
                )
            ).status_code == 404

            assert (
                await get(
                    token_a,
                    "/api/v1/workspace/members",
                    org_b.id,
                )
            ).status_code == 404

            assert (
                await get(
                    token_a,
                    "/api/v1/cloud-accounts",
                    org_b.id,
                )
            ).status_code == 404

            # --------------------------------------------------
            # Tenant B must not select Tenant A.
            # --------------------------------------------------
            assert (
                await get(
                    token_b,
                    "/api/v1/workspace/organization",
                    org_a.id,
                )
            ).status_code == 404

            assert (
                await get(
                    token_b,
                    "/api/v1/workspace/members",
                    org_a.id,
                )
            ).status_code == 404

            assert (
                await get(
                    token_b,
                    "/api/v1/cloud-accounts",
                    org_a.id,
                )
            ).status_code == 404

    finally:
        # Remove only records created by this test.
        async with Session() as session:
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

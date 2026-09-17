"""HTTP-level PostgreSQL acceptance tests for CloudOps account deletion."""

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
    hash_password,
    password_state_version,
)
from app.db.session import engine as app_database_engine
from app.main import app
from app.models.cloud_account import CloudAccount
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

TEST_PASSWORD = "Delete-account-test-123!"


def _access_token(
    user: User,
) -> str:
    """Create the same password-state-bound JWT used by the application."""

    return create_access_token(
        str(
            user.id,
        ),
        password_version=password_state_version(
            user.password_changed_at,
        ),
    )


def _browser_headers(
    token: str,
    *,
    origin: str = "https://app.example.com",
) -> dict[str, str]:
    """Build browser-like authenticated request headers."""

    return {
        "Authorization": f"Bearer {token}",
        "Origin": origin,
        "Sec-Fetch-Site": (
            "same-origin" if origin == "https://app.example.com" else "cross-site"
        ),
    }


@pytest.mark.asyncio(loop_scope="module")
async def test_delete_account_http_security_and_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Exercise destructive-account deletion through the real HTTP boundary."""

    assert TENANT_TEST_DATABASE_URL is not None

    # The FastAPI DatabaseSession dependency reads DATABASE_URL normally.
    # Never let this acceptance test accidentally target another database.
    assert settings.database_url == TENANT_TEST_DATABASE_URL, (
        "DATABASE_URL must equal TENANT_TEST_DATABASE_URL for this "
        "HTTP account-deletion acceptance test."
    )

    monkeypatch.setattr(
        settings,
        "cors_origins",
        "https://app.example.com",
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

    user = User(
        email=f"http-delete-{suffix}@example.com",
        full_name="HTTP Delete User",
        password_hash=hash_password(
            TEST_PASSWORD,
        ),
        role="viewer",
        is_active=True,
        email_verified_at=now,
        password_changed_at=now,
    )

    organization = Organization(
        name=f"HTTP Delete Workspace {suffix}",
    )

    try:
        async with Session() as session:
            session.add_all(
                [
                    user,
                    organization,
                ]
            )

            await session.flush()

            membership = OrganizationMembership(
                organization_id=organization.id,
                user_id=user.id,
                role="owner",
                is_active=True,
            )

            session.add(
                membership,
            )

            await session.commit()

        user_id = user.id
        organization_id = organization.id

        token = _access_token(
            user,
        )

        transport = httpx.ASGITransport(
            app=app,
        )

        async with httpx.AsyncClient(
            transport=transport,
            base_url="https://app.example.com",
        ) as client:
            valid_payload = {
                "confirmation": "DELETE",
                "current_password": TEST_PASSWORD,
            }

            # --------------------------------------------------
            # Browser-origin protection
            # --------------------------------------------------
            untrusted_response = await client.post(
                "/api/v1/auth/delete-account",
                headers=_browser_headers(
                    token,
                    origin="https://evil.example",
                ),
                json=valid_payload,
            )

            assert untrusted_response.status_code == 403

            # --------------------------------------------------
            # Exact destructive confirmation
            # --------------------------------------------------
            invalid_confirmation = await client.post(
                "/api/v1/auth/delete-account",
                headers=_browser_headers(
                    token,
                ),
                json={
                    "confirmation": "delete",
                    "current_password": TEST_PASSWORD,
                },
            )

            assert invalid_confirmation.status_code == 422

            # --------------------------------------------------
            # Current-password reauthentication
            # --------------------------------------------------
            wrong_password = await client.post(
                "/api/v1/auth/delete-account",
                headers=_browser_headers(
                    token,
                ),
                json={
                    "confirmation": "DELETE",
                    "current_password": "wrong-password",
                },
            )

            assert wrong_password.status_code == 400
            assert wrong_password.json()["detail"] == "Current password is incorrect."

            # Failed destructive requests must leave the identity intact.
            async with Session() as session:
                assert (
                    await session.scalar(
                        select(
                            User.id,
                        ).where(
                            User.id == user_id,
                        )
                    )
                    == user_id
                )

                # Add a personal-workspace integration. User deletion must
                # refuse to purge this integration implicitly.
                cloud_account = CloudAccount(
                    organization_id=organization_id,
                    provider="aws",
                    name="HTTP Delete Blocker",
                    external_account_id=(f"{uuid4().int % 1_000_000_000_000:012d}"),
                    role_arn=None,
                    external_id=f"coi_http_delete_{suffix}",
                    enabled_regions=[
                        "eu-central-1",
                    ],
                    status="pending",
                    sync_status="idle",
                    created_by_id=user_id,
                )

                session.add(
                    cloud_account,
                )

                await session.commit()

                cloud_account_id = cloud_account.id

            # --------------------------------------------------
            # Explicit integration-removal requirement
            # --------------------------------------------------
            integration_blocked = await client.post(
                "/api/v1/auth/delete-account",
                headers=_browser_headers(
                    token,
                ),
                json=valid_payload,
            )

            assert integration_blocked.status_code == 409
            assert integration_blocked.json()["detail"] == (
                "Remove all cloud integrations from personal workspaces "
                "before deleting your account."
            )

            # Remove only the test integration so the explicit account
            # deletion path can be exercised next.
            async with Session() as session:
                await session.execute(
                    delete(
                        CloudAccount,
                    ).where(
                        CloudAccount.id == cloud_account_id,
                    )
                )

                await session.commit()

            # Supply a refresh cookie so success must actively clear it.
            client.cookies.set(
                settings.refresh_cookie_name,
                "http-delete-test-refresh-token",
                path=settings.refresh_cookie_path,
            )

            # --------------------------------------------------
            # Successful permanent deletion
            # --------------------------------------------------
            success = await client.post(
                "/api/v1/auth/delete-account",
                headers=_browser_headers(
                    token,
                ),
                json=valid_payload,
            )

            assert success.status_code == 200

            payload = success.json()

            assert payload["personal_workspaces_deleted"] == 1
            assert payload["shared_workspaces_left"] == 0
            assert payload["message"] == ("CloudOps account deleted successfully.")

            set_cookie = "\n".join(
                success.headers.get_list(
                    "set-cookie",
                )
            ).lower()

            assert settings.refresh_cookie_name.lower() in set_cookie
            assert "max-age=0" in set_cookie

            # The deleted user and personal workspace must be gone.
            async with Session() as session:
                assert (
                    await session.scalar(
                        select(
                            User.id,
                        ).where(
                            User.id == user_id,
                        )
                    )
                    is None
                )

                assert (
                    await session.scalar(
                        select(
                            Organization.id,
                        ).where(
                            Organization.id == organization_id,
                        )
                    )
                    is None
                )

            # A previously issued access JWT must immediately stop resolving.
            old_token_response = await client.get(
                "/api/v1/auth/me",
                headers={
                    "Authorization": f"Bearer {token}",
                },
            )

            assert old_token_response.status_code == 401

    finally:
        # Cleanup is intentionally idempotent because the successful path
        # normally removes these records before this block executes.
        async with Session() as session:
            await session.execute(
                delete(
                    CloudAccount,
                ).where(
                    CloudAccount.organization_id == organization.id,
                )
            )

            await session.execute(
                delete(
                    OrganizationMembership,
                ).where(
                    OrganizationMembership.user_id == user.id,
                )
            )

            await session.execute(
                delete(
                    Organization,
                ).where(
                    Organization.id == organization.id,
                )
            )

            await session.execute(
                delete(
                    User,
                ).where(
                    User.id == user.id,
                )
            )

            await session.commit()

        await engine.dispose()
        await app_database_engine.dispose()


@pytest.mark.asyncio(loop_scope="module")
async def test_delete_account_http_blocks_last_shared_owner(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A shared workspace must not be orphaned by HTTP account deletion."""

    assert TENANT_TEST_DATABASE_URL is not None

    assert settings.database_url == TENANT_TEST_DATABASE_URL, (
        "DATABASE_URL must equal TENANT_TEST_DATABASE_URL for this "
        "HTTP account-deletion acceptance test."
    )

    monkeypatch.setattr(
        settings,
        "cors_origins",
        "https://app.example.com",
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

    owner = User(
        email=f"http-last-owner-{suffix}@example.com",
        full_name="HTTP Last Owner",
        password_hash=hash_password(
            TEST_PASSWORD,
        ),
        role="viewer",
        is_active=True,
        email_verified_at=now,
        password_changed_at=now,
    )

    member = User(
        email=f"http-member-{suffix}@example.com",
        full_name="HTTP Shared Member",
        password_hash=hash_password(
            TEST_PASSWORD,
        ),
        role="viewer",
        is_active=True,
        email_verified_at=now,
        password_changed_at=now,
    )

    organization = Organization(
        name=f"HTTP Shared Workspace {suffix}",
    )

    try:
        async with Session() as session:
            session.add_all(
                [
                    owner,
                    member,
                    organization,
                ]
            )

            await session.flush()

            session.add_all(
                [
                    OrganizationMembership(
                        organization_id=organization.id,
                        user_id=owner.id,
                        role="owner",
                        is_active=True,
                    ),
                    OrganizationMembership(
                        organization_id=organization.id,
                        user_id=member.id,
                        role="member",
                        is_active=True,
                    ),
                ]
            )

            await session.commit()

        token = _access_token(
            owner,
        )

        transport = httpx.ASGITransport(
            app=app,
        )

        async with httpx.AsyncClient(
            transport=transport,
            base_url="https://app.example.com",
        ) as client:
            response = await client.post(
                "/api/v1/auth/delete-account",
                headers=_browser_headers(
                    token,
                ),
                json={
                    "confirmation": "DELETE",
                    "current_password": TEST_PASSWORD,
                },
            )

            assert response.status_code == 409
            assert response.json()["detail"] == (
                "Transfer workspace ownership before deleting your account."
            )

        # The blocked action must preserve both identity and workspace.
        async with Session() as session:
            assert (
                await session.scalar(
                    select(
                        User.id,
                    ).where(
                        User.id == owner.id,
                    )
                )
                == owner.id
            )

            assert (
                await session.scalar(
                    select(
                        Organization.id,
                    ).where(
                        Organization.id == organization.id,
                    )
                )
                == organization.id
            )

    finally:
        async with Session() as session:
            await session.execute(
                delete(
                    OrganizationMembership,
                ).where(
                    OrganizationMembership.organization_id == organization.id,
                )
            )

            await session.execute(
                delete(
                    Organization,
                ).where(
                    Organization.id == organization.id,
                )
            )

            await session.execute(
                delete(
                    User,
                ).where(
                    User.id.in_(
                        [
                            owner.id,
                            member.id,
                        ]
                    )
                )
            )

            await session.commit()

        await engine.dispose()
        await app_database_engine.dispose()

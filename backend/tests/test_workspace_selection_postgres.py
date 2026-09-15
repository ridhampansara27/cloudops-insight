"""PostgreSQL tests for multi-workspace discovery."""

import os
from datetime import (
    UTC,
    datetime,
)

import pytest
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
)

from app.api.v1.workspace import (
    list_available_organizations,
)
from app.core.security import hash_password
from app.models.organization import (
    Organization,
    OrganizationMembership,
)
from app.repositories.user_repository import UserRepository

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)


pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason="TENANT_TEST_DATABASE_URL is required.",
)


async def _create_user(
    session: AsyncSession,
    *,
    email: str,
    full_name: str,
):
    user = await UserRepository(
        session,
    ).create(
        email=email,
        full_name=full_name,
        password_hash=hash_password(
            "workspace-selection-password",
        ),
        email_verified_at=datetime.now(
            UTC,
        ),
        commit=False,
    )

    await session.flush()

    return user


@pytest.mark.asyncio
async def test_available_organizations_are_user_scoped_and_active() -> None:
    """Discovery must expose only active memberships for the caller."""

    assert TENANT_TEST_DATABASE_URL is not None

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    async with engine.connect() as connection:
        outer_transaction = await connection.begin()

        session = AsyncSession(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )

        try:
            user_a = await _create_user(
                session,
                email="workspace-user-a@example.com",
                full_name="Workspace User A",
            )

            user_b = await _create_user(
                session,
                email="workspace-user-b@example.com",
                full_name="Workspace User B",
            )

            organization_a = Organization(
                name="Workspace A",
                is_active=True,
            )

            organization_b = Organization(
                name="Workspace B",
                is_active=True,
            )

            inactive_organization = Organization(
                name="Inactive Workspace",
                is_active=False,
            )

            foreign_organization = Organization(
                name="Foreign Workspace",
                is_active=True,
            )

            session.add_all(
                [
                    organization_a,
                    organization_b,
                    inactive_organization,
                    foreign_organization,
                ],
            )

            await session.flush()

            membership_a = OrganizationMembership(
                organization_id=organization_a.id,
                user_id=user_a.id,
                role="owner",
                is_active=True,
            )

            membership_b = OrganizationMembership(
                organization_id=organization_b.id,
                user_id=user_a.id,
                role="member",
                is_active=True,
            )

            inactive_membership = OrganizationMembership(
                organization_id=inactive_organization.id,
                user_id=user_a.id,
                role="admin",
                is_active=True,
            )

            disabled_membership = OrganizationMembership(
                organization_id=foreign_organization.id,
                user_id=user_a.id,
                role="viewer",
                is_active=False,
            )

            foreign_membership = OrganizationMembership(
                organization_id=foreign_organization.id,
                user_id=user_b.id,
                role="owner",
                is_active=True,
            )

            session.add_all(
                [
                    membership_a,
                    membership_b,
                    inactive_membership,
                    disabled_membership,
                    foreign_membership,
                ],
            )

            await session.commit()

            available = await list_available_organizations(
                current_user=user_a,
                session=session,
            )

            assert len(available) == 2

            available_by_id = {workspace.id: workspace for workspace in available}

            assert set(
                available_by_id,
            ) == {
                organization_a.id,
                organization_b.id,
            }

            assert available_by_id[organization_a.id].membership_id == membership_a.id

            assert available_by_id[organization_a.id].role == "owner"

            assert available_by_id[organization_b.id].membership_id == membership_b.id

            assert available_by_id[organization_b.id].role == "member"

            assert all(
                workspace.id != foreign_organization.id for workspace in available
            )

            assert all(
                workspace.id != inactive_organization.id for workspace in available
            )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()

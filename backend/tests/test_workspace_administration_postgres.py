"""PostgreSQL tests for tenant-safe workspace administration."""

import os
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
)

from app.core.security import hash_password
from app.models.organization import (
    Organization,
    OrganizationMembership,
)
from app.repositories.user_repository import UserRepository
from app.services.workspace_administration_service import (
    LastWorkspaceOwnerError,
    WorkspaceAdministrationService,
    WorkspaceMemberNotFoundError,
)

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
            "workspace-administration-password",
        ),
        email_verified_at=datetime.now(
            UTC,
        ),
        commit=False,
    )

    await session.flush()

    return user


async def _create_organization(
    session: AsyncSession,
    *,
    name: str,
):
    organization = Organization(
        name=name,
        is_active=True,
    )

    session.add(
        organization,
    )

    await session.flush()

    return organization


async def _add_member(
    session: AsyncSession,
    *,
    organization_id,
    user_id,
    role: str,
):
    membership = OrganizationMembership(
        organization_id=organization_id,
        user_id=user_id,
        role=role,
        is_active=True,
    )

    session.add(
        membership,
    )

    await session.flush()

    return membership


@pytest.mark.asyncio
async def test_member_listing_and_mutation_are_tenant_scoped() -> None:
    """Organization A can never list or mutate organization B memberships."""

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
            organization_a = await _create_organization(
                session,
                name="Organization A",
            )

            organization_b = await _create_organization(
                session,
                name="Organization B",
            )

            owner_a = await _create_user(
                session,
                email="owner-a@example.com",
                full_name="Owner A",
            )

            member_a = await _create_user(
                session,
                email="member-a@example.com",
                full_name="Member A",
            )

            owner_b = await _create_user(
                session,
                email="owner-b@example.com",
                full_name="Owner B",
            )

            membership_owner_a = await _add_member(
                session,
                organization_id=organization_a.id,
                user_id=owner_a.id,
                role="owner",
            )

            membership_member_a = await _add_member(
                session,
                organization_id=organization_a.id,
                user_id=member_a.id,
                role="member",
            )

            membership_owner_b = await _add_member(
                session,
                organization_id=organization_b.id,
                user_id=owner_b.id,
                role="owner",
            )

            await session.commit()

            service = WorkspaceAdministrationService(
                session,
            )

            members_a = await service.list_members(
                organization_id=organization_a.id,
            )

            assert {member.membership_id for member in members_a} == {
                membership_owner_a.id,
                membership_member_a.id,
            }

            assert membership_owner_b.id not in {
                member.membership_id for member in members_a
            }

            with pytest.raises(
                WorkspaceMemberNotFoundError,
            ):
                await service.update_member_role(
                    organization_id=organization_a.id,
                    membership_id=membership_owner_b.id,
                    role="viewer",
                )

            with pytest.raises(
                WorkspaceMemberNotFoundError,
            ):
                await service.remove_member(
                    organization_id=organization_a.id,
                    membership_id=membership_owner_b.id,
                )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_last_active_owner_cannot_be_demoted_or_removed() -> None:
    """Workspace administration must never create an ownerless tenant."""

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
            organization = await _create_organization(
                session,
                name="Owner Safety",
            )

            owner = await _create_user(
                session,
                email="sole-owner@example.com",
                full_name="Sole Owner",
            )

            member = await _create_user(
                session,
                email="ordinary-member@example.com",
                full_name="Ordinary Member",
            )

            owner_membership = await _add_member(
                session,
                organization_id=organization.id,
                user_id=owner.id,
                role="owner",
            )

            member_membership = await _add_member(
                session,
                organization_id=organization.id,
                user_id=member.id,
                role="member",
            )

            await session.commit()

            service = WorkspaceAdministrationService(
                session,
            )

            with pytest.raises(
                LastWorkspaceOwnerError,
            ):
                await service.update_member_role(
                    organization_id=organization.id,
                    membership_id=owner_membership.id,
                    role="admin",
                )

            with pytest.raises(
                LastWorkspaceOwnerError,
            ):
                await service.remove_member(
                    organization_id=organization.id,
                    membership_id=owner_membership.id,
                )

            updated_member = await service.update_member_role(
                organization_id=organization.id,
                membership_id=member_membership.id,
                role="owner",
            )

            assert updated_member.role == "owner"

            # Once a second owner exists, the original owner can be demoted.
            updated_owner = await service.update_member_role(
                organization_id=organization.id,
                membership_id=owner_membership.id,
                role="admin",
            )

            assert updated_owner.role == "admin"

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_profile_and_organization_updates_are_persisted() -> None:
    """Basic profile/workspace settings survive a real PostgreSQL commit."""

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
            organization = await _create_organization(
                session,
                name="Before Rename",
            )

            user = await _create_user(
                session,
                email="profile@example.com",
                full_name="Before Profile",
            )

            await _add_member(
                session,
                organization_id=organization.id,
                user_id=user.id,
                role="owner",
            )

            await session.commit()

            service = WorkspaceAdministrationService(
                session,
            )

            updated_user = await service.update_profile(
                user=user,
                full_name="Updated Profile",
            )

            assert updated_user.full_name == "Updated Profile"

            updated_organization = await service.update_organization(
                organization_id=organization.id,
                name="Updated Organization",
            )

            assert updated_organization.name == "Updated Organization"

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()

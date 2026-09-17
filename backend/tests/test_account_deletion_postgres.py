"""Real PostgreSQL tests for permanent CloudOps identity deletion."""

import os
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.security import hash_password
from app.models.auth import AuthToken, RefreshSession
from app.models.budget import Budget
from app.models.cloud_account import CloudAccount
from app.models.organization import Organization, OrganizationMembership
from app.models.organization_invitation import OrganizationInvitation
from app.models.user import User
from app.schemas.auth import DeleteAccountRequest
from app.services.account_deletion_service import (
    AccountDeletionCloudIntegrationsRemainError,
    AccountDeletionLastOwnerError,
    AccountDeletionService,
    InvalidAccountDeletionPasswordError,
)

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)

pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason="TENANT_TEST_DATABASE_URL is required.",
)

TEST_PASSWORD = "Correct-Test-Password-123!"


@asynccontextmanager
async def postgres_session():
    """Run each lifecycle test inside an outer rollback transaction."""

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
            yield session

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


def test_delete_account_request_requires_exact_confirmation() -> None:
    """Destructive confirmation must be exact and reject extra fields."""

    payload = DeleteAccountRequest.model_validate(
        {
            "confirmation": "DELETE",
            "current_password": TEST_PASSWORD,
        }
    )

    assert payload.confirmation == "DELETE"

    with pytest.raises(
        ValidationError,
    ):
        DeleteAccountRequest.model_validate(
            {
                "confirmation": "delete",
                "current_password": TEST_PASSWORD,
            }
        )

    with pytest.raises(
        ValidationError,
    ):
        DeleteAccountRequest.model_validate(
            {
                "confirmation": "DELETE",
                "current_password": TEST_PASSWORD,
                "unexpected": True,
            }
        )


@pytest.mark.asyncio
async def test_wrong_password_does_not_delete_account() -> None:
    """A destructive account action must re-authenticate the user."""

    async with postgres_session() as session:
        user = User(
            email="delete-wrong-password@example.com",
            full_name="Wrong Password User",
            password_hash=hash_password(
                TEST_PASSWORD,
            ),
            role="viewer",
            is_active=True,
            email_verified_at=datetime.now(
                UTC,
            ),
        )

        organization = Organization(
            name="Wrong Password Workspace",
        )

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

        with pytest.raises(
            InvalidAccountDeletionPasswordError,
        ):
            await AccountDeletionService(
                session,
            ).delete_account(
                user_id=user_id,
                current_password="Definitely-Wrong-Password",
            )

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

        assert (
            await session.scalar(
                select(
                    Organization.id,
                ).where(
                    Organization.id == organization_id,
                )
            )
            == organization_id
        )


@pytest.mark.asyncio
async def test_personal_workspace_with_cloud_integration_blocks_deletion() -> None:
    """Cloud integrations must be explicitly removed before identity deletion."""

    async with postgres_session() as session:
        user = User(
            email="delete-with-integration@example.com",
            full_name="Integration User",
            password_hash=hash_password(
                TEST_PASSWORD,
            ),
            role="viewer",
            is_active=True,
            email_verified_at=datetime.now(
                UTC,
            ),
        )

        organization = Organization(
            name="Integration Workspace",
        )

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

        account = CloudAccount(
            organization_id=organization.id,
            provider="aws",
            name="Deletion Block AWS",
            external_account_id="757575757575",
            role_arn=None,
            external_id="coi_delete_block_test",
            enabled_regions=[
                "eu-central-1",
            ],
            status="pending",
            sync_status="idle",
            created_by_id=user.id,
        )

        session.add_all(
            [
                membership,
                account,
            ]
        )

        await session.commit()

        user_id = user.id
        organization_id = organization.id
        account_id = account.id

        with pytest.raises(
            AccountDeletionCloudIntegrationsRemainError,
        ):
            await AccountDeletionService(
                session,
            ).delete_account(
                user_id=user_id,
                current_password=TEST_PASSWORD,
            )

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

        assert (
            await session.scalar(
                select(
                    Organization.id,
                ).where(
                    Organization.id == organization_id,
                )
            )
            == organization_id
        )

        assert (
            await session.scalar(
                select(
                    CloudAccount.id,
                ).where(
                    CloudAccount.id == account_id,
                )
            )
            == account_id
        )


@pytest.mark.asyncio
async def test_last_shared_workspace_owner_cannot_delete_account() -> None:
    """Deleting an identity must never leave a shared workspace ownerless."""

    async with postgres_session() as session:
        owner = User(
            email="delete-last-owner@example.com",
            full_name="Last Owner",
            password_hash=hash_password(
                TEST_PASSWORD,
            ),
            role="viewer",
            is_active=True,
            email_verified_at=datetime.now(
                UTC,
            ),
        )

        member = User(
            email="delete-last-owner-member@example.com",
            full_name="Regular Member",
            password_hash=hash_password(
                "Other-Test-Password-123!",
            ),
            role="viewer",
            is_active=True,
            email_verified_at=datetime.now(
                UTC,
            ),
        )

        organization = Organization(
            name="Shared Last Owner Workspace",
        )

        session.add_all(
            [
                owner,
                member,
                organization,
            ]
        )

        await session.flush()

        owner_membership = OrganizationMembership(
            organization_id=organization.id,
            user_id=owner.id,
            role="owner",
            is_active=True,
        )

        member_membership = OrganizationMembership(
            organization_id=organization.id,
            user_id=member.id,
            role="member",
            is_active=True,
        )

        session.add_all(
            [
                owner_membership,
                member_membership,
            ]
        )

        await session.commit()

        owner_id = owner.id
        organization_id = organization.id

        with pytest.raises(
            AccountDeletionLastOwnerError,
        ):
            await AccountDeletionService(
                session,
            ).delete_account(
                user_id=owner_id,
                current_password=TEST_PASSWORD,
            )

        assert (
            await session.scalar(
                select(
                    User.id,
                ).where(
                    User.id == owner_id,
                )
            )
            == owner_id
        )

        assert (
            await session.scalar(
                select(
                    Organization.id,
                ).where(
                    Organization.id == organization_id,
                )
            )
            == organization_id
        )


@pytest.mark.asyncio
async def test_personal_workspace_and_auth_state_are_deleted() -> None:
    """A sole-member workspace and authentication state must be purged."""

    async with postgres_session() as session:
        now = datetime.now(
            UTC,
        )

        user = User(
            email="delete-personal@example.com",
            full_name="Personal Delete User",
            password_hash=hash_password(
                TEST_PASSWORD,
            ),
            role="viewer",
            is_active=True,
            email_verified_at=now,
        )

        organization = Organization(
            name="Personal Delete Workspace",
        )

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

        budget = Budget(
            organization_id=organization.id,
            name="Personal Workspace Budget",
            scope_type="service",
            scope_value="Amazon EC2",
            monthly_limit=100,
            warning_threshold=80,
            critical_threshold=100,
            is_active=True,
            created_by_id=user.id,
        )

        auth_token = AuthToken(
            user_id=user.id,
            token_hash="a" * 64,
            purpose="password_reset",
            expires_at=now
            + timedelta(
                hours=1,
            ),
        )

        refresh_session = RefreshSession(
            user_id=user.id,
            family_id=uuid4(),
            token_hash="b" * 64,
            expires_at=now
            + timedelta(
                days=1,
            ),
        )

        session.add_all(
            [
                membership,
                budget,
                auth_token,
                refresh_session,
            ]
        )

        await session.commit()

        user_id = user.id
        organization_id = organization.id
        membership_id = membership.id
        budget_id = budget.id
        auth_token_id = auth_token.id
        refresh_session_id = refresh_session.id

        result = await AccountDeletionService(
            session,
        ).delete_account(
            user_id=user_id,
            current_password=TEST_PASSWORD,
        )

        assert result.personal_workspaces_deleted == 1
        assert result.shared_workspaces_left == 0

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

        assert (
            await session.scalar(
                select(
                    OrganizationMembership.id,
                ).where(
                    OrganizationMembership.id == membership_id,
                )
            )
            is None
        )

        assert (
            await session.scalar(
                select(
                    Budget.id,
                ).where(
                    Budget.id == budget_id,
                )
            )
            is None
        )

        assert (
            await session.scalar(
                select(
                    AuthToken.id,
                ).where(
                    AuthToken.id == auth_token_id,
                )
            )
            is None
        )

        assert (
            await session.scalar(
                select(
                    RefreshSession.id,
                ).where(
                    RefreshSession.id == refresh_session_id,
                )
            )
            is None
        )


@pytest.mark.asyncio
async def test_shared_workspace_survives_and_audit_references_become_null() -> None:
    """Deleting one owner must preserve shared tenant data and attribution."""

    async with postgres_session() as session:
        now = datetime.now(
            UTC,
        )

        deleting_owner = User(
            email="delete-shared-owner@example.com",
            full_name="Deleting Shared Owner",
            password_hash=hash_password(
                TEST_PASSWORD,
            ),
            role="viewer",
            is_active=True,
            email_verified_at=now,
        )

        surviving_owner = User(
            email="delete-surviving-owner@example.com",
            full_name="Surviving Owner",
            password_hash=hash_password(
                "Surviving-Owner-Password-123!",
            ),
            role="viewer",
            is_active=True,
            email_verified_at=now,
        )

        organization = Organization(
            name="Shared Preservation Workspace",
        )

        session.add_all(
            [
                deleting_owner,
                surviving_owner,
                organization,
            ]
        )

        await session.flush()

        deleting_membership = OrganizationMembership(
            organization_id=organization.id,
            user_id=deleting_owner.id,
            role="owner",
            is_active=True,
        )

        surviving_membership = OrganizationMembership(
            organization_id=organization.id,
            user_id=surviving_owner.id,
            role="owner",
            is_active=True,
        )

        session.add_all(
            [
                deleting_membership,
                surviving_membership,
            ]
        )

        await session.flush()

        cloud_account = CloudAccount(
            organization_id=organization.id,
            provider="aws",
            name="Shared Historical AWS",
            external_account_id="767676767676",
            role_arn=None,
            external_id="coi_shared_delete_test",
            enabled_regions=[
                "eu-central-1",
            ],
            status="pending",
            sync_status="idle",
            created_by_id=deleting_owner.id,
        )

        budget = Budget(
            organization_id=organization.id,
            name="Shared Historical Budget",
            scope_type="service",
            scope_value="Amazon EC2",
            monthly_limit=200,
            warning_threshold=80,
            critical_threshold=100,
            is_active=True,
            created_by_id=deleting_owner.id,
        )

        invitation = OrganizationInvitation(
            organization_id=organization.id,
            invited_email="historical-invite@example.com",
            role="member",
            token_hash="c" * 64,
            invited_by_user_id=deleting_owner.id,
            accepted_by_user_id=deleting_owner.id,
            expires_at=now
            + timedelta(
                days=1,
            ),
            accepted_at=now,
        )

        session.add_all(
            [
                cloud_account,
                budget,
                invitation,
            ]
        )

        await session.commit()

        deleting_owner_id = deleting_owner.id
        surviving_owner_id = surviving_owner.id
        organization_id = organization.id
        deleting_membership_id = deleting_membership.id
        surviving_membership_id = surviving_membership.id
        cloud_account_id = cloud_account.id
        budget_id = budget.id
        invitation_id = invitation.id

        result = await AccountDeletionService(
            session,
        ).delete_account(
            user_id=deleting_owner_id,
            current_password=TEST_PASSWORD,
        )

        assert result.personal_workspaces_deleted == 0
        assert result.shared_workspaces_left == 1

        assert (
            await session.scalar(
                select(
                    User.id,
                ).where(
                    User.id == deleting_owner_id,
                )
            )
            is None
        )

        assert (
            await session.scalar(
                select(
                    User.id,
                ).where(
                    User.id == surviving_owner_id,
                )
            )
            == surviving_owner_id
        )

        assert (
            await session.scalar(
                select(
                    Organization.id,
                ).where(
                    Organization.id == organization_id,
                )
            )
            == organization_id
        )

        assert (
            await session.scalar(
                select(
                    OrganizationMembership.id,
                ).where(
                    OrganizationMembership.id == deleting_membership_id,
                )
            )
            is None
        )

        assert (
            await session.scalar(
                select(
                    OrganizationMembership.id,
                ).where(
                    OrganizationMembership.id == surviving_membership_id,
                )
            )
            == surviving_membership_id
        )

        await session.refresh(
            cloud_account,
        )

        await session.refresh(
            budget,
        )

        await session.refresh(
            invitation,
        )

        assert cloud_account.id == cloud_account_id
        assert cloud_account.created_by_id is None

        assert budget.id == budget_id
        assert budget.created_by_id is None

        assert invitation.id == invitation_id
        assert invitation.invited_by_user_id is None
        assert invitation.accepted_by_user_id is None

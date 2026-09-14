"""PostgreSQL security tests for workspace invitations."""

import os
from datetime import (
    UTC,
    datetime,
)

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
)

from app.core.security import (
    hash_opaque_token,
    hash_password,
)
from app.models.organization import (
    Organization,
    OrganizationMembership,
)
from app.models.organization_invitation import (
    OrganizationInvitation,
)
from app.models.user import User
from app.repositories.user_repository import (
    UserRepository,
)
from app.services.workspace_invitation_service import (
    WorkspaceInvitationAcceptanceError,
    WorkspaceInvitationAlreadyMemberError,
    WorkspaceInvitationNotFoundError,
    WorkspaceInvitationRoleForbiddenError,
    WorkspaceInvitationService,
)

TENANT_TEST_DATABASE_URL = os.getenv(
    "TENANT_TEST_DATABASE_URL",
)


pytestmark = pytest.mark.skipif(
    not TENANT_TEST_DATABASE_URL,
    reason=("TENANT_TEST_DATABASE_URL is required."),
)


class CapturingInvitationSender:
    """Capture the raw bearer only in test memory."""

    def __init__(
        self,
    ) -> None:
        self.token: str | None = None

        self.recipient_email: str | None = None

    async def send_workspace_invitation(
        self,
        *,
        recipient_email: str,
        token: str,
        organization_name: str,
        role: str,
        inviter_name: str,
    ) -> None:
        del organization_name
        del role
        del inviter_name

        self.recipient_email = recipient_email

        self.token = token


async def _create_user(
    session: AsyncSession,
    *,
    email: str,
    full_name: str,
    password: str = ("workspace-invitation-password"),
):
    user = await UserRepository(
        session,
    ).create(
        email=(email),
        full_name=(full_name),
        password_hash=(
            hash_password(
                password,
            )
        ),
        email_verified_at=(
            datetime.now(
                UTC,
            )
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
        name=(name),
        is_active=True,
    )

    session.add(
        organization,
    )

    await session.flush()

    return organization


async def _add_membership(
    session: AsyncSession,
    *,
    organization_id,
    user_id,
    role: str,
    active: bool = True,
):
    membership = OrganizationMembership(
        organization_id=(organization_id),
        user_id=(user_id),
        role=(role),
        is_active=(active),
    )

    session.add(
        membership,
    )

    await session.flush()

    return membership


@pytest.mark.asyncio
async def test_invitation_bearer_is_never_stored_raw() -> None:
    """Only the invitation HMAC may enter PostgreSQL."""

    assert TENANT_TEST_DATABASE_URL is not None

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    async with engine.connect() as connection:
        outer_transaction = await connection.begin()

        session = AsyncSession(
            bind=(connection),
            expire_on_commit=False,
            join_transaction_mode=("create_savepoint"),
        )

        try:
            organization = await _create_organization(
                session,
                name=("Invitation Security"),
            )

            owner = await _create_user(
                session,
                email=("invite-owner@example.com"),
                full_name=("Invite Owner"),
            )

            await _add_membership(
                session,
                organization_id=(organization.id),
                user_id=(owner.id),
                role=("owner"),
            )

            await session.commit()

            sender = CapturingInvitationSender()

            issued = await WorkspaceInvitationService(
                session,
                email_sender=(sender),
            ).issue_invitation(
                organization_id=(organization.id),
                invited_email=("New.Member@Example.com"),
                role=("member"),
                invited_by_user_id=(owner.id),
                inviter_name=(owner.full_name),
                inviter_role=("owner"),
            )

            assert sender.token is not None

            assert sender.recipient_email == "new.member@example.com"

            persisted = await session.scalar(
                select(
                    OrganizationInvitation,
                ).where(
                    OrganizationInvitation.id == issued.id,
                )
            )

            assert persisted is not None

            assert persisted.token_hash == hash_opaque_token(
                sender.token,
            )

            assert persisted.token_hash != sender.token

            assert issued.status == "pending"

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_new_user_can_accept_once_and_is_email_verified() -> None:
    """An invite can bootstrap one verified account and membership."""

    assert TENANT_TEST_DATABASE_URL is not None

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    async with engine.connect() as connection:
        outer_transaction = await connection.begin()

        session = AsyncSession(
            bind=(connection),
            expire_on_commit=False,
            join_transaction_mode=("create_savepoint"),
        )

        try:
            organization = await _create_organization(
                session,
                name=("New User Workspace"),
            )

            owner = await _create_user(
                session,
                email=("owner-new@example.com"),
                full_name=("Owner New"),
            )

            await _add_membership(
                session,
                organization_id=(organization.id),
                user_id=(owner.id),
                role=("owner"),
            )

            await session.commit()

            sender = CapturingInvitationSender()

            service = WorkspaceInvitationService(
                session,
                email_sender=(sender),
            )

            await service.issue_invitation(
                organization_id=(organization.id),
                invited_email=("brand-new@example.com"),
                role=("viewer"),
                invited_by_user_id=(owner.id),
                inviter_name=(owner.full_name),
                inviter_role=("owner"),
            )

            assert sender.token is not None

            accepted = await service.accept_invitation(
                raw_token=(sender.token),
                full_name=("Brand New User"),
                password=("brand-new-secure-password"),
            )

            assert accepted.account_created is True

            assert accepted.role == "viewer"

            user = await session.scalar(
                select(
                    User,
                ).where(
                    User.email == "brand-new@example.com",
                )
            )

            assert user is not None

            assert user.email_verified_at is not None

            membership = await session.scalar(
                select(
                    OrganizationMembership,
                ).where(
                    OrganizationMembership.organization_id == organization.id,
                    OrganizationMembership.user_id == user.id,
                )
            )

            assert membership is not None

            assert membership.is_active is True

            assert membership.role == "viewer"

            with pytest.raises(
                WorkspaceInvitationAcceptanceError,
            ):
                await service.accept_invitation(
                    raw_token=(sender.token),
                    full_name=("Replay"),
                    password=("brand-new-secure-password"),
                )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_existing_account_requires_its_password() -> None:
    """Invite possession cannot bypass an existing account password."""

    assert TENANT_TEST_DATABASE_URL is not None

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    async with engine.connect() as connection:
        outer_transaction = await connection.begin()

        session = AsyncSession(
            bind=(connection),
            expire_on_commit=False,
            join_transaction_mode=("create_savepoint"),
        )

        try:
            organization = await _create_organization(
                session,
                name=("Existing Account Workspace"),
            )

            owner = await _create_user(
                session,
                email=("owner-existing@example.com"),
                full_name=("Owner Existing"),
            )

            existing = await _create_user(
                session,
                email=("existing@example.com"),
                full_name=("Existing User"),
                password=("existing-account-password"),
            )

            await _add_membership(
                session,
                organization_id=(organization.id),
                user_id=(owner.id),
                role=("owner"),
            )

            await session.commit()

            sender = CapturingInvitationSender()

            service = WorkspaceInvitationService(
                session,
                email_sender=(sender),
            )

            await service.issue_invitation(
                organization_id=(organization.id),
                invited_email=(existing.email),
                role=("member"),
                invited_by_user_id=(owner.id),
                inviter_name=(owner.full_name),
                inviter_role=("owner"),
            )

            assert sender.token is not None

            with pytest.raises(
                WorkspaceInvitationAcceptanceError,
            ):
                await service.accept_invitation(
                    raw_token=(sender.token),
                    full_name=(existing.full_name),
                    password=("wrong-password-value"),
                )

            accepted = await service.accept_invitation(
                raw_token=(sender.token),
                full_name=(existing.full_name),
                password=("existing-account-password"),
            )

            assert accepted.account_created is False

            assert accepted.user_id == existing.id

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_reinvite_rotates_old_pending_bearer() -> None:
    """Creating a replacement invite revokes the earlier bearer."""

    assert TENANT_TEST_DATABASE_URL is not None

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    async with engine.connect() as connection:
        outer_transaction = await connection.begin()

        session = AsyncSession(
            bind=(connection),
            expire_on_commit=False,
            join_transaction_mode=("create_savepoint"),
        )

        try:
            organization = await _create_organization(
                session,
                name=("Rotation Workspace"),
            )

            owner = await _create_user(
                session,
                email=("rotation-owner@example.com"),
                full_name=("Rotation Owner"),
            )

            await _add_membership(
                session,
                organization_id=(organization.id),
                user_id=(owner.id),
                role=("owner"),
            )

            await session.commit()

            first_sender = CapturingInvitationSender()

            service = WorkspaceInvitationService(
                session,
                email_sender=(first_sender),
            )

            first = await service.issue_invitation(
                organization_id=(organization.id),
                invited_email=("rotate@example.com"),
                role=("member"),
                invited_by_user_id=(owner.id),
                inviter_name=(owner.full_name),
                inviter_role=("owner"),
            )

            assert first_sender.token is not None

            old_token = first_sender.token

            second_sender = CapturingInvitationSender()

            service = WorkspaceInvitationService(
                session,
                email_sender=(second_sender),
            )

            second = await service.issue_invitation(
                organization_id=(organization.id),
                invited_email=("rotate@example.com"),
                role=("admin"),
                invited_by_user_id=(owner.id),
                inviter_name=(owner.full_name),
                inviter_role=("owner"),
            )

            assert second_sender.token is not None

            assert second.id != first.id

            first_row = await session.get(
                OrganizationInvitation,
                first.id,
            )

            assert first_row is not None

            assert first_row.revoked_at is not None

            with pytest.raises(
                WorkspaceInvitationAcceptanceError,
            ):
                await service.accept_invitation(
                    raw_token=(old_token),
                    full_name=("Rotated User"),
                    password=("rotated-invite-password"),
                )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_admin_cannot_invite_owner_and_active_member_cannot_be_invited() -> None:
    """Invitation issuance cannot create unauthorized privilege or duplicates."""

    assert TENANT_TEST_DATABASE_URL is not None

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    async with engine.connect() as connection:
        outer_transaction = await connection.begin()

        session = AsyncSession(
            bind=(connection),
            expire_on_commit=False,
            join_transaction_mode=("create_savepoint"),
        )

        try:
            organization = await _create_organization(
                session,
                name=("Role Safety Workspace"),
            )

            owner = await _create_user(
                session,
                email=("role-owner@example.com"),
                full_name=("Role Owner"),
            )

            admin = await _create_user(
                session,
                email=("role-admin@example.com"),
                full_name=("Role Admin"),
            )

            await _add_membership(
                session,
                organization_id=(organization.id),
                user_id=(owner.id),
                role=("owner"),
            )

            await _add_membership(
                session,
                organization_id=(organization.id),
                user_id=(admin.id),
                role=("admin"),
            )

            await session.commit()

            service = WorkspaceInvitationService(
                session,
                email_sender=(CapturingInvitationSender()),
            )

            with pytest.raises(
                WorkspaceInvitationRoleForbiddenError,
            ):
                await service.issue_invitation(
                    organization_id=(organization.id),
                    invited_email=("another-owner@example.com"),
                    role=("owner"),
                    invited_by_user_id=(admin.id),
                    inviter_name=(admin.full_name),
                    inviter_role=("admin"),
                )

            with pytest.raises(
                WorkspaceInvitationAlreadyMemberError,
            ):
                await service.issue_invitation(
                    organization_id=(organization.id),
                    invited_email=(admin.email),
                    role=("viewer"),
                    invited_by_user_id=(owner.id),
                    inviter_name=(owner.full_name),
                    inviter_role=("owner"),
                )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()


@pytest.mark.asyncio
async def test_invitation_revocation_is_tenant_scoped() -> None:
    """Organization A cannot revoke Organization B's invitation."""

    assert TENANT_TEST_DATABASE_URL is not None

    engine = create_async_engine(
        TENANT_TEST_DATABASE_URL,
    )

    async with engine.connect() as connection:
        outer_transaction = await connection.begin()

        session = AsyncSession(
            bind=(connection),
            expire_on_commit=False,
            join_transaction_mode=("create_savepoint"),
        )

        try:
            organization_a = await _create_organization(
                session,
                name=("Invitation Tenant A"),
            )

            organization_b = await _create_organization(
                session,
                name=("Invitation Tenant B"),
            )

            owner_b = await _create_user(
                session,
                email=("invitation-owner-b@example.com"),
                full_name=("Invitation Owner B"),
            )

            await _add_membership(
                session,
                organization_id=(organization_b.id),
                user_id=(owner_b.id),
                role=("owner"),
            )

            await session.commit()

            service = WorkspaceInvitationService(
                session,
                email_sender=(CapturingInvitationSender()),
            )

            invitation = await service.issue_invitation(
                organization_id=(organization_b.id),
                invited_email=("tenant-b-invite@example.com"),
                role=("member"),
                invited_by_user_id=(owner_b.id),
                inviter_name=(owner_b.full_name),
                inviter_role=("owner"),
            )

            with pytest.raises(
                WorkspaceInvitationNotFoundError,
            ):
                await service.revoke_invitation(
                    organization_id=(organization_a.id),
                    invitation_id=(invitation.id),
                )

        finally:
            await session.close()

            await outer_transaction.rollback()

    await engine.dispose()

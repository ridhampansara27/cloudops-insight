"""Secure organization invitation lifecycle."""

from dataclasses import dataclass
from datetime import (
    UTC,
    datetime,
    timedelta,
)
from typing import Protocol
from uuid import UUID

from sqlalchemy import (
    func,
    select,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    generate_opaque_token,
    hash_opaque_token,
    hash_password,
    verify_password,
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

INVITABLE_ROLES = {
    "owner",
    "admin",
    "member",
    "viewer",
}


class WorkspaceInvitationEmailSender(
    Protocol,
):
    """Boundary for delivering the raw invitation bearer."""

    async def send_workspace_invitation(
        self,
        *,
        recipient_email: str,
        token: str,
        organization_name: str,
        role: str,
        inviter_name: str,
    ) -> None:
        """Deliver one invitation bearer."""
        ...


class WorkspaceInvitationNotFoundError(
    RuntimeError,
):
    """Invitation is unavailable inside the requested tenant."""


class WorkspaceInvitationAlreadyMemberError(
    RuntimeError,
):
    """The invited email already has an active membership."""


class WorkspaceInvitationRoleForbiddenError(
    RuntimeError,
):
    """The inviter may not grant the requested role."""


class WorkspaceInvitationConflictError(
    RuntimeError,
):
    """Invitation persistence conflicted with another request."""


class WorkspaceInvitationDeliveryError(
    RuntimeError,
):
    """The persisted invitation could not be delivered safely."""


class WorkspaceInvitationAcceptanceError(
    RuntimeError,
):
    """The invitation cannot be accepted."""


@dataclass(
    frozen=True,
)
class WorkspaceInvitationRecord:
    """Safe invitation metadata without its bearer or digest."""

    id: UUID

    organization_id: UUID

    invited_email: str

    role: str

    status: str

    invited_by_user_id: UUID | None

    expires_at: datetime

    accepted_at: datetime | None

    revoked_at: datetime | None

    created_at: datetime


@dataclass(
    frozen=True,
)
class WorkspaceInvitationAcceptance:
    """Result of successfully consuming one invitation."""

    organization_id: UUID

    organization_name: str

    user_id: UUID

    email: str

    role: str

    account_created: bool


class WorkspaceInvitationService:
    """Issue, revoke and consume tenant invitations."""

    def __init__(
        self,
        session: AsyncSession,
        *,
        email_sender: WorkspaceInvitationEmailSender | None = None,
    ) -> None:
        self.session = session

        self.email_sender = email_sender

    async def issue_invitation(
        self,
        *,
        organization_id: UUID,
        invited_email: str,
        role: str,
        invited_by_user_id: UUID,
        inviter_name: str,
        inviter_role: str,
    ) -> WorkspaceInvitationRecord:
        """Create and deliver one new invitation."""

        normalized_email = invited_email.strip().lower()

        if role not in INVITABLE_ROLES:
            raise WorkspaceInvitationRoleForbiddenError(
                "Unsupported invitation role.",
            )

        # Admins may invite up to their own privilege level, but only an
        # owner may create another owner.
        if role == "owner" and inviter_role != "owner":
            raise WorkspaceInvitationRoleForbiddenError(
                "Only an owner can invite another owner.",
            )

        # Locking the organization serializes invitation issuance inside
        # one tenant and materially reduces duplicate-invite races.
        organization = await self.session.scalar(
            select(
                Organization,
            )
            .where(
                Organization.id == organization_id,
                Organization.is_active.is_(
                    True,
                ),
            )
            .with_for_update()
        )

        if organization is None:
            raise WorkspaceInvitationNotFoundError(
                "Organization is unavailable.",
            )

        already_member = await self.session.scalar(
            select(
                OrganizationMembership.id,
            )
            .join(
                User,
                User.id == OrganizationMembership.user_id,
            )
            .where(
                OrganizationMembership.organization_id == organization_id,
                OrganizationMembership.is_active.is_(
                    True,
                ),
                func.lower(
                    User.email,
                )
                == normalized_email,
            )
        )

        if already_member is not None:
            raise WorkspaceInvitationAlreadyMemberError(
                "This email already belongs to an active member.",
            )

        now = datetime.now(
            UTC,
        )

        # Re-inviting rotates previous pending bearers. The old bearer
        # becomes unusable before a replacement is committed.
        existing_pending = (
            await self.session.scalars(
                select(
                    OrganizationInvitation,
                )
                .where(
                    OrganizationInvitation.organization_id == organization_id,
                    OrganizationInvitation.invited_email == normalized_email,
                    OrganizationInvitation.accepted_at.is_(
                        None,
                    ),
                    OrganizationInvitation.revoked_at.is_(
                        None,
                    ),
                )
                .with_for_update()
            )
        ).all()

        for existing in existing_pending:
            existing.revoked_at = now

        raw_token = generate_opaque_token()

        invitation = OrganizationInvitation(
            organization_id=(organization_id),
            invited_email=(normalized_email),
            role=role,
            token_hash=(
                hash_opaque_token(
                    raw_token,
                )
            ),
            invited_by_user_id=(invited_by_user_id),
            expires_at=(
                now
                + timedelta(
                    hours=(settings.workspace_invitation_expire_hours),
                )
            ),
        )

        self.session.add(
            invitation,
        )

        try:
            await self.session.commit()

        except IntegrityError as error:
            await self.session.rollback()

            raise WorkspaceInvitationConflictError(
                "A pending invitation already exists.",
            ) from error

        await self.session.refresh(
            invitation,
        )

        if self.email_sender is not None:
            try:
                await self.email_sender.send_workspace_invitation(
                    recipient_email=(normalized_email),
                    token=raw_token,
                    organization_name=(organization.name),
                    role=role,
                    inviter_name=(inviter_name),
                )

            except Exception as error:
                # Never leave an active bearer behind after a known
                # delivery failure.
                invitation.revoked_at = datetime.now(
                    UTC,
                )

                await self.session.commit()

                raise WorkspaceInvitationDeliveryError(
                    "Invitation delivery failed.",
                ) from error

        return self._record(
            invitation,
        )

    async def list_invitations(
        self,
        *,
        organization_id: UUID,
    ) -> list[WorkspaceInvitationRecord]:
        """Return safe invitation metadata for one tenant."""

        invitations = (
            await self.session.scalars(
                select(
                    OrganizationInvitation,
                )
                .where(
                    OrganizationInvitation.organization_id == organization_id,
                )
                .order_by(
                    OrganizationInvitation.created_at.desc(),
                )
                .limit(
                    100,
                )
            )
        ).all()

        return [
            self._record(
                invitation,
            )
            for invitation in invitations
        ]

    async def revoke_invitation(
        self,
        *,
        organization_id: UUID,
        invitation_id: UUID,
    ) -> None:
        """Revoke only an invitation belonging to the current tenant."""

        invitation = await self.session.scalar(
            select(
                OrganizationInvitation,
            )
            .where(
                OrganizationInvitation.id == invitation_id,
                OrganizationInvitation.organization_id == organization_id,
            )
            .with_for_update()
        )

        if invitation is None:
            raise WorkspaceInvitationNotFoundError(
                "Invitation was not found.",
            )

        if invitation.accepted_at is not None:
            raise WorkspaceInvitationConflictError(
                "Accepted invitations cannot be revoked.",
            )

        if invitation.revoked_at is None:
            invitation.revoked_at = datetime.now(
                UTC,
            )

            await self.session.commit()

    async def accept_invitation(
        self,
        *,
        raw_token: str,
        full_name: str,
        password: str,
    ) -> WorkspaceInvitationAcceptance:
        """Consume one invitation to create or attach an account."""

        now = datetime.now(
            UTC,
        )

        invitation = await self.session.scalar(
            select(
                OrganizationInvitation,
            )
            .where(
                OrganizationInvitation.token_hash
                == hash_opaque_token(
                    raw_token,
                ),
            )
            .with_for_update()
        )

        if (
            invitation is None
            or invitation.accepted_at is not None
            or invitation.revoked_at is not None
            or invitation.expires_at <= now
        ):
            raise WorkspaceInvitationAcceptanceError(
                "Invitation is invalid or expired.",
            )

        organization = await self.session.scalar(
            select(
                Organization,
            )
            .where(
                Organization.id == invitation.organization_id,
                Organization.is_active.is_(
                    True,
                ),
            )
            .with_for_update()
        )

        if organization is None:
            raise WorkspaceInvitationAcceptanceError(
                "Invitation is invalid or expired.",
            )

        normalized_email = invitation.invited_email.strip().lower()

        user = await self.session.scalar(
            select(
                User,
            )
            .where(
                func.lower(
                    User.email,
                )
                == normalized_email,
            )
            .with_for_update()
        )

        account_created = False

        if user is not None:
            # Possession of an invitation alone must not grant access to
            # an existing account. Its password is also required.
            if not user.is_active or not verify_password(
                password,
                user.password_hash,
            ):
                raise WorkspaceInvitationAcceptanceError(
                    "Invitation could not be accepted.",
                )

            # The invitation was delivered to this exact address, so
            # successfully consuming it proves control of that email.
            if user.email_verified_at is None:
                user.email_verified_at = now

        else:
            try:
                user = await UserRepository(
                    self.session,
                ).create(
                    email=(normalized_email),
                    full_name=(full_name.strip()),
                    password_hash=(
                        hash_password(
                            password,
                        )
                    ),
                    email_verified_at=(now),
                    commit=False,
                )

                await self.session.flush()

                account_created = True

            except IntegrityError as error:
                await self.session.rollback()

                raise WorkspaceInvitationAcceptanceError(
                    "Invitation could not be accepted.",
                ) from error

        membership = await self.session.scalar(
            select(
                OrganizationMembership,
            )
            .where(
                OrganizationMembership.organization_id == invitation.organization_id,
                OrganizationMembership.user_id == user.id,
            )
            .with_for_update()
        )

        if membership is None:
            membership = OrganizationMembership(
                organization_id=(invitation.organization_id),
                user_id=(user.id),
                role=(invitation.role),
                is_active=True,
            )

            self.session.add(
                membership,
            )

        elif not membership.is_active:
            membership.is_active = True

            membership.role = invitation.role

        # If another process already created an active membership after
        # this invitation was issued, preserve that membership's current
        # role rather than escalating it from stale invitation metadata.
        effective_role = membership.role

        invitation.accepted_at = now

        invitation.accepted_by_user_id = user.id

        organization_id = organization.id

        organization_name = organization.name

        user_id = user.id

        email = user.email

        await self.session.commit()

        return WorkspaceInvitationAcceptance(
            organization_id=(organization_id),
            organization_name=(organization_name),
            user_id=(user_id),
            email=(email),
            role=(effective_role),
            account_created=(account_created),
        )

    @staticmethod
    def _record(
        invitation: OrganizationInvitation,
    ) -> WorkspaceInvitationRecord:
        """Convert persistence state to safe metadata."""

        now = datetime.now(
            UTC,
        )

        if invitation.accepted_at is not None:
            status = "accepted"

        elif invitation.revoked_at is not None:
            status = "revoked"

        elif invitation.expires_at <= now:
            status = "expired"

        else:
            status = "pending"

        return WorkspaceInvitationRecord(
            id=invitation.id,
            organization_id=(invitation.organization_id),
            invited_email=(invitation.invited_email),
            role=(invitation.role),
            status=(status),
            invited_by_user_id=(invitation.invited_by_user_id),
            expires_at=(invitation.expires_at),
            accepted_at=(invitation.accepted_at),
            revoked_at=(invitation.revoked_at),
            created_at=(invitation.created_at),
        )

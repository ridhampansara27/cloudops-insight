"""Tenant-safe profile and workspace administration."""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import (
    func,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import (
    Organization,
    OrganizationMembership,
)
from app.models.user import User

TENANT_ROLES = {
    "owner",
    "admin",
    "member",
    "viewer",
}


class WorkspaceOrganizationNotFoundError(RuntimeError):
    """Raised when the current organization cannot be found."""


class WorkspaceMemberNotFoundError(RuntimeError):
    """Raised when a membership is outside the current tenant."""


class LastWorkspaceOwnerError(RuntimeError):
    """Raised when an operation would leave an organization ownerless."""


@dataclass(
    frozen=True,
)
class WorkspaceMemberRecord:
    """Flatten membership and user data for the API boundary."""

    membership_id: UUID

    user_id: UUID

    email: str

    full_name: str

    role: str

    is_active: bool

    joined_at: object


class WorkspaceAdministrationService:
    """Manage only identities and memberships inside one tenant boundary."""

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    async def update_profile(
        self,
        *,
        user: User,
        full_name: str,
    ) -> User:
        """Update non-sensitive identity metadata."""

        user.full_name = full_name.strip()

        await self.session.commit()

        await self.session.refresh(
            user,
        )

        return user

    async def get_organization(
        self,
        *,
        organization_id: UUID,
    ) -> Organization:
        """Load the active current organization."""

        organization = await self.session.scalar(
            select(
                Organization,
            ).where(
                Organization.id == organization_id,
                Organization.is_active.is_(
                    True,
                ),
            )
        )

        if organization is None:
            raise WorkspaceOrganizationNotFoundError(
                "Organization is unavailable.",
            )

        return organization

    async def update_organization(
        self,
        *,
        organization_id: UUID,
        name: str,
    ) -> Organization:
        """Rename only the caller's current organization."""

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
            raise WorkspaceOrganizationNotFoundError(
                "Organization is unavailable.",
            )

        organization.name = name.strip()

        await self.session.commit()

        await self.session.refresh(
            organization,
        )

        return organization

    async def list_members(
        self,
        *,
        organization_id: UUID,
    ) -> list[WorkspaceMemberRecord]:
        """Return active members from exactly one organization."""

        rows = (
            await self.session.execute(
                select(
                    OrganizationMembership,
                    User,
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
                    User.is_active.is_(
                        True,
                    ),
                )
                .order_by(
                    OrganizationMembership.created_at.asc(),
                    User.email.asc(),
                )
            )
        ).all()

        return [
            WorkspaceMemberRecord(
                membership_id=membership.id,
                user_id=user.id,
                email=user.email,
                full_name=user.full_name,
                role=membership.role,
                is_active=membership.is_active,
                joined_at=membership.created_at,
            )
            for membership, user in rows
        ]

    async def update_member_role(
        self,
        *,
        organization_id: UUID,
        membership_id: UUID,
        role: str,
    ) -> WorkspaceMemberRecord:
        """Change an active member role without crossing tenant boundaries."""

        if role not in TENANT_ROLES:
            raise ValueError(
                "Unsupported tenant role.",
            )

        membership = await self._get_active_membership_for_update(
            organization_id=organization_id,
            membership_id=membership_id,
        )

        if membership.role == "owner" and role != "owner":
            await self._ensure_another_owner_exists(
                organization_id=organization_id,
                excluding_membership_id=membership.id,
            )

        membership.role = role

        await self.session.commit()

        return await self._member_record(
            organization_id=organization_id,
            membership_id=membership.id,
        )

    async def remove_member(
        self,
        *,
        organization_id: UUID,
        membership_id: UUID,
    ) -> None:
        """Deactivate a membership rather than hard deleting history."""

        membership = await self._get_active_membership_for_update(
            organization_id=organization_id,
            membership_id=membership_id,
        )

        if membership.role == "owner":
            await self._ensure_another_owner_exists(
                organization_id=organization_id,
                excluding_membership_id=membership.id,
            )

        membership.is_active = False

        await self.session.commit()

    async def _get_active_membership_for_update(
        self,
        *,
        organization_id: UUID,
        membership_id: UUID,
    ) -> OrganizationMembership:
        """Lock one membership only when it belongs to the current tenant."""

        membership = await self.session.scalar(
            select(
                OrganizationMembership,
            )
            .where(
                OrganizationMembership.id == membership_id,
                OrganizationMembership.organization_id == organization_id,
                OrganizationMembership.is_active.is_(
                    True,
                ),
            )
            .with_for_update()
        )

        if membership is None:
            raise WorkspaceMemberNotFoundError(
                "Workspace member was not found.",
            )

        return membership

    async def _ensure_another_owner_exists(
        self,
        *,
        organization_id: UUID,
        excluding_membership_id: UUID,
    ) -> None:
        """Guarantee every active organization retains at least one owner."""

        owner_count = await self.session.scalar(
            select(
                func.count(),
            )
            .select_from(
                OrganizationMembership,
            )
            .where(
                OrganizationMembership.organization_id == organization_id,
                OrganizationMembership.is_active.is_(
                    True,
                ),
                OrganizationMembership.role == "owner",
                OrganizationMembership.id != excluding_membership_id,
            )
        )

        if owner_count is None or owner_count < 1:
            raise LastWorkspaceOwnerError(
                "The organization must retain at least one active owner.",
            )

    async def _member_record(
        self,
        *,
        organization_id: UUID,
        membership_id: UUID,
    ) -> WorkspaceMemberRecord:
        """Read one tenant-scoped membership after a successful update."""

        row = (
            await self.session.execute(
                select(
                    OrganizationMembership,
                    User,
                )
                .join(
                    User,
                    User.id == OrganizationMembership.user_id,
                )
                .where(
                    OrganizationMembership.id == membership_id,
                    OrganizationMembership.organization_id == organization_id,
                    OrganizationMembership.is_active.is_(
                        True,
                    ),
                )
            )
        ).one_or_none()

        if row is None:
            raise WorkspaceMemberNotFoundError(
                "Workspace member was not found.",
            )

        membership, user = row

        return WorkspaceMemberRecord(
            membership_id=membership.id,
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=membership.role,
            is_active=membership.is_active,
            joined_at=membership.created_at,
        )

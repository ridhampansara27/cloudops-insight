"""Permanent CloudOps user-account deletion lifecycle."""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.models.budget import Budget
from app.models.cloud_account import CloudAccount
from app.models.organization import Organization, OrganizationMembership
from app.models.user import User


class InvalidAccountDeletionPasswordError(RuntimeError):
    """Raised when destructive re-authentication fails."""


class AccountDeletionLastOwnerError(RuntimeError):
    """Raised when deletion would leave a shared workspace ownerless."""


class AccountDeletionCloudIntegrationsRemainError(RuntimeError):
    """Raised when a personal workspace still owns cloud integrations."""


@dataclass(
    frozen=True,
)
class AccountDeletionResult:
    """Summarize successfully completed account deletion."""

    personal_workspaces_deleted: int

    shared_workspaces_left: int


class AccountDeletionService:
    """Delete one CloudOps identity without destroying shared tenant data."""

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    async def delete_account(
        self,
        *,
        user_id: UUID,
        current_password: str,
    ) -> AccountDeletionResult:
        """Delete one authenticated identity after tenant-safety checks."""

        # Lock the identity so concurrent account-security operations cannot
        # mutate it while destructive authorization is being evaluated.
        user = await self.session.scalar(
            select(
                User,
            )
            .where(
                User.id == user_id,
            )
            .with_for_update()
        )

        if user is None:
            await self.session.rollback()

            raise InvalidAccountDeletionPasswordError(
                "User identity is unavailable.",
            )

        # Re-authenticate immediately before the destructive action.
        if not verify_password(
            current_password,
            user.password_hash,
        ):
            await self.session.rollback()

            raise InvalidAccountDeletionPasswordError(
                "Current password is incorrect.",
            )

        # Load every membership, not merely the currently selected tenant.
        # Account deletion affects the global CloudOps identity and therefore
        # must be safe across every workspace that identity belongs to.
        user_memberships = list(
            (
                await self.session.scalars(
                    select(
                        OrganizationMembership,
                    )
                    .where(
                        OrganizationMembership.user_id == user.id,
                    )
                    .order_by(
                        OrganizationMembership.organization_id,
                        OrganizationMembership.id,
                    )
                    .with_for_update()
                )
            ).all()
        )

        personal_organization_ids: list[UUID] = []

        shared_workspaces_left = 0

        for user_membership in user_memberships:
            organization = await self.session.scalar(
                select(
                    Organization,
                )
                .where(
                    Organization.id == user_membership.organization_id,
                )
                .with_for_update()
            )

            if organization is None:
                await self.session.rollback()

                raise RuntimeError(
                    "Workspace referenced by membership is unavailable.",
                )

            # Lock every membership belonging to this organization. This
            # serializes deletion against concurrent role/member operations.
            organization_memberships = list(
                (
                    await self.session.scalars(
                        select(
                            OrganizationMembership,
                        )
                        .where(
                            OrganizationMembership.organization_id == organization.id,
                        )
                        .order_by(
                            OrganizationMembership.id,
                        )
                        .with_for_update()
                    )
                ).all()
            )

            # A workspace is considered personal only when this identity is
            # literally its sole membership. Inactive historical members make
            # it a shared workspace so their tenant history is not destroyed.
            if (
                len(
                    organization_memberships,
                )
                == 1
                and organization_memberships[0].user_id == user.id
            ):
                personal_organization_ids.append(
                    organization.id,
                )

                continue

            shared_workspaces_left += 1

            # Non-owner members can leave a shared workspace safely.
            if not user_membership.is_active or user_membership.role != "owner":
                continue

            # An active owner may delete their identity only if another active
            # and usable owner remains in the shared workspace.
            another_active_owner = await self.session.scalar(
                select(
                    OrganizationMembership.id,
                )
                .join(
                    User,
                    User.id == OrganizationMembership.user_id,
                )
                .where(
                    OrganizationMembership.organization_id == organization.id,
                    OrganizationMembership.id != user_membership.id,
                    OrganizationMembership.is_active.is_(
                        True,
                    ),
                    OrganizationMembership.role == "owner",
                    User.is_active.is_(
                        True,
                    ),
                )
                .limit(
                    1,
                )
            )

            if another_active_owner is None:
                await self.session.rollback()

                raise AccountDeletionLastOwnerError(
                    "Transfer workspace ownership before deleting the account.",
                )

        if personal_organization_ids:
            # Keep integration removal as an explicit, independently audited
            # lifecycle action. Account deletion must never silently purge an
            # AWS integration behind the customer's back.
            remaining_integration = await self.session.scalar(
                select(
                    CloudAccount.id,
                )
                .where(
                    CloudAccount.organization_id.in_(
                        personal_organization_ids,
                    ),
                )
                .limit(
                    1,
                )
            )

            if remaining_integration is not None:
                await self.session.rollback()

                raise AccountDeletionCloudIntegrationsRemainError(
                    "Remove cloud integrations before deleting the account.",
                )

            # Budgets intentionally RESTRICT organization deletion. Personal
            # workspace budgets are customer-owned data and can be removed
            # together with that personal workspace.
            await self.session.execute(
                delete(
                    Budget,
                ).where(
                    Budget.organization_id.in_(
                        personal_organization_ids,
                    ),
                )
            )

            # Memberships and invitations cascade from organizations.
            await self.session.execute(
                delete(
                    Organization,
                ).where(
                    Organization.id.in_(
                        personal_organization_ids,
                    ),
                )
            )

        # PostgreSQL now provides the remaining lifecycle semantics:
        #
        # - auth tokens / refresh sessions -> CASCADE
        # - memberships in shared workspaces -> CASCADE
        # - incident assignment -> SET NULL
        # - invitation acceptance/inviter audit -> SET NULL
        # - shared cloud-account/budget creator attribution -> SET NULL
        await self.session.delete(
            user,
        )

        await self.session.commit()

        return AccountDeletionResult(
            personal_workspaces_deleted=len(
                personal_organization_ids,
            ),
            shared_workspaces_left=shared_workspaces_left,
        )

"""Tenant-aware persistence for cloud integrations."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cloud_account import CloudAccount
from app.schemas.cloud_account import CloudAccountCreate, CloudAccountUpdate


class CloudAccountRepository:
    """Persist cloud accounts while exposing tenant-safe read operations."""

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    async def list_for_organization(
        self,
        organization_id: UUID,
    ) -> list[CloudAccount]:
        """Return only cloud accounts owned by one organization."""

        statement = (
            select(
                CloudAccount,
            )
            .where(
                CloudAccount.organization_id == organization_id,
            )
            .order_by(
                CloudAccount.created_at.desc(),
            )
        )

        result = await self.session.execute(
            statement,
        )

        return list(
            result.scalars().all(),
        )

    async def get_by_id_for_organization(
        self,
        *,
        account_id: UUID,
        organization_id: UUID,
    ) -> CloudAccount | None:
        """Return one tenant-owned account without leaking other tenants."""

        statement = select(
            CloudAccount,
        ).where(
            CloudAccount.id == account_id,
            CloudAccount.organization_id == organization_id,
        )

        result = await self.session.execute(
            statement,
        )

        return result.scalar_one_or_none()

    async def get_by_external_id(
        self,
        *,
        provider: str,
        external_account_id: str,
    ) -> CloudAccount | None:
        """Check global provider-account uniqueness.

        The database currently enforces global uniqueness for
        provider + external_account_id, so this lookup intentionally
        remains global. Customer-facing callers must not serialize
        or disclose the returned record.
        """

        statement = select(
            CloudAccount,
        ).where(
            CloudAccount.provider == provider,
            CloudAccount.external_account_id == external_account_id,
        )

        result = await self.session.execute(
            statement,
        )

        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        payload: CloudAccountCreate,
        created_by_id: UUID,
        organization_id: UUID,
    ) -> CloudAccount:
        """Create one cloud integration inside the selected organization."""

        account = CloudAccount(
            organization_id=organization_id,
            provider=payload.provider.lower(),
            name=payload.name,
            external_account_id=payload.external_account_id,
            role_arn=payload.role_arn,
            external_id=payload.external_id,
            enabled_regions=payload.enabled_regions,
            status="pending",
            created_by_id=created_by_id,
        )

        self.session.add(
            account,
        )

        await self.session.commit()

        await self.session.refresh(
            account,
        )

        return account

    async def update(
        self,
        *,
        account: CloudAccount,
        payload: CloudAccountUpdate,
    ) -> CloudAccount:
        """Update an account already proven to belong to the tenant."""

        changes = payload.model_dump(
            exclude_unset=True,
        )

        for field_name, value in changes.items():
            setattr(
                account,
                field_name,
                value,
            )

        await self.session.commit()

        await self.session.refresh(
            account,
        )

        return account

    async def delete(
        self,
        account: CloudAccount,
    ) -> None:
        """Delete an account already proven to belong to the tenant."""

        await self.session.delete(
            account,
        )

        await self.session.commit()

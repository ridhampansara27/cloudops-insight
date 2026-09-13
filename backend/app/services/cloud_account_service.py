"""Business logic for tenant-owned cloud account management."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cloud_account import CloudAccount
from app.repositories.cloud_account_repository import CloudAccountRepository
from app.schemas.cloud_account import CloudAccountCreate, CloudAccountUpdate
from app.services.aws_account_validator import (
    AWSAccountValidationError,
    validate_aws_account_configuration,
)


class CloudAccountService:
    """Coordinate tenant-aware cloud-account business rules."""

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session
        self.repository = CloudAccountRepository(
            session,
        )

    async def create(
        self,
        *,
        payload: CloudAccountCreate,
        user_id: UUID,
        organization_id: UUID,
    ) -> CloudAccount:
        """Create a cloud account inside one organization."""

        existing = await self.repository.get_by_external_id(
            provider=payload.provider.lower(),
            external_account_id=payload.external_account_id,
        )

        if existing is not None:
            # Keep this response generic so account ownership is not leaked.
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cloud account is already registered or unavailable.",
            )

        try:
            validate_aws_account_configuration(
                payload.external_account_id,
                payload.role_arn,
            )

        except AWSAccountValidationError as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(
                    error,
                ),
            ) from error

        return await self.repository.create(
            payload=payload,
            created_by_id=user_id,
            organization_id=organization_id,
        )

    async def list_for_organization(
        self,
        organization_id: UUID,
    ) -> list[CloudAccount]:
        """Return only accounts owned by one organization."""

        return await self.repository.list_for_organization(
            organization_id,
        )

    async def get_for_organization(
        self,
        *,
        account_id: UUID,
        organization_id: UUID,
    ) -> CloudAccount:
        """Return one tenant-owned account or deliberately return 404."""

        account = await self.repository.get_by_id_for_organization(
            account_id=account_id,
            organization_id=organization_id,
        )

        if account is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cloud account not found.",
            )

        return account

    async def update(
        self,
        *,
        account_id: UUID,
        organization_id: UUID,
        payload: CloudAccountUpdate,
    ) -> CloudAccount:
        """Update only a cloud account belonging to this organization."""

        account = await self.get_for_organization(
            account_id=account_id,
            organization_id=organization_id,
        )

        return await self.repository.update(
            account=account,
            payload=payload,
        )

    async def delete(
        self,
        *,
        account_id: UUID,
        organization_id: UUID,
    ) -> None:
        """Delete only a cloud account belonging to this organization."""

        account = await self.get_for_organization(
            account_id=account_id,
            organization_id=organization_id,
        )

        await self.repository.delete(
            account,
        )

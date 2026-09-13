"""Business logic for tenant-owned cloud account onboarding."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cloud_account import CloudAccount
from app.repositories.cloud_account_repository import CloudAccountRepository
from app.schemas.cloud_account import CloudAccountCreate, CloudAccountUpdate
from app.services.aws_account_validator import (
    AWSAccountValidationError,
    validate_aws_account_configuration,
    validate_aws_account_id,
)
from app.services.aws_onboarding_service import generate_external_id


class CloudAccountService:
    """Coordinate secure tenant-aware AWS account onboarding."""

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
        """Create phase-one onboarding state with a new ExternalId."""

        if payload.provider.lower() != "aws":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only AWS accounts are currently supported.",
            )

        try:
            validate_aws_account_id(
                payload.external_account_id,
            )

        except AWSAccountValidationError as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(
                    error,
                ),
            ) from error

        existing = await self.repository.get_by_external_id(
            provider=payload.provider.lower(),
            external_account_id=payload.external_account_id,
        )

        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cloud account is already registered or unavailable.",
            )

        external_id = generate_external_id()

        return await self.repository.create(
            payload=payload,
            created_by_id=user_id,
            organization_id=organization_id,
            external_id=external_id,
        )

    async def list_for_organization(
        self,
        organization_id: UUID,
    ) -> list[CloudAccount]:
        return await self.repository.list_for_organization(
            organization_id,
        )

    async def get_for_organization(
        self,
        *,
        account_id: UUID,
        organization_id: UUID,
    ) -> CloudAccount:
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
        """Safely update customer-controlled integration settings."""

        account = await self.get_for_organization(
            account_id=account_id,
            organization_id=organization_id,
        )

        changes = payload.model_dump(
            exclude_unset=True,
        )

        if "role_arn" in changes:
            role_arn = changes["role_arn"]

            if role_arn is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="AWS IAM role ARN cannot be cleared.",
                )

            try:
                validate_aws_account_configuration(
                    account.external_account_id,
                    role_arn,
                )

            except AWSAccountValidationError as error:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=str(
                        error,
                    ),
                ) from error

            # Any role change invalidates the prior trust validation.
            account.status = "pending"
            account.last_validated_at = None
            account.last_validation_error = None
            account.sync_status = "idle"
            account.last_sync_error = None

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
        account = await self.get_for_organization(
            account_id=account_id,
            organization_id=organization_id,
        )

        await self.repository.delete(
            account,
        )

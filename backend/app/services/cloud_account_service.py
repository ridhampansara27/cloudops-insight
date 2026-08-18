"""Business logic for cloud account management."""

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
    """Coordinates cloud-account business rules."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = CloudAccountRepository(session)

    async def create(
        self,
        payload: CloudAccountCreate,
        user_id: UUID,
    ) -> CloudAccount:
        """Create a cloud account owned by the authenticated user."""

        existing = await self.repository.get_by_external_account_id(
            payload.external_account_id
        )

        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cloud account already registered",
            )

        # Validate that the AWS account ID and IAM role ARN are structurally valid
        # and that the account ID inside the ARN matches the supplied account ID.
        #
        # This performs local validation only.
        # We are NOT calling AWS STS yet.
        try:
            validate_aws_account_configuration(
                payload.external_account_id,
                payload.role_arn,
            )
        except AWSAccountValidationError as exc:
            # Return HTTP 422 because the submitted cloud-account configuration
            # is syntactically valid JSON but semantically invalid.
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc

        cloud_account = CloudAccount(
            provider=payload.provider,
            name=payload.name,
            external_account_id=payload.external_account_id,
            role_arn=payload.role_arn,
            external_id=payload.external_id,
            enabled_regions=payload.enabled_regions,
            # Initial state until AWS validation/synchronization runs.
            status="pending",
            created_by_id=user_id,
        )

        await self.repository.create(cloud_account)

        # Commit the transaction only after repository operations succeed.
        await self.session.commit()

        return cloud_account

    async def list_for_user(self, user_id: UUID) -> list[CloudAccount]:
        """List cloud accounts owned by the authenticated user."""

        return await self.repository.list_for_user(user_id)

    async def get_for_user(
        self,
        account_id: UUID,
        user_id: UUID,
    ) -> CloudAccount:
        """Return one owned account or raise 404."""

        cloud_account = await self.repository.get_for_user(
            account_id,
            user_id,
        )

        if cloud_account is None:
            # 404 prevents leaking existence of another user's account.
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cloud account not found",
            )

        return cloud_account

    async def update(
        self,
        account_id: UUID,
        user_id: UUID,
        payload: CloudAccountUpdate,
    ) -> CloudAccount:
        """Partially update a cloud account."""

        cloud_account = await self.get_for_user(account_id, user_id)

        # exclude_unset ensures PATCH changes only supplied fields.
        update_data = payload.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(cloud_account, field, value)

        await self.session.commit()
        await self.session.refresh(cloud_account)

        return cloud_account

    async def delete(
        self,
        account_id: UUID,
        user_id: UUID,
    ) -> None:
        """Delete one owned cloud account."""

        cloud_account = await self.get_for_user(account_id, user_id)

        await self.repository.delete(cloud_account)
        await self.session.commit()

"""Business logic for tenant-owned cloud integrations."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.budget import Budget
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
    """Coordinate tenant-safe cloud integration lifecycle operations."""

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

        return await self.repository.create(
            payload=payload,
            created_by_id=user_id,
            organization_id=organization_id,
            external_id=generate_external_id(),
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
        """Update configuration while invalidating obsolete queued work."""

        account = await self.get_for_organization(
            account_id=account_id,
            organization_id=organization_id,
        )

        changes = payload.model_dump(
            exclude_unset=True,
        )

        role_changed = False
        regions_changed = False

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

            role_changed = role_arn != account.role_arn

            # Supplying the role explicitly is also the safe
            # reconnect path for a disconnected account.
            account.status = "pending"
            account.disconnected_at = None
            account.last_validated_at = None
            account.last_validation_error = None
            account.sync_status = "idle"
            account.sync_started_at = None
            account.last_sync_error = None

        if "enabled_regions" in changes:
            new_regions = changes["enabled_regions"]

            regions_changed = new_regions != account.enabled_regions

        # Any AWS-access configuration change creates a new generation.
        if role_changed or regions_changed:
            account.connection_revision += 1

        return await self.repository.update(
            account=account,
            payload=payload,
        )

    async def disconnect(
        self,
        *,
        account_id: UUID,
        organization_id: UUID,
    ) -> tuple[
        CloudAccount,
        int,
    ]:
        """Disconnect CloudOps access without deleting cloud or history."""

        account = await self.get_for_organization(
            account_id=account_id,
            organization_id=organization_id,
        )

        # Idempotent disconnect.
        if account.status == "disconnected":
            if account.disconnected_at is None:
                account.disconnected_at = datetime.now(
                    UTC,
                )

                await self.session.commit()

                await self.session.refresh(
                    account,
                )

            return (
                account,
                0,
            )

        # Phase one is the security boundary:
        # increment revision and stop eligibility before any cleanup.
        if account.status != "disconnecting":
            account.status = "disconnecting"
            account.connection_revision += 1

            account.sync_status = "idle"
            account.sync_started_at = None
            account.last_sync_error = None

            await self.session.commit()

            await self.session.refresh(
                account,
            )

        # Account-scoped budgets no longer have a live integration.
        budget_result = await self.session.execute(
            update(
                Budget,
            )
            .where(
                Budget.organization_id == organization_id,
                Budget.scope_type == "account",
                Budget.scope_value
                == str(
                    account.id,
                ),
                Budget.is_active.is_(
                    True,
                ),
            )
            .values(
                is_active=False,
            ),
        )

        deactivated = budget_result.rowcount or 0

        # Historical resources, costs, metrics, incidents and
        # recommendations intentionally remain untouched.
        account.status = "disconnected"
        account.disconnected_at = datetime.now(
            UTC,
        )

        await self.session.commit()

        await self.session.refresh(
            account,
        )

        return (
            account,
            deactivated,
        )

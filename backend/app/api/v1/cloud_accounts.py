from datetime import UTC, datetime
from uuid import UUID

from anyio import to_thread
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.api.dependencies import (
    CurrentTenant,
    DatabaseSession,
    TenantOwnerOrAdmin,
)
from app.core.config import settings
from app.providers.aws.connection import (
    AwsConnectionError,
    AwsConnectionService,
)
from app.providers.aws.types import AwsAccountConfig
from app.schemas.cloud_account import (
    CloudAccountCreate,
    CloudAccountOnboardingRead,
    CloudAccountRead,
    CloudAccountUpdate,
    CloudAccountValidationResponse,
)
from app.schemas.resource_sync import (
    MonitoringSyncResponse,
    ResourceSyncQueuedResponse,
    ResourceSyncStatusResponse,
)
from app.services.aws_account_validator import (
    AWSAccountValidationError,
    validate_aws_account_configuration,
)
from app.services.aws_onboarding_service import (
    SUGGESTED_ROLE_NAME,
    build_assume_role_trust_policy,
)
from app.services.cloud_account_service import CloudAccountService
from app.services.cost_sync_service import CostSyncService
from app.services.monitoring_sync_service import MonitoringSyncService
from app.tasks.aws_sync import sync_aws_account_task


class CostSyncResponse(BaseModel):
    account_id: UUID
    records_imported: int


router = APIRouter()


def _build_onboarding_response(
    account,
) -> CloudAccountOnboardingRead:
    """Return ExternalId only through the owner/admin onboarding surface."""

    if not account.external_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This legacy integration does not have a CloudOps "
                "ExternalId and requires migration."
            ),
        )

    platform_principal_arn = (
        settings.aws_platform_principal_arn.strip()
        if settings.aws_platform_principal_arn
        else None
    )

    trust_policy = (
        build_assume_role_trust_policy(
            platform_principal_arn=platform_principal_arn,
            external_id=account.external_id,
        )
        if platform_principal_arn
        else None
    )

    public_account = CloudAccountRead.model_validate(
        account,
    )

    return CloudAccountOnboardingRead(
        **public_account.model_dump(),
        external_id=account.external_id,
        platform_principal_arn=platform_principal_arn,
        suggested_role_name=SUGGESTED_ROLE_NAME,
        trust_policy=trust_policy,
        onboarding_ready=bool(
            platform_principal_arn,
        ),
    )


@router.get(
    "",
    response_model=list[CloudAccountRead],
)
async def list_cloud_accounts(
    tenant: CurrentTenant,
    session: DatabaseSession,
) -> list[CloudAccountRead]:
    accounts = await CloudAccountService(
        session,
    ).list_for_organization(
        tenant.organization_id,
    )

    return [
        CloudAccountRead.model_validate(
            account,
        )
        for account in accounts
    ]


@router.post(
    "",
    response_model=CloudAccountOnboardingRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_cloud_account(
    payload: CloudAccountCreate,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> CloudAccountOnboardingRead:
    """Begin secure AWS onboarding and generate the ExternalId."""

    account = await CloudAccountService(
        session,
    ).create(
        payload=payload,
        user_id=tenant.user_id,
        organization_id=tenant.organization_id,
    )

    return _build_onboarding_response(
        account,
    )


@router.get(
    "/{account_id}/onboarding",
    response_model=CloudAccountOnboardingRead,
)
async def get_cloud_account_onboarding(
    account_id: UUID,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> CloudAccountOnboardingRead:
    """Reload the IAM trust material for a pending integration."""

    account = await CloudAccountService(
        session,
    ).get_for_organization(
        account_id=account_id,
        organization_id=tenant.organization_id,
    )

    return _build_onboarding_response(
        account,
    )


@router.get(
    "/{account_id}",
    response_model=CloudAccountRead,
)
async def get_cloud_account(
    account_id: UUID,
    tenant: CurrentTenant,
    session: DatabaseSession,
) -> CloudAccountRead:
    account = await CloudAccountService(
        session,
    ).get_for_organization(
        account_id=account_id,
        organization_id=tenant.organization_id,
    )

    return CloudAccountRead.model_validate(
        account,
    )


@router.get(
    "/{account_id}/sync-status",
    response_model=ResourceSyncStatusResponse,
)
async def get_cloud_account_sync_status(
    account_id: UUID,
    tenant: CurrentTenant,
    session: DatabaseSession,
) -> ResourceSyncStatusResponse:
    account = await CloudAccountService(
        session,
    ).get_for_organization(
        account_id=account_id,
        organization_id=tenant.organization_id,
    )

    return ResourceSyncStatusResponse(
        account_id=account.id,
        sync_status=account.sync_status,
        sync_started_at=account.sync_started_at,
        last_synced_at=account.last_synced_at,
        last_sync_error=account.last_sync_error,
    )


@router.patch(
    "/{account_id}",
    response_model=CloudAccountRead,
)
async def update_cloud_account(
    account_id: UUID,
    payload: CloudAccountUpdate,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> CloudAccountRead:
    """Submit or change the customer IAM role."""

    account = await CloudAccountService(
        session,
    ).update(
        account_id=account_id,
        organization_id=tenant.organization_id,
        payload=payload,
    )

    return CloudAccountRead.model_validate(
        account,
    )


@router.post(
    "/{account_id}/validate",
    response_model=CloudAccountValidationResponse,
)
async def validate_cloud_account(
    account_id: UUID,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> CloudAccountValidationResponse:
    """Validate the configured AssumeRole + ExternalId with AWS STS."""

    account = await CloudAccountService(
        session,
    ).get_for_organization(
        account_id=account_id,
        organization_id=tenant.organization_id,
    )

    if not account.role_arn or not account.external_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Complete the cross-account IAM role setup before "
                "validating this AWS integration."
            ),
        )

    try:
        validate_aws_account_configuration(
            account.external_account_id,
            account.role_arn,
        )

    except AWSAccountValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(
                error,
            ),
        ) from error

    aws_account = AwsAccountConfig(
        account_id=account.external_account_id,
        role_arn=account.role_arn,
        external_id=account.external_id,
        enabled_regions=tuple(
            account.enabled_regions,
        ),
    )

    connection_service = AwsConnectionService()

    try:
        identity = await to_thread.run_sync(
            connection_service.validate_account,
            aws_account,
        )

    except AwsConnectionError as error:
        account.last_validated_at = datetime.now(
            UTC,
        )
        account.status = "error"
        account.last_validation_error = str(
            error,
        )

        await session.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(
                error,
            ),
        ) from error

    account.last_validated_at = datetime.now(
        UTC,
    )
    account.status = "connected"
    account.last_validation_error = None

    await session.commit()

    return CloudAccountValidationResponse(
        connected=True,
        account_id=identity.account_id,
        caller_arn=identity.arn,
        message="AWS account connection validated successfully.",
    )


@router.post(
    "/{account_id}/sync",
    response_model=ResourceSyncQueuedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def sync_cloud_account(
    account_id: UUID,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> ResourceSyncQueuedResponse:
    account = await CloudAccountService(
        session,
    ).get_for_organization(
        account_id=account_id,
        organization_id=tenant.organization_id,
    )

    if account.status != "connected":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Validate the AWS account before synchronization.",
        )

    if account.sync_status in {
        "queued",
        "running",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="AWS synchronization is already in progress.",
        )

    account.sync_status = "queued"
    account.last_sync_error = None

    await session.commit()

    try:
        task = sync_aws_account_task.delay(
            str(
                account_id,
            ),
        )

    except Exception as error:
        account.sync_status = "failed"
        account.last_sync_error = "Unable to queue resource synchronization."

        await session.commit()

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Background synchronization service is unavailable.",
        ) from error

    return ResourceSyncQueuedResponse(
        account_id=account_id,
        task_id=task.id,
        status="queued",
    )


@router.post(
    "/{account_id}/metrics/sync",
    response_model=MonitoringSyncResponse,
)
async def sync_cloud_account_metrics(
    account_id: UUID,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> MonitoringSyncResponse:
    account = await CloudAccountService(
        session,
    ).get_for_organization(
        account_id=account_id,
        organization_id=tenant.organization_id,
    )

    if account.status != "connected":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="AWS account is not connected.",
        )

    samples = await MonitoringSyncService(
        session,
    ).sync_account(
        account_id,
    )

    return MonitoringSyncResponse(
        account_id=account_id,
        samples_upserted=samples,
    )


@router.post(
    "/{account_id}/costs/sync",
    response_model=CostSyncResponse,
)
async def sync_cloud_account_costs(
    account_id: UUID,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> CostSyncResponse:
    account = await CloudAccountService(
        session,
    ).get_for_organization(
        account_id=account_id,
        organization_id=tenant.organization_id,
    )

    if account.status != "connected":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="AWS account is not connected.",
        )

    imported = await CostSyncService(
        session,
    ).sync_account(
        account_id,
    )

    return CostSyncResponse(
        account_id=account_id,
        records_imported=imported,
    )


@router.delete(
    "/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_cloud_account(
    account_id: UUID,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> None:
    """Temporary compatibility endpoint; safe disconnect replaces this next."""

    await CloudAccountService(
        session,
    ).delete(
        account_id=account_id,
        organization_id=tenant.organization_id,
    )

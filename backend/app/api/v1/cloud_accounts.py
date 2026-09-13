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
from app.providers.aws.connection import (
    AwsConnectionError,
    AwsConnectionService,
)
from app.providers.aws.types import AwsAccountConfig
from app.repositories.cloud_account_repository import CloudAccountRepository
from app.schemas.cloud_account import (
    CloudAccountCreate,
    CloudAccountRead,
    CloudAccountUpdate,
    CloudAccountValidationResponse,
)
from app.schemas.resource_sync import (
    MonitoringSyncResponse,
    ResourceSyncQueuedResponse,
    ResourceSyncStatusResponse,
)
from app.services.cost_sync_service import CostSyncService
from app.services.monitoring_sync_service import MonitoringSyncService
from app.tasks.aws_sync import sync_aws_account_task


class CostSyncResponse(BaseModel):
    account_id: UUID
    records_imported: int


router = APIRouter()


async def _get_tenant_account(
    *,
    account_id: UUID,
    organization_id: UUID,
    session: DatabaseSession,
):
    """Load an account without revealing records owned by another tenant."""

    account = await CloudAccountRepository(
        session,
    ).get_by_id_for_organization(
        account_id=account_id,
        organization_id=organization_id,
    )

    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cloud account not found.",
        )

    return account


@router.get(
    "",
    response_model=list[CloudAccountRead],
)
async def list_cloud_accounts(
    tenant: CurrentTenant,
    session: DatabaseSession,
) -> list[CloudAccountRead]:
    accounts = await CloudAccountRepository(
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


@router.get(
    "/{account_id}",
    response_model=CloudAccountRead,
)
async def get_cloud_account(
    account_id: UUID,
    tenant: CurrentTenant,
    session: DatabaseSession,
) -> CloudAccountRead:
    account = await _get_tenant_account(
        account_id=account_id,
        organization_id=tenant.organization_id,
        session=session,
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
    account = await _get_tenant_account(
        account_id=account_id,
        organization_id=tenant.organization_id,
        session=session,
    )

    return ResourceSyncStatusResponse(
        account_id=account.id,
        sync_status=account.sync_status,
        sync_started_at=account.sync_started_at,
        last_synced_at=account.last_synced_at,
        last_sync_error=account.last_sync_error,
    )


@router.post(
    "",
    response_model=CloudAccountRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_cloud_account(
    payload: CloudAccountCreate,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> CloudAccountRead:
    if payload.provider.lower() != "aws":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only AWS accounts are currently supported.",
        )

    repository = CloudAccountRepository(
        session,
    )

    existing = await repository.get_by_external_id(
        provider=payload.provider.lower(),
        external_account_id=payload.external_account_id,
    )

    if existing is not None:
        # Do not reveal which organization owns the provider account.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cloud account is already registered or unavailable.",
        )

    account = await repository.create(
        payload=payload,
        created_by_id=tenant.user_id,
        organization_id=tenant.organization_id,
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
    account = await _get_tenant_account(
        account_id=account_id,
        organization_id=tenant.organization_id,
        session=session,
    )

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
    account = await _get_tenant_account(
        account_id=account_id,
        organization_id=tenant.organization_id,
        session=session,
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
    # Security boundary: prove tenant ownership before calling a service
    # whose internal API currently accepts only account_id.
    await _get_tenant_account(
        account_id=account_id,
        organization_id=tenant.organization_id,
        session=session,
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
    # Security boundary: never allow a caller to trigger another
    # organization's Cost Explorer synchronization by UUID.
    await _get_tenant_account(
        account_id=account_id,
        organization_id=tenant.organization_id,
        session=session,
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
    repository = CloudAccountRepository(
        session,
    )

    account = await repository.get_by_id_for_organization(
        account_id=account_id,
        organization_id=tenant.organization_id,
    )

    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cloud account not found.",
        )

    account = await repository.update(
        account=account,
        payload=payload,
    )

    return CloudAccountRead.model_validate(
        account,
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
    """Delete one tenant-owned integration.

    This endpoint remains temporarily for compatibility.
    The dedicated safe Disconnect lifecycle replaces it in a later stage.
    """

    repository = CloudAccountRepository(
        session,
    )

    account = await repository.get_by_id_for_organization(
        account_id=account_id,
        organization_id=tenant.organization_id,
    )

    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cloud account not found.",
        )

    await repository.delete(
        account,
    )

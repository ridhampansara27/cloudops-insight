from datetime import UTC, datetime
from uuid import UUID

from anyio import to_thread
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError

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
    CloudAccountDisconnectResponse,
    CloudAccountOnboardingRead,
    CloudAccountRead,
    CloudAccountRemovalRequest,
    CloudAccountRemovalResponse,
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
from app.services.cloud_account_connection_guard import (
    StaleCloudAccountConnectionError,
    require_connection_revision,
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
    """Validate STS without allowing stale validation to reconnect access."""

    account = await CloudAccountService(
        session,
    ).get_for_organization(
        account_id=account_id,
        organization_id=tenant.organization_id,
        for_update=True,
    )

    if account.status == "removing":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="AWS integration removal is already in progress.",
        )

    if account.status in {
        "disconnecting",
        "disconnected",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Resume AWS onboarding before validating a disconnected integration."
            ),
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

    expected_revision = account.connection_revision

    # Make validation mutually exclusive with connected synchronization.
    account.status = "validating"
    account.last_validation_error = None

    await session.commit()

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
        await session.rollback()

        try:
            account = await require_connection_revision(
                session,
                account_id=account_id,
                expected_revision=expected_revision,
                required_status="validating",
                for_update=True,
            )

        except StaleCloudAccountConnectionError as stale_error:
            await session.rollback()

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=("AWS integration changed while validation was running."),
            ) from stale_error

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

    try:
        account = await require_connection_revision(
            session,
            account_id=account_id,
            expected_revision=expected_revision,
            required_status="validating",
            for_update=True,
        )

    except StaleCloudAccountConnectionError as error:
        await session.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=("AWS integration changed while validation was running."),
        ) from error

    account.last_validated_at = datetime.now(
        UTC,
    )
    account.status = "connected"
    account.last_validation_error = None
    account.disconnected_at = None

    try:
        await session.commit()

    except IntegrityError as error:
        # PostgreSQL/asyncpg keeps the provider exception as the cause of
        # SQLAlchemy's adapted DBAPI error.
        original_error = getattr(
            error.orig,
            "__cause__",
            None,
        )

        constraint_name = getattr(
            original_error,
            "constraint_name",
            None,
        )

        # Never disguise unrelated integrity failures as ownership conflicts.
        if constraint_name != (
            "uq_cloud_accounts_connected_provider_external_account_id"
        ):
            raise

        # Another organization completed validation for the same
        # provider-native account while this AWS validation was running.
        await session.rollback()

        account = await CloudAccountService(
            session,
        ).get_for_organization(
            account_id=account_id,
            organization_id=tenant.organization_id,
        )

        account.last_validated_at = datetime.now(
            UTC,
        )
        account.status = "error"
        account.last_validation_error = (
            "AWS account is already connected or unavailable."
        )

        await session.commit()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="AWS account is already connected or unavailable.",
        ) from error

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

    queued_revision = account.connection_revision

    account.sync_status = "queued"
    account.last_sync_error = None

    await session.commit()

    try:
        task = sync_aws_account_task.delay(
            str(
                account_id,
            ),
            queued_revision,
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
        account.connection_revision,
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
        account.connection_revision,
    )

    return CostSyncResponse(
        account_id=account_id,
        records_imported=imported,
    )


@router.post(
    "/{account_id}/remove",
    response_model=CloudAccountRemovalResponse,
)
async def remove_cloud_account(
    account_id: UUID,
    payload: CloudAccountRemovalRequest,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> CloudAccountRemovalResponse:
    """Permanently remove CloudOps integration data, never AWS resources."""

    budgets_deleted = await CloudAccountService(
        session,
    ).remove(
        account_id=account_id,
        organization_id=tenant.organization_id,
    )

    return CloudAccountRemovalResponse(
        account_id=account_id,
        account_budgets_deleted=budgets_deleted,
        message=(
            "AWS integration and imported CloudOps data were permanently "
            "removed. No AWS resources were modified."
        ),
    )


@router.post(
    "/{account_id}/disconnect",
    response_model=CloudAccountDisconnectResponse,
)
async def disconnect_cloud_account(
    account_id: UUID,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> CloudAccountDisconnectResponse:
    """Safely revoke CloudOps integration activity without deleting history."""

    account, budgets_deactivated = await CloudAccountService(
        session,
    ).disconnect(
        account_id=account_id,
        organization_id=tenant.organization_id,
    )

    if account.disconnected_at is None:
        raise RuntimeError(
            "Disconnected account is missing disconnect timestamp.",
        )

    return CloudAccountDisconnectResponse(
        account_id=account.id,
        status=account.status,
        disconnected_at=account.disconnected_at,
        connection_revision=account.connection_revision,
        account_budgets_deactivated=budgets_deactivated,
        message=(
            "AWS integration disconnected. Historical CloudOps data "
            "was retained and no AWS resources were modified."
        ),
    )

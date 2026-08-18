# Import UUID typing.
# Import UTC-aware timestamps.
from datetime import (
    UTC,
    datetime,
)
from uuid import UUID

# Import AnyIO thread execution for blocking Boto3 operations.
from anyio import to_thread

# Import FastAPI routing and HTTP error helpers.
from fastapi import APIRouter, HTTPException, status

# Import Pydantic base schema.
from pydantic import BaseModel

# Import authentication/database dependencies.
from app.api.dependencies import (
    CurrentUser,
    DatabaseSession,
)

# Import the SQLAlchemy CloudAccount model so this route can load an account directly by ID.
from app.models.cloud_account import CloudAccount

# Import AWS validation service.
from app.providers.aws.connection import (
    AwsConnectionError,
    AwsConnectionService,
)

# Import normalized AWS account configuration.
from app.providers.aws.types import (
    AwsAccountConfig,
)

# Import the repository.
from app.repositories.cloud_account_repository import (
    CloudAccountRepository,
)

# Import API schemas.
# Import validation response schema.
from app.schemas.cloud_account import (
    CloudAccountCreate,
    CloudAccountRead,
    CloudAccountUpdate,
    CloudAccountValidationResponse,
)

# Import synchronization response schemas.
from app.schemas.resource_sync import (
    MonitoringSyncResponse,
    ResourceSyncQueuedResponse,
    ResourceSyncStatusResponse,
)

# Import Cost Explorer synchronization service.
from app.services.cost_sync_service import (
    CostSyncService,
)

# Import monitoring synchronization service.
from app.services.monitoring_sync_service import (
    MonitoringSyncService,
)

# Import Celery AWS synchronization task.
from app.tasks.aws_sync import (
    sync_aws_account_task,
)


# Describe a successful Cost Explorer synchronization.
class CostSyncResponse(
    BaseModel,
):
    # Return the synchronized cloud account UUID.
    account_id: UUID

    # Return the number of imported cost records.
    records_imported: int


# Create the cloud-account router.
router = APIRouter()


# List registered cloud accounts.
@router.get(
    "",
    response_model=list[CloudAccountRead],
)
async def list_cloud_accounts(
    # Require authentication.
    current_user: CurrentUser,
    # Receive the request database session.
    session: DatabaseSession,
) -> list[CloudAccountRead]:
    # Explicitly mark authentication as intentionally required.
    del current_user

    # Create the repository.
    repository = CloudAccountRepository(
        session,
    )

    # Retrieve all accounts.
    accounts = await repository.list_all()

    # Convert ORM objects into response schemas.
    return [
        CloudAccountRead.model_validate(
            account,
        )
        for account in accounts
    ]


# Retrieve one cloud account.
@router.get(
    "/{account_id}",
    response_model=CloudAccountRead,
)
async def get_cloud_account(
    # Read the account UUID from the route.
    account_id: UUID,
    # Require authentication.
    current_user: CurrentUser,
    # Receive the database session.
    session: DatabaseSession,
) -> CloudAccountRead:
    # Mark authentication as intentionally required.
    del current_user

    # Create the repository.
    repository = CloudAccountRepository(
        session,
    )

    # Retrieve the requested account.
    account = await repository.get_by_id(
        account_id,
    )

    # Return 404 when it does not exist.
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cloud account not found.",
        )

    # Serialize the ORM model.
    return CloudAccountRead.model_validate(
        account,
    )


# Return current resource-synchronization state.
@router.get(
    "/{account_id}/sync-status",
    response_model=ResourceSyncStatusResponse,
)
async def get_cloud_account_sync_status(
    # Receive cloud-account UUID.
    account_id: UUID,
    # Require authentication.
    current_user: CurrentUser,
    # Receive database session.
    session: DatabaseSession,
) -> ResourceSyncStatusResponse:
    # Require authentication.
    del current_user

    # Retrieve account.
    account = await session.get(
        CloudAccount,
        account_id,
    )

    # Reject unknown accounts.
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cloud account not found.",
        )

    # Return persisted synchronization status.
    return ResourceSyncStatusResponse(
        account_id=account.id,
        sync_status=(account.sync_status),
        sync_started_at=(account.sync_started_at),
        last_synced_at=(account.last_synced_at),
        last_sync_error=(account.last_sync_error),
    )


# Register a new cloud account.
@router.post(
    "",
    response_model=CloudAccountRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_cloud_account(
    # Read and validate the request body.
    payload: CloudAccountCreate,
    # Resolve the current authenticated user.
    current_user: CurrentUser,
    # Receive the database session.
    session: DatabaseSession,
) -> CloudAccountRead:
    # Reject providers not supported by this project yet.
    if payload.provider.lower() != "aws":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only AWS accounts are currently supported.",
        )

    # Create the repository.
    repository = CloudAccountRepository(
        session,
    )

    # Look for an existing registration.
    existing = await repository.get_by_external_id(
        provider=payload.provider.lower(),
        external_account_id=payload.external_account_id,
    )

    # Prevent duplicates.
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cloud account is already registered.",
        )

    # Create the account.
    account = await repository.create(
        payload=payload,
        created_by_id=current_user.id,
    )

    # Return the created account.
    return CloudAccountRead.model_validate(
        account,
    )


# Validate access to one configured AWS account.
@router.post(
    "/{account_id}/validate",
    response_model=CloudAccountValidationResponse,
)
async def validate_cloud_account(
    # Read the CloudOps account UUID.
    account_id: UUID,
    # Require an authenticated application user.
    current_user: CurrentUser,
    # Receive the asynchronous database session.
    session: DatabaseSession,
) -> CloudAccountValidationResponse:
    # Require authentication even though role authorization comes later.
    del current_user

    # Create the database repository.
    repository = CloudAccountRepository(
        session,
    )

    # Retrieve account configuration.
    account = await repository.get_by_id(
        account_id,
    )

    # Reject unknown CloudOps records.
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cloud account not found.",
        )

    # Create a thread-safe immutable AWS configuration snapshot.
    aws_account = AwsAccountConfig(
        # Store expected AWS account ID.
        account_id=account.external_account_id,
        # Store optional AssumeRole ARN.
        role_arn=account.role_arn,
        # Store optional ExternalId.
        external_id=account.external_id,
        # Copy discovery regions.
        enabled_regions=tuple(
            account.enabled_regions,
        ),
    )

    # Create AWS validation service.
    connection_service = AwsConnectionService()

    try:
        # Run blocking Boto3 network operations outside the async event loop.
        identity = await to_thread.run_sync(
            connection_service.validate_account,
            aws_account,
        )

    except AwsConnectionError as error:
        # Record the validation attempt time.
        account.last_validated_at = datetime.now(
            UTC,
        )

        # Mark the account as unhealthy.
        account.status = "error"

        # Store only the safe application error message.
        account.last_validation_error = str(
            error,
        )

        # Persist account state.
        await session.commit()

        # Return a useful API validation failure.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(
                error,
            ),
        ) from error

    # Record successful validation.
    account.last_validated_at = datetime.now(
        UTC,
    )

    # Mark AWS connectivity successful.
    account.status = "connected"

    # Clear any historical validation error.
    account.last_validation_error = None

    # Persist connection status.
    await session.commit()

    # Return verified AWS identity.
    return CloudAccountValidationResponse(
        # Confirm successful connection.
        connected=True,
        # Return verified account ID.
        account_id=identity.account_id,
        # Return verified caller ARN.
        caller_arn=identity.arn,
        # Explain the result.
        message="AWS account connection validated successfully.",
    )


# Queue AWS inventory synchronization.
@router.post(
    "/{account_id}/sync",
    response_model=ResourceSyncQueuedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def sync_cloud_account(
    # Receive CloudOps cloud-account UUID.
    account_id: UUID,
    # Require authentication.
    current_user: CurrentUser,
    # Receive database session.
    session: DatabaseSession,
) -> ResourceSyncQueuedResponse:
    # Require authentication.
    del current_user

    # Retrieve account.
    account = await session.get(
        CloudAccount,
        account_id,
    )

    # Reject unknown accounts.
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cloud account not found.",
        )

    # Require verified AWS connection.
    if account.status != "connected":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Validate the AWS account before synchronization.",
        )

    # Prevent obvious duplicate synchronization requests.
    if account.sync_status in {
        "queued",
        "running",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="AWS synchronization is already in progress.",
        )

    # Mark account queued before sending the Celery task.
    account.sync_status = "queued"

    # Clear previous queue errors.
    account.last_sync_error = None

    # Persist queue state.
    await session.commit()

    try:
        # Publish the synchronization task to Redis.
        task = sync_aws_account_task.delay(
            str(
                account_id,
            ),
        )

    except Exception as error:
        # Mark queue submission failure.
        account.sync_status = "failed"

        # Store a safe queue error.
        account.last_sync_error = "Unable to queue resource synchronization."

        # Persist failure.
        await session.commit()

        # Report service unavailability.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Background synchronization service is unavailable.",
        ) from error

    # Return queued task information.
    return ResourceSyncQueuedResponse(
        account_id=account_id,
        task_id=task.id,
        status="queued",
    )


# Synchronize real CloudWatch metrics for one AWS account.
@router.post(
    "/{account_id}/metrics/sync",
    response_model=MonitoringSyncResponse,
)
async def sync_cloud_account_metrics(
    # Receive cloud account UUID.
    account_id: UUID,
    # Require authenticated application user.
    current_user: CurrentUser,
    # Receive asynchronous database session.
    session: DatabaseSession,
) -> MonitoringSyncResponse:
    # Require authentication.
    del current_user

    # Run CloudWatch synchronization.
    samples = await MonitoringSyncService(
        session,
    ).sync_account(
        account_id,
    )

    # Return synchronization result.
    return MonitoringSyncResponse(
        account_id=account_id,
        samples_upserted=(samples),
    )


# Synchronize real Cost Explorer records.
@router.post(
    "/{account_id}/costs/sync",
    response_model=CostSyncResponse,
)
async def sync_cloud_account_costs(
    # Receive cloud account UUID.
    account_id: UUID,
    # Require authenticated application user.
    current_user: CurrentUser,
    # Receive asynchronous database session.
    session: DatabaseSession,
) -> CostSyncResponse:
    # Require authentication.
    del current_user

    # Synchronize Cost Explorer.
    imported = await CostSyncService(
        session,
    ).sync_account(
        account_id,
    )

    # Return synchronization statistics.
    return CostSyncResponse(
        account_id=account_id,
        records_imported=imported,
    )


# Modify a cloud account.
@router.patch(
    "/{account_id}",
    response_model=CloudAccountRead,
)
async def update_cloud_account(
    # Read the account identifier.
    account_id: UUID,
    # Read fields to update.
    payload: CloudAccountUpdate,
    # Require authentication.
    current_user: CurrentUser,
    # Receive the database session.
    session: DatabaseSession,
) -> CloudAccountRead:
    # Mark authentication as intentionally required.
    del current_user

    # Create the repository.
    repository = CloudAccountRepository(
        session,
    )

    # Retrieve the account.
    account = await repository.get_by_id(
        account_id,
    )

    # Reject missing accounts.
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cloud account not found.",
        )

    # Apply the changes.
    updated_account = await repository.update(
        account=account,
        payload=payload,
    )

    # Return the updated account.
    return CloudAccountRead.model_validate(
        updated_account,
    )


# Delete one cloud account.
@router.delete(
    "/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_cloud_account(
    # Read the account UUID.
    account_id: UUID,
    # Require authentication.
    current_user: CurrentUser,
    # Receive the database session.
    session: DatabaseSession,
) -> None:
    # Mark authentication as intentionally required.
    del current_user

    # Create the repository.
    repository = CloudAccountRepository(
        session,
    )

    # Retrieve the account.
    account = await repository.get_by_id(
        account_id,
    )

    # Reject missing accounts.
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cloud account not found.",
        )

    # Delete the account and dependent inventory.
    await repository.delete(
        account,
    )

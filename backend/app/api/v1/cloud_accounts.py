# Import UUID typing.
from uuid import UUID

# Import FastAPI routing and HTTP error helpers.
from fastapi import APIRouter, HTTPException, status

# Import authentication/database dependencies.
from app.api.dependencies import (
    CurrentUser,
    DatabaseSession,
)

# Import the repository.
from app.repositories.cloud_account_repository import (
    CloudAccountRepository,
)

# Import API schemas.
from app.schemas.cloud_account import (
    CloudAccountCreate,
    CloudAccountRead,
    CloudAccountUpdate,
)

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

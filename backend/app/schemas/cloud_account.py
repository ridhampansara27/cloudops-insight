# Import datetime and UUID types.
from datetime import datetime
from uuid import UUID

# Import Pydantic schema helpers.
from pydantic import BaseModel, ConfigDict, Field


# Define the request body used when registering a cloud account.
class CloudAccountCreate(BaseModel):
    # Store the user-visible name.
    name: str = Field(
        min_length=1,
        max_length=160,
    )

    # Store the cloud provider.
    provider: str = Field(
        default="aws",
        max_length=32,
    )

    # Store the provider-native account identifier.
    external_account_id: str = Field(
        min_length=1,
        max_length=64,
    )

    # Store the IAM role used later for AWS AssumeRole.
    role_arn: str | None = Field(
        default=None,
        max_length=512,
    )

    # Store the optional STS external identifier.
    external_id: str | None = Field(
        default=None,
        max_length=255,
    )

    # Store AWS regions enabled for discovery.
    enabled_regions: list[str] = Field(
        default_factory=list,
    )


# Define fields that can be changed after account creation.
class CloudAccountUpdate(BaseModel):
    # Allow the visible name to change.
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=160,
    )

    # Allow the IAM role to change.
    role_arn: str | None = Field(
        default=None,
        max_length=512,
    )

    # Allow the STS external identifier to change.
    external_id: str | None = Field(
        default=None,
        max_length=255,
    )

    # Allow the enabled regions to change.
    enabled_regions: list[str] | None = None

    # Allow the connection to be disabled.
    status: str | None = Field(
        default=None,
        max_length=32,
    )


# Define the public representation of a cloud account.
class CloudAccountRead(BaseModel):
    # Allow Pydantic to serialize SQLAlchemy ORM objects.
    model_config = ConfigDict(
        from_attributes=True,
    )

    # Return the CloudOps record identifier.
    id: UUID

    # Return the provider.
    provider: str

    # Return the user-visible account name.
    name: str

    # Return the provider-native account identifier.
    external_account_id: str

    # Return the IAM role ARN.
    role_arn: str | None

    # Return regions configured for discovery.
    enabled_regions: list[str]

    # Return the current connection state.
    status: str

    # Return the latest successful synchronization.
    last_synced_at: datetime | None

    # Return record creation time.
    created_at: datetime

    # Return last modification time.
    updated_at: datetime

    # Return the most recent successful or failed validation time.
    last_validated_at: datetime | None

    # Return the latest safe validation failure when one exists.
    last_validation_error: str | None

    # Return synchronization workflow state.
    sync_status: str

    # Return latest synchronization start time.
    sync_started_at: datetime | None

    # Return latest safe synchronization failure.
    last_sync_error: str | None


# Describe a successful AWS connection validation.
class CloudAccountValidationResponse(
    BaseModel,
):
    # Confirm provider connectivity.
    connected: bool

    # Return the verified AWS account ID.
    account_id: str

    # Return the ARN representing the verified caller.
    caller_arn: str

    # Return a user-facing result message.
    message: str

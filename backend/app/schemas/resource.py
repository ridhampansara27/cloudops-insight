# Import datetime and UUID types.
from datetime import datetime
from typing import Any
from uuid import UUID

# Import Pydantic schema helpers.
from pydantic import BaseModel, ConfigDict, Field


# Define one resource returned by the API.
class ResourceRead(BaseModel):
    # Allow serialization from SQLAlchemy ORM objects.
    model_config = ConfigDict(
        from_attributes=True,
    )

    # Return CloudOps' internal UUID.
    id: UUID

    # Return the parent cloud account.
    cloud_account_id: UUID

    # Return the provider-native identifier.
    provider_resource_id: str

    # Return the AWS ARN when available.
    arn: str | None

    # Return the visible resource name.
    name: str

    # Return the cloud service.
    service: str

    # Return the provider-specific type.
    resource_type: str

    # Return AWS region.
    region: str

    # Return availability zone when relevant.
    availability_zone: str | None

    # Return the normalized environment.
    environment: str | None

    # Return resource ownership information.
    owner: str | None

    # Return the cloud-native resource state.
    cloud_state: str

    # Return CloudOps' calculated health state.
    health_state: str

    # Return provider-specific metadata.
    resource_metadata: dict[str, Any]

    # Return the latest discovery timestamp.
    last_seen_at: datetime | None

    # Return the latest synchronization timestamp.
    last_synced_at: datetime | None

    # Return whether the resource exists in current provider inventory.
    is_active: bool

    # Return when CloudOps observed the resource disappear.
    deleted_at: datetime | None


# Define one paginated resource response.
class ResourceListResponse(BaseModel):
    # Return the matching resources.
    items: list[ResourceRead]

    # Return the total number matching the filters.
    total: int

    # Return the current one-based page.
    page: int = Field(
        ge=1,
    )

    # Return the requested page size.
    page_size: int = Field(
        ge=1,
    )

    # Return the total number of pages.
    total_pages: int

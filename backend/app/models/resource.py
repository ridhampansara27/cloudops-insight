# Import flexible JSON value typing.
# Import datetime and UUID types.
from datetime import datetime
from typing import Any
from uuid import UUID

# Import SQLAlchemy database constructs.
from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
)

# Import PostgreSQL JSON storage.
from sqlalchemy.dialects.postgresql import JSONB

# Import SQLAlchemy ORM typing.
from sqlalchemy.orm import Mapped, mapped_column

# Import the application database base.
from app.db.base import Base

# Import shared model mixins.
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


# Define one discovered cloud resource.
class CloudResource(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    # Define the resource table.
    __tablename__ = "resources"

    # Prevent duplicate provider resources inside one account.
    __table_args__ = (
        UniqueConstraint(
            "cloud_account_id",
            "provider_resource_id",
            name="uq_resources_account_provider_resource",
        ),
    )

    # Reference the cloud account that owns this resource.
    cloud_account_id: Mapped[UUID] = mapped_column(
        # Remove resources automatically when their account is deleted.
        ForeignKey(
            "cloud_accounts.id",
            ondelete="CASCADE",
        ),
        # Index account-based inventory queries.
        index=True,
        # Require an owning cloud account.
        nullable=False,
    )

    # Store the provider-native identifier.
    provider_resource_id: Mapped[str] = mapped_column(
        # Support IDs and long resource identifiers.
        String(512),
        # Require a provider identifier.
        nullable=False,
    )

    # Store the AWS ARN when available.
    arn: Mapped[str | None] = mapped_column(
        # Support long ARN values.
        String(1024),
        # Not all AWS resources expose an ARN in the same way.
        nullable=True,
    )

    # Store the resource display name.
    name: Mapped[str] = mapped_column(
        # Allow descriptive names.
        String(255),
        # Require a visible resource name.
        nullable=False,
    )

    # Store the AWS service.
    service: Mapped[str] = mapped_column(
        # Examples include EC2, RDS, ECS, ALB, and S3.
        String(64),
        # Index service-based queries.
        index=True,
        # Require the service.
        nullable=False,
    )

    # Store the provider-specific resource type.
    resource_type: Mapped[str] = mapped_column(
        # Example: AWS::EC2::Instance.
        String(160),
        # Require a resource type.
        nullable=False,
    )

    # Store the AWS region.
    region: Mapped[str] = mapped_column(
        # Region names are short strings.
        String(64),
        # Index region-based inventory queries.
        index=True,
        # Require a region or a normalized global region value.
        nullable=False,
    )

    # Store the availability zone when applicable.
    availability_zone: Mapped[str | None] = mapped_column(
        # Availability-zone names are short.
        String(64),
        # Many resources are regional instead of zonal.
        nullable=True,
    )

    # Store the normalized application environment.
    environment: Mapped[str | None] = mapped_column(
        # Support development, staging, and production.
        String(64),
        # Environment tags might be missing.
        nullable=True,
    )

    # Store the normalized resource owner.
    owner: Mapped[str | None] = mapped_column(
        # Allow team or user ownership names.
        String(160),
        # Ownership might initially be unknown.
        nullable=True,
    )

    # Store the native cloud-resource state.
    cloud_state: Mapped[str] = mapped_column(
        # Support running, stopped, available, and similar states.
        String(64),
        # Default resources to unknown until discovery provides state.
        default="unknown",
        # Require a normalized state.
        nullable=False,
    )

    # Store CloudOps' calculated health state.
    health_state: Mapped[str] = mapped_column(
        # Support healthy, warning, critical, and unknown.
        String(32),
        # Default to unknown until monitoring is available.
        default="unknown",
        # Index operational health queries.
        index=True,
        # Require a health state.
        nullable=False,
    )

    # Store provider-specific metadata without requiring columns for everything.
    resource_metadata: Mapped[dict[str, Any]] = mapped_column(
        # Store the database column under the simple name metadata.
        "metadata",
        # Use PostgreSQL JSONB.
        JSONB,
        # Start with an empty metadata object.
        default=dict,
        # Require a JSON object.
        nullable=False,
    )

    # Store when the resource was first discovered.
    first_seen_at: Mapped[datetime | None] = mapped_column(
        # Store timezone-aware values.
        DateTime(timezone=True),
        # Allow initial incomplete discovery state.
        nullable=True,
    )

    # Store when AWS last reported the resource.
    last_seen_at: Mapped[datetime | None] = mapped_column(
        # Store timezone-aware values.
        DateTime(timezone=True),
        # Allow records before the first complete synchronization.
        nullable=True,
    )

    # Store the most recent successful inventory synchronization.
    last_synced_at: Mapped[datetime | None] = mapped_column(
        # Store timezone-aware values.
        DateTime(timezone=True),
        # Permit never-synchronized records.
        nullable=True,
    )


# Define one provider tag assigned to a resource.
class ResourceTag(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    # Define the tag table.
    __tablename__ = "resource_tags"

    # Prevent duplicate tag keys on the same resource.
    __table_args__ = (
        UniqueConstraint(
            "resource_id",
            "key",
            name="uq_resource_tags_resource_key",
        ),
    )

    # Reference the tagged resource.
    resource_id: Mapped[UUID] = mapped_column(
        # Delete tags when their resource disappears.
        ForeignKey(
            "resources.id",
            ondelete="CASCADE",
        ),
        # Index tag-to-resource lookups.
        index=True,
        # Require an owning resource.
        nullable=False,
    )

    # Store the provider tag key.
    key: Mapped[str] = mapped_column(
        # Support normal AWS tag keys.
        String(255),
        # Require a key.
        nullable=False,
    )

    # Store the provider tag value.
    value: Mapped[str] = mapped_column(
        # Support normal tag values.
        String(1024),
        # Require a tag value.
        nullable=False,
    )

# Import Python datetime and UUID types.
from datetime import datetime
from uuid import UUID

# Import SQLAlchemy database constructs.
from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)

# Import PostgreSQL JSON storage.
from sqlalchemy.dialects.postgresql import JSONB

# Import SQLAlchemy ORM typing.
from sqlalchemy.orm import Mapped, mapped_column

# Import the application database base.
from app.db.base import Base

# Import shared model mixins.
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


# Define one connected cloud account.
class CloudAccount(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    # Define the database table.
    __tablename__ = "cloud_accounts"

    # Prevent duplicate onboarding records inside one organization while
    # allowing separate tenants to independently prove AWS ownership.
    #
    # Once validation succeeds, only one organization may hold the global
    # connected claim for a provider-native account.
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "provider",
            "external_account_id",
            name="uq_cloud_accounts_org_provider_external_account_id",
        ),
        Index(
            "uq_cloud_accounts_connected_provider_external_account_id",
            "provider",
            "external_account_id",
            unique=True,
            postgresql_where=text("status = 'connected'"),
        ),
    )

    # Store the organization that owns this cloud integration.
    #
    # Every cloud account belongs to exactly one organization.
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "organizations.id",
            ondelete="RESTRICT",
        ),
        index=True,
        nullable=False,
    )

    # Store the cloud provider.
    provider: Mapped[str] = mapped_column(
        # AWS is the initial provider.
        String(32),
        # Default new records to AWS.
        default="aws",
        # Require the provider.
        nullable=False,
    )

    # Store the user-facing account name.
    name: Mapped[str] = mapped_column(
        # Allow useful descriptive names.
        String(160),
        # Require a display name.
        nullable=False,
    )

    # Store the AWS account ID.
    external_account_id: Mapped[str] = mapped_column(
        # AWS account IDs currently fit easily inside this field.
        String(64),
        # Require the provider-native account identifier.
        nullable=False,
    )

    # Store the optional IAM role used for AssumeRole.
    role_arn: Mapped[str | None] = mapped_column(
        # Allow a full AWS ARN.
        String(512),
        # Permit local-profile development without a role initially.
        nullable=True,
    )

    # Store the STS external identifier where configured.
    external_id: Mapped[str | None] = mapped_column(
        # Allow sufficiently long external identifiers.
        String(255),
        # Permit accounts that do not require an external identifier.
        nullable=True,
    )

    # Store regions enabled for discovery.
    enabled_regions: Mapped[list[str]] = mapped_column(
        # Store a JSON array in PostgreSQL.
        JSONB,
        # Initialize accounts with an empty list.
        default=list,
        # Require a region collection.
        nullable=False,
    )

    # Store account synchronization state.
    status: Mapped[str] = mapped_column(
        # Support pending, connected, error, and disabled states.
        String(32),
        # Start newly registered accounts in pending state.
        default="pending",
        # Require a synchronization state.
        nullable=False,
    )

    # Store the most recent successful synchronization.
    last_synced_at: Mapped[datetime | None] = mapped_column(
        # Store timezone-aware timestamps.
        DateTime(timezone=True),
        # Allow accounts that have never synchronized.
        nullable=True,
    )

    # Record which CloudOps user created the account.
    created_by_id: Mapped[UUID | None] = mapped_column(
        # Preserve the organization-owned integration if its creator
        # later deletes their CloudOps identity.
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    # Store when AWS credentials were most recently validated.
    last_validated_at: Mapped[datetime | None] = mapped_column(
        # Store timezone-aware timestamps.
        DateTime(
            timezone=True,
        ),
        # Allow accounts that have never been validated.
        nullable=True,
    )

    # Store the latest safe validation failure message.
    last_validation_error: Mapped[str | None] = mapped_column(
        # Keep validation messages reasonably bounded.
        String(
            1024,
        ),
        # Successful connections do not require an error.
        nullable=True,
    )

    # Store background synchronization lifecycle state.
    sync_status: Mapped[str] = mapped_column(
        # Keep workflow states compact.
        String(
            32,
        ),
        # Require a status.
        nullable=False,
        # New accounts have not started synchronization.
        default="idle",
        # Existing database records also receive idle.
        server_default="idle",
    )

    # Store when the latest synchronization attempt started.
    sync_started_at: Mapped[datetime | None] = mapped_column(
        # Store timezone-aware timestamps.
        DateTime(
            timezone=True,
        ),
        # Accounts may never have synchronized.
        nullable=True,
    )

    # Store the latest safe synchronization failure.
    last_sync_error: Mapped[str | None] = mapped_column(
        # Bound provider error size.
        String(
            1024,
        ),
        # Successful accounts have no error.
        nullable=True,
    )

    # Increment whenever AWS connectivity is invalidated or reconfigured.
    #
    # Celery tasks capture this value when queued. A task whose captured
    # revision no longer matches this value must not access AWS or persist
    # provider data.
    connection_revision: Mapped[int] = mapped_column(
        Integer,
        default=1,
        server_default="1",
        nullable=False,
    )

    # Record when customer access to AWS was intentionally disconnected.
    disconnected_at: Mapped[datetime | None] = mapped_column(
        DateTime(
            timezone=True,
        ),
        nullable=True,
    )

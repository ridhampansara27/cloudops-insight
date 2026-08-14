# Import Python's datetime type.
from datetime import datetime

# Import UUID generation and UUID typing.
from uuid import UUID, uuid4

# Import SQLAlchemy timestamp support.
from sqlalchemy import DateTime, func

# Import PostgreSQL's native UUID type.
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

# Import SQLAlchemy ORM typing helpers.
from sqlalchemy.orm import Mapped, mapped_column


# Provide a UUID primary key to domain models.
class UUIDPrimaryKeyMixin:
    # Create a UUID identifier automatically for new records.
    id: Mapped[UUID] = mapped_column(
        # Store the value using PostgreSQL's native UUID type.
        PG_UUID(as_uuid=True),
        # Mark this column as the table's primary key.
        primary_key=True,
        # Generate a UUID in Python before insertion.
        default=uuid4,
    )


# Provide created and updated timestamps to domain models.
class TimestampMixin:
    # Store when the record was originally created.
    created_at: Mapped[datetime] = mapped_column(
        # Store timezone-aware timestamps.
        DateTime(timezone=True),
        # Let PostgreSQL provide the insertion timestamp.
        server_default=func.now(),
        # Always require a creation timestamp.
        nullable=False,
    )

    # Store when the record was most recently modified.
    updated_at: Mapped[datetime] = mapped_column(
        # Store timezone-aware timestamps.
        DateTime(timezone=True),
        # Initialize the timestamp during insertion.
        server_default=func.now(),
        # Update the timestamp when SQLAlchemy updates the record.
        onupdate=func.now(),
        # Always require an update timestamp.
        nullable=False,
    )

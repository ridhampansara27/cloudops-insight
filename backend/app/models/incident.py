# Import datetime and UUID types.
from datetime import datetime
from uuid import UUID

# Import SQLAlchemy constructs.
from sqlalchemy import DateTime, ForeignKey, String, Text

# Import ORM typing.
from sqlalchemy.orm import Mapped, mapped_column

# Import application database base.
from app.db.base import Base

# Import shared model mixins.
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


# Define one operational incident.
class Incident(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    # Define the database table.
    __tablename__ = "incidents"

    # Reference the affected resource.
    resource_id: Mapped[UUID] = mapped_column(
        # Delete incidents when the resource is intentionally purged.
        ForeignKey(
            "resources.id",
            ondelete="CASCADE",
        ),
        # Index incident lookups by resource.
        index=True,
        # Require an affected resource.
        nullable=False,
    )

    # Store incident severity.
    severity: Mapped[str] = mapped_column(
        # Support critical, high, medium, and low.
        String(32),
        # Index operational queries.
        index=True,
        # Require severity.
        nullable=False,
    )

    # Store the visible incident title.
    title: Mapped[str] = mapped_column(
        # Allow meaningful incident descriptions.
        String(255),
        # Require a title.
        nullable=False,
    )

    # Store additional incident context.
    description: Mapped[str | None] = mapped_column(
        # Allow long diagnostic content.
        Text,
        # Permit incidents without an extended description initially.
        nullable=True,
    )

    # Store incident workflow status.
    status: Mapped[str] = mapped_column(
        # Support open, acknowledged, investigating, and resolved.
        String(32),
        # Start incidents open.
        default="open",
        # Index workflow queries.
        index=True,
        # Require a status.
        nullable=False,
    )

    # Store when the incident began.
    started_at: Mapped[datetime] = mapped_column(
        # Store timezone-aware timestamps.
        DateTime(timezone=True),
        # Require the incident start time.
        nullable=False,
    )

    # Store when the incident was acknowledged.
    acknowledged_at: Mapped[datetime | None] = mapped_column(
        # Store timezone-aware values.
        DateTime(timezone=True),
        # Permit unacknowledged incidents.
        nullable=True,
    )

    # Store when the incident was resolved.
    resolved_at: Mapped[datetime | None] = mapped_column(
        # Store timezone-aware values.
        DateTime(timezone=True),
        # Permit unresolved incidents.
        nullable=True,
    )

    # Optionally assign an operator.
    assigned_user_id: Mapped[UUID | None] = mapped_column(
        # Keep the incident if the user account is removed.
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        # Allow unassigned incidents.
        nullable=True,
    )

    # Store where the incident originated.
    source: Mapped[str] = mapped_column(
        # Support monitoring and manual incidents.
        String(
            32,
        ),
        # Existing incidents are treated as manual/demo records.
        default="manual",
        # Existing database rows receive a valid default.
        server_default="manual",
        # Require incident provenance.
        nullable=False,
    )

# Import datetime and UUID types.
from datetime import datetime
from uuid import UUID

# Import SQLAlchemy database constructs.
from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)

# Import ORM typing.
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

# Import application database base.
from app.db.base import Base

# Import reusable model mixins.
from app.models.mixins import (
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


# Store one normalized CloudWatch metric data point.
class MetricSample(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    # Define the time-series table.
    __tablename__ = "metric_samples"

    # Prevent duplicate CloudWatch samples during overlapping synchronizations.
    __table_args__ = (
        UniqueConstraint(
            "resource_id",
            "namespace",
            "metric_name",
            "statistic",
            "timestamp",
            name=("uq_metric_samples_resource_metric_timestamp"),
        ),
    )

    # Reference the monitored cloud resource.
    resource_id: Mapped[UUID] = mapped_column(
        # Delete metric history if the resource is permanently purged.
        ForeignKey(
            "resources.id",
            ondelete="CASCADE",
        ),
        # Optimize resource detail metric queries.
        index=True,
        # Require a monitored resource.
        nullable=False,
    )

    # Store the CloudWatch namespace.
    namespace: Mapped[str] = mapped_column(
        String(
            128,
        ),
        nullable=False,
    )

    # Store the provider metric name.
    metric_name: Mapped[str] = mapped_column(
        String(
            160,
        ),
        index=True,
        nullable=False,
    )

    # Store the CloudWatch statistic.
    statistic: Mapped[str] = mapped_column(
        String(
            32,
        ),
        nullable=False,
    )

    # Store the normalized numeric metric value.
    value: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    # Store provider metric unit.
    unit: Mapped[str | None] = mapped_column(
        String(
            32,
        ),
        nullable=True,
    )

    # Store provider observation time.
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(
            timezone=True,
        ),
        index=True,
        nullable=False,
    )

    # Store CloudWatch's aggregation period.
    period_seconds: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

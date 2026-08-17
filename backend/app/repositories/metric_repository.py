# Import datetime for metric-range queries.
from datetime import datetime

# Import UUID typing.
from uuid import UUID

# Import SQLAlchemy querying.
from sqlalchemy import select

# Import PostgreSQL-specific INSERT support.
from sqlalchemy.dialects.postgresql import (
    insert as postgresql_insert,
)

# Import asynchronous database session.
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

# Import metric ORM model.
from app.models.metric import (
    MetricSample,
)

# Import normalized AWS metric data.
from app.providers.aws.monitoring_types import (
    AwsMetricPoint,
)


# Persist normalized monitoring information.
class MetricRepository:
    # Store request/task database session.
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        # Save asynchronous SQLAlchemy session.
        self.session = session

    # Upsert CloudWatch metric points.
    async def upsert_points(
        self,
        points: list[AwsMetricPoint],
    ) -> int:
        # Nothing to persist.
        if not points:
            return 0

        # Create one PostgreSQL INSERT statement.
        statement = postgresql_insert(
            MetricSample,
        ).values(
            [
                {
                    "resource_id": (point.resource_id),
                    "namespace": (point.namespace),
                    "metric_name": (point.metric_name),
                    "statistic": (point.statistic),
                    "value": (point.value),
                    "unit": (point.unit),
                    "timestamp": (point.timestamp),
                    "period_seconds": (point.period_seconds),
                }
                for point in points
            ],
        )

        # Update the metric value when overlapping sync windows return the same point.
        statement = statement.on_conflict_do_update(
            constraint=("uq_metric_samples_resource_metric_timestamp"),
            set_={
                "value": (statement.excluded.value),
                "unit": (statement.excluded.unit),
                "period_seconds": (statement.excluded.period_seconds),
            },
        )

        # Execute the bulk upsert.
        await self.session.execute(
            statement,
        )

        # Return number processed.
        return len(
            points,
        )

    # Retrieve time-series data for one resource.
    async def get_resource_metrics(
        self,
        *,
        resource_id: UUID,
        start_time: datetime,
    ) -> list[MetricSample]:
        # Build chronological metric query.
        statement = (
            select(
                MetricSample,
            )
            .where(
                MetricSample.resource_id == resource_id,
                MetricSample.timestamp >= start_time,
            )
            .order_by(
                MetricSample.timestamp.asc(),
            )
        )

        # Execute query.
        result = await self.session.execute(
            statement,
        )

        # Return metric samples.
        return list(
            result.scalars().all(),
        )

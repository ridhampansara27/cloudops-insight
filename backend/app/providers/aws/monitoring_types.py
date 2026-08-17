# Import datetime for metric timestamps.
# Import dataclass helpers.
from dataclasses import dataclass
from datetime import datetime

# Import UUID for CloudOps resource identifiers.
from uuid import UUID


# Describe one CloudWatch metric that CloudOps wants to retrieve.
@dataclass(
    frozen=True,
    slots=True,
)
class AwsMetricQuery:
    # Store the CloudOps resource UUID that owns this metric.
    resource_id: UUID

    # Store the CloudWatch namespace.
    namespace: str

    # Store the CloudWatch metric name.
    metric_name: str

    # Store the requested CloudWatch statistic.
    statistic: str

    # Store CloudWatch metric dimensions.
    dimensions: tuple[
        tuple[str, str],
        ...,
    ]

    # Store the metric unit when known.
    unit: str | None = None


# Describe one normalized CloudWatch data point.
@dataclass(
    frozen=True,
    slots=True,
)
class AwsMetricPoint:
    # Store the CloudOps resource UUID.
    resource_id: UUID

    # Store the CloudWatch namespace.
    namespace: str

    # Store the metric name.
    metric_name: str

    # Store the requested statistic.
    statistic: str

    # Store the observed numeric value.
    value: float

    # Store CloudWatch's metric unit when available.
    unit: str | None

    # Store the metric observation timestamp.
    timestamp: datetime

    # Store the CloudWatch aggregation period.
    period_seconds: int

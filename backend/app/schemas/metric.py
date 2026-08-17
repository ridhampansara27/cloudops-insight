# Import datetime typing.
from datetime import datetime

# Import Pydantic schema base.
from pydantic import BaseModel


# Define one chart point.
class MetricPointRead(
    BaseModel,
):
    # Return provider observation timestamp.
    timestamp: datetime

    # Return observed value.
    value: float


# Define one complete metric series.
class MetricSeriesRead(
    BaseModel,
):
    # Return CloudWatch namespace.
    namespace: str

    # Return metric name.
    metric_name: str

    # Return CloudWatch statistic.
    statistic: str

    # Return unit.
    unit: str | None

    # Return chronological data points.
    points: list[MetricPointRead]

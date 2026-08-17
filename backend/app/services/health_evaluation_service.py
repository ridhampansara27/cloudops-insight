# Import dataclass support.
from dataclasses import dataclass

# Import datetime helpers.
from datetime import (
    UTC,
    datetime,
    timedelta,
)

# Import SQLAlchemy querying.
from sqlalchemy import select

# Import asynchronous database session.
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

# Import monitoring model.
from app.models.metric import (
    MetricSample,
)

# Import cloud resource model.
from app.models.resource import (
    CloudResource,
)


# Describe one explainable health evaluation.
@dataclass(
    frozen=True,
    slots=True,
)
class HealthEvaluation:
    # Store normalized health state.
    state: str

    # Explain the decision.
    reason: str


# Evaluate resource health using recent real metrics.
class HealthEvaluationService:
    # Store database session.
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    # Evaluate one resource.
    async def evaluate(
        self,
        resource: CloudResource,
    ) -> HealthEvaluation:
        # Analyze the last thirty minutes.
        cutoff = datetime.now(
            UTC,
        ) - timedelta(
            minutes=30,
        )

        # Retrieve recent metric samples.
        result = await self.session.execute(
            select(
                MetricSample,
            ).where(
                MetricSample.resource_id == resource.id,
                MetricSample.timestamp >= cutoff,
            ),
        )

        # Store metric rows.
        samples = list(
            result.scalars().all(),
        )

        # Return unknown when CloudWatch returned no recent data.
        if not samples:
            return HealthEvaluation(
                state="unknown",
                reason=("No recent CloudWatch metrics are available."),
            )

        # Group numeric values by metric name.
        values: dict[
            str,
            list[float],
        ] = {}

        # Normalize rows.
        for sample in samples:
            values.setdefault(
                sample.metric_name,
                [],
            ).append(
                sample.value,
            )

        # Calculate a metric average.
        def average(
            metric_name: str,
        ) -> float | None:
            # Read available points.
            metric_values = values.get(
                metric_name,
            )

            # Return no value when metric is absent.
            if not metric_values:
                return None

            # Calculate arithmetic mean.
            return sum(
                metric_values,
            ) / len(
                metric_values,
            )

        # Evaluate EC2 and RDS CPU.
        if resource.service in {
            "EC2",
            "RDS",
        }:
            # Calculate recent average CPU.
            cpu = average(
                "CPUUtilization",
            )

            # Missing CPU remains unknown.
            if cpu is None:
                return HealthEvaluation(
                    state="unknown",
                    reason=("CPUUtilization is not currently available."),
                )

            # Critical CPU threshold.
            if cpu >= 90:
                return HealthEvaluation(
                    state="critical",
                    reason=(f"Average CPU utilization is {cpu:.1f}%."),
                )

            # Warning CPU threshold.
            if cpu >= 75:
                return HealthEvaluation(
                    state="warning",
                    reason=(f"Average CPU utilization is {cpu:.1f}%."),
                )

            # Resource is currently healthy under this rule.
            return HealthEvaluation(
                state="healthy",
                reason=(f"Average CPU utilization is {cpu:.1f}%."),
            )

        # Evaluate ECS CPU and memory.
        if resource.service == "ECS" and resource.resource_type == "AWS::ECS::Service":
            # Calculate CPU average.
            cpu = average(
                "CPUUtilization",
            )

            # Calculate memory average.
            memory = average(
                "MemoryUtilization",
            )

            # Require at least one utilization metric.
            utilization_values = [
                value
                for value in (
                    cpu,
                    memory,
                )
                if value is not None
            ]

            if not utilization_values:
                return HealthEvaluation(
                    state="unknown",
                    reason=("ECS utilization metrics are unavailable."),
                )

            # Select the most stressed dimension.
            highest = max(
                utilization_values,
            )

            # Critical utilization.
            if highest >= 90:
                return HealthEvaluation(
                    state="critical",
                    reason=(f"ECS utilization reached {highest:.1f}%."),
                )

            # Warning utilization.
            if highest >= 75:
                return HealthEvaluation(
                    state="warning",
                    reason=(f"ECS utilization reached {highest:.1f}%."),
                )

            # Healthy service.
            return HealthEvaluation(
                state="healthy",
                reason=(f"Highest ECS utilization is {highest:.1f}%."),
            )

        # Evaluate Application Load Balancer.
        if resource.service == "ELB":
            # Calculate average target response time.
            response_time = average(
                "TargetResponseTime",
            )

            # Sum target HTTP 5xx responses.
            error_count = sum(
                values.get(
                    "HTTPCode_Target_5XX_Count",
                    [],
                ),
            )

            # Sum requests over the evaluated interval.
            request_count = sum(
                values.get(
                    "RequestCount",
                    [],
                ),
            )

            # Calculate HTTP 5xx percentage when traffic exists.
            error_rate = (error_count / request_count) * 100 if request_count > 0 else 0

            # Critical ALB conditions.
            if error_rate >= 5 or (response_time is not None and response_time >= 5):
                return HealthEvaluation(
                    state="critical",
                    reason=(
                        f"ALB 5xx rate {error_rate:.2f}% "
                        f"and response time "
                        f"{response_time or 0:.2f}s."
                    ),
                )

            # Warning ALB conditions.
            if error_rate >= 1 or (response_time is not None and response_time >= 2):
                return HealthEvaluation(
                    state="warning",
                    reason=(
                        f"ALB 5xx rate {error_rate:.2f}% "
                        f"and response time "
                        f"{response_time or 0:.2f}s."
                    ),
                )

            # Healthy when meaningful traffic metrics exist.
            if request_count > 0 or response_time is not None:
                return HealthEvaluation(
                    state="healthy",
                    reason=("ALB metrics are within CloudOps thresholds."),
                )

        # Unsupported or metric-less resource.
        return HealthEvaluation(
            state="unknown",
            reason=("No health evaluation rule exists for this resource."),
        )

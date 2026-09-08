# Import calendar helper for determining the number of days in a month.
from calendar import monthrange

# Import timezone-aware datetime helpers.
from datetime import (
    UTC,
    datetime,
    timedelta,
)

# Import Decimal for accurate financial calculations.
from decimal import Decimal

# Import SQLAlchemy query builder.
from sqlalchemy import select

# Import asynchronous SQLAlchemy session.
from sqlalchemy.ext.asyncio import AsyncSession

# Import real AWS cost records.
from app.models.cost import CostRecord

# Import persisted CloudWatch metric samples.
from app.models.metric import MetricSample

# Import persisted optimization recommendations.
from app.models.recommendation import Recommendation

# Import discovered cloud resources.
from app.models.resource import CloudResource

# Define the maximum average CPU utilization allowed
# for the first CloudOps rightsizing heuristic.
CPU_THRESHOLD_PERCENT = Decimal(
    10,
)

# Define the percentage of the calculated monthly run-rate
# that CloudOps assumes could potentially be saved by rightsizing.
RIGHTSIZING_SAVINGS_RATE = Decimal(
    "0.25",
)

# Require several real CPU observations before making
# a recommendation.
#
# Step 353 says "enough CPU history exists" but does not
# prescribe an exact sample count, so six samples are used
# as the first transparent CloudOps implementation threshold.
MIN_CPU_SAMPLES = 6

# Define two-decimal financial precision for displayed
# run-rate and estimated savings values.
MONEY_QUANTIZER = Decimal(
    "0.01",
)


# Generate explainable CloudOps optimization recommendations.
class RecommendationEngine:
    # Receive the asynchronous database session.
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        # Store database access for recommendation evaluation.
        self.session = session

    # Evaluate one discovered resource against the
    # CloudOps EC2 rightsizing heuristic.
    async def evaluate_resource(
        self,
        resource: CloudResource,
    ) -> Recommendation | None:
        # -----------------------------------------------------
        # 1. Verify that this is an active EC2 instance.
        # -----------------------------------------------------

        # Ignore resources that are no longer present in AWS.
        if not resource.is_active:
            return None

        # Only evaluate resources discovered as EC2.
        if resource.service != "EC2":
            return None

        # Only evaluate actual EC2 instances.
        if resource.resource_type != "AWS::EC2::Instance":
            return None

        # Only evaluate currently running EC2 instances.
        #
        # A stopped instance should not receive a CPU-based
        # rightsizing recommendation.
        if resource.cloud_state != "running":
            return None

        # -----------------------------------------------------
        # 2. Define the twenty-four-hour CPU window.
        # -----------------------------------------------------

        # Determine the current timezone-aware UTC timestamp.
        end_time = datetime.now(
            UTC,
        )

        # Look back over the most recent twenty-four hours.
        start_time = end_time - timedelta(
            hours=24,
        )

        # -----------------------------------------------------
        # 3. Load real CloudWatch CPUUtilization samples.
        # -----------------------------------------------------

        # Retrieve CPU utilization values belonging to
        # this CloudOps resource.
        cpu_result = await self.session.execute(
            select(
                MetricSample.value,
            ).where(
                # Match the discovered CloudOps resource.
                MetricSample.resource_id == resource.id,
                # Only use EC2 CPU utilization observations.
                MetricSample.metric_name == "CPUUtilization",
                # Restrict observations to the last 24 hours.
                MetricSample.timestamp >= start_time,
                MetricSample.timestamp <= end_time,
            ),
        )

        # Convert database numeric values into Decimal
        # without introducing floating-point inaccuracies.
        cpu_values = [
            Decimal(
                str(
                    value,
                ),
            )
            for value in cpu_result.scalars().all()
        ]

        # -----------------------------------------------------
        # 4. Require enough real CPU history.
        # -----------------------------------------------------

        # Do not make a recommendation from an insufficient
        # number of CloudWatch observations.
        if (
            len(
                cpu_values,
            )
            < MIN_CPU_SAMPLES
        ):
            return None

        # Calculate the arithmetic mean of all CPU observations
        # collected during the evaluation window.
        average_cpu = sum(
            cpu_values,
            Decimal(
                0,
            ),
        ) / Decimal(
            len(
                cpu_values,
            ),
        )

        # -----------------------------------------------------
        # 5. Apply the CloudOps < 10% CPU rule.
        # -----------------------------------------------------

        # Reuse a previous rightsizing recommendation for this
        # resource instead of creating duplicates every time
        # monitoring synchronization runs.
        existing_result = await self.session.execute(
            select(
                Recommendation,
            )
            .where(
                Recommendation.resource_id == resource.id,
                Recommendation.recommendation_type == "rightsizing",
            )
            .order_by(
                Recommendation.created_at.desc(),
            ),
        )

        existing_recommendation = existing_result.scalars().first()

        # Resolve a currently open recommendation when the
        # resource is no longer below the CPU threshold.
        if average_cpu >= CPU_THRESHOLD_PERCENT:
            if (
                existing_recommendation is not None
                and existing_recommendation.status == "open"
            ):
                existing_recommendation.status = "resolved"

                await self.session.commit()

            return None

        # -----------------------------------------------------
        # 6. Determine the current billing month.
        # -----------------------------------------------------

        # Determine today's date using UTC.
        today = datetime.now(
            UTC,
        ).date()

        # Determine the first calendar day of the current month.
        month_start = today.replace(
            day=1,
        )

        # Determine how many calendar days exist
        # in the current month.
        days_in_month = monthrange(
            today.year,
            today.month,
        )[1]

        # -----------------------------------------------------
        # 7. Load real resource-level AWS cost records.
        # -----------------------------------------------------

        # Query Cost Explorer records that belong specifically
        # to this EC2 resource.
        #
        # Do NOT fall back to total EC2 service cost because
        # Step 353 explicitly requires resource-level real cost.
        cost_result = await self.session.execute(
            select(
                CostRecord.usage_date,
                CostRecord.amount,
            ).where(
                # Match only this CloudOps resource.
                CostRecord.resource_id == resource.id,
                # Use cost records from the current billing month.
                CostRecord.usage_date >= month_start,
                # Do not consider any future-dated records.
                CostRecord.usage_date <= today,
            ),
        )

        # Retrieve all matching resource-level billing rows.
        cost_rows = cost_result.all()

        # -----------------------------------------------------
        # 8. Calculate savings only when real resource-level
        #    AWS billing data is available.
        # -----------------------------------------------------

        # Start without a monetary estimate. This is intentional:
        # CloudOps must never invent a financial saving when AWS
        # has not supplied resource-level billing data.
        monthly_run_rate: Decimal | None = None
        potential_savings: Decimal | None = None

        # Calculate a monetary estimate only when Cost Explorer
        # returned resource-level rows.
        if cost_rows:
            observed_cost = sum(
                (
                    Decimal(
                        str(
                            row.amount,
                        ),
                    )
                    for row in cost_rows
                ),
                Decimal(
                    0,
                ),
            )

            # Count distinct billing dates represented by AWS.
            observed_dates = {row.usage_date for row in cost_rows}

            observed_days = len(
                observed_dates,
            )

            # Only quantify savings from positive real spending.
            if (
                observed_cost
                > Decimal(
                    0,
                )
                and observed_days > 0
            ):
                monthly_run_rate = (
                    observed_cost
                    / Decimal(
                        observed_days,
                    )
                    * Decimal(
                        days_in_month,
                    )
                ).quantize(
                    MONEY_QUANTIZER,
                )

                potential_savings = (
                    monthly_run_rate * RIGHTSIZING_SAVINGS_RATE
                ).quantize(
                    MONEY_QUANTIZER,
                )

        # -----------------------------------------------------
        # 12. Build transparent recommendation evidence.
        # -----------------------------------------------------

        if potential_savings is None:
            description = (
                "CloudOps detected sustained low CPU utilization "
                "for this active EC2 instance. A monetary savings "
                "estimate is unavailable because positive "
                "resource-level AWS Cost Explorer records are not "
                "currently available."
            )

            evidence = (
                "CloudOps rule-based heuristic: "
                f"24-hour average CPU was {average_cpu:.1f}%. "
                "The instance satisfies the CloudOps <10% CPU "
                "rightsizing signal. Resource-level AWS Cost "
                "Explorer data is unavailable, so CloudOps does "
                "not fabricate a savings amount."
            )

        else:
            # A calculated saving implies that a monthly run-rate
            # was successfully derived from real AWS billing data.
            assert monthly_run_rate is not None

            description = (
                "CloudOps detected sustained low CPU utilization "
                "together with real resource-level AWS cost data "
                "for this active EC2 instance."
            )

            evidence = (
                "CloudOps rule-based heuristic: "
                f"24-hour average CPU was {average_cpu:.1f}%. "
                "Recent resource-level AWS Cost Explorer records "
                "indicate a monthly run-rate of "
                f"${monthly_run_rate:.2f}. "
                "Estimated savings assumes a 25% reduction "
                "after rightsizing."
            )

        # -----------------------------------------------------
        # 13. Create or update the persisted recommendation.
        # -----------------------------------------------------

        recommendation_title = f"Rightsize underutilized EC2 instance {resource.name}"

        if existing_recommendation is None:
            recommendation = Recommendation(
                resource_id=resource.id,
                recommendation_type="rightsizing",
                title=recommendation_title,
                description=description,
                evidence=evidence,
                estimated_monthly_savings=potential_savings,
                risk="medium",
                confidence="medium",
                status="open",
            )

            self.session.add(
                recommendation,
            )

        else:
            recommendation = existing_recommendation

            # Refresh evidence and monetary estimates without
            # changing the user's recommendation workflow state.
            recommendation.title = recommendation_title
            recommendation.description = description
            recommendation.evidence = evidence
            recommendation.estimated_monthly_savings = potential_savings
            recommendation.risk = "medium"
            recommendation.confidence = "medium"

        # -----------------------------------------------------
        # 14. Persist the recommendation.
        # -----------------------------------------------------

        await self.session.commit()

        await self.session.refresh(
            recommendation,
        )

        return recommendation

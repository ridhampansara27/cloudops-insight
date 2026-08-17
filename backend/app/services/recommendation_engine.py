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

        # Step 353 requires the average CPU to be strictly
        # below ten percent.
        #
        # Therefore:
        #
        # 9.9%  -> candidate
        # 10.0% -> not a candidate
        # 20.0% -> not a candidate
        if average_cpu >= CPU_THRESHOLD_PERCENT:
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
        # 8. Require real resource-level cost.
        # -----------------------------------------------------

        # Step 353 explicitly forbids inventing a monetary
        # recommendation when resource-level cost is unavailable.
        if not cost_rows:
            return None

        # Sum the real observed AWS cost for this EC2 instance.
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

        # A zero or negative observed cost cannot produce
        # a meaningful monetary rightsizing recommendation.
        if observed_cost <= Decimal(
            0,
        ):
            return None

        # -----------------------------------------------------
        # 9. Determine how many billing days were observed.
        # -----------------------------------------------------

        # Store unique dates represented by the imported
        # resource-level Cost Explorer records.
        observed_dates = {row.usage_date for row in cost_rows}

        # Count distinct observed billing days.
        observed_days = len(
            observed_dates,
        )

        # Protect the run-rate calculation against division
        # by zero.
        if observed_days == 0:
            return None

        # -----------------------------------------------------
        # 10. Calculate monthly run-rate.
        # -----------------------------------------------------

        # Step 353 formula:
        #
        # monthly run-rate
        # =
        # observed resource cost
        # / observed days
        # * days in current month
        monthly_run_rate = (
            observed_cost
            / Decimal(
                observed_days,
            )
            * Decimal(
                days_in_month,
            )
        )

        # Round the calculated run-rate to normal
        # currency precision.
        monthly_run_rate = monthly_run_rate.quantize(
            MONEY_QUANTIZER,
        )

        # -----------------------------------------------------
        # 11. Calculate potential monthly savings.
        # -----------------------------------------------------

        # Step 353 formula:
        #
        # potential savings
        # =
        # monthly run-rate
        # * 25%
        potential_savings = monthly_run_rate * RIGHTSIZING_SAVINGS_RATE

        # Store savings using two-decimal currency precision.
        potential_savings = potential_savings.quantize(
            MONEY_QUANTIZER,
        )

        # -----------------------------------------------------
        # 12. Build transparent recommendation evidence.
        # -----------------------------------------------------

        # Explain exactly which CloudOps rule generated
        # the recommendation.
        #
        # Do not describe this as an AWS recommendation.
        evidence = (
            "CloudOps rule-based heuristic: "
            f"24-hour average CPU was "
            f"{average_cpu:.1f}%. "
            "Recent resource-level AWS Cost Explorer "
            "records indicate a monthly run-rate of "
            f"${monthly_run_rate:.2f}. "
            "Estimated savings assumes a 25% reduction "
            "after rightsizing."
        )

        # -----------------------------------------------------
        # 13. Create the persisted recommendation.
        # -----------------------------------------------------

        # Create an explainable CloudOps-generated
        # rightsizing recommendation.
        recommendation = Recommendation(
            # Link the recommendation to the EC2 resource.
            resource_id=resource.id,
            # Use the defined optimization category.
            recommendation_type="rightsizing",
            # Provide a human-readable recommendation title.
            title=(f"Rightsize underutilized EC2 instance {resource.name}"),
            # Explain why this optimization is being proposed.
            description=(
                "CloudOps detected sustained low CPU "
                "utilization together with real "
                "resource-level AWS cost data for this "
                "active EC2 instance."
            ),
            # Store the exact rule evidence used.
            evidence=evidence,
            # Store the calculated potential monthly saving.
            estimated_monthly_savings=(potential_savings),
            # Step 353 requires medium risk.
            risk="medium",
            # Step 353 requires medium confidence.
            confidence="medium",
            # Newly generated recommendations begin open.
            status="open",
        )

        # -----------------------------------------------------
        # 14. Persist the recommendation.
        # -----------------------------------------------------

        # Stage the new recommendation in the session.
        self.session.add(
            recommendation,
        )

        # Persist the recommendation to PostgreSQL.
        await self.session.commit()

        # Reload generated database fields such as
        # UUID and timestamps.
        await self.session.refresh(
            recommendation,
        )

        # Return the persisted recommendation.
        return recommendation

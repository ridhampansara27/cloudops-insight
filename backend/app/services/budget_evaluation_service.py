# Import immutable result-model support.
from dataclasses import dataclass

# Import timezone-aware timestamps.
from datetime import (
    UTC,
    datetime,
)

# Import Decimal for financial calculations.
from decimal import Decimal

# Import UUID parsing for account-scoped budgets.
from uuid import UUID

# Import SQLAlchemy aggregation/query helpers.
from sqlalchemy import func, select

# Import asynchronous database session.
from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

# Import budget ORM model.
from app.models.budget import (
    Budget,
)

# Import real Cost Explorer records.
from app.models.cost import (
    CostRecord,
)


# Store the calculated state of one budget.
@dataclass(
    frozen=True,
    slots=True,
)
class BudgetEvaluation:
    # Store actual month-to-date spending.
    current_spend: Decimal

    # Store percentage of the configured budget consumed.
    utilization_percentage: Decimal

    # Store healthy, warning, critical, or unsupported.
    evaluation_status: str

    # Store when the supported budget was evaluated.
    last_evaluated_at: datetime | None


# Evaluate budgets using real imported Cost Explorer records.
class BudgetEvaluationService:
    # Receive the asynchronous SQLAlchemy session.
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        # Store the session for database queries.
        self.session = session

    # Evaluate one budget.
    async def evaluate(
        self,
        budget: Budget,
    ) -> BudgetEvaluation:
        # Do not estimate unsupported environment or team costs.
        if budget.scope_type not in {
            "account",
            "service",
        }:
            return BudgetEvaluation(
                current_spend=Decimal(
                    0,
                ),
                utilization_percentage=Decimal(
                    0,
                ),
                evaluation_status="unsupported",
                last_evaluated_at=None,
            )

        # Store the current UTC time.
        evaluated_at = datetime.now(
            UTC,
        )

        # Determine the beginning of the current billing month.
        month_start = evaluated_at.date().replace(
            day=1,
        )

        # Start with current-month cost records.
        conditions = [
            CostRecord.usage_date >= month_start,
        ]

        # Configure an account-scoped budget.
        if budget.scope_type == "account":
            try:
                # Account scope values use the CloudOps cloud-account UUID.
                cloud_account_id = UUID(
                    budget.scope_value,
                )

            except ValueError:
                # An invalid account identifier cannot be evaluated safely.
                return BudgetEvaluation(
                    current_spend=Decimal(
                        0,
                    ),
                    utilization_percentage=Decimal(
                        0,
                    ),
                    evaluation_status="unsupported",
                    last_evaluated_at=None,
                )

            # Include only costs belonging to the selected cloud account.
            conditions.append(
                CostRecord.cloud_account_id == cloud_account_id,
            )

        # Configure a service-scoped budget.
        elif budget.scope_type == "service":
            # Match the genuine AWS Cost Explorer service label.
            conditions.append(
                CostRecord.service == budget.scope_value,
            )

        # Sum real imported cost records.
        current_spend_result = await self.session.scalar(
            select(
                func.sum(
                    CostRecord.amount,
                ),
            ).where(
                *conditions,
            ),
        )

        # Normalize an empty aggregate to exact decimal zero.
        current_spend = (
            Decimal(
                0,
            )
            if current_spend_result is None
            else Decimal(
                current_spend_result,
            )
        )

        # Normalize configured budget values to Decimal.
        monthly_limit = Decimal(
            budget.monthly_limit,
        )

        warning_threshold = Decimal(
            budget.warning_threshold,
        )

        critical_threshold = Decimal(
            budget.critical_threshold,
        )

        # Prevent division by zero if invalid historical data exists.
        if monthly_limit <= Decimal(
            0,
        ):
            return BudgetEvaluation(
                current_spend=current_spend,
                utilization_percentage=Decimal(
                    0,
                ),
                evaluation_status="unsupported",
                last_evaluated_at=evaluated_at,
            )

        # Calculate percentage of the monthly budget already consumed.
        utilization_percentage = (
            current_spend
            / monthly_limit
            * Decimal(
                100,
            )
        )

        # Apply the critical threshold first.
        if utilization_percentage >= critical_threshold:
            evaluation_status = "critical"

        # Apply the warning threshold.
        elif utilization_percentage >= warning_threshold:
            evaluation_status = "warning"

        # Everything below the warning threshold is healthy.
        else:
            evaluation_status = "healthy"

        # Return the calculated budget state.
        return BudgetEvaluation(
            current_spend=current_spend,
            utilization_percentage=(utilization_percentage),
            evaluation_status=(evaluation_status),
            last_evaluated_at=(evaluated_at),
        )

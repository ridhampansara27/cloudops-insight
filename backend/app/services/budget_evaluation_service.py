"""Evaluate organization-owned budgets using tenant-scoped cloud costs."""

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.budget import Budget
from app.models.cloud_account import CloudAccount
from app.models.cost import CostRecord


@dataclass(
    frozen=True,
    slots=True,
)
class BudgetEvaluation:
    """Store the calculated state of one budget."""

    current_spend: Decimal
    utilization_percentage: Decimal
    evaluation_status: str
    last_evaluated_at: datetime | None


class BudgetEvaluationService:
    """Evaluate budgets without crossing organization boundaries."""

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    async def evaluate(
        self,
        *,
        budget: Budget,
        organization_id: UUID,
    ) -> BudgetEvaluation:
        """Evaluate one budget using only costs from its organization."""

        # Fail closed if a caller accidentally passes a budget from
        # another organization.
        if budget.organization_id != organization_id:
            raise ValueError("Budget does not belong to the requested organization.")

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

        evaluated_at = datetime.now(
            UTC,
        )

        month_start = evaluated_at.date().replace(
            day=1,
        )

        # Every supported budget begins with the same mandatory
        # organization boundary.
        conditions = [
            CloudAccount.organization_id == organization_id,
            CostRecord.cost_type == "service_aggregate",
            CostRecord.usage_date >= month_start,
        ]

        if budget.scope_type == "account":
            try:
                cloud_account_id = UUID(
                    budget.scope_value,
                )

            except ValueError:
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

            conditions.append(
                CostRecord.cloud_account_id == cloud_account_id,
            )

        elif budget.scope_type == "service":
            conditions.append(
                CostRecord.service == budget.scope_value,
            )

        # Join every billing record through its owning cloud account.
        # This is the critical tenant boundary that was previously absent
        # for service-scoped budgets.
        current_spend_result = await self.session.scalar(
            select(
                func.sum(
                    CostRecord.amount,
                ),
            )
            .join(
                CloudAccount,
                CloudAccount.id == CostRecord.cloud_account_id,
            )
            .where(
                *conditions,
            ),
        )

        current_spend = (
            Decimal(
                0,
            )
            if current_spend_result is None
            else Decimal(
                current_spend_result,
            )
        )

        # Credits/refunds must not display negative consumed budget.
        current_spend = max(
            current_spend,
            Decimal(
                0,
            ),
        )

        monthly_limit = Decimal(
            budget.monthly_limit,
        )

        warning_threshold = Decimal(
            budget.warning_threshold,
        )

        critical_threshold = Decimal(
            budget.critical_threshold,
        )

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

        utilization_percentage = (
            current_spend
            / monthly_limit
            * Decimal(
                100,
            )
        )

        if utilization_percentage >= critical_threshold:
            evaluation_status = "critical"

        elif utilization_percentage >= warning_threshold:
            evaluation_status = "warning"

        else:
            evaluation_status = "healthy"

        return BudgetEvaluation(
            current_spend=current_spend,
            utilization_percentage=utilization_percentage,
            evaluation_status=evaluation_status,
            last_evaluated_at=evaluated_at,
        )

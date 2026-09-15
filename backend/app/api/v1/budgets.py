from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.dependencies import (
    CurrentTenant,
    DatabaseSession,
    TenantOwnerOrAdmin,
)
from app.models.budget import Budget
from app.models.cloud_account import CloudAccount
from app.schemas.budget import BudgetCreate, BudgetRead, BudgetUpdate
from app.services.budget_evaluation_service import BudgetEvaluationService

router = APIRouter()


async def _get_tenant_budget(
    *,
    budget_id: UUID,
    organization_id: UUID,
    session: DatabaseSession,
) -> Budget:
    """Return a budget only when it belongs to the selected organization."""

    result = await session.execute(
        select(
            Budget,
        ).where(
            Budget.id == budget_id,
            Budget.organization_id == organization_id,
        ),
    )

    budget = result.scalar_one_or_none()

    if budget is None:
        # 404 intentionally avoids revealing another tenant's budget.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found.",
        )

    return budget


async def _validate_account_scope(
    *,
    scope_value: str,
    organization_id: UUID,
    session: DatabaseSession,
) -> None:
    """Require account-budget scopes to reference this organization."""

    try:
        cloud_account_id = UUID(
            scope_value,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Account budget scope must reference a valid cloud account.",
        ) from error

    result = await session.execute(
        select(
            CloudAccount.id,
        ).where(
            CloudAccount.id == cloud_account_id,
            CloudAccount.organization_id == organization_id,
        ),
    )

    if result.scalar_one_or_none() is None:
        # Keep the message generic for cross-tenant UUID probes.
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Selected cloud account is unavailable.",
        )


def _with_evaluation(
    *,
    budget: Budget,
    evaluation,
) -> BudgetRead:
    """Serialize one budget together with its calculated state."""

    budget_read = BudgetRead.model_validate(
        budget,
    )

    return budget_read.model_copy(
        update={
            "current_spend": evaluation.current_spend,
            "utilization_percentage": evaluation.utilization_percentage,
            "evaluation_status": evaluation.evaluation_status,
            "last_evaluated_at": evaluation.last_evaluated_at,
        },
    )


@router.get(
    "",
    response_model=list[BudgetRead],
)
async def list_budgets(
    tenant: CurrentTenant,
    session: DatabaseSession,
) -> list[BudgetRead]:
    """List only budgets owned by the active organization."""

    result = await session.execute(
        select(
            Budget,
        )
        .where(
            Budget.organization_id == tenant.organization_id,
        )
        .order_by(
            Budget.created_at.desc(),
        ),
    )

    budgets = result.scalars().all()

    evaluation_service = BudgetEvaluationService(
        session,
    )

    responses: list[BudgetRead] = []

    for budget in budgets:
        evaluation = await evaluation_service.evaluate(
            budget=budget,
            organization_id=tenant.organization_id,
        )

        responses.append(
            _with_evaluation(
                budget=budget,
                evaluation=evaluation,
            )
        )

    return responses


@router.post(
    "",
    response_model=BudgetRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_budget(
    payload: BudgetCreate,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> BudgetRead:
    """Create a budget inside the active organization."""

    if payload.critical_threshold < payload.warning_threshold:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Critical threshold must be greater than or equal to warning threshold."
            ),
        )

    if payload.scope_type == "account":
        await _validate_account_scope(
            scope_value=payload.scope_value,
            organization_id=tenant.organization_id,
            session=session,
        )

    budget = Budget(
        organization_id=tenant.organization_id,
        name=payload.name,
        scope_type=payload.scope_type,
        scope_value=payload.scope_value,
        monthly_limit=payload.monthly_limit,
        warning_threshold=payload.warning_threshold,
        critical_threshold=payload.critical_threshold,
        created_by_id=tenant.user_id,
    )

    session.add(
        budget,
    )

    await session.commit()

    await session.refresh(
        budget,
    )

    evaluation = await BudgetEvaluationService(
        session,
    ).evaluate(
        budget=budget,
        organization_id=tenant.organization_id,
    )

    return _with_evaluation(
        budget=budget,
        evaluation=evaluation,
    )


@router.patch(
    "/{budget_id}",
    response_model=BudgetRead,
)
async def update_budget(
    budget_id: UUID,
    payload: BudgetUpdate,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> BudgetRead:
    """Update only a budget belonging to this organization."""

    budget = await _get_tenant_budget(
        budget_id=budget_id,
        organization_id=tenant.organization_id,
        session=session,
    )

    changes = payload.model_dump(
        exclude_unset=True,
    )

    for field_name, value in changes.items():
        setattr(
            budget,
            field_name,
            value,
        )

    if budget.critical_threshold < budget.warning_threshold:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Critical threshold must be greater than or equal to warning threshold."
            ),
        )

    await session.commit()

    await session.refresh(
        budget,
    )

    evaluation = await BudgetEvaluationService(
        session,
    ).evaluate(
        budget=budget,
        organization_id=tenant.organization_id,
    )

    return _with_evaluation(
        budget=budget,
        evaluation=evaluation,
    )


@router.delete(
    "/{budget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_budget(
    budget_id: UUID,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> None:
    """Delete only a budget belonging to this organization."""

    budget = await _get_tenant_budget(
        budget_id=budget_id,
        organization_id=tenant.organization_id,
        session=session,
    )

    await session.delete(
        budget,
    )

    await session.commit()

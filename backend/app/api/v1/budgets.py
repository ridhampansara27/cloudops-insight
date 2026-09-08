# Import UUID typing.
from uuid import UUID

# Import FastAPI helpers.
from fastapi import (
    APIRouter,
    HTTPException,
    status,
)

# Import SQLAlchemy selection.
from sqlalchemy import select

# Import API dependencies.
from app.api.dependencies import (
    CurrentUser,
    DatabaseSession,
)

# Import Budget ORM model.
from app.models.budget import Budget

# Import connected cloud accounts for account-scope validation.
from app.models.cloud_account import CloudAccount

# Import budget schemas.
from app.schemas.budget import (
    BudgetCreate,
    BudgetRead,
    BudgetUpdate,
)

# Import real budget evaluation.
from app.services.budget_evaluation_service import (
    BudgetEvaluationService,
)

# Create the budget router.
router = APIRouter()


# List all configured budgets.
@router.get(
    "",
    response_model=list[BudgetRead],
)
async def list_budgets(
    # Require authentication.
    current_user: CurrentUser,
    # Receive database session.
    session: DatabaseSession,
) -> list[BudgetRead]:
    # Mark authentication as intentionally required.
    del current_user

    # Query budgets in creation order.
    result = await session.execute(
        select(
            Budget,
        ).order_by(
            Budget.created_at.desc(),
        ),
    )

    # Retrieve ORM objects.
    budgets = result.scalars().all()

    # Create the budget evaluation service.
    evaluation_service = BudgetEvaluationService(
        session,
    )

    # Store evaluated budget responses.
    responses: list[BudgetRead] = []

    # Evaluate every configured budget.
    for budget in budgets:
        # Calculate real current spend and utilization.
        evaluation = await evaluation_service.evaluate(
            budget,
        )

        # Serialize persisted budget fields.
        budget_read = BudgetRead.model_validate(
            budget,
        )

        # Add calculated budget evaluation fields.
        responses.append(
            budget_read.model_copy(
                update={
                    "current_spend": evaluation.current_spend,
                    "utilization_percentage": (evaluation.utilization_percentage),
                    "evaluation_status": (evaluation.evaluation_status),
                    "last_evaluated_at": (evaluation.last_evaluated_at),
                },
            ),
        )

    # Return evaluated budgets.
    return responses


# Create one budget.
@router.post(
    "",
    response_model=BudgetRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_budget(
    # Read request data.
    payload: BudgetCreate,
    # Resolve authenticated user.
    current_user: CurrentUser,
    # Receive database session.
    session: DatabaseSession,
) -> BudgetRead:
    # Reject inconsistent thresholds.
    if payload.critical_threshold < payload.warning_threshold:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Critical threshold must be greater than or equal to warning threshold."
            ),
        )

    # Validate account-scoped budgets against a genuine
    # connected CloudOps cloud account.
    if payload.scope_type == "account":
        try:
            cloud_account_id = UUID(
                payload.scope_value,
            )
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Account budget scope must reference a valid cloud account.",
            ) from error

        cloud_account = await session.get(
            CloudAccount,
            cloud_account_id,
        )

        if cloud_account is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Selected cloud account does not exist.",
            )

    # Build the ORM object.
    budget = Budget(
        name=payload.name,
        scope_type=payload.scope_type,
        scope_value=payload.scope_value,
        monthly_limit=payload.monthly_limit,
        warning_threshold=payload.warning_threshold,
        critical_threshold=payload.critical_threshold,
        created_by_id=current_user.id,
    )

    # Stage creation.
    session.add(
        budget,
    )

    # Persist it.
    await session.commit()

    # Reload generated fields.
    await session.refresh(
        budget,
    )

    # Evaluate the newly created budget.
    evaluation = await BudgetEvaluationService(
        session,
    ).evaluate(
        budget,
    )

    # Serialize persisted budget fields.
    budget_read = BudgetRead.model_validate(
        budget,
    )

    # Return the budget with calculated evaluation fields.
    return budget_read.model_copy(
        update={
            "current_spend": evaluation.current_spend,
            "utilization_percentage": (evaluation.utilization_percentage),
            "evaluation_status": (evaluation.evaluation_status),
            "last_evaluated_at": (evaluation.last_evaluated_at),
        },
    )


# Update an existing budget.
@router.patch(
    "/{budget_id}",
    response_model=BudgetRead,
)
async def update_budget(
    # Read budget UUID.
    budget_id: UUID,
    # Read requested changes.
    payload: BudgetUpdate,
    # Require authentication.
    current_user: CurrentUser,
    # Receive database session.
    session: DatabaseSession,
) -> BudgetRead:
    # Mark authentication as intentionally required.
    del current_user

    # Retrieve the budget.
    budget = await session.get(
        Budget,
        budget_id,
    )

    # Reject missing records.
    if budget is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found.",
        )

    # Extract supplied fields.
    changes = payload.model_dump(
        exclude_unset=True,
    )

    # Apply requested values.
    for field_name, value in changes.items():
        setattr(
            budget,
            field_name,
            value,
        )

    # Validate final threshold values.
    if budget.critical_threshold < budget.warning_threshold:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Critical threshold must be greater than or equal to warning threshold."
            ),
        )

    # Save changes.
    await session.commit()

    # Reload generated values.
    await session.refresh(
        budget,
    )

    # Evaluate the updated budget.
    evaluation = await BudgetEvaluationService(
        session,
    ).evaluate(
        budget,
    )

    # Serialize persisted budget fields.
    budget_read = BudgetRead.model_validate(
        budget,
    )

    # Return the updated budget with calculated evaluation fields.
    return budget_read.model_copy(
        update={
            "current_spend": evaluation.current_spend,
            "utilization_percentage": (evaluation.utilization_percentage),
            "evaluation_status": (evaluation.evaluation_status),
            "last_evaluated_at": (evaluation.last_evaluated_at),
        },
    )


# Delete a budget.
@router.delete(
    "/{budget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_budget(
    # Read budget UUID.
    budget_id: UUID,
    # Require authentication.
    current_user: CurrentUser,
    # Receive database session.
    session: DatabaseSession,
) -> None:
    # Mark authentication as intentionally required.
    del current_user

    # Retrieve budget.
    budget = await session.get(
        Budget,
        budget_id,
    )

    # Reject unknown budgets.
    if budget is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found.",
        )

    # Delete the ORM record.
    await session.delete(
        budget,
    )

    # Persist deletion.
    await session.commit()

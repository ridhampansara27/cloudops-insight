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

# Import budget schemas.
from app.schemas.budget import (
    BudgetCreate,
    BudgetRead,
    BudgetUpdate,
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

    # Serialize the results.
    return [
        BudgetRead.model_validate(
            budget,
        )
        for budget in budgets
    ]


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

    # Return the created budget.
    return BudgetRead.model_validate(
        budget,
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

    # Return updated budget.
    return BudgetRead.model_validate(
        budget,
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

# Import datetime, Decimal, and UUID types.
from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

# Import Pydantic helpers.
from pydantic import BaseModel, ConfigDict, Field


# Define the request used to create a budget.
class BudgetCreate(BaseModel):
    # Store the visible budget name.
    name: str = Field(
        min_length=1,
        max_length=160,
    )

    # Only expose scopes the current evaluator supports.
    scope_type: Literal[
        "account",
        "service",
    ]

    # Store the selected scope.
    scope_value: str = Field(
        min_length=1,
        max_length=255,
    )

    # Store the monthly spending limit.
    monthly_limit: Decimal = Field(
        gt=0,
    )

    # Store warning percentage.
    warning_threshold: int = Field(
        default=80,
        ge=1,
        le=100,
    )

    # Store critical percentage.
    critical_threshold: int = Field(
        default=100,
        ge=1,
        le=100,
    )


# Define fields that can be edited.
class BudgetUpdate(BaseModel):
    # Allow updating the visible name.
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=160,
    )

    # Allow changing the monthly limit.
    monthly_limit: Decimal | None = Field(
        default=None,
        gt=0,
    )

    # Allow changing the warning threshold.
    warning_threshold: int | None = Field(
        default=None,
        ge=1,
        le=100,
    )

    # Allow changing the critical threshold.
    critical_threshold: int | None = Field(
        default=None,
        ge=1,
        le=100,
    )

    # Allow disabling the budget.
    is_active: bool | None = None


# Define the public budget representation.
class BudgetRead(BaseModel):
    # Read fields directly from SQLAlchemy objects.
    model_config = ConfigDict(
        from_attributes=True,
    )

    # Return budget UUID.
    id: UUID

    # Return display name.
    name: str

    # Return scope type.
    scope_type: str

    # Return scope value.
    scope_value: str

    # Return monthly limit.
    monthly_limit: Decimal

    # Return warning percentage.
    warning_threshold: int

    # Return critical percentage.
    critical_threshold: int

    # Return whether evaluation is enabled.
    is_active: bool

    # Return creation time.
    created_at: datetime

    # Return modification time.
    updated_at: datetime

    # Return real current-month spending.
    current_spend: Decimal

    # Return percentage of the monthly budget already consumed.
    utilization_percentage: Decimal

    # Return the calculated budget health state.
    evaluation_status: str

    # Return when the budget evaluation was performed.
    last_evaluated_at: datetime | None

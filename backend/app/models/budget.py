# Import Decimal and UUID types.
from decimal import Decimal
from uuid import UUID

# Import SQLAlchemy constructs.
from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String

# Import ORM typing.
from sqlalchemy.orm import Mapped, mapped_column

# Import application database base.
from app.db.base import Base

# Import shared model mixins.
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


# Define one cloud spending budget.
class Budget(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    # Define the database table.
    __tablename__ = "budgets"

    # Store the budget display name.
    name: Mapped[str] = mapped_column(
        # Allow descriptive budget names.
        String(160),
        # Require a name.
        nullable=False,
    )

    # Store the dimension against which the budget applies.
    scope_type: Mapped[str] = mapped_column(
        # Support account, service, environment, and team.
        String(32),
        # Require a scope type.
        nullable=False,
    )

    # Store the selected scope value.
    scope_value: Mapped[str] = mapped_column(
        # Allow account IDs and descriptive scope values.
        String(255),
        # Require a scope value.
        nullable=False,
    )

    # Store the monthly monetary limit.
    monthly_limit: Mapped[Decimal] = mapped_column(
        # Store financial values accurately.
        Numeric(
            precision=18,
            scale=2,
        ),
        # Require a monthly limit.
        nullable=False,
    )

    # Store the warning threshold percentage.
    warning_threshold: Mapped[int] = mapped_column(
        # Use an integer percentage.
        Integer,
        # Warn at eighty percent by default.
        default=80,
        # Require the threshold.
        nullable=False,
    )

    # Store the critical threshold percentage.
    critical_threshold: Mapped[int] = mapped_column(
        # Use an integer percentage.
        Integer,
        # Mark one hundred percent as critical by default.
        default=100,
        # Require the threshold.
        nullable=False,
    )

    # Store whether the budget is currently evaluated.
    is_active: Mapped[bool] = mapped_column(
        # Use PostgreSQL boolean storage.
        Boolean,
        # Enable newly created budgets.
        default=True,
        # Require an active state.
        nullable=False,
    )

    # Store the user who created the budget.
    created_by_id: Mapped[UUID] = mapped_column(
        # Reference the users table.
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        # Require ownership.
        nullable=False,
    )

# Import Python date, decimal, and UUID types.
from datetime import date
from decimal import Decimal
from uuid import UUID

# Import SQLAlchemy database types and foreign keys.
from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String

# Import SQLAlchemy ORM typing.
from sqlalchemy.orm import Mapped, mapped_column

# Import the application database base.
from app.db.base import Base

# Import shared model mixins.
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


# Define one normalized cloud billing record.
class CostRecord(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    # Define the database table.
    __tablename__ = "cost_records"

    # Reference the cloud account responsible for the cost.
    cloud_account_id: Mapped[UUID] = mapped_column(
        # Delete billing records when the account is removed.
        ForeignKey(
            "cloud_accounts.id",
            ondelete="CASCADE",
        ),
        # Index account-based cost queries.
        index=True,
        # Require an account.
        nullable=False,
    )

    # Optionally map the cost directly to a discovered resource.
    resource_id: Mapped[UUID | None] = mapped_column(
        # Keep billing history even if the resource is removed.
        ForeignKey(
            "resources.id",
            ondelete="SET NULL",
        ),
        # Index resource-level cost queries.
        index=True,
        # Some costs cannot be mapped to a single resource.
        nullable=True,
    )

    # Store the billing date.
    usage_date: Mapped[date] = mapped_column(
        # Use PostgreSQL's date type.
        Date,
        # Index time-series queries.
        index=True,
        # Require a billing date.
        nullable=False,
    )

    # Store the normalized service.
    service: Mapped[str] = mapped_column(
        # Allow AWS service names.
        String(160),
        # Index service-cost queries.
        index=True,
        # Require a service.
        nullable=False,
    )

    # Store the type of cost.
    cost_type: Mapped[str] = mapped_column(
        # Support direct, shared, credit, tax, and adjustment values.
        String(64),
        # Default ordinary resource spending to direct.
        default="direct",
        # Require a cost classification.
        nullable=False,
    )

    # Store the monetary amount precisely.
    amount: Mapped[Decimal] = mapped_column(
        # Avoid floating-point errors in financial data.
        Numeric(
            precision=18,
            scale=6,
        ),
        # Require an amount.
        nullable=False,
    )

    # Store the billing currency.
    currency: Mapped[str] = mapped_column(
        # ISO currency codes fit inside eight characters.
        String(8),
        # AWS accounts commonly report USD unless converted.
        default="USD",
        # Require a currency.
        nullable=False,
    )

    # Track whether the provider marked the amount as estimated.
    is_estimated: Mapped[bool] = mapped_column(
        # Store a native boolean.
        Boolean,
        # Default imported records to final unless indicated otherwise.
        default=False,
        # Require the estimate flag.
        nullable=False,
    )

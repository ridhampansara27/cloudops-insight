# Import Decimal and UUID types.
from decimal import Decimal
from uuid import UUID

# Import SQLAlchemy constructs.
from sqlalchemy import ForeignKey, Numeric, String, Text

# Import ORM typing.
from sqlalchemy.orm import Mapped, mapped_column

# Import application database base.
from app.db.base import Base

# Import reusable model mixins.
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


# Define one FinOps optimization recommendation.
class Recommendation(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    # Define the database table.
    __tablename__ = "recommendations"

    # Reference the resource producing the recommendation.
    resource_id: Mapped[UUID] = mapped_column(
        # Remove recommendations with a permanently removed resource.
        ForeignKey(
            "resources.id",
            ondelete="CASCADE",
        ),
        # Index resource recommendation queries.
        index=True,
        # Require an affected resource.
        nullable=False,
    )

    # Store the recommendation category.
    recommendation_type: Mapped[str] = mapped_column(
        # Support values such as rightsizing and scheduling.
        String(80),
        # Require a type.
        nullable=False,
    )

    # Store a user-facing title.
    title: Mapped[str] = mapped_column(
        # Allow descriptive titles.
        String(255),
        # Require a title.
        nullable=False,
    )

    # Store recommendation details.
    description: Mapped[str] = mapped_column(
        # Allow long descriptive content.
        Text,
        # Require an explanation.
        nullable=False,
    )

    # Store the evidence that triggered the recommendation.
    evidence: Mapped[str] = mapped_column(
        # Allow detailed evidence.
        Text,
        # Require explainable evidence.
        nullable=False,
    )

    # Store estimated monthly savings.
    estimated_monthly_savings: Mapped[Decimal | None] = mapped_column(
        # Store monetary values accurately.
        Numeric(
            precision=18,
            scale=2,
        ),
        # Require an estimated saving.
        nullable=True,
    )

    # Store operational risk.
    risk: Mapped[str] = mapped_column(
        # Support low, medium, and high.
        String(32),
        # Require risk classification.
        nullable=False,
    )

    # Store recommendation confidence.
    confidence: Mapped[str] = mapped_column(
        # Support low, medium, and high.
        String(32),
        # Require confidence classification.
        nullable=False,
    )

    # Store workflow state.
    status: Mapped[str] = mapped_column(
        # Support open, accepted, dismissed, and resolved.
        String(32),
        # Start recommendations open.
        default="open",
        # Index recommendation workflow queries.
        index=True,
        # Require a state.
        nullable=False,
    )

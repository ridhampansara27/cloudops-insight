# Import datetime, Decimal, and UUID types.
from datetime import datetime
from decimal import Decimal
from uuid import UUID

# Import Pydantic helpers.
from pydantic import BaseModel, ConfigDict


# Define the public optimization recommendation.
class RecommendationRead(BaseModel):
    # Serialize SQLAlchemy ORM objects.
    model_config = ConfigDict(
        from_attributes=True,
    )

    # Return recommendation UUID.
    id: UUID

    # Return affected resource UUID.
    resource_id: UUID

    # Return recommendation category.
    recommendation_type: str

    # Return visible title.
    title: str

    # Return recommendation explanation.
    description: str

    # Return evidence used to generate it.
    evidence: str

    # Return estimated monthly saving.
    estimated_monthly_savings: Decimal | None

    # Return operational risk.
    risk: str

    # Return recommendation confidence.
    confidence: str

    # Return workflow status.
    status: str

    # Return creation time.
    created_at: datetime


# Define recommendation workflow changes.
class RecommendationStatusUpdate(BaseModel):
    # Store accepted, dismissed, resolved, or open.
    status: str

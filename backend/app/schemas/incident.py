# Import datetime and UUID types.
from datetime import datetime
from uuid import UUID

# Import Pydantic helpers.
from pydantic import BaseModel, ConfigDict


# Define incident API representation.
class IncidentRead(BaseModel):
    # Serialize SQLAlchemy ORM objects.
    model_config = ConfigDict(
        from_attributes=True,
    )

    # Return internal incident UUID.
    id: UUID

    # Return affected resource UUID.
    resource_id: UUID

    # Return severity.
    severity: str

    # Return incident title.
    title: str

    # Return extended description.
    description: str | None

    # Return workflow status.
    status: str

    # Return incident start time.
    started_at: datetime

    # Return acknowledgement time.
    acknowledged_at: datetime | None

    # Return resolution time.
    resolved_at: datetime | None


# Define a workflow status update.
class IncidentStatusUpdate(BaseModel):
    # Store the new workflow status.
    status: str

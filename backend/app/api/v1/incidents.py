# Import UTC-aware datetime utilities.
from datetime import UTC, datetime

# Import UUID typing.
from uuid import UUID

# Import FastAPI helpers.
from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    status,
)

# Import SQLAlchemy select.
from sqlalchemy import select

# Import dependencies.
from app.api.dependencies import (
    CurrentUser,
    DatabaseSession,
)

# Import incident model.
from app.models.incident import Incident

# Import schemas.
from app.schemas.incident import (
    IncidentRead,
    IncidentStatusUpdate,
)

# Create the incident router.
router = APIRouter()


# List incidents.
@router.get(
    "",
    response_model=list[IncidentRead],
)
async def list_incidents(
    # Require authentication.
    current_user: CurrentUser,
    # Receive database session.
    session: DatabaseSession,
    # Optionally filter severity.
    severity: str | None = Query(
        default=None,
    ),
    # Optionally filter workflow state.
    incident_status: str | None = Query(
        default=None,
        alias="status",
    ),
) -> list[IncidentRead]:
    # Mark authentication as intentionally required.
    del current_user

    # Start the query.
    statement = select(
        Incident,
    )

    # Apply severity filtering.
    if severity:
        statement = statement.where(
            Incident.severity == severity,
        )

    # Apply status filtering.
    if incident_status:
        statement = statement.where(
            Incident.status == incident_status,
        )

    # Show newest incidents first.
    statement = statement.order_by(
        Incident.started_at.desc(),
    )

    # Execute the query.
    result = await session.execute(
        statement,
    )

    # Return serialized incidents.
    return [
        IncidentRead.model_validate(
            incident,
        )
        for incident in result.scalars().all()
    ]


# Update incident workflow status.
@router.patch(
    "/{incident_id}/status",
    response_model=IncidentRead,
)
async def update_incident_status(
    # Read incident UUID.
    incident_id: UUID,
    # Read requested status.
    payload: IncidentStatusUpdate,
    # Resolve authenticated user.
    current_user: CurrentUser,
    # Receive database session.
    session: DatabaseSession,
) -> IncidentRead:
    # Define supported workflow states.
    allowed_statuses = {
        "open",
        "acknowledged",
        "investigating",
        "resolved",
    }

    # Validate status.
    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid incident status.",
        )

    # Retrieve the incident.
    incident = await session.get(
        Incident,
        incident_id,
    )

    # Reject missing incidents.
    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    # Capture the current UTC timestamp.
    now = datetime.now(
        UTC,
    )

    # Record first acknowledgement.
    if payload.status == "acknowledged" and incident.acknowledged_at is None:
        incident.acknowledged_at = now

    # Record resolution timestamp.
    if payload.status == "resolved":
        incident.resolved_at = now

    # Assign the acting user.
    incident.assigned_user_id = current_user.id

    # Update workflow status.
    incident.status = payload.status

    # Persist changes.
    await session.commit()

    # Reload the record.
    await session.refresh(
        incident,
    )

    # Return updated incident.
    return IncidentRead.model_validate(
        incident,
    )

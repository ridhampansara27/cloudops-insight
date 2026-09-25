from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.dependencies import (
    CurrentTenant,
    DatabaseSession,
    TenantWriteAccess,
)
from app.models.cloud_account import CloudAccount
from app.models.incident import Incident
from app.models.resource import CloudResource
from app.schemas.incident import IncidentRead, IncidentStatusUpdate

router = APIRouter()


@router.get(
    "",
    response_model=list[IncidentRead],
)
async def list_incidents(
    tenant: CurrentTenant,
    session: DatabaseSession,
    severity: str | None = Query(
        default=None,
    ),
    incident_status: str | None = Query(
        default=None,
        alias="status",
    ),
) -> list[IncidentRead]:
    """List incidents belonging only to the active organization."""

    statement = (
        select(
            Incident,
        )
        .join(
            CloudResource,
            CloudResource.id == Incident.resource_id,
        )
        .join(
            CloudAccount,
            CloudAccount.id == CloudResource.cloud_account_id,
        )
        .where(
            CloudAccount.organization_id == tenant.organization_id,
        )
    )

    if severity:
        statement = statement.where(
            Incident.severity == severity,
        )

    if incident_status:
        statement = statement.where(
            Incident.status == incident_status,
        )

    statement = statement.order_by(
        Incident.started_at.desc(),
    )

    result = await session.execute(
        statement,
    )

    return [
        IncidentRead.model_validate(
            incident,
        )
        for incident in result.scalars().all()
    ]


@router.patch(
    "/{incident_id}/status",
    response_model=IncidentRead,
)
async def update_incident_status(
    incident_id: UUID,
    payload: IncidentStatusUpdate,
    tenant: TenantWriteAccess,
    session: DatabaseSession,
) -> IncidentRead:
    """Change status only for an incident owned by this organization."""

    allowed_statuses = {
        "open",
        "acknowledged",
        "investigating",
        "resolved",
    }

    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid incident status.",
        )

    result = await session.execute(
        select(
            Incident,
        )
        .join(
            CloudResource,
            CloudResource.id == Incident.resource_id,
        )
        .join(
            CloudAccount,
            CloudAccount.id == CloudResource.cloud_account_id,
        )
        .where(
            Incident.id == incident_id,
            CloudAccount.organization_id == tenant.organization_id,
        ),
    )

    incident = result.scalar_one_or_none()

    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found.",
        )

    now = datetime.now(
        UTC,
    )

    if payload.status == "acknowledged" and incident.acknowledged_at is None:
        incident.acknowledged_at = now

    if payload.status == "resolved":
        incident.resolved_at = now

    incident.assigned_user_id = tenant.user_id
    incident.status = payload.status

    await session.commit()

    await session.refresh(
        incident,
    )

    return IncidentRead.model_validate(
        incident,
    )

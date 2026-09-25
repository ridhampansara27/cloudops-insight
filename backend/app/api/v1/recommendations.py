from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.dependencies import (
    CurrentTenant,
    DatabaseSession,
    TenantWriteAccess,
)
from app.models.cloud_account import CloudAccount
from app.models.recommendation import Recommendation
from app.models.resource import CloudResource
from app.schemas.recommendation import (
    RecommendationRead,
    RecommendationStatusUpdate,
)

router = APIRouter()


@router.get(
    "",
    response_model=list[RecommendationRead],
)
async def list_recommendations(
    tenant: CurrentTenant,
    session: DatabaseSession,
    recommendation_status: str | None = Query(
        default=None,
        alias="status",
    ),
    risk: str | None = Query(
        default=None,
    ),
) -> list[RecommendationRead]:
    """List recommendations belonging only to the active organization."""

    statement = (
        select(
            Recommendation,
        )
        .join(
            CloudResource,
            CloudResource.id == Recommendation.resource_id,
        )
        .join(
            CloudAccount,
            CloudAccount.id == CloudResource.cloud_account_id,
        )
        .where(
            CloudAccount.organization_id == tenant.organization_id,
        )
    )

    if recommendation_status:
        statement = statement.where(
            Recommendation.status == recommendation_status,
        )

    if risk:
        statement = statement.where(
            Recommendation.risk == risk,
        )

    statement = statement.order_by(
        Recommendation.created_at.desc(),
    )

    result = await session.execute(
        statement,
    )

    return [
        RecommendationRead.model_validate(
            recommendation,
        )
        for recommendation in result.scalars().all()
    ]


@router.patch(
    "/{recommendation_id}/status",
    response_model=RecommendationRead,
)
async def update_recommendation_status(
    recommendation_id: UUID,
    payload: RecommendationStatusUpdate,
    tenant: TenantWriteAccess,
    session: DatabaseSession,
) -> RecommendationRead:
    """Change status only for a tenant-owned recommendation."""

    allowed_statuses = {
        "open",
        "accepted",
        "dismissed",
        "resolved",
    }

    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid recommendation status.",
        )

    result = await session.execute(
        select(
            Recommendation,
        )
        .join(
            CloudResource,
            CloudResource.id == Recommendation.resource_id,
        )
        .join(
            CloudAccount,
            CloudAccount.id == CloudResource.cloud_account_id,
        )
        .where(
            Recommendation.id == recommendation_id,
            CloudAccount.organization_id == tenant.organization_id,
        ),
    )

    recommendation = result.scalar_one_or_none()

    if recommendation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found.",
        )

    recommendation.status = payload.status

    await session.commit()

    await session.refresh(
        recommendation,
    )

    return RecommendationRead.model_validate(
        recommendation,
    )

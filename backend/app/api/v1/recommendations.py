# Import UUID typing.
from uuid import UUID

# Import FastAPI helpers.
from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    status,
)

# Import SQLAlchemy selection.
from sqlalchemy import select

# Import request dependencies.
from app.api.dependencies import (
    CurrentUser,
    DatabaseSession,
)

# Import ORM model.
from app.models.recommendation import Recommendation

# Import schemas.
from app.schemas.recommendation import (
    RecommendationRead,
    RecommendationStatusUpdate,
)

# Create recommendation router.
router = APIRouter()


# List optimization recommendations.
@router.get(
    "",
    response_model=list[RecommendationRead],
)
async def list_recommendations(
    # Require authentication.
    current_user: CurrentUser,
    # Receive database session.
    session: DatabaseSession,
    # Optionally filter workflow state.
    recommendation_status: str | None = Query(
        default=None,
        alias="status",
    ),
    # Optionally filter risk.
    risk: str | None = Query(
        default=None,
    ),
) -> list[RecommendationRead]:
    # Mark authentication as intentionally required.
    del current_user

    # Start with all recommendations.
    statement = select(
        Recommendation,
    )

    # Apply workflow filter.
    if recommendation_status:
        statement = statement.where(
            Recommendation.status == recommendation_status,
        )

    # Apply risk filter.
    if risk:
        statement = statement.where(
            Recommendation.risk == risk,
        )

    # Show the newest recommendations first.
    statement = statement.order_by(
        Recommendation.created_at.desc(),
    )

    # Execute query.
    result = await session.execute(
        statement,
    )

    # Serialize ORM records.
    return [
        RecommendationRead.model_validate(
            recommendation,
        )
        for recommendation in result.scalars().all()
    ]


# Change recommendation workflow status.
@router.patch(
    "/{recommendation_id}/status",
    response_model=RecommendationRead,
)
async def update_recommendation_status(
    # Read recommendation UUID.
    recommendation_id: UUID,
    # Read new status.
    payload: RecommendationStatusUpdate,
    # Require authentication.
    current_user: CurrentUser,
    # Receive database session.
    session: DatabaseSession,
) -> RecommendationRead:
    # Mark authentication as intentionally required.
    del current_user

    # Define supported workflow states.
    allowed_statuses = {
        "open",
        "accepted",
        "dismissed",
        "resolved",
    }

    # Reject invalid state values.
    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid recommendation status.",
        )

    # Retrieve the recommendation.
    recommendation = await session.get(
        Recommendation,
        recommendation_id,
    )

    # Reject unknown recommendations.
    if recommendation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found.",
        )

    # Apply workflow state.
    recommendation.status = payload.status

    # Persist the update.
    await session.commit()

    # Reload the record.
    await session.refresh(
        recommendation,
    )

    # Return updated data.
    return RecommendationRead.model_validate(
        recommendation,
    )

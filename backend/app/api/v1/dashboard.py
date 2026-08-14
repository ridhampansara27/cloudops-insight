# Import UTC-aware datetime helpers.
from datetime import UTC, datetime

# Import FastAPI router.
from fastapi import APIRouter

# Import SQLAlchemy aggregation helpers.
from sqlalchemy import func, select

# Import request dependencies.
from app.api.dependencies import (
    CurrentUser,
    DatabaseSession,
)

# Import ORM models.
from app.models.cost import CostRecord
from app.models.incident import Incident
from app.models.recommendation import Recommendation
from app.models.resource import CloudResource

# Import response schema.
from app.schemas.dashboard import DashboardSummary

# Create the dashboard API router.
router = APIRouter()


# Return dashboard KPIs.
@router.get(
    "/summary",
    response_model=DashboardSummary,
)
async def get_dashboard_summary(
    # Require an authenticated user.
    current_user: CurrentUser,
    # Receive the database session.
    session: DatabaseSession,
) -> DashboardSummary:
    # Mark authentication as intentionally required.
    del current_user

    # Determine today's date using an explicit UTC timezone.
    today = datetime.now(
        UTC,
    ).date()

    # Create the month boundary used by cost queries.
    month_start = today.replace(
        day=1,
    )

    # Count all resources.
    total_resources = await session.scalar(
        select(
            func.count(
                CloudResource.id,
            ),
        ),
    )

    # Count healthy resources.
    healthy_resources = await session.scalar(
        select(
            func.count(
                CloudResource.id,
            ),
        ).where(
            CloudResource.health_state == "healthy",
        ),
    )

    # Count warning resources.
    warning_resources = await session.scalar(
        select(
            func.count(
                CloudResource.id,
            ),
        ).where(
            CloudResource.health_state == "warning",
        ),
    )

    # Count critical resources.
    critical_resources = await session.scalar(
        select(
            func.count(
                CloudResource.id,
            ),
        ).where(
            CloudResource.health_state == "critical",
        ),
    )

    # Count incidents that have not been resolved.
    active_incidents = await session.scalar(
        select(
            func.count(
                Incident.id,
            ),
        ).where(
            Incident.status != "resolved",
        ),
    )

    # Sum costs belonging to the current month.
    month_to_date_cost = await session.scalar(
        select(
            func.coalesce(
                func.sum(
                    CostRecord.amount,
                ),
                0,
            ),
        ).where(
            CostRecord.usage_date >= month_start,
        ),
    )

    # Sum savings from currently open recommendations.
    potential_savings = await session.scalar(
        select(
            func.coalesce(
                func.sum(
                    Recommendation.estimated_monthly_savings,
                ),
                0,
            ),
        ).where(
            Recommendation.status == "open",
        ),
    )

    # Return the aggregated dashboard data.
    return DashboardSummary(
        total_resources=int(
            total_resources or 0,
        ),
        healthy_resources=int(
            healthy_resources or 0,
        ),
        warning_resources=int(
            warning_resources or 0,
        ),
        critical_resources=int(
            critical_resources or 0,
        ),
        active_incidents=int(
            active_incidents or 0,
        ),
        month_to_date_cost=float(
            month_to_date_cost or 0,
        ),
        potential_monthly_savings=float(
            potential_savings or 0,
        ),
        currency="USD",
    )

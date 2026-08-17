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

# Import cloud-account model.
from app.models.cloud_account import (
    CloudAccount,
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

    # Count all currently active resources.
    total_resources = await session.scalar(
        select(
            func.count(
                CloudResource.id,
            ),
        ).where(
            # Ignore resources that disappeared from AWS.
            CloudResource.is_active.is_(
                True,
            ),
        ),
    )

    # Count currently active healthy resources.
    healthy_resources = await session.scalar(
        select(
            func.count(
                CloudResource.id,
            ),
        ).where(
            # Ignore resources that disappeared from AWS.
            CloudResource.is_active.is_(
                True,
            ),
            # Count only healthy resources.
            CloudResource.health_state == "healthy",
        ),
    )

    # Count currently active warning resources.
    warning_resources = await session.scalar(
        select(
            func.count(
                CloudResource.id,
            ),
        ).where(
            # Ignore resources that disappeared from AWS.
            CloudResource.is_active.is_(
                True,
            ),
            # Count only warning resources.
            CloudResource.health_state == "warning",
        ),
    )

    # Count currently active critical resources.
    critical_resources = await session.scalar(
        select(
            func.count(
                CloudResource.id,
            ),
        ).where(
            # Ignore resources that disappeared from AWS.
            CloudResource.is_active.is_(
                True,
            ),
            # Count only critical resources.
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
            # Count only AWS service-level aggregate records.
            CostRecord.cost_type == "service_aggregate",
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

    # Determine the most recent successful resource sync.
    last_resource_sync_at = await session.scalar(
        select(
            func.max(
                CloudAccount.last_synced_at,
            ),
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
        # Return the latest AWS inventory synchronization timestamp.
        last_resource_sync_at=(last_resource_sync_at),
    )

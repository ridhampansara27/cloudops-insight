# Import UTC-aware datetime helpers.
from datetime import UTC, datetime

# Import FastAPI routing.
from fastapi import APIRouter

# Import SQLAlchemy aggregation helpers.
from sqlalchemy import func, select

# Import request dependencies.
from app.api.dependencies import (
    CurrentUser,
    DatabaseSession,
)

# Import the cost model.
from app.models.cost import CostRecord

# Import cost response schemas.
from app.schemas.cost import (
    CostSummaryRead,
    DailyCostRead,
    ServiceCostRead,
)

# Create the cost API router.
router = APIRouter()


# Return cost information for the current month.
@router.get(
    "/summary",
    response_model=CostSummaryRead,
)
async def get_cost_summary(
    # Require authentication.
    current_user: CurrentUser,
    # Receive the database session.
    session: DatabaseSession,
) -> CostSummaryRead:
    # Mark authentication as intentionally required.
    del current_user

    # Determine today's date using an explicit UTC timezone.
    today = datetime.now(
        UTC,
    ).date()

    # Create the first day of the current month.
    month_start = today.replace(
        day=1,
    )

    # Calculate the current month's service-level total.
    month_total_result = await session.scalar(
        select(
            func.coalesce(
                func.sum(
                    CostRecord.amount,
                ),
                0,
            ),
        ).where(
            CostRecord.cost_type == "service_aggregate",
            CostRecord.usage_date >= month_start,
        ),
    )

    # Aggregate spending by cloud service.
    service_result = await session.execute(
        select(
            CostRecord.service,
            func.sum(
                CostRecord.amount,
            ).label(
                "amount",
            ),
        )
        .where(
            CostRecord.cost_type == "service_aggregate",
            CostRecord.usage_date >= month_start,
        )
        .group_by(
            CostRecord.service,
        )
        .order_by(
            func.sum(
                CostRecord.amount,
            ).desc(),
        ),
    )

    # Aggregate spending by billing date.
    daily_result = await session.execute(
        select(
            CostRecord.usage_date,
            func.sum(
                CostRecord.amount,
            ).label(
                "amount",
            ),
        )
        .where(
            CostRecord.cost_type == "service_aggregate",
            CostRecord.usage_date >= month_start,
        )
        .group_by(
            CostRecord.usage_date,
        )
        .order_by(
            CostRecord.usage_date.asc(),
        ),
    )

    # Determine whether mapped resource-level cost records exist.
    resource_level_count = await session.scalar(
        select(
            func.count(
                CostRecord.id,
            ),
        ).where(
            CostRecord.cost_type == "resource_direct",
            CostRecord.resource_id.is_not(None),
            CostRecord.usage_date >= month_start,
        ),
    )

    # Read the actual reporting currency from imported records.
    currency_result = await session.scalar(
        select(
            CostRecord.currency,
        )
        .where(
            CostRecord.cost_type == "service_aggregate",
            CostRecord.usage_date >= month_start,
        )
        .order_by(
            CostRecord.usage_date.desc(),
        )
        .limit(1),
    )

    # Convert service rows into API models.
    service_costs = [
        ServiceCostRead(
            service=row.service,
            amount=float(
                row.amount,
            ),
        )
        for row in service_result.all()
    ]

    # Convert daily rows into API models.
    daily_costs = [
        DailyCostRead(
            date=row.usage_date,
            amount=float(
                row.amount,
            ),
        )
        for row in daily_result.all()
    ]

    # Return only genuine imported AWS billing information.
    return CostSummaryRead(
        month_to_date=float(
            month_total_result or 0,
        ),
        by_service=service_costs,
        daily=daily_costs,
        currency=(currency_result or "USD"),
        resource_level_available=bool(
            resource_level_count,
        ),
    )

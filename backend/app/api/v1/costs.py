from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.dependencies import CurrentTenant, DatabaseSession
from app.models.cloud_account import CloudAccount
from app.models.cost import CostRecord
from app.schemas.cost import (
    CostSummaryRead,
    DailyCostRead,
    ServiceCostRead,
)

router = APIRouter()


@router.get(
    "/summary",
    response_model=CostSummaryRead,
)
async def get_cost_summary(
    tenant: CurrentTenant,
    session: DatabaseSession,
) -> CostSummaryRead:
    """Return only billing records owned by the active organization."""

    today = datetime.now(
        UTC,
    ).date()

    month_start = today.replace(
        day=1,
    )

    tenant_cost_filters = (
        CloudAccount.organization_id == tenant.organization_id,
        CostRecord.cost_type == "service_aggregate",
        CostRecord.usage_date >= month_start,
    )

    month_total_result = await session.scalar(
        select(
            func.coalesce(
                func.sum(
                    CostRecord.amount,
                ),
                0,
            ),
        )
        .join(
            CloudAccount,
            CloudAccount.id == CostRecord.cloud_account_id,
        )
        .where(
            *tenant_cost_filters,
        ),
    )

    service_result = await session.execute(
        select(
            CostRecord.service,
            func.sum(
                CostRecord.amount,
            ).label(
                "amount",
            ),
        )
        .join(
            CloudAccount,
            CloudAccount.id == CostRecord.cloud_account_id,
        )
        .where(
            *tenant_cost_filters,
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

    daily_result = await session.execute(
        select(
            CostRecord.usage_date,
            func.sum(
                CostRecord.amount,
            ).label(
                "amount",
            ),
        )
        .join(
            CloudAccount,
            CloudAccount.id == CostRecord.cloud_account_id,
        )
        .where(
            *tenant_cost_filters,
        )
        .group_by(
            CostRecord.usage_date,
        )
        .order_by(
            CostRecord.usage_date.asc(),
        ),
    )

    resource_level_count = await session.scalar(
        select(
            func.count(
                CostRecord.id,
            ),
        )
        .join(
            CloudAccount,
            CloudAccount.id == CostRecord.cloud_account_id,
        )
        .where(
            CloudAccount.organization_id == tenant.organization_id,
            CostRecord.cost_type == "resource_direct",
            CostRecord.resource_id.is_not(None),
            CostRecord.usage_date >= month_start,
        ),
    )

    currency_result = await session.scalar(
        select(
            CostRecord.currency,
        )
        .join(
            CloudAccount,
            CloudAccount.id == CostRecord.cloud_account_id,
        )
        .where(
            *tenant_cost_filters,
        )
        .order_by(
            CostRecord.usage_date.desc(),
        )
        .limit(1),
    )

    return CostSummaryRead(
        month_to_date=float(
            month_total_result or 0,
        ),
        by_service=[
            ServiceCostRead(
                service=row.service,
                amount=float(
                    row.amount,
                ),
            )
            for row in service_result.all()
        ],
        daily=[
            DailyCostRead(
                date=row.usage_date,
                amount=float(
                    row.amount,
                ),
            )
            for row in daily_result.all()
        ],
        currency=currency_result or "USD",
        resource_level_available=bool(
            resource_level_count,
        ),
    )

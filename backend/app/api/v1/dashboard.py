from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.dependencies import CurrentTenant, DatabaseSession
from app.models.cloud_account import CloudAccount
from app.models.cost import CostRecord
from app.models.incident import Incident
from app.models.recommendation import Recommendation
from app.models.resource import CloudResource
from app.schemas.dashboard import DashboardSummary

router = APIRouter()


@router.get(
    "/summary",
    response_model=DashboardSummary,
)
async def get_dashboard_summary(
    tenant: CurrentTenant,
    session: DatabaseSession,
) -> DashboardSummary:
    """Return KPIs from only the active organization."""

    organization_id = tenant.organization_id

    today = datetime.now(
        UTC,
    ).date()

    month_start = today.replace(
        day=1,
    )

    async def count_resources(
        health_state: str | None = None,
    ) -> int:
        statement = (
            select(
                func.count(
                    CloudResource.id,
                ),
            )
            .join(
                CloudAccount,
                CloudAccount.id == CloudResource.cloud_account_id,
            )
            .where(
                CloudAccount.organization_id == organization_id,
                CloudResource.is_active.is_(True),
            )
        )

        if health_state is not None:
            statement = statement.where(
                CloudResource.health_state == health_state,
            )

        result = await session.scalar(
            statement,
        )

        return int(
            result or 0,
        )

    total_resources = await count_resources()
    healthy_resources = await count_resources(
        "healthy",
    )
    warning_resources = await count_resources(
        "warning",
    )
    critical_resources = await count_resources(
        "critical",
    )

    active_incidents = await session.scalar(
        select(
            func.count(
                Incident.id,
            ),
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
            CloudAccount.organization_id == organization_id,
            Incident.status != "resolved",
        ),
    )

    month_to_date_cost = await session.scalar(
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
            CloudAccount.organization_id == organization_id,
            CostRecord.cost_type == "service_aggregate",
            CostRecord.usage_date >= month_start,
        ),
    )

    potential_savings = await session.scalar(
        select(
            func.coalesce(
                func.sum(
                    Recommendation.estimated_monthly_savings,
                ),
                0,
            ),
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
            CloudAccount.organization_id == organization_id,
            Recommendation.status == "open",
        ),
    )

    last_resource_sync_at = await session.scalar(
        select(
            func.max(
                CloudAccount.last_synced_at,
            ),
        ).where(
            CloudAccount.organization_id == organization_id,
        ),
    )

    currency = await session.scalar(
        select(
            CostRecord.currency,
        )
        .join(
            CloudAccount,
            CloudAccount.id == CostRecord.cloud_account_id,
        )
        .where(
            CloudAccount.organization_id == organization_id,
            CostRecord.cost_type == "service_aggregate",
            CostRecord.usage_date >= month_start,
        )
        .order_by(
            CostRecord.usage_date.desc(),
        )
        .limit(1),
    )

    return DashboardSummary(
        total_resources=total_resources,
        healthy_resources=healthy_resources,
        warning_resources=warning_resources,
        critical_resources=critical_resources,
        active_incidents=int(
            active_incidents or 0,
        ),
        month_to_date_cost=float(
            month_to_date_cost or 0,
        ),
        potential_monthly_savings=float(
            potential_savings or 0,
        ),
        currency=currency or "USD",
        last_resource_sync_at=last_resource_sync_at,
    )

from datetime import UTC, datetime, timedelta
from math import ceil
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.dependencies import CurrentTenant, DatabaseSession
from app.repositories.metric_repository import MetricRepository
from app.repositories.resource_repository import ResourceRepository
from app.schemas.metric import MetricPointRead, MetricSeriesRead
from app.schemas.resource import ResourceListResponse, ResourceRead

router = APIRouter()


@router.get(
    "",
    response_model=ResourceListResponse,
)
async def list_resources(
    tenant: CurrentTenant,
    session: DatabaseSession,
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    search: str | None = Query(
        default=None,
        max_length=255,
    ),
    service: str | None = Query(
        default=None,
    ),
    environment: str | None = Query(
        default=None,
    ),
    health_state: str | None = Query(
        default=None,
    ),
) -> ResourceListResponse:
    resources, total = await ResourceRepository(
        session,
    ).list_resources(
        organization_id=tenant.organization_id,
        page=page,
        page_size=page_size,
        search=search,
        service=service,
        environment=environment,
        health_state=health_state,
    )

    total_pages = (
        ceil(
            total / page_size,
        )
        if total > 0
        else 0
    )

    return ResourceListResponse(
        items=[
            ResourceRead.model_validate(
                resource,
            )
            for resource in resources
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{resource_id}",
    response_model=ResourceRead,
)
async def get_resource(
    resource_id: UUID,
    tenant: CurrentTenant,
    session: DatabaseSession,
) -> ResourceRead:
    resource = await ResourceRepository(
        session,
    ).get_by_id(
        resource_id=resource_id,
        organization_id=tenant.organization_id,
    )

    if resource is None:
        # 404 intentionally hides cross-tenant resource existence.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found.",
        )

    return ResourceRead.model_validate(
        resource,
    )


@router.get(
    "/{resource_id}/metrics",
    response_model=list[MetricSeriesRead],
)
async def get_resource_metrics(
    resource_id: UUID,
    tenant: CurrentTenant,
    session: DatabaseSession,
    hours: int = Query(
        default=24,
        ge=1,
        le=168,
    ),
) -> list[MetricSeriesRead]:
    # Establish resource ownership before querying its metric samples.
    resource = await ResourceRepository(
        session,
    ).get_by_id(
        resource_id=resource_id,
        organization_id=tenant.organization_id,
    )

    if resource is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found.",
        )

    start_time = datetime.now(
        UTC,
    ) - timedelta(
        hours=hours,
    )

    samples = await MetricRepository(
        session,
    ).get_resource_metrics(
        resource_id=resource_id,
        start_time=start_time,
    )

    grouped: dict[
        tuple[
            str,
            str,
            str,
            str | None,
        ],
        list[MetricPointRead],
    ] = {}

    for sample in samples:
        key = (
            sample.namespace,
            sample.metric_name,
            sample.statistic,
            sample.unit,
        )

        grouped.setdefault(
            key,
            [],
        ).append(
            MetricPointRead(
                timestamp=sample.timestamp,
                value=sample.value,
            ),
        )

    return [
        MetricSeriesRead(
            namespace=namespace,
            metric_name=metric_name,
            statistic=statistic,
            unit=unit,
            points=points,
        )
        for (
            namespace,
            metric_name,
            statistic,
            unit,
        ), points in grouped.items()
    ]

"""Tenant-aware cloud resource persistence."""

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cloud_account import CloudAccount
from app.models.resource import CloudResource


class ResourceRepository:
    """Query cloud resources only through their owning cloud account."""

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    async def list_resources(
        self,
        *,
        organization_id: UUID,
        page: int,
        page_size: int,
        search: str | None = None,
        service: str | None = None,
        environment: str | None = None,
        health_state: str | None = None,
    ) -> tuple[
        list[CloudResource],
        int,
    ]:
        """Return one organization's active cloud inventory."""

        filters = [
            CloudAccount.organization_id == organization_id,
            CloudResource.is_active.is_(True),
        ]

        if search:
            pattern = f"%{search.strip()}%"

            filters.append(
                or_(
                    CloudResource.name.ilike(
                        pattern,
                    ),
                    CloudResource.provider_resource_id.ilike(
                        pattern,
                    ),
                ),
            )

        if service:
            filters.append(
                CloudResource.service == service,
            )

        if environment:
            filters.append(
                CloudResource.environment == environment,
            )

        if health_state:
            filters.append(
                CloudResource.health_state == health_state,
            )

        statement = (
            select(
                CloudResource,
            )
            .join(
                CloudAccount,
                CloudAccount.id == CloudResource.cloud_account_id,
            )
            .where(
                *filters,
            )
        )

        count_statement = (
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
                *filters,
            )
        )

        offset = (page - 1) * page_size

        statement = (
            statement.order_by(
                CloudResource.name.asc(),
                CloudResource.id.asc(),
            )
            .offset(
                offset,
            )
            .limit(
                page_size,
            )
        )

        result = await self.session.execute(
            statement,
        )

        total_result = await self.session.execute(
            count_statement,
        )

        return (
            list(
                result.scalars().all(),
            ),
            int(
                total_result.scalar_one(),
            ),
        )

    async def get_by_id(
        self,
        *,
        resource_id: UUID,
        organization_id: UUID,
    ) -> CloudResource | None:
        """Return an active resource only from the selected organization."""

        statement = (
            select(
                CloudResource,
            )
            .join(
                CloudAccount,
                CloudAccount.id == CloudResource.cloud_account_id,
            )
            .where(
                CloudResource.id == resource_id,
                CloudResource.is_active.is_(True),
                CloudAccount.organization_id == organization_id,
            )
        )

        result = await self.session.execute(
            statement,
        )

        return result.scalar_one_or_none()

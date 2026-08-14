"""Resource inventory business logic."""

import math
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.resource_repository import ResourceRepository
from app.schemas.resource import ResourceListResponse


class ResourceService:
    """Business logic for resource inventory."""

    def __init__(self, session: AsyncSession) -> None:
        self.repository = ResourceRepository(session)

    async def list_resources(
        self,
        user_id: UUID,
        *,
        page: int,
        page_size: int,
        search: str | None,
        service: str | None,
        environment: str | None,
        health: str | None,
    ) -> ResourceListResponse:
        """Return paginated resources."""

        items, total = await self.repository.list_for_user(
            user_id,
            page=page,
            page_size=page_size,
            search=search,
            service=service,
            environment=environment,
            health=health,
        )

        pages = math.ceil(total / page_size) if total else 0

        return ResourceListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
        )

    async def get_resource(
        self,
        resource_id: UUID,
        user_id: UUID,
    ):
        """Return one resource or 404."""

        resource = await self.repository.get_for_user(
            resource_id,
            user_id,
        )

        if resource is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resource not found",
            )

        return resource

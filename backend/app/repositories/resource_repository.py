# Import UUID typing.
from uuid import UUID

# Import SQLAlchemy query helpers.
from sqlalchemy import func, or_, select

# Import the asynchronous database session.
from sqlalchemy.ext.asyncio import AsyncSession

# Import the resource ORM model.
from app.models.resource import CloudResource


# Encapsulate resource-inventory database operations.
class ResourceRepository:
    # Store the request-scoped SQLAlchemy session.
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        # Save the database session.
        self.session = session

    # Retrieve filtered and paginated resources.
    async def list_resources(
        self,
        *,
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
        # Start with the resource table.
        # Always show only resources present in the latest successful discovery.
        filters = [
            CloudResource.is_active.is_(
                True,
            ),
        ]

        # Apply free-text resource search.
        if search:
            # Build a case-insensitive search pattern.
            pattern = f"%{search.strip()}%"

            # Search both visible names and provider identifiers.
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

        # Apply service filtering.
        if service:
            filters.append(
                CloudResource.service == service,
            )

        # Apply environment filtering.
        if environment:
            filters.append(
                CloudResource.environment == environment,
            )

        # Apply health filtering.
        if health_state:
            filters.append(
                CloudResource.health_state == health_state,
            )

        # Create the data query.
        statement = select(
            CloudResource,
        )

        # Create the matching-row count.
        count_statement = select(
            func.count(
                CloudResource.id,
            ),
        )

        # Apply the same filters to both queries.
        if filters:
            statement = statement.where(
                *filters,
            )

            count_statement = count_statement.where(
                *filters,
            )

        # Calculate the SQL offset.
        offset = (page - 1) * page_size

        # Apply deterministic ordering and pagination.
        statement = (
            statement.order_by(
                CloudResource.name.asc(),
            )
            .offset(
                offset,
            )
            .limit(
                page_size,
            )
        )

        # Execute the resource query.
        result = await self.session.execute(
            statement,
        )

        # Execute the count query.
        total_result = await self.session.execute(
            count_statement,
        )

        # Convert the returned ORM resources into a list.
        resources = list(
            result.scalars().all(),
        )

        # Read the total matching row count.
        total = int(
            total_result.scalar_one(),
        )

        # Return both resources and total count.
        return resources, total

    # Retrieve one resource.
    async def get_by_id(
        self,
        resource_id: UUID,
    ) -> CloudResource | None:
        # Build an active-resource detail query.
        statement = select(
            CloudResource,
        ).where(
            # Match requested UUID.
            CloudResource.id == resource_id,
            # Hide historical resources from normal inventory.
            CloudResource.is_active.is_(
                True,
            ),
        )

        # Execute the query.
        result = await self.session.execute(
            statement,
        )

        # Return the active resource when it exists.
        return result.scalar_one_or_none()

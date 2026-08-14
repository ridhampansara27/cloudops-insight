# Import the ceiling helper for page-count calculations.
from math import ceil

# Import UUID typing.
from uuid import UUID

# Import FastAPI routing helpers.
from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    status,
)

# Import authentication/database dependencies.
from app.api.dependencies import (
    CurrentUser,
    DatabaseSession,
)

# Import the resource repository.
from app.repositories.resource_repository import (
    ResourceRepository,
)

# Import response schemas.
from app.schemas.resource import (
    ResourceListResponse,
    ResourceRead,
)

# Create the resource API router.
router = APIRouter()


# List discovered cloud resources.
@router.get(
    "",
    response_model=ResourceListResponse,
)
async def list_resources(
    # Require authentication.
    current_user: CurrentUser,
    # Receive the database session.
    session: DatabaseSession,
    # Read the requested page.
    page: int = Query(
        default=1,
        ge=1,
    ),
    # Limit the maximum page size.
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    # Support free-text search.
    search: str | None = Query(
        default=None,
        max_length=255,
    ),
    # Support filtering by AWS service.
    service: str | None = Query(
        default=None,
    ),
    # Support filtering by environment.
    environment: str | None = Query(
        default=None,
    ),
    # Support filtering by normalized health.
    health_state: str | None = Query(
        default=None,
    ),
) -> ResourceListResponse:
    # Mark authentication as intentionally required.
    del current_user

    # Create the repository.
    repository = ResourceRepository(
        session,
    )

    # Retrieve resource records.
    resources, total = await repository.list_resources(
        page=page,
        page_size=page_size,
        search=search,
        service=service,
        environment=environment,
        health_state=health_state,
    )

    # Calculate the number of available pages.
    total_pages = (
        ceil(
            total / page_size,
        )
        if total > 0
        else 0
    )

    # Build the API response.
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


# Retrieve one resource by UUID.
@router.get(
    "/{resource_id}",
    response_model=ResourceRead,
)
async def get_resource(
    # Read the resource UUID.
    resource_id: UUID,
    # Require authentication.
    current_user: CurrentUser,
    # Receive the database session.
    session: DatabaseSession,
) -> ResourceRead:
    # Mark authentication as intentionally required.
    del current_user

    # Create the repository.
    repository = ResourceRepository(
        session,
    )

    # Retrieve the resource.
    resource = await repository.get_by_id(
        resource_id,
    )

    # Reject unknown resource identifiers.
    if resource is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found.",
        )

    # Return the serialized resource.
    return ResourceRead.model_validate(
        resource,
    )

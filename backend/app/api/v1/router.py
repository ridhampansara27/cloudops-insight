# Import FastAPI's router object.
from fastapi import APIRouter

# Import the authentication router.
from app.api.v1.auth import router as auth_router

# Import application settings.
from app.core.config import settings

# Create the version-one API router.
router = APIRouter()


# Attach authentication endpoints.
router.include_router(
    # Register authentication routes.
    auth_router,
    # Place them below /auth.
    prefix="/auth",
    # Group them in OpenAPI.
    tags=["Authentication"],
)


# Provide safe application runtime information.
@router.get(
    "/system/info",
    tags=["System"],
)
async def system_info() -> dict[str, str]:
    # Return non-sensitive application information.
    return {
        # Return the API name.
        "application": settings.app_name,
        # Return the active environment.
        "environment": settings.app_env,
        # Return the API version.
        "api_version": "v1",
    }

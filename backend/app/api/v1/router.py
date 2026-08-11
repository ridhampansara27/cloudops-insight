# Import FastAPI's router object.
from fastapi import APIRouter

# Import application settings.
from app.core.config import settings

# Create the API version-one router.
router = APIRouter()


# Provide basic non-sensitive API information.
@router.get("/system/info")
async def system_info() -> dict[str, str]:
    # Return safe runtime metadata.
    return {
        # Return the public application name.
        "application": settings.app_name,
        # Return the current application environment.
        "environment": settings.app_env,
        # Return the API version.
        "api_version": "v1",
    }

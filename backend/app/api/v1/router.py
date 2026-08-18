# Import FastAPI router support.
from fastapi import APIRouter

# Import version-one feature routers.
from app.api.v1.auth import router as auth_router
from app.api.v1.budgets import router as budgets_router
from app.api.v1.cloud_accounts import router as cloud_accounts_router
from app.api.v1.costs import router as costs_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.incidents import router as incidents_router
from app.api.v1.recommendations import router as recommendations_router
from app.api.v1.resources import router as resources_router

# Import application settings.
from app.core.config import settings

# Create the version-one API router.
router = APIRouter()


# Register authentication routes.
router.include_router(
    auth_router,
    prefix="/auth",
    tags=["Authentication"],
)


# Register cloud-account routes.
router.include_router(
    cloud_accounts_router,
    prefix="/cloud-accounts",
    tags=["Cloud Accounts"],
)


# Register resource-inventory routes.
router.include_router(
    resources_router,
    prefix="/resources",
    tags=["Resources"],
)


# Register dashboard routes.
router.include_router(
    dashboard_router,
    prefix="/dashboard",
    tags=["Dashboard"],
)


# Register cost-management routes.
router.include_router(
    costs_router,
    prefix="/costs",
    tags=["Costs"],
)


# Register budget routes.
router.include_router(
    budgets_router,
    prefix="/budgets",
    tags=["Budgets"],
)


# Register incident-management routes.
router.include_router(
    incidents_router,
    prefix="/incidents",
    tags=["Incidents"],
)


# Register optimization routes.
router.include_router(
    recommendations_router,
    prefix="/recommendations",
    tags=["Recommendations"],
)


# Return safe application runtime information.
@router.get(
    "/system/info",
    tags=["System"],
)
async def system_info() -> dict[str, str]:
    # Return non-sensitive runtime information.
    return {
        "application": settings.app_name,
        "environment": settings.app_env,
        "api_version": "v1",
    }

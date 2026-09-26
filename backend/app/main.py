# Import the asynchronous context-manager helper.
# Import the asynchronous-iterator type.
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

# Import FastAPI.
from fastapi import FastAPI

# Import CORS middleware.
from fastapi.middleware.cors import CORSMiddleware

# Import the health router.
from app.api.health import router as health_router

# Import the version-one application router.
from app.api.v1.router import router as api_v1_router

# Import Redis shutdown handling.
from app.cache.redis import close_redis

# Import application settings.
from app.core.config import settings

# Import API response security hardening.
from app.core.http_security import SecurityHeadersMiddleware

# Import logging configuration.
from app.core.logging import configure_logging

# Import the asynchronous database engine.
from app.db.session import engine

# Configure application logging before FastAPI starts.
configure_logging()


# Explicit browser methods supported by the current frontend/API contract.
CORS_ALLOWED_METHODS = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
]


# Explicit non-simple/custom headers used by CloudOps clients.
CORS_ALLOWED_HEADERS = [
    "Accept",
    "Authorization",
    "Content-Type",
    "X-Organization-ID",
]


# Expose only response headers that browser JavaScript may need.
CORS_EXPOSE_HEADERS = [
    "Retry-After",
]


def development_api_url(
    path: str,
) -> str | None:
    """Expose interactive API metadata outside production only."""

    if settings.is_production:
        return None

    return path


# Define application startup and shutdown lifecycle behavior.
@asynccontextmanager
async def lifespan(
    # Receive the running FastAPI instance.
    app: FastAPI,
) -> AsyncIterator[None]:
    # Explicitly mark the application argument as intentionally unused.
    del app

    # Allow FastAPI to start serving requests.
    yield

    # Close Redis connections during application shutdown.
    await close_redis()

    # Dispose SQLAlchemy's PostgreSQL connection pool.
    await engine.dispose()


# Create the FastAPI application.
app = FastAPI(
    # Define the API title shown by OpenAPI outside production.
    title=settings.app_name,
    # Describe the API in generated development documentation.
    description=(
        "Cloud resource monitoring, FinOps, incident management and optimization API."
    ),
    # Define the first backend API version.
    version="0.1.0",
    # Disable Swagger UI in production.
    docs_url=development_api_url(
        "/docs",
    ),
    # Disable ReDoc in production.
    redoc_url=development_api_url(
        "/redoc",
    ),
    # Disable the OpenAPI schema endpoint in production.
    openapi_url=development_api_url(
        "/openapi.json",
    ),
    # Attach startup and shutdown lifecycle handling.
    lifespan=lifespan,
)


# Configure cross-origin browser requests from explicitly approved frontend
# origins. Credential-bearing CORS must remain explicit rather than wildcarded.
app.add_middleware(
    CORSMiddleware,
    # Permit only configured frontend origins.
    allow_origins=settings.cors_origin_list,
    # Allow HttpOnly refresh cookies and Authorization headers.
    allow_credentials=True,
    # Permit only methods used by the CloudOps browser client.
    allow_methods=CORS_ALLOWED_METHODS,
    # Permit only headers required by the frontend API contract.
    allow_headers=CORS_ALLOWED_HEADERS,
    # Allow frontend code to read rate-limit retry information.
    expose_headers=CORS_EXPOSE_HEADERS,
    # Cache successful browser preflight decisions for ten minutes.
    max_age=600,
)


# Add this after CORS so it becomes the outer user middleware and therefore
# also hardens CORS preflight responses produced before routing.
app.add_middleware(
    SecurityHeadersMiddleware,
    api_prefix=settings.api_v1_prefix,
)


# Register infrastructure health endpoints.
app.include_router(
    health_router,
    prefix="/health",
    tags=["Health"],
)


# Register version-one API routes.
app.include_router(
    api_v1_router,
    prefix=settings.api_v1_prefix,
    tags=["System"],
)


# Provide a small API root endpoint.
@app.get("/")
async def root() -> dict[str, str]:
    """Return non-sensitive service discovery information."""

    response = {
        "service": settings.app_name,
        "status": "running",
    }

    # Development environments may advertise interactive documentation.
    if not settings.is_production:
        response["docs"] = "/docs"

    return response

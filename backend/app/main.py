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

# Import logging configuration.
from app.core.logging import configure_logging

# Import the asynchronous database engine.
from app.db.session import engine

# Configure application logging before FastAPI starts.
configure_logging()


# Define application startup and shutdown lifecycle behavior.
@asynccontextmanager
async def lifespan(
    # Receive the running FastAPI instance.
    app: FastAPI,
) -> AsyncIterator[None]:
    # Explicitly mark the application argument as intentionally unused for now.
    del app

    # Allow FastAPI to start serving requests.
    yield

    # Close Redis connections during application shutdown.
    await close_redis()

    # Dispose SQLAlchemy's PostgreSQL connection pool.
    await engine.dispose()


# Create the FastAPI application.
app = FastAPI(
    # Define the API title shown by OpenAPI.
    title=settings.app_name,
    # Describe the API in generated documentation.
    description=(
        "Cloud resource monitoring, FinOps, incident management and optimization API."
    ),
    # Define the first backend API version.
    version="0.1.0",
    # Attach startup and shutdown lifecycle handling.
    lifespan=lifespan,
)


# Configure cross-origin requests from the React frontend.
app.add_middleware(
    # Use FastAPI's CORS middleware.
    CORSMiddleware,
    # Permit only configured frontend origins.
    allow_origins=settings.cors_origin_list,
    # Allow browser credentials when needed later for authentication.
    allow_credentials=True,
    # Allow standard HTTP methods.
    allow_methods=["*"],
    # Allow standard API headers.
    allow_headers=["*"],
)


# Register infrastructure health endpoints.
app.include_router(
    # Attach the health router.
    health_router,
    # Expose the routes below /health.
    prefix="/health",
    # Group these routes in OpenAPI.
    tags=["Health"],
)


# Register version-one API routes.
app.include_router(
    # Attach version-one routes.
    api_v1_router,
    # Expose them beneath /api/v1.
    prefix=settings.api_v1_prefix,
    # Group them in OpenAPI.
    tags=["System"],
)


# Provide a small API root endpoint.
@app.get("/")
async def root() -> dict[str, str]:
    # Return basic discovery information.
    return {
        # Confirm the service identity.
        "service": settings.app_name,
        # Report service availability.
        "status": "running",
        # Tell developers where interactive documentation lives.
        "docs": "/docs",
    }

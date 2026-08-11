# Import Python logging.
import logging

# Import FastAPI routing support.
# Import FastAPI's response object so readiness can return HTTP 503.
from fastapi import APIRouter, Response

# Import SQLAlchemy's raw SQL expression helper.
from sqlalchemy import text

# Import the Redis client.
from app.cache.redis import redis_client

# Import the asynchronous database engine.
from app.db.session import engine

# Create the module logger.
logger = logging.getLogger(__name__)


# Create the health-check router.
router = APIRouter()


# Define the lightweight liveness probe.
@router.get("/live")
async def liveness() -> dict[str, str]:
    # Confirm that the FastAPI process itself is running.
    return {
        "status": "alive",
    }


# Define the dependency-aware readiness probe.
@router.get("/ready")
async def readiness(
    # Allow the endpoint to control the final HTTP status code.
    response: Response,
) -> dict[str, object]:
    # Assume readiness until a dependency check fails.
    ready = True

    # Store individual dependency results.
    checks: dict[str, str] = {}

    try:
        # Open an asynchronous PostgreSQL connection.
        async with engine.connect() as connection:
            # Execute the smallest practical PostgreSQL validation query.
            await connection.execute(
                text("SELECT 1"),
            )

        # Record successful database connectivity.
        checks["database"] = "available"

    except Exception:
        # Record the full failure in application logs.
        logger.exception(
            "PostgreSQL readiness check failed.",
        )

        # Record the failed dependency for the API consumer.
        checks["database"] = "unavailable"

        # Mark the application as not ready.
        ready = False

    try:
        # Send a lightweight Redis PING command.
        await redis_client.ping()

        # Record successful Redis connectivity.
        checks["redis"] = "available"

    except Exception:
        # Record the full Redis error in application logs.
        logger.exception(
            "Redis readiness check failed.",
        )

        # Record the failed dependency.
        checks["redis"] = "unavailable"

        # Mark the application as not ready.
        ready = False

    # Return HTTP 503 when a required dependency is unavailable.
    if not ready:
        # Change the successful default status code to service unavailable.
        response.status_code = 503

    # Return the overall readiness status and dependency details.
    return {
        # Report the application's overall readiness.
        "status": ("ready" if ready else "not_ready"),
        # Report each dependency independently.
        "checks": checks,
    }

# Import Redis' asyncio-compatible client.
from redis.asyncio import Redis

# Import application settings.
from app.core.config import settings

# Create the shared asynchronous Redis client.
redis_client = Redis.from_url(
    # Use the configured Redis connection URL.
    settings.redis_url,
    # Decode Redis byte responses into normal Python strings.
    decode_responses=True,
)


# Close Redis connections during application shutdown.
async def close_redis() -> None:
    # Explicitly close the asynchronous Redis client.
    await redis_client.aclose()

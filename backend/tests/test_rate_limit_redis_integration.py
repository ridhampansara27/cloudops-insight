"""Real Redis tests for distributed rate-limit atomicity."""

import asyncio
import os

import pytest
from fastapi import HTTPException
from redis.asyncio import Redis
from starlette.requests import Request

from app.core.config import settings
from app.services import rate_limit_service
from app.services.rate_limit_service import (
    RateLimitPolicy,
    enforce_rate_limit,
)

RATE_LIMIT_TEST_REDIS_URL = os.getenv(
    "RATE_LIMIT_TEST_REDIS_URL",
)


pytestmark = pytest.mark.skipif(
    not RATE_LIMIT_TEST_REDIS_URL,
    reason="RATE_LIMIT_TEST_REDIS_URL is required.",
)


def _request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/rate-limit-test",
            "headers": [],
            "client": (
                "203.0.113.44",
                50000,
            ),
            "server": (
                "testserver",
                80,
            ),
            "scheme": "https",
            "query_string": b"",
        },
    )


@pytest.mark.asyncio
async def test_real_redis_enforces_atomic_concurrent_limit(
    monkeypatch,
) -> None:
    """Concurrent requests cannot race past the configured limit."""

    assert RATE_LIMIT_TEST_REDIS_URL is not None

    client = Redis.from_url(
        RATE_LIMIT_TEST_REDIS_URL,
        decode_responses=True,
    )

    try:
        await client.flushdb()

        monkeypatch.setattr(
            settings,
            "rate_limit_enabled",
            True,
        )

        monkeypatch.setattr(
            rate_limit_service,
            "redis_client",
            client,
        )

        policy = RateLimitPolicy(
            "redis-concurrency",
            3,
            60,
        )

        results = await asyncio.gather(
            *[
                enforce_rate_limit(
                    _request(),
                    policy,
                    "person@example.com",
                    "opaque-bearer",
                )
                for _ in range(
                    5,
                )
            ],
            return_exceptions=True,
        )

        allowed = sum(result is None for result in results)

        rejected = [
            result
            for result in results
            if isinstance(
                result,
                HTTPException,
            )
        ]

        assert allowed == 3

        assert (
            len(
                rejected,
            )
            == 2
        )

        assert all(error.status_code == 429 for error in rejected)

        keys = await client.keys(
            "cloudops:rate-limit:*",
        )

        assert (
            len(
                keys,
            )
            == 1
        )

        assert "person@example.com" not in keys[0]

        assert "opaque-bearer" not in keys[0]

        ttl = await client.ttl(
            keys[0],
        )

        assert 1 <= ttl <= 60

    finally:
        await client.aclose()

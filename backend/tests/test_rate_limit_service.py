"""Unit tests for Redis-backed abuse protection."""

from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core.config import settings
from app.services import rate_limit_service
from app.services.rate_limit_service import (
    RateLimitPolicy,
    enforce_rate_limit,
    resolve_rate_limit_client_ip,
)


def _request(
    *,
    client_ip: str = "203.0.113.10",
    headers: list[
        tuple[
            bytes,
            bytes,
        ]
    ]
    | None = None,
) -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/auth/login",
            "headers": headers or [],
            "client": (
                client_ip,
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


def test_client_ip_ignores_forwarded_for(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "rate_limit_trust_cloudflare_connecting_ip",
        False,
    )

    request = _request(
        client_ip="203.0.113.10",
        headers=[
            (
                b"x-forwarded-for",
                b"198.51.100.99",
            ),
            (
                b"cf-connecting-ip",
                b"192.0.2.55",
            ),
        ],
    )

    assert (
        resolve_rate_limit_client_ip(
            request,
        )
        == "203.0.113.10"
    )


def test_cloudflare_ip_is_used_only_when_explicitly_trusted(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "rate_limit_trust_cloudflare_connecting_ip",
        True,
    )

    request = _request(
        client_ip="10.0.0.10",
        headers=[
            (
                b"cf-connecting-ip",
                b"2001:db8::1234",
            ),
        ],
    )

    assert (
        resolve_rate_limit_client_ip(
            request,
        )
        == "2001:db8::1234"
    )


@pytest.mark.asyncio
async def test_rate_limit_returns_429_and_retry_after(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "rate_limit_enabled",
        True,
    )

    eval_mock = AsyncMock(
        return_value=[
            6,
            42,
        ],
    )

    monkeypatch.setattr(
        rate_limit_service.redis_client,
        "eval",
        eval_mock,
    )

    with pytest.raises(
        HTTPException,
    ) as error:
        await enforce_rate_limit(
            _request(),
            RateLimitPolicy(
                "unit",
                5,
                60,
            ),
            "person@example.com",
            "super-secret-token",
        )

    assert error.value.status_code == 429

    assert error.value.headers == {
        "Retry-After": "42",
    }

    redis_key = str(
        eval_mock.await_args.args[2],
    )

    assert "person@example.com" not in redis_key

    assert "super-secret-token" not in redis_key


@pytest.mark.asyncio
async def test_rate_limit_redis_failure_fails_closed(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "rate_limit_enabled",
        True,
    )

    monkeypatch.setattr(
        rate_limit_service.redis_client,
        "eval",
        AsyncMock(
            side_effect=ConnectionError(
                "redis unavailable",
            ),
        ),
    )

    with pytest.raises(
        HTTPException,
    ) as error:
        await enforce_rate_limit(
            _request(),
            RateLimitPolicy(
                "unit-failure",
                5,
                60,
            ),
        )

    assert error.value.status_code == 503

    assert error.value.detail == "Request protection is temporarily unavailable."


@pytest.mark.asyncio
async def test_disabled_rate_limit_does_not_touch_redis(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "rate_limit_enabled",
        False,
    )

    eval_mock = AsyncMock()

    monkeypatch.setattr(
        rate_limit_service.redis_client,
        "eval",
        eval_mock,
    )

    await enforce_rate_limit(
        _request(),
        RateLimitPolicy(
            "disabled",
            1,
            60,
        ),
    )

    eval_mock.assert_not_awaited()

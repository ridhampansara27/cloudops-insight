"""Unit tests for refresh-cookie security attributes."""

from datetime import UTC, datetime, timedelta

from fastapi import Response

from app.core.config import settings
from app.services.auth_cookie_service import (
    clear_refresh_cookie,
    set_refresh_cookie,
)


def test_refresh_cookie_uses_security_attributes(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "refresh_cookie_name",
        "cloudops_refresh",
    )

    monkeypatch.setattr(
        settings,
        "refresh_cookie_secure",
        True,
    )

    monkeypatch.setattr(
        settings,
        "refresh_cookie_samesite",
        "lax",
    )

    monkeypatch.setattr(
        settings,
        "refresh_cookie_path",
        "/api/v1/auth",
    )

    monkeypatch.setattr(
        settings,
        "refresh_cookie_domain",
        "",
    )

    response = Response()

    set_refresh_cookie(
        response,
        token="test-refresh-secret",
        expires_at=(
            datetime.now(
                UTC,
            )
            + timedelta(
                days=1,
            )
        ),
    )

    header = response.headers["set-cookie"]

    assert "cloudops_refresh=test-refresh-secret" in header
    assert "HttpOnly" in header
    assert "Secure" in header
    assert "SameSite=lax" in header
    assert "Path=/api/v1/auth" in header
    assert "Max-Age=" in header


def test_refresh_cookie_can_be_cleared(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "refresh_cookie_name",
        "cloudops_refresh",
    )

    monkeypatch.setattr(
        settings,
        "refresh_cookie_path",
        "/api/v1/auth",
    )

    monkeypatch.setattr(
        settings,
        "refresh_cookie_domain",
        "",
    )

    response = Response()

    clear_refresh_cookie(
        response,
    )

    header = response.headers["set-cookie"]

    assert "cloudops_refresh=" in header
    assert "Max-Age=0" in header
    assert "Path=/api/v1/auth" in header

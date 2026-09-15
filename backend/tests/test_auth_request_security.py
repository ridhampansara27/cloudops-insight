"""Tests for cookie-auth endpoint browser-origin protection."""

import pytest
from fastapi import (
    HTTPException,
    Request,
)
from pytest import MonkeyPatch

from app.core.config import settings
from app.services.auth_request_security import (
    enforce_trusted_browser_origin,
)


def _request(
    headers: dict[
        str,
        str,
    ],
) -> Request:
    encoded_headers = [
        (
            name.lower().encode(
                "latin-1",
            ),
            value.encode(
                "latin-1",
            ),
        )
        for name, value in headers.items()
    ]

    return Request(
        {
            "type": "http",
            "asgi": {
                "version": "3.0",
            },
            "http_version": "1.1",
            "method": "POST",
            "scheme": "https",
            "path": "/api/v1/auth/refresh",
            "raw_path": b"/api/v1/auth/refresh",
            "query_string": b"",
            "headers": encoded_headers,
            "client": (
                "127.0.0.1",
                12345,
            ),
            "server": (
                "api.example.com",
                443,
            ),
        },
    )


def test_allowed_browser_origin_passes(
    monkeypatch: MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "cors_origins",
        ("https://app.example.com,https://admin.example.com"),
    )

    request = _request(
        {
            "origin": ("https://app.example.com"),
            "sec-fetch-site": "same-site",
        },
    )

    enforce_trusted_browser_origin(
        request,
    )


def test_untrusted_browser_origin_is_rejected(
    monkeypatch: MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "cors_origins",
        "https://app.example.com",
    )

    request = _request(
        {
            "origin": "https://evil.example",
            "sec-fetch-site": "cross-site",
        },
    )

    with pytest.raises(
        HTTPException,
    ) as error:
        enforce_trusted_browser_origin(
            request,
        )

    assert error.value.status_code == 403


def test_cross_site_fetch_metadata_is_rejected(
    monkeypatch: MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "cors_origins",
        "https://app.example.com",
    )

    request = _request(
        {
            "sec-fetch-site": "cross-site",
        },
    )

    with pytest.raises(
        HTTPException,
    ) as error:
        enforce_trusted_browser_origin(
            request,
        )

    assert error.value.status_code == 403


def test_allowed_referer_origin_passes(
    monkeypatch: MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "cors_origins",
        "https://app.example.com",
    )

    request = _request(
        {
            "referer": ("https://app.example.com/login"),
            "sec-fetch-site": "same-origin",
        },
    )

    enforce_trusted_browser_origin(
        request,
    )


def test_non_browser_request_without_origin_metadata_passes(
    monkeypatch: MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        settings,
        "cors_origins",
        "https://app.example.com",
    )

    request = _request(
        {},
    )

    enforce_trusted_browser_origin(
        request,
    )

"""HTTP boundary tests for CloudOps API security policy."""

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import (
    CORS_ALLOWED_HEADERS,
    CORS_ALLOWED_METHODS,
    app,
    development_api_url,
)


def test_security_headers_are_added_to_normal_responses() -> None:
    """Service responses receive baseline browser security headers."""

    with TestClient(
        app,
    ) as client:
        response = client.get(
            "/",
        )

    assert response.status_code == 200

    assert response.headers["x-content-type-options"] == "nosniff"

    assert response.headers["x-frame-options"] == "DENY"

    assert response.headers["referrer-policy"] == "no-referrer"

    assert response.headers["x-permitted-cross-domain-policies"] == "none"

    permissions_policy = response.headers["permissions-policy"]

    assert "camera=()" in permissions_policy

    assert "microphone=()" in permissions_policy

    assert "geolocation=()" in permissions_policy


def test_api_responses_are_never_http_cached() -> None:
    """Even rejected authenticated API responses must be non-cacheable."""

    with TestClient(
        app,
    ) as client:
        response = client.get(
            "/api/v1/auth/me",
        )

    # The exact unauthenticated status is not important to this middleware
    # test; the response must remain protected regardless of outcome.
    assert response.status_code >= 400

    assert response.headers["cache-control"] == "no-store"

    assert response.headers["pragma"] == "no-cache"

    assert response.headers["x-content-type-options"] == "nosniff"


def test_allowed_credentialed_cors_preflight_is_explicit() -> None:
    """Approved frontend requests receive only the explicit CORS contract."""

    origin = settings.cors_origin_list[0]

    with TestClient(
        app,
    ) as client:
        response = client.options(
            "/api/v1/workspace/profile",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "PATCH",
                "Access-Control-Request-Headers": (
                    "authorization,content-type,x-organization-id"
                ),
            },
        )

    assert response.status_code == 200

    assert response.headers["access-control-allow-origin"] == origin

    assert response.headers["access-control-allow-credentials"] == "true"

    allowed_methods = {
        method.strip()
        for method in response.headers["access-control-allow-methods"].split(
            ",",
        )
    }

    assert allowed_methods == set(
        CORS_ALLOWED_METHODS,
    )

    allowed_headers = {
        header.strip().lower()
        for header in response.headers["access-control-allow-headers"].split(
            ",",
        )
    }

    assert {header.lower() for header in CORS_ALLOWED_HEADERS}.issubset(
        allowed_headers,
    )

    # Security middleware must remain outside CORS so preflight responses
    # are hardened as well.
    assert response.headers["x-content-type-options"] == "nosniff"

    assert response.headers["cache-control"] == "no-store"


def test_avatar_upload_cors_preflight_allows_put() -> None:
    """Approved frontend clients may preflight persistent avatar uploads."""

    origin = settings.cors_origin_list[0]

    with TestClient(
        app,
    ) as client:
        response = client.options(
            "/api/v1/auth/me/avatar",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "PUT",
                "Access-Control-Request-Headers": (
                    "authorization,content-type,x-organization-id"
                ),
            },
        )

    assert response.status_code == 200

    assert response.headers["access-control-allow-origin"] == origin

    assert response.headers["access-control-allow-credentials"] == "true"

    allowed_methods = {
        method.strip()
        for method in response.headers["access-control-allow-methods"].split(
            ",",
        )
    }

    assert "PUT" in allowed_methods

    assert allowed_methods == set(
        CORS_ALLOWED_METHODS,
    )


def test_unapproved_cors_method_is_rejected() -> None:
    """Browser clients cannot preflight methods outside the API contract."""

    origin = settings.cors_origin_list[0]

    with TestClient(
        app,
    ) as client:
        response = client.options(
            "/api/v1/workspace/profile",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "TRACE",
            },
        )

    assert response.status_code == 400


def test_unapproved_cors_header_is_rejected() -> None:
    """Arbitrary browser request headers are not wildcard-authorized."""

    origin = settings.cors_origin_list[0]

    with TestClient(
        app,
    ) as client:
        response = client.options(
            "/api/v1/workspace/profile",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "PATCH",
                "Access-Control-Request-Headers": "x-cloudops-unapproved-header",
            },
        )

    assert response.status_code == 400


def test_retry_after_is_exposed_to_browser_clients() -> None:
    """Frontend code may inspect rate-limit retry timing."""

    origin = settings.cors_origin_list[0]

    with TestClient(
        app,
    ) as client:
        response = client.get(
            "/health/live",
            headers={
                "Origin": origin,
            },
        )

    exposed_headers = {
        header.strip().lower()
        for header in response.headers["access-control-expose-headers"].split(
            ",",
        )
    }

    assert "retry-after" in exposed_headers


def test_production_disables_interactive_api_metadata(
    monkeypatch,
) -> None:
    """Production must not expose Swagger, ReDoc or OpenAPI URLs."""

    monkeypatch.setattr(
        settings,
        "app_env",
        "production",
    )

    assert settings.is_production is True

    assert (
        development_api_url(
            "/docs",
        )
        is None
    )

    assert (
        development_api_url(
            "/redoc",
        )
        is None
    )

    assert (
        development_api_url(
            "/openapi.json",
        )
        is None
    )


def test_environment_detection_is_case_insensitive(
    monkeypatch,
) -> None:
    """Deployment environment matching should not depend on capitalization."""

    monkeypatch.setattr(
        settings,
        "app_env",
        " PrOdUcTiOn ",
    )

    assert settings.is_production is True

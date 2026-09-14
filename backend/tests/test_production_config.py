"""Production configuration must fail closed."""

from collections.abc import Mapping
from typing import Any

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def _production_settings(
    overrides: Mapping[
        str,
        Any,
    ]
    | None = None,
) -> Settings:
    """Create one safe production baseline with optional mutations."""

    values: dict[
        str,
        Any,
    ] = {
        "app_env": "production",
        "debug": False,
        "database_url": (
            "postgresql+asyncpg://cloudops:local-test-password@database:5432/cloudops"
        ),
        "redis_url": "redis://redis:6379/0",
        "jwt_secret": ("jwt-production-test-secret-0123456789abcdef0123456789abcdef"),
        "auth_token_pepper": (
            "opaque-token-production-test-pepper-fedcba9876543210fedcba9876543210"
        ),
        "frontend_base_url": "https://cloudinsight.ridhampansara.dev",
        "cors_origins": "https://cloudinsight.ridhampansara.dev",
        "smtp_host": "smtp.mail-provider.example",
        "smtp_port": 587,
        "smtp_username": "cloudops-production",
        "smtp_password": "smtp-provider-generated-password-012345",
        "smtp_from_email": "no-reply@ridhampansara.dev",
        "smtp_starttls": True,
        "smtp_timeout_seconds": 10,
        "refresh_cookie_secure": True,
        "refresh_cookie_domain": "",
        "refresh_cookie_path": "/api/v1/auth",
        "rate_limit_enabled": True,
        "public_signup_enabled": False,
    }

    if overrides:
        values.update(
            overrides,
        )

    return Settings(
        _env_file=None,
        **values,
    )


def _assert_rejected(
    **overrides: Any,
) -> None:
    with pytest.raises(
        ValidationError,
    ):
        _production_settings(
            overrides,
        )


def test_safe_production_configuration_is_accepted() -> None:
    settings = _production_settings()

    assert settings.is_production is True


@pytest.mark.parametrize(
    (
        "field",
        "unsafe_value",
    ),
    [
        (
            "debug",
            True,
        ),
        (
            "jwt_secret",
            "too-short",
        ),
        (
            "jwt_secret",
            "replace-with-a-long-random-production-secret",
        ),
        (
            "auth_token_pepper",
            "",
        ),
        (
            "auth_token_pepper",
            "replace-with-a-long-random-production-pepper",
        ),
        (
            "frontend_base_url",
            "http://cloudinsight.ridhampansara.dev",
        ),
        (
            "frontend_base_url",
            "https://localhost",
        ),
        (
            "cors_origins",
            "http://cloudinsight.ridhampansara.dev",
        ),
        (
            "cors_origins",
            "*",
        ),
        (
            "smtp_host",
            "",
        ),
        (
            "smtp_username",
            "",
        ),
        (
            "smtp_password",
            "",
        ),
        (
            "smtp_password",
            "change-me",
        ),
        (
            "smtp_from_email",
            "no-reply@cloudops-insight.local",
        ),
        (
            "smtp_starttls",
            False,
        ),
        (
            "refresh_cookie_secure",
            False,
        ),
        (
            "refresh_cookie_domain",
            ".ridhampansara.dev",
        ),
        (
            "refresh_cookie_path",
            "/",
        ),
        (
            "rate_limit_enabled",
            False,
        ),
    ],
)
def test_unsafe_production_values_are_rejected(
    field: str,
    unsafe_value: Any,
) -> None:
    _assert_rejected(
        **{
            field: unsafe_value,
        },
    )


def test_token_pepper_must_be_independent_from_jwt_secret() -> None:
    jwt_secret = "shared-production-secret-0123456789abcdef0123456789abcdef"

    _assert_rejected(
        jwt_secret=jwt_secret,
        auth_token_pepper=jwt_secret,
    )


def test_development_remains_usable_with_local_services() -> None:
    """Mailpit/local HTTP development must not require production rules."""

    settings = Settings(
        _env_file=None,
        app_env="development",
        debug=True,
        database_url=("postgresql+asyncpg://cloudops:local@localhost:5432/cloudops"),
        redis_url="redis://localhost:6379/0",
        jwt_secret="development-only",
        auth_token_pepper="",
        frontend_base_url="http://localhost:5173",
        cors_origins="http://localhost:5173",
        smtp_host="localhost",
        smtp_port=1025,
        smtp_username="",
        smtp_password="",
        smtp_from_email="no-reply@example.com",
        smtp_starttls=False,
        refresh_cookie_secure=False,
        rate_limit_enabled=False,
    )

    assert settings.is_production is False

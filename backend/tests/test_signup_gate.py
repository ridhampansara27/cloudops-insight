"""Unit tests for commercial signup availability boundaries."""

import pytest
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.auth import SignupRequest
from app.services.registration_service import (
    RegistrationService,
    SignupUnavailableError,
)


class UnusedSession:
    """Session must never be touched while signup is disabled."""


@pytest.mark.asyncio
async def test_public_signup_is_disabled_by_default() -> None:
    """The endpoint service fails before creating customer state."""

    original = settings.public_signup_enabled

    settings.public_signup_enabled = False

    try:
        service = RegistrationService(
            UnusedSession(),  # type: ignore[arg-type]
        )

        with pytest.raises(
            SignupUnavailableError,
        ):
            await service.register(
                SignupRequest(
                    email="closed@example.com",
                    full_name="Closed Signup",
                    organization_name="Closed Tenant",
                    password="CloudOpsClosed1!",
                ),
            )

    finally:
        settings.public_signup_enabled = original


def test_signup_request_normalizes_identity_fields_without_mutating_password() -> None:
    """Tenant labels are canonicalized while passwords remain exact."""

    raw_password = "  CloudOpsKeep1!  "

    payload = SignupRequest(
        email="owner@example.com",
        full_name="  Launch Owner  ",
        organization_name="  Launch Workspace  ",
        password=raw_password,
    )

    assert payload.full_name == "Launch Owner"
    assert payload.organization_name == "Launch Workspace"
    assert payload.password == raw_password


@pytest.mark.parametrize(
    (
        "field_name",
        "invalid_value",
    ),
    [
        (
            "full_name",
            "      ",
        ),
        (
            "organization_name",
            "   ",
        ),
    ],
)
def test_signup_request_rejects_whitespace_only_identity_fields(
    field_name: str,
    invalid_value: str,
) -> None:
    """Whitespace-only identity labels must fail validation."""

    values = {
        "email": "validation@example.com",
        "full_name": "Valid Owner",
        "organization_name": "Valid Workspace",
        "password": "CloudOpsFixture1!",
    }

    values[field_name] = invalid_value

    with pytest.raises(
        ValidationError,
    ):
        SignupRequest(
            **values,
        )


@pytest.mark.parametrize(
    (
        "field_name",
        "invalid_value",
    ),
    [
        (
            "full_name",
            "Launch\nOwner",
        ),
        (
            "full_name",
            "Launch\x00Owner",
        ),
        (
            "organization_name",
            "Launch\rWorkspace",
        ),
    ],
)
def test_signup_request_rejects_multiline_or_nul_identity_fields(
    field_name: str,
    invalid_value: str,
) -> None:
    """Identity labels must remain safe single-line values."""

    values = {
        "email": "controls@example.com",
        "full_name": "Valid Owner",
        "organization_name": "Valid Workspace",
        "password": "CloudOpsFixture2!",
    }

    values[field_name] = invalid_value

    with pytest.raises(
        ValidationError,
    ):
        SignupRequest(
            **values,
        )

"""Unit tests for commercial signup availability boundaries."""

import pytest

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
                    password="closed-signup-password",
                ),
            )

    finally:
        settings.public_signup_enabled = original

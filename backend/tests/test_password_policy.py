"""Tests for the central new-password security policy."""

import pytest
from pydantic import ValidationError

from app.core.password_policy import (
    PASSWORD_MAX_LENGTH,
    validate_new_password,
)
from app.schemas.auth import (
    ResetPasswordRequest,
    SignupRequest,
)

STRONG_PASSWORD = "CloudOpsStrong1!"


def test_strong_password_is_accepted_without_mutation() -> None:
    """A valid password is returned exactly as supplied."""

    assert validate_new_password(STRONG_PASSWORD) == STRONG_PASSWORD


def test_minimum_length_boundary_is_accepted() -> None:
    """Exactly twelve characters remains a valid lower boundary."""

    password = "Aa1!" + ("x" * 8)

    assert len(password) == 12
    assert validate_new_password(password) == password


@pytest.mark.parametrize(
    "password",
    [
        "Aa1!",
        "alllowercase1!",
        "ALLUPPERCASE1!",
        "NoNumberHere!",
        "NoSpecialHere1",
        "WhitespaceOnly1 ",
        "Aa1!" + ("x" * PASSWORD_MAX_LENGTH),
    ],
)
def test_invalid_new_passwords_are_rejected(
    password: str,
) -> None:
    """Invalid length or composition must fail."""

    with pytest.raises(ValueError):
        validate_new_password(password)


def test_whitespace_does_not_count_as_special_character() -> None:
    """Whitespace cannot satisfy the special-character requirement."""

    with pytest.raises(ValueError):
        validate_new_password("ValidPassword1 ")


def test_maximum_length_boundary_is_accepted() -> None:
    """The internal 128-character ceiling remains valid."""

    password = "Aa1!" + ("x" * (PASSWORD_MAX_LENGTH - 4))

    assert len(password) == PASSWORD_MAX_LENGTH
    assert validate_new_password(password) == password


def test_signup_request_applies_central_password_policy() -> None:
    """Signup validates passwords before assigning credentials."""

    request = SignupRequest(
        email="policy-signup@example.com",
        full_name="Policy Signup",
        organization_name="Policy Workspace",
        password=STRONG_PASSWORD,
    )

    assert request.password == STRONG_PASSWORD

    with pytest.raises(ValidationError):
        SignupRequest(
            email="weak-signup@example.com",
            full_name="Weak Signup",
            organization_name="Weak Workspace",
            password="lowercase-password1!",
        )


def test_reset_request_applies_central_password_policy() -> None:
    """Reset validates newly assigned passwords with the same policy."""

    request = ResetPasswordRequest(
        token=("r" * 32),
        new_password=STRONG_PASSWORD,
    )

    assert request.new_password == STRONG_PASSWORD

    with pytest.raises(ValidationError):
        ResetPasswordRequest(
            token=("r" * 32),
            new_password="lowercase-password1!",
        )

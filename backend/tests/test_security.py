# Import PyJWT's invalid-token exception.
# Import pytest.
import pytest
from jwt.exceptions import InvalidTokenError

# Import application security functions.
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


# Verify password hashing and validation.
def test_password_hashing() -> None:
    # Define a plaintext demonstration password.
    password = "Test-Password-123!"

    # Generate a secure one-way hash.
    hashed_password = hash_password(
        password,
    )

    # Ensure the original password was not stored directly.
    assert hashed_password != password

    # Ensure the correct password validates.
    assert verify_password(
        password,
        hashed_password,
    )

    # Ensure an incorrect password fails validation.
    assert not verify_password(
        "wrong-password",
        hashed_password,
    )


# Verify valid JWT token creation and decoding.
def test_access_token_round_trip() -> None:
    # Define a demonstration subject.
    subject = "12345678-1234-5678-1234-567812345678"

    # Generate a signed JWT.
    token = create_access_token(
        subject,
    )

    # Decode the token.
    decoded_subject = decode_access_token(
        token,
    )

    # Ensure the subject survives the encode/decode cycle.
    assert decoded_subject == subject


# Verify invalid JWT data is rejected.
def test_invalid_access_token() -> None:
    # Confirm an invalid token raises a JWT validation error.
    with pytest.raises(
        InvalidTokenError,
    ):
        # Attempt to decode invalid token data.
        decode_access_token(
            "this-is-not-a-valid-jwt",
        )

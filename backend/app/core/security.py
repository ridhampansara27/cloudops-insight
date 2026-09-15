"""Cryptographic helpers for passwords and authentication bearer tokens."""

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import settings

password_hash = PasswordHash.recommended()


DUMMY_PASSWORD_HASH = password_hash.hash(
    "cloudops-dummy-password",
)


def hash_password(
    plain_password: str,
) -> str:
    """Hash one plaintext password before persistence."""

    return password_hash.hash(
        plain_password,
    )


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """Verify one plaintext password against a stored hash."""

    return password_hash.verify(
        plain_password,
        hashed_password,
    )


def password_state_version(
    password_changed_at: datetime,
) -> int:
    """Convert the password boundary into an exact JWT-safe integer.

    PostgreSQL timestamps retain microsecond precision. Encoding the
    complete microsecond timestamp prevents same-second password changes
    from accidentally validating old access tokens.
    """

    value = password_changed_at.astimezone(
        UTC,
    )

    return (
        int(
            value.timestamp(),
        )
        * 1_000_000
        + value.microsecond
    )


def create_access_token(
    subject: str,
    *,
    password_version: int | None = None,
) -> str:
    """Create one short-lived signed access token."""

    now = datetime.now(
        UTC,
    )

    payload: dict[
        str,
        object,
    ] = {
        "sub": subject,
        "exp": (
            now
            + timedelta(
                minutes=settings.access_token_expire_minutes,
            )
        ),
        "iat": now,
    }

    if password_version is not None:
        payload["pwd"] = password_version

    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token_claims(
    token: str,
) -> dict[
    str,
    object,
]:
    """Decode and cryptographically verify one access JWT."""

    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[
            settings.jwt_algorithm,
        ],
    )

    subject = payload.get(
        "sub",
    )

    if not isinstance(
        subject,
        str,
    ):
        raise InvalidTokenError(
            "Token subject is missing.",
        )

    return payload


def decode_access_token(
    token: str,
) -> str:
    """Decode a JWT and return its authenticated subject."""

    payload = decode_access_token_claims(
        token,
    )

    subject = payload["sub"]

    if not isinstance(
        subject,
        str,
    ):
        raise InvalidTokenError(
            "Token subject is missing.",
        )

    return subject


def access_token_matches_password_state(
    claims: dict[
        str,
        object,
    ],
    password_changed_at: datetime,
) -> bool:
    """Reject access JWTs issued for an older password state."""

    token_version = claims.get(
        "pwd",
    )

    # Require the password-state claim for commercial sessions.
    #
    # This intentionally causes pre-migration access JWTs to require a
    # fresh login when this architecture is eventually deployed.
    if (
        type(
            token_version,
        )
        is not int
    ):
        return False

    return token_version == password_state_version(
        password_changed_at,
    )


OPAQUE_TOKEN_RANDOM_BYTES = 48


def generate_opaque_token() -> str:
    """Generate a high-entropy bearer suitable for URLs or cookies."""

    return secrets.token_urlsafe(
        OPAQUE_TOKEN_RANDOM_BYTES,
    )


def hash_opaque_token(
    token: str,
) -> str:
    """Return the only opaque-token representation allowed in PostgreSQL."""

    pepper = settings.auth_token_pepper or settings.jwt_secret

    return hmac.new(
        pepper.encode(
            "utf-8",
        ),
        token.encode(
            "utf-8",
        ),
        hashlib.sha256,
    ).hexdigest()


def opaque_token_matches(
    token: str,
    expected_hash: str,
) -> bool:
    """Compare opaque authentication secrets in constant time."""

    return hmac.compare_digest(
        hash_opaque_token(
            token,
        ),
        expected_hash,
    )

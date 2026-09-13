# Import UTC-aware datetime and token-expiration utilities.
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

# Import PyJWT.
import jwt

# Import PyJWT's invalid-token exception.
from jwt.exceptions import InvalidTokenError

# Import pwdlib's password hashing abstraction.
from pwdlib import PasswordHash

# Import application security settings.
from app.core.config import settings

# Create the recommended password-hashing configuration.
password_hash = PasswordHash.recommended()


# Create a fixed dummy hash used when a login email does not exist.
DUMMY_PASSWORD_HASH = password_hash.hash(
    "cloudops-dummy-password",
)


# Hash a plaintext password before database storage.
def hash_password(
    plain_password: str,
) -> str:
    # Return a one-way password hash.
    return password_hash.hash(
        plain_password,
    )


# Verify a plaintext password against a stored hash.
def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    # Return whether the password matches the stored hash.
    return password_hash.verify(
        plain_password,
        hashed_password,
    )


# Create a signed access token for one user.
def create_access_token(
    subject: str,
) -> str:
    # Calculate the UTC expiration time.
    expires_at = datetime.now(UTC) + timedelta(
        minutes=settings.access_token_expire_minutes,
    )

    # Build the JWT payload.
    payload = {
        # Store the user identifier in the standard subject claim.
        "sub": subject,
        # Store the expiration time.
        "exp": expires_at,
        # Record when the token was issued.
        "iat": datetime.now(UTC),
    }

    # Encode and sign the token.
    return jwt.encode(
        # Supply the JWT claims.
        payload,
        # Sign with the application secret.
        settings.jwt_secret,
        # Use the configured algorithm.
        algorithm=settings.jwt_algorithm,
    )


# Decode a JWT and return the authenticated subject.
def decode_access_token(
    token: str,
) -> str:
    # Decode and cryptographically verify the JWT.
    payload = jwt.decode(
        # Supply the encoded token.
        token,
        # Supply the signing secret.
        settings.jwt_secret,
        # Restrict decoding to the configured algorithm.
        algorithms=[
            settings.jwt_algorithm,
        ],
    )

    # Read the user identifier.
    subject = payload.get("sub")

    # Reject tokens without a valid string subject.
    if not isinstance(subject, str):
        # Raise the same exception type used for invalid JWTs.
        raise InvalidTokenError(
            "Token subject is missing.",
        )

    # Return the authenticated user identifier.
    return subject


# Use 384 bits of cryptographic randomness for bearer secrets that are
# delivered through verification/reset links or refresh cookies.
OPAQUE_TOKEN_RANDOM_BYTES = 48


def generate_opaque_token() -> str:
    """Generate a high-entropy bearer secret suitable for URLs/cookies."""

    return secrets.token_urlsafe(
        OPAQUE_TOKEN_RANDOM_BYTES,
    )


def hash_opaque_token(
    token: str,
) -> str:
    """Produce the only token representation allowed in PostgreSQL.

    Because generated tokens already contain high entropy, HMAC-SHA256
    provides a compact lookup key while preventing a database leak from
    exposing immediately usable bearer credentials.
    """

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
    """Constant-time comparison helper for security-sensitive checks."""

    return hmac.compare_digest(
        hash_opaque_token(
            token,
        ),
        expected_hash,
    )

"""Authentication request and response contracts."""

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
)


class TokenResponse(BaseModel):
    """Current access-token response retained until session migration."""

    access_token: str

    token_type: str = "bearer"


class SignupRequest(BaseModel):
    """Create the first owner of a new CloudOps tenant."""

    model_config = ConfigDict(
        extra="forbid",
    )

    email: EmailStr

    full_name: str = Field(
        min_length=2,
        max_length=160,
    )

    organization_name: str = Field(
        min_length=2,
        max_length=160,
    )

    password: str = Field(
        min_length=12,
        max_length=128,
    )


class VerifyEmailRequest(BaseModel):
    """Consume one opaque email-verification bearer token."""

    model_config = ConfigDict(
        extra="forbid",
    )

    token: str = Field(
        min_length=32,
        max_length=512,
    )


class ResendVerificationRequest(BaseModel):
    """Request another verification message."""

    model_config = ConfigDict(
        extra="forbid",
    )

    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    """Request a password-reset email without account enumeration."""

    model_config = ConfigDict(
        extra="forbid",
    )

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Consume one password-reset bearer and set a new password."""

    model_config = ConfigDict(
        extra="forbid",
    )

    token: str = Field(
        min_length=32,
        max_length=512,
    )

    new_password: str = Field(
        min_length=12,
        max_length=128,
    )


class AuthMessageResponse(BaseModel):
    """Return intentionally generic authentication workflow messages."""

    message: str

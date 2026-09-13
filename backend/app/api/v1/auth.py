"""Authentication API."""

from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from fastapi.security import OAuth2PasswordRequestForm

from app.api.dependencies import (
    CurrentUser,
    DatabaseSession,
)
from app.core.security import create_access_token
from app.schemas.auth import (
    AuthMessageResponse,
    ResendVerificationRequest,
    SignupRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.user import UserRead
from app.services.auth_email_service import AuthEmailService
from app.services.auth_service import AuthService
from app.services.registration_service import (
    RegistrationService,
    SignupEmailConfigurationError,
    SignupUnavailableError,
)

router = APIRouter()


GENERIC_SIGNUP_MESSAGE = (
    "If this email can be registered, check your inbox for a verification link."
)

GENERIC_RESEND_MESSAGE = (
    "If an unverified account exists for this email, "
    "a verification message may be sent."
)


@router.post(
    "/signup",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def signup(
    payload: SignupRequest,
    session: DatabaseSession,
) -> AuthMessageResponse:
    """Create one tenant-owner registration while remaining fail-closed."""

    service = RegistrationService(
        session,
    )

    try:
        await service.register(
            payload,
        )

    except SignupUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Public signup is currently unavailable.",
        ) from error

    except SignupEmailConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Public signup is currently unavailable.",
        ) from error

    # Never reveal whether this email already existed.
    return AuthMessageResponse(
        message=GENERIC_SIGNUP_MESSAGE,
    )


@router.post(
    "/verify-email",
    response_model=AuthMessageResponse,
)
async def verify_email(
    payload: VerifyEmailRequest,
    session: DatabaseSession,
) -> AuthMessageResponse:
    """Consume one expiring email verification token."""

    verified = await RegistrationService(
        session,
    ).verify_email(
        payload.token,
    )

    if not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification link is invalid or expired.",
        )

    return AuthMessageResponse(
        message="Email address verified successfully.",
    )


@router.post(
    "/resend-verification",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def resend_verification(
    payload: ResendVerificationRequest,
    session: DatabaseSession,
) -> AuthMessageResponse:
    """Rotate verification links without exposing user existence."""

    email_service = AuthEmailService()

    # Verification/resend stays available for already-created users even
    # if new signup is subsequently disabled, but SMTP must be configured.
    if not email_service.is_configured:
        # Still use a generic availability response rather than revealing
        # whether the requested identity exists.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Verification email delivery is currently unavailable.",
        )

    await RegistrationService(
        session,
        email_sender=email_service,
    ).resend_verification(
        str(
            payload.email,
        ),
    )

    return AuthMessageResponse(
        message=GENERIC_RESEND_MESSAGE,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
)
async def login(
    form_data: Annotated[
        OAuth2PasswordRequestForm,
        Depends(),
    ],
    session: DatabaseSession,
) -> TokenResponse:
    """Authenticate only active, email-verified users."""

    authentication = AuthService(
        session,
    )

    user = await authentication.authenticate(
        email=form_data.username,
        password=form_data.password,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    access_token = create_access_token(
        subject=str(
            user.id,
        ),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
    )


@router.get(
    "/me",
    response_model=UserRead,
)
async def read_current_user(
    current_user: CurrentUser,
) -> UserRead:
    """Return the current authenticated identity."""

    return UserRead.model_validate(
        current_user,
    )

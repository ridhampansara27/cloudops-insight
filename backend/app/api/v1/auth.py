"""Authentication API."""

from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from fastapi.security import OAuth2PasswordRequestForm

from app.api.dependencies import (
    CurrentUser,
    DatabaseSession,
)
from app.core.config import settings
from app.core.security import (
    create_access_token,
    password_state_version,
)
from app.schemas.auth import (
    AuthMessageResponse,
    ForgotPasswordRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.user import UserRead
from app.services.auth_cookie_service import (
    clear_refresh_cookie,
    set_refresh_cookie,
)
from app.services.auth_email_service import AuthEmailService
from app.services.auth_request_security import enforce_trusted_browser_origin
from app.services.auth_service import AuthService
from app.services.password_reset_service import PasswordResetService
from app.services.rate_limit_service import (
    limit_forgot_password,
    limit_login,
    limit_refresh,
    limit_resend_verification,
    limit_reset_password,
    limit_signup,
    limit_verify_email,
)
from app.services.refresh_session_service import (
    InvalidRefreshSessionError,
    RefreshSessionReuseError,
    RefreshSessionService,
)
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

GENERIC_FORGOT_PASSWORD_MESSAGE = (
    "If an eligible account exists for this email, "
    "a password reset message may be sent."
)


def _create_user_access_token(
    user: UserRead | object,
) -> str:
    """Create an access token bound to the current password state."""

    return create_access_token(
        subject=str(
            user.id,
        ),
        password_version=password_state_version(
            user.password_changed_at,
        ),
    )


@router.post(
    "/signup",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def signup(
    payload: SignupRequest,
    request: Request,
    session: DatabaseSession,
) -> AuthMessageResponse:
    """Create one tenant-owner registration while remaining fail-closed."""

    await limit_signup(
        request,
        str(
            payload.email,
        ),
    )

    service = RegistrationService(
        session,
    )

    try:
        await service.register(
            payload,
        )

    except (
        SignupUnavailableError,
        SignupEmailConfigurationError,
    ) as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Public signup is currently unavailable.",
        ) from error

    return AuthMessageResponse(
        message=GENERIC_SIGNUP_MESSAGE,
    )


@router.post(
    "/verify-email",
    response_model=AuthMessageResponse,
)
async def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    session: DatabaseSession,
) -> AuthMessageResponse:
    """Consume one expiring email-verification token."""

    await limit_verify_email(
        request,
        payload.token,
    )

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
    request: Request,
    session: DatabaseSession,
) -> AuthMessageResponse:
    """Rotate verification links without exposing user existence."""

    await limit_resend_verification(
        request,
        str(
            payload.email,
        ),
    )

    email_service = AuthEmailService()

    if not email_service.is_configured:
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
    "/forgot-password",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    session: DatabaseSession,
) -> AuthMessageResponse:
    """Request password recovery without revealing account existence."""

    await limit_forgot_password(
        request,
        str(
            payload.email,
        ),
    )

    email_service = AuthEmailService()

    if not email_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password recovery is currently unavailable.",
        )

    await PasswordResetService(
        session,
        email_sender=email_service,
    ).request_reset(
        str(
            payload.email,
        ),
    )

    return AuthMessageResponse(
        message=GENERIC_FORGOT_PASSWORD_MESSAGE,
    )


@router.post(
    "/reset-password",
    response_model=AuthMessageResponse,
)
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    session: DatabaseSession,
) -> AuthMessageResponse:
    """Consume one reset bearer and replace the account password."""

    await limit_reset_password(
        request,
        payload.token,
    )

    reset = await PasswordResetService(
        session,
    ).reset_password(
        raw_token=payload.token,
        new_password=payload.new_password,
    )

    if not reset:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link is invalid or expired.",
        )

    return AuthMessageResponse(
        message="Password updated successfully.",
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
    request: Request,
    response: Response,
    session: DatabaseSession,
) -> TokenResponse:
    """Authenticate and create a rotating refresh-session family."""

    enforce_trusted_browser_origin(
        request,
    )

    await limit_login(
        request,
        form_data.username,
    )

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

    refresh_issue = await RefreshSessionService(
        session,
    ).issue(
        user,
    )

    set_refresh_cookie(
        response,
        token=refresh_issue.token,
        expires_at=refresh_issue.expires_at,
    )

    return TokenResponse(
        access_token=_create_user_access_token(
            user,
        ),
        token_type="bearer",
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
)
async def refresh_access_token(
    request: Request,
    response: Response,
    session: DatabaseSession,
) -> TokenResponse:
    """Rotate the refresh bearer and return a fresh access JWT."""

    enforce_trusted_browser_origin(
        request,
    )

    raw_token = request.cookies.get(
        settings.refresh_cookie_name,
    )

    await limit_refresh(
        request,
        raw_token,
    )

    if not raw_token:
        clear_refresh_cookie(
            response,
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session is unavailable.",
        )

    try:
        refresh_issue = await RefreshSessionService(
            session,
        ).rotate(
            raw_token,
        )

    except (
        InvalidRefreshSessionError,
        RefreshSessionReuseError,
    ) as error:
        clear_refresh_cookie(
            response,
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session is unavailable.",
        ) from error

    set_refresh_cookie(
        response,
        token=refresh_issue.token,
        expires_at=refresh_issue.expires_at,
    )

    return TokenResponse(
        access_token=_create_user_access_token(
            refresh_issue.user,
        ),
        token_type="bearer",
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def logout(
    request: Request,
    response: Response,
    session: DatabaseSession,
) -> None:
    """Revoke the current refresh family and clear its browser cookie."""

    enforce_trusted_browser_origin(
        request,
    )

    raw_token = request.cookies.get(
        settings.refresh_cookie_name,
    )

    if raw_token:
        await RefreshSessionService(
            session,
        ).revoke_family_for_token(
            raw_token,
        )

    clear_refresh_cookie(
        response,
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

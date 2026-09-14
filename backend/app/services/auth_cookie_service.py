"""Secure browser-cookie handling for rotating refresh sessions."""

from datetime import UTC, datetime

from fastapi import Response

from app.core.config import settings


def set_refresh_cookie(
    response: Response,
    *,
    token: str,
    expires_at: datetime,
) -> None:
    """Place a refresh bearer in an HttpOnly path-scoped cookie."""

    remaining_seconds = max(
        0,
        int(
            (
                expires_at
                - datetime.now(
                    UTC,
                )
            ).total_seconds(),
        ),
    )

    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=token,
        max_age=remaining_seconds,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite=settings.refresh_cookie_samesite,
        path=settings.refresh_cookie_path,
        domain=(settings.refresh_cookie_domain or None),
    )


def clear_refresh_cookie(
    response: Response,
) -> None:
    """Remove the browser refresh bearer."""

    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path=settings.refresh_cookie_path,
        domain=(settings.refresh_cookie_domain or None),
    )

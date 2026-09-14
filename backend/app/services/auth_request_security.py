"""Browser-origin validation for cookie-authenticated auth endpoints."""

from urllib.parse import urlsplit

from fastapi import (
    HTTPException,
    Request,
    status,
)

from app.core.config import settings


def _normalized_origin(
    value: str,
) -> str | None:
    """Convert an Origin or Referer value into scheme + authority."""

    parsed = urlsplit(
        value.strip(),
    )

    if (
        parsed.scheme.lower()
        not in {
            "http",
            "https",
        }
        or not parsed.netloc
    ):
        return None

    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"


def _deny_untrusted_origin() -> None:
    """Reject a browser request from an untrusted site."""

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Request origin is not allowed.",
    )


def enforce_trusted_browser_origin(
    request: Request,
) -> None:
    """Protect cookie-authenticated POST endpoints against CSRF.

    Modern browsers provide Origin and Sec-Fetch-Site metadata for these
    requests. Requests without browser metadata remain usable by trusted
    non-browser API clients, while browser cross-site requests fail closed.
    """

    fetch_site = request.headers.get(
        "sec-fetch-site",
    )

    if fetch_site is not None and fetch_site.lower() == "cross-site":
        _deny_untrusted_origin()

    supplied_origin = request.headers.get(
        "origin",
    )

    if supplied_origin is None:
        supplied_origin = request.headers.get(
            "referer",
        )

    # CLI/service-to-service callers do not necessarily supply browser
    # origin metadata. They also cannot perform browser CSRF.
    if supplied_origin is None:
        return

    candidate = _normalized_origin(
        supplied_origin,
    )

    allowed_origins = {
        normalized
        for configured_origin in settings.cors_origin_list
        if (
            normalized := _normalized_origin(
                configured_origin,
            )
        )
        is not None
    }

    if candidate is None or candidate not in allowed_origins:
        _deny_untrusted_origin()

"""Distributed Redis-backed request abuse protection."""

import hashlib
import logging
from dataclasses import dataclass
from ipaddress import ip_address
from uuid import UUID

from fastapi import (
    HTTPException,
    Request,
    status,
)

from app.cache.redis import redis_client
from app.core.config import settings

logger = logging.getLogger(
    __name__,
)


# Perform INCR + first-use expiry + TTL lookup in one atomic Redis
# operation. This avoids the classic INCR/EXPIRE crash window.
_RATE_LIMIT_SCRIPT = """
local current = redis.call('INCR', KEYS[1])

if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end

local ttl = redis.call('TTL', KEYS[1])

return {current, ttl}
"""


@dataclass(
    frozen=True,
    slots=True,
)
class RateLimitPolicy:
    """One fixed-window request policy."""

    name: str

    limit: int

    window_seconds: int


# ============================================================
# Public authentication policies
# ============================================================

SIGNUP_IP = RateLimitPolicy(
    "auth-signup-ip",
    10,
    3600,
)

SIGNUP_IDENTITY = RateLimitPolicy(
    "auth-signup-identity",
    3,
    3600,
)


VERIFY_EMAIL_IP = RateLimitPolicy(
    "auth-verify-ip",
    30,
    900,
)

VERIFY_EMAIL_TOKEN = RateLimitPolicy(
    "auth-verify-token",
    10,
    900,
)


RESEND_VERIFICATION_IP = RateLimitPolicy(
    "auth-resend-ip",
    10,
    3600,
)

RESEND_VERIFICATION_IDENTITY = RateLimitPolicy(
    "auth-resend-identity",
    3,
    3600,
)


FORGOT_PASSWORD_IP = RateLimitPolicy(
    "auth-forgot-ip",
    10,
    3600,
)

FORGOT_PASSWORD_IDENTITY = RateLimitPolicy(
    "auth-forgot-identity",
    3,
    3600,
)


RESET_PASSWORD_IP = RateLimitPolicy(
    "auth-reset-ip",
    15,
    900,
)

RESET_PASSWORD_TOKEN = RateLimitPolicy(
    "auth-reset-token",
    5,
    900,
)


LOGIN_IP = RateLimitPolicy(
    "auth-login-ip",
    30,
    900,
)

LOGIN_IDENTITY = RateLimitPolicy(
    "auth-login-identity",
    10,
    900,
)


REFRESH_IP = RateLimitPolicy(
    "auth-refresh-ip",
    120,
    300,
)

REFRESH_SESSION = RateLimitPolicy(
    "auth-refresh-session",
    30,
    300,
)


# ============================================================
# Workspace invitation policies
# ============================================================

INVITATION_ISSUE_ACTOR = RateLimitPolicy(
    "workspace-invite-actor",
    30,
    3600,
)

INVITATION_ISSUE_RECIPIENT = RateLimitPolicy(
    "workspace-invite-recipient",
    5,
    3600,
)


INVITATION_ACCEPT_IP = RateLimitPolicy(
    "workspace-invite-accept-ip",
    20,
    900,
)

INVITATION_ACCEPT_TOKEN = RateLimitPolicy(
    "workspace-invite-accept-token",
    8,
    900,
)


# ============================================================
# Authenticated support policies
# ============================================================

SUPPORT_TICKET_ACTOR = RateLimitPolicy(
    "support-ticket-actor",
    10,
    3600,
)


def _normalized_ip(
    value: str | None,
) -> str | None:
    """Normalize one literal IPv4/IPv6 address."""

    if value is None:
        return None

    candidate = value.strip()

    if not candidate:
        return None

    try:
        return str(
            ip_address(
                candidate,
            ),
        )

    except ValueError:
        return None


def resolve_rate_limit_client_ip(
    request: Request,
) -> str:
    """Resolve the request source without trusting arbitrary proxy headers."""

    if settings.rate_limit_trust_cloudflare_connecting_ip:
        cloudflare_ip = _normalized_ip(
            request.headers.get(
                "cf-connecting-ip",
            ),
        )

        if cloudflare_ip is not None:
            return cloudflare_ip

    # Deliberately ignore X-Forwarded-For. It is client-spoofable unless
    # every upstream proxy hop and trust boundary is explicitly controlled.
    if request.client is not None:
        direct_ip = _normalized_ip(
            request.client.host,
        )

        if direct_ip is not None:
            return direct_ip

        # Test clients and some local transports can expose a hostname
        # rather than an IP literal. It is still transport-derived rather
        # than caller-controlled header input.
        direct_host = request.client.host.strip().lower()

        if direct_host:
            return direct_host

    return "unknown-client"


def _fingerprint(
    *parts: str,
) -> str:
    """Hash limiter identity data before it enters Redis."""

    payload = "\x1f".join(
        parts,
    ).encode(
        "utf-8",
    )

    return hashlib.sha256(
        payload,
    ).hexdigest()


async def enforce_rate_limit(
    request: Request,
    policy: RateLimitPolicy,
    *identity_parts: str,
    include_client_ip: bool = True,
) -> None:
    """Consume one distributed rate-limit slot or reject the request."""

    if not settings.rate_limit_enabled:
        return

    scope_parts: list[str] = []

    if include_client_ip:
        scope_parts.append(
            resolve_rate_limit_client_ip(
                request,
            ),
        )

    scope_parts.extend(
        identity_parts,
    )

    if not scope_parts:
        scope_parts.append(
            "global",
        )

    digest = _fingerprint(
        *scope_parts,
    )

    redis_key = f"cloudops:rate-limit:{policy.name}:{digest}"

    try:
        result = await redis_client.eval(
            _RATE_LIMIT_SCRIPT,
            1,
            redis_key,
            policy.window_seconds,
        )

        current = int(
            result[0],
        )

        ttl = int(
            result[1],
        )

    except Exception as error:
        # Authentication abuse protection is a security control. If Redis
        # cannot enforce it, fail closed rather than silently bypassing it.
        logger.exception(
            "Rate-limit enforcement failed.",
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Request protection is temporarily unavailable.",
        ) from error

    if current <= policy.limit:
        return

    retry_after = max(
        ttl,
        1,
    )

    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Too many requests. Try again later.",
        headers={
            "Retry-After": str(
                retry_after,
            ),
        },
    )


async def limit_signup(
    request: Request,
    email: str,
) -> None:
    """Protect public tenant registration."""

    normalized_email = email.strip().lower()

    await enforce_rate_limit(
        request,
        SIGNUP_IP,
    )

    await enforce_rate_limit(
        request,
        SIGNUP_IDENTITY,
        normalized_email,
    )


async def limit_verify_email(
    request: Request,
    token: str,
) -> None:
    """Protect verification-token consumption."""

    await enforce_rate_limit(
        request,
        VERIFY_EMAIL_IP,
    )

    await enforce_rate_limit(
        request,
        VERIFY_EMAIL_TOKEN,
        token,
    )


async def limit_resend_verification(
    request: Request,
    email: str,
) -> None:
    """Protect verification-email resend requests."""

    normalized_email = email.strip().lower()

    await enforce_rate_limit(
        request,
        RESEND_VERIFICATION_IP,
    )

    await enforce_rate_limit(
        request,
        RESEND_VERIFICATION_IDENTITY,
        normalized_email,
    )


async def limit_forgot_password(
    request: Request,
    email: str,
) -> None:
    """Protect password-recovery email requests."""

    normalized_email = email.strip().lower()

    await enforce_rate_limit(
        request,
        FORGOT_PASSWORD_IP,
    )

    await enforce_rate_limit(
        request,
        FORGOT_PASSWORD_IDENTITY,
        normalized_email,
    )


async def limit_reset_password(
    request: Request,
    token: str,
) -> None:
    """Protect reset-bearer consumption."""

    await enforce_rate_limit(
        request,
        RESET_PASSWORD_IP,
    )

    await enforce_rate_limit(
        request,
        RESET_PASSWORD_TOKEN,
        token,
    )


async def limit_login(
    request: Request,
    email: str,
) -> None:
    """Protect password authentication without global account lockout."""

    normalized_email = email.strip().lower()

    await enforce_rate_limit(
        request,
        LOGIN_IP,
    )

    # Combining source IP + account identifier avoids introducing a global
    # per-account counter that an attacker could abuse to lock out a victim.
    await enforce_rate_limit(
        request,
        LOGIN_IDENTITY,
        normalized_email,
    )


async def limit_refresh(
    request: Request,
    raw_refresh_token: str | None,
) -> None:
    """Protect rotating refresh-session endpoints."""

    await enforce_rate_limit(
        request,
        REFRESH_IP,
    )

    if raw_refresh_token:
        await enforce_rate_limit(
            request,
            REFRESH_SESSION,
            raw_refresh_token,
        )


async def limit_invitation_issue(
    request: Request,
    *,
    user_id: UUID,
    organization_id: UUID,
    email: str,
) -> None:
    """Protect authenticated invitation delivery."""

    normalized_email = email.strip().lower()

    # Actor/workspace limit is independent of IP so changing network origin
    # cannot bypass an authenticated invitation-sending quota.
    await enforce_rate_limit(
        request,
        INVITATION_ISSUE_ACTOR,
        str(
            user_id,
        ),
        str(
            organization_id,
        ),
        include_client_ip=False,
    )

    await enforce_rate_limit(
        request,
        INVITATION_ISSUE_RECIPIENT,
        str(
            organization_id,
        ),
        normalized_email,
        include_client_ip=False,
    )


async def limit_support_ticket(
    request: Request,
    *,
    user_id: UUID,
    organization_id: UUID,
) -> None:
    """Protect authenticated support-ticket submission."""

    await enforce_rate_limit(
        request,
        SUPPORT_TICKET_ACTOR,
        str(
            user_id,
        ),
        str(
            organization_id,
        ),
        include_client_ip=False,
    )


async def limit_invitation_accept(
    request: Request,
    token: str,
) -> None:
    """Protect public invitation-bearer consumption."""

    await enforce_rate_limit(
        request,
        INVITATION_ACCEPT_IP,
    )

    await enforce_rate_limit(
        request,
        INVITATION_ACCEPT_TOKEN,
        token,
    )

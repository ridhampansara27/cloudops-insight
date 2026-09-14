"""Secure forgot-password and reset-password lifecycle."""

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    generate_opaque_token,
    hash_opaque_token,
    hash_password,
)
from app.models.auth import (
    AuthToken,
    RefreshSession,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.auth_email_service import (
    AuthEmailService,
    PasswordResetEmailSender,
    VerificationEmailConfigurationError,
)

logger = logging.getLogger(
    __name__,
)


class PasswordResetService:
    """Issue and consume one-time password-reset bearer tokens."""

    def __init__(
        self,
        session: AsyncSession,
        *,
        email_sender: PasswordResetEmailSender | None = None,
    ) -> None:
        self.session = session

        self.users = UserRepository(
            session,
        )

        self.email_sender = email_sender or AuthEmailService()

    async def request_reset(
        self,
        email: str,
    ) -> bool:
        """Issue a reset token only for an eligible identity.

        The API intentionally ignores this boolean so callers cannot use
        response differences to discover registered email addresses.
        """

        normalized_email = email.strip().lower()

        user = await self.users.get_by_email(
            normalized_email,
        )

        if user is None or not user.is_active or user.email_verified_at is None:
            return False

        now = datetime.now(
            UTC,
        )

        latest_result = await self.session.execute(
            select(
                AuthToken,
            )
            .where(
                AuthToken.user_id == user.id,
                AuthToken.purpose == "password_reset",
                AuthToken.used_at.is_(
                    None,
                ),
            )
            .order_by(
                AuthToken.created_at.desc(),
            )
            .limit(
                1,
            ),
        )

        latest = latest_result.scalar_one_or_none()

        if latest is not None:
            cooldown = timedelta(
                seconds=(settings.password_reset_resend_cooldown_seconds),
            )

            if latest.created_at is not None and latest.created_at > now - cooldown:
                return False

        # Rotate every earlier unused reset link.
        await self.session.execute(
            update(
                AuthToken,
            )
            .where(
                AuthToken.user_id == user.id,
                AuthToken.purpose == "password_reset",
                AuthToken.used_at.is_(
                    None,
                ),
            )
            .values(
                used_at=now,
            ),
        )

        raw_token = generate_opaque_token()

        token = AuthToken(
            user_id=user.id,
            token_hash=hash_opaque_token(
                raw_token,
            ),
            purpose="password_reset",
            expires_at=(
                now
                + timedelta(
                    minutes=(settings.password_reset_token_expire_minutes),
                )
            ),
        )

        self.session.add(
            token,
        )

        await self.session.commit()

        await self._deliver_reset(
            recipient=normalized_email,
            token=raw_token,
        )

        return True

    async def reset_password(
        self,
        *,
        raw_token: str,
        new_password: str,
    ) -> bool:
        """Consume a valid reset token and invalidate previous credentials."""

        now = datetime.now(
            UTC,
        )

        token_hash = hash_opaque_token(
            raw_token,
        )

        token_result = await self.session.execute(
            select(
                AuthToken,
            )
            .where(
                AuthToken.token_hash == token_hash,
                AuthToken.purpose == "password_reset",
            )
            .with_for_update(),
        )

        token = token_result.scalar_one_or_none()

        if token is None or token.used_at is not None or token.expires_at <= now:
            await self.session.rollback()

            return False

        user_result = await self.session.execute(
            select(
                User,
            )
            .where(
                User.id == token.user_id,
            )
            .with_for_update(),
        )

        user = user_result.scalar_one_or_none()

        if user is None or not user.is_active or user.email_verified_at is None:
            await self.session.rollback()

            return False

        user.password_hash = hash_password(
            new_password,
        )

        user.password_changed_at = now

        # Consume every outstanding reset token for this identity.
        await self.session.execute(
            update(
                AuthToken,
            )
            .where(
                AuthToken.user_id == user.id,
                AuthToken.purpose == "password_reset",
                AuthToken.used_at.is_(
                    None,
                ),
            )
            .values(
                used_at=now,
            ),
        )

        # Stage 3D will begin issuing rotating refresh sessions.
        # Revoking them here now ensures password reset already has the
        # correct security semantics when those sessions become active.
        await self.session.execute(
            update(
                RefreshSession,
            )
            .where(
                RefreshSession.user_id == user.id,
                RefreshSession.revoked_at.is_(
                    None,
                ),
            )
            .values(
                revoked_at=now,
            ),
        )

        await self.session.commit()

        return True

    async def _deliver_reset(
        self,
        *,
        recipient: str,
        token: str,
    ) -> None:
        """Deliver a reset bearer without writing it to logs."""

        try:
            await self.email_sender.send_password_reset_email(
                recipient=recipient,
                token=token,
            )

        except VerificationEmailConfigurationError:
            logger.error(
                "Password-reset email delivery is not configured.",
            )

        except Exception:
            logger.exception(
                "Password-reset email delivery failed.",
            )

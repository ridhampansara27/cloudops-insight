"""Commercial signup and email-verification lifecycle."""

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    generate_opaque_token,
    hash_opaque_token,
    hash_password,
)
from app.models.auth import AuthToken
from app.models.organization import (
    Organization,
    OrganizationMembership,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import SignupRequest
from app.services.auth_email_service import (
    AuthEmailService,
    VerificationEmailConfigurationError,
    VerificationEmailSender,
)

logger = logging.getLogger(
    __name__,
)


class SignupUnavailableError(RuntimeError):
    """Raised when commercial signup is intentionally disabled."""


class SignupEmailConfigurationError(RuntimeError):
    """Raised when enabled signup cannot deliver verification mail."""


class RegistrationService:
    """Create and verify tenant-owner identities."""

    def __init__(
        self,
        session: AsyncSession,
        *,
        email_sender: VerificationEmailSender | None = None,
    ) -> None:
        self.session = session

        self.users = UserRepository(
            session,
        )

        self.email_sender = email_sender or AuthEmailService()

    async def register(
        self,
        payload: SignupRequest,
        *,
        enforce_public_signup_gate: bool = True,
    ) -> bool:
        """Atomically create identity, tenant, owner membership and token.

        Returns whether a new registration was created. API callers must
        deliberately ignore this result so duplicate-email responses remain
        non-enumerating.
        """

        if enforce_public_signup_gate and not settings.public_signup_enabled:
            raise SignupUnavailableError(
                "Public signup is currently disabled.",
            )

        if (
            enforce_public_signup_gate
            and isinstance(
                self.email_sender,
                AuthEmailService,
            )
            and not self.email_sender.is_configured
        ):
            raise SignupEmailConfigurationError(
                "Signup email delivery is not configured.",
            )

        normalized_email = (
            str(
                payload.email,
            )
            .strip()
            .lower()
        )

        existing = await self.users.get_by_email(
            normalized_email,
        )

        # Do not reveal whether the identity already exists.
        if existing is not None:
            return False

        raw_token = generate_opaque_token()

        token_hash = hash_opaque_token(
            raw_token,
        )

        expires_at = datetime.now(
            UTC,
        ) + timedelta(
            minutes=(settings.email_verification_token_expire_minutes),
        )

        try:
            user = await self.users.create(
                email=normalized_email,
                full_name=payload.full_name.strip(),
                password_hash=hash_password(
                    payload.password,
                ),
                role="viewer",
                email_verified_at=None,
                commit=False,
            )

            organization = Organization(
                name=payload.organization_name.strip(),
                is_active=True,
            )

            self.session.add(
                organization,
            )

            await self.session.flush()

            membership = OrganizationMembership(
                organization_id=organization.id,
                user_id=user.id,
                role="owner",
                is_active=True,
            )

            verification = AuthToken(
                user_id=user.id,
                token_hash=token_hash,
                purpose="email_verification",
                expires_at=expires_at,
            )

            self.session.add_all(
                [
                    membership,
                    verification,
                ],
            )

            # One transaction is the signup boundary.
            await self.session.commit()

        except IntegrityError:
            await self.session.rollback()

            # A concurrent signup for the same email must receive the same
            # generic API result as a pre-existing account.
            return False

        await self._deliver_verification(
            recipient=normalized_email,
            token=raw_token,
        )

        return True

    async def resend_verification(
        self,
        email: str,
    ) -> bool:
        """Rotate a verification token without exposing account existence."""

        normalized_email = email.strip().lower()

        user = await self.users.get_by_email(
            normalized_email,
        )

        if user is None or not user.is_active or user.email_verified_at is not None:
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
                AuthToken.purpose == "email_verification",
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
                seconds=(settings.verification_resend_cooldown_seconds),
            )

            created_at = latest.created_at

            if created_at is not None and created_at > now - cooldown:
                # Return the same generic success path but do not send spam.
                return False

        # Invalidate all previous unused verification links.
        await self.session.execute(
            update(
                AuthToken,
            )
            .where(
                AuthToken.user_id == user.id,
                AuthToken.purpose == "email_verification",
                AuthToken.used_at.is_(
                    None,
                ),
            )
            .values(
                used_at=now,
            ),
        )

        raw_token = generate_opaque_token()

        verification = AuthToken(
            user_id=user.id,
            token_hash=hash_opaque_token(
                raw_token,
            ),
            purpose="email_verification",
            expires_at=(
                now
                + timedelta(
                    minutes=(settings.email_verification_token_expire_minutes),
                )
            ),
        )

        self.session.add(
            verification,
        )

        await self.session.commit()

        await self._deliver_verification(
            recipient=normalized_email,
            token=raw_token,
        )

        return True

    async def verify_email(
        self,
        raw_token: str,
    ) -> bool:
        """Consume exactly one valid email-verification bearer token."""

        now = datetime.now(
            UTC,
        )

        token_hash = hash_opaque_token(
            raw_token,
        )

        result = await self.session.execute(
            select(
                AuthToken,
            )
            .where(
                AuthToken.token_hash == token_hash,
                AuthToken.purpose == "email_verification",
            )
            .with_for_update(),
        )

        token = result.scalar_one_or_none()

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

        if user is None:
            await self.session.rollback()

            return False

        token.used_at = now

        if user.email_verified_at is None:
            user.email_verified_at = now

        # Any sibling verification tokens become invalid as soon as
        # ownership of the email has been proven.
        await self.session.execute(
            update(
                AuthToken,
            )
            .where(
                AuthToken.user_id == user.id,
                AuthToken.purpose == "email_verification",
                AuthToken.used_at.is_(
                    None,
                ),
            )
            .values(
                used_at=now,
            ),
        )

        await self.session.commit()

        return True

    async def _deliver_verification(
        self,
        *,
        recipient: str,
        token: str,
    ) -> None:
        """Deliver mail while never writing the raw token to logs."""

        try:
            await self.email_sender.send_verification_email(
                recipient=recipient,
                token=token,
            )

        except VerificationEmailConfigurationError:
            # Configuration errors are actionable before public signup
            # becomes enabled, but no bearer secret is logged.
            logger.error(
                "Verification email delivery is not configured.",
            )

        except Exception:
            # Registration remains recoverable through resend.
            #
            # Do not log recipient/token pair or the raw bearer secret.
            logger.exception(
                "Verification email delivery failed.",
            )

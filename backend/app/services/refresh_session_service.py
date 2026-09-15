"""Server-side rotating refresh-session lifecycle."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    generate_opaque_token,
    hash_opaque_token,
)
from app.models.auth import RefreshSession
from app.models.user import User


class InvalidRefreshSessionError(RuntimeError):
    """Raised when a refresh bearer cannot establish a valid session."""


class RefreshSessionReuseError(RuntimeError):
    """Raised when a previously rotated/revoked bearer is replayed."""


@dataclass(
    frozen=True,
)
class RefreshSessionIssue:
    """Return a raw bearer only to the HTTP boundary."""

    token: str

    user: User

    expires_at: datetime

    family_id: UUID


class RefreshSessionService:
    """Issue, rotate, detect replay and revoke refresh sessions."""

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    async def issue(
        self,
        user: User,
    ) -> RefreshSessionIssue:
        """Create the initial member of one refresh-token family."""

        now = datetime.now(
            UTC,
        )

        expires_at = now + timedelta(
            days=settings.refresh_session_expire_days,
        )

        family_id = uuid4()

        raw_token = generate_opaque_token()

        refresh_session = RefreshSession(
            user_id=user.id,
            family_id=family_id,
            token_hash=hash_opaque_token(
                raw_token,
            ),
            expires_at=expires_at,
        )

        self.session.add(
            refresh_session,
        )

        await self.session.commit()

        return RefreshSessionIssue(
            token=raw_token,
            user=user,
            expires_at=expires_at,
            family_id=family_id,
        )

    async def rotate(
        self,
        raw_token: str,
    ) -> RefreshSessionIssue:
        """Consume one active refresh bearer and replace it atomically."""

        now = datetime.now(
            UTC,
        )

        token_hash = hash_opaque_token(
            raw_token,
        )

        result = await self.session.execute(
            select(
                RefreshSession,
            )
            .where(
                RefreshSession.token_hash == token_hash,
            )
            .with_for_update(),
        )

        current = result.scalar_one_or_none()

        if current is None:
            await self.session.rollback()

            raise InvalidRefreshSessionError(
                "Refresh session is invalid.",
            )

        # A known token that has already been rotated or revoked is a
        # replay signal. Revoke every still-active member of its family.
        if current.replaced_by_id is not None or current.revoked_at is not None:
            await self._revoke_family(
                family_id=current.family_id,
                revoked_at=now,
            )

            await self.session.commit()

            raise RefreshSessionReuseError(
                "Refresh session reuse detected.",
            )

        if current.expires_at <= now:
            current.revoked_at = now

            await self.session.commit()

            raise InvalidRefreshSessionError(
                "Refresh session expired.",
            )

        user_result = await self.session.execute(
            select(
                User,
            )
            .where(
                User.id == current.user_id,
            )
            .with_for_update(),
        )

        user = user_result.scalar_one_or_none()

        if user is None or not user.is_active or user.email_verified_at is None:
            await self._revoke_family(
                family_id=current.family_id,
                revoked_at=now,
            )

            await self.session.commit()

            raise InvalidRefreshSessionError(
                "Refresh-session user is unavailable.",
            )

        raw_replacement = generate_opaque_token()

        # Keep one absolute family expiration boundary. Rotation does not
        # silently extend a stolen/abandoned family forever.
        replacement = RefreshSession(
            user_id=user.id,
            family_id=current.family_id,
            token_hash=hash_opaque_token(
                raw_replacement,
            ),
            expires_at=current.expires_at,
        )

        self.session.add(
            replacement,
        )

        # Obtain replacement.id before linking the old record to it.
        await self.session.flush()

        current.last_used_at = now
        current.revoked_at = now
        current.replaced_by_id = replacement.id

        await self.session.commit()

        return RefreshSessionIssue(
            token=raw_replacement,
            user=user,
            expires_at=replacement.expires_at,
            family_id=replacement.family_id,
        )

    async def revoke_family_for_token(
        self,
        raw_token: str,
    ) -> bool:
        """Revoke a refresh family during explicit logout."""

        now = datetime.now(
            UTC,
        )

        token_hash = hash_opaque_token(
            raw_token,
        )

        result = await self.session.execute(
            select(
                RefreshSession,
            )
            .where(
                RefreshSession.token_hash == token_hash,
            )
            .with_for_update(),
        )

        current = result.scalar_one_or_none()

        if current is None:
            await self.session.rollback()

            return False

        await self._revoke_family(
            family_id=current.family_id,
            revoked_at=now,
        )

        await self.session.commit()

        return True

    async def _revoke_family(
        self,
        *,
        family_id: UUID,
        revoked_at: datetime,
    ) -> None:
        """Revoke every currently active member of one token family."""

        await self.session.execute(
            update(
                RefreshSession,
            )
            .where(
                RefreshSession.family_id == family_id,
                RefreshSession.revoked_at.is_(
                    None,
                ),
            )
            .values(
                revoked_at=revoked_at,
            ),
        )

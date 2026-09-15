"""Authentication credential verification."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    DUMMY_PASSWORD_HASH,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository


class AuthService:
    """Authenticate local CloudOps identities."""

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.users = UserRepository(
            session,
        )

    async def authenticate(
        self,
        email: str,
        password: str,
    ) -> User | None:
        """Authenticate without revealing which credential check failed."""

        user = await self.users.get_by_email(
            email,
        )

        if user is None:
            # Preserve comparable password-work for unknown identities.
            verify_password(
                password,
                DUMMY_PASSWORD_HASH,
            )

            return None

        if not verify_password(
            password,
            user.password_hash,
        ):
            return None

        if not user.is_active:
            return None

        # Commercial users must prove ownership of the login address
        # before an access token can ever be issued.
        if user.email_verified_at is None:
            return None

        return user

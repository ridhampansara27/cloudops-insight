"""Persistence operations for application users."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    """Persist identity records without forcing transaction boundaries."""

    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        self.session = session

    async def get_by_email(
        self,
        email: str,
    ) -> User | None:
        statement = select(
            User,
        ).where(
            User.email == email.lower(),
        )

        result = await self.session.execute(
            statement,
        )

        return result.scalar_one_or_none()

    async def get_by_id(
        self,
        user_id: UUID,
    ) -> User | None:
        return await self.session.get(
            User,
            user_id,
        )

    async def create(
        self,
        *,
        email: str,
        full_name: str,
        password_hash: str,
        role: str = "viewer",
        email_verified_at: datetime | None = None,
        commit: bool = True,
    ) -> User:
        """Create a user with an optional caller-controlled transaction.

        Legacy/administrative callers retain commit=True behavior.

        Commercial signup will use commit=False so User + Organization +
        OWNER membership + verification token can be committed atomically.
        """

        user = User(
            email=email.lower(),
            full_name=full_name,
            password_hash=password_hash,
            role=role,
            email_verified_at=email_verified_at,
        )

        self.session.add(
            user,
        )

        if commit:
            await self.session.commit()

        else:
            await self.session.flush()

        await self.session.refresh(
            user,
        )

        return user

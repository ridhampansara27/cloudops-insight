"""Seed the explicitly configured development administrator."""

import asyncio
from datetime import UTC, datetime

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import async_session_factory
from app.repositories.user_repository import UserRepository


async def seed_admin() -> None:
    """Create a verified local administrator when explicitly configured."""

    if not settings.seed_admin_password:
        raise RuntimeError(
            "SEED_ADMIN_PASSWORD must be configured in backend/.env.",
        )

    async with async_session_factory() as session:
        repository = UserRepository(
            session,
        )

        existing_user = await repository.get_by_email(
            settings.seed_admin_email,
        )

        if existing_user is not None:
            print(
                "Administrator already exists:",
                existing_user.email,
            )

            return

        hashed_password = hash_password(
            settings.seed_admin_password,
        )

        user = await repository.create(
            email=settings.seed_admin_email,
            full_name=settings.seed_admin_name,
            password_hash=hashed_password,
            role="admin",
            email_verified_at=datetime.now(
                UTC,
            ),
        )

        print(
            "Created administrator:",
            user.email,
        )


if __name__ == "__main__":
    asyncio.run(
        seed_admin(),
    )

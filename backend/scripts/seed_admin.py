# Import Python's asynchronous runtime.
import asyncio

# Import application configuration.
from app.core.config import settings

# Import password hashing.
from app.core.security import hash_password

# Import the database session factory.
from app.db.session import async_session_factory

# Import the user repository.
from app.repositories.user_repository import UserRepository


# Seed the initial local administrator.
async def seed_admin() -> None:
    # Prevent accidentally creating an administrator with no password.
    if not settings.seed_admin_password:
        # Fail clearly instead of creating an insecure account.
        raise RuntimeError(
            "SEED_ADMIN_PASSWORD must be configured in backend/.env.",
        )

    # Create a database session.
    async with async_session_factory() as session:
        # Create the user repository.
        repository = UserRepository(
            session,
        )

        # Check whether the administrator already exists.
        existing_user = await repository.get_by_email(
            settings.seed_admin_email,
        )

        # Avoid creating duplicate administrators.
        if existing_user is not None:
            # Display a useful status message.
            print(
                "Administrator already exists:",
                existing_user.email,
            )

            # Exit normally.
            return

        # Hash the local administrator password.
        hashed_password = hash_password(
            settings.seed_admin_password,
        )

        # Create the administrator.
        user = await repository.create(
            email=settings.seed_admin_email,
            full_name=settings.seed_admin_name,
            password_hash=hashed_password,
            role="admin",
        )

        # Confirm successful creation.
        print(
            "Created administrator:",
            user.email,
        )


# Execute the asynchronous seed routine when run as a module.
if __name__ == "__main__":
    # Start the asyncio event loop.
    asyncio.run(
        seed_admin(),
    )

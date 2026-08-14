# Import the asynchronous SQLAlchemy session.
from sqlalchemy.ext.asyncio import AsyncSession

# Import password verification helpers.
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    verify_password,
)

# Import the User model.
from app.models.user import User

# Import the user repository.
from app.repositories.user_repository import UserRepository


# Encapsulate authentication business logic.
class AuthService:
    # Create the service with one database session.
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        # Create the repository used by the service.
        self.users = UserRepository(
            session,
        )

    # Authenticate one email and password combination.
    async def authenticate(
        self,
        email: str,
        password: str,
    ) -> User | None:
        # Find the user by normalized email.
        user = await self.users.get_by_email(
            email,
        )

        # Handle unknown email addresses.
        if user is None:
            # Perform a normal password verification to reduce timing differences.
            verify_password(
                password,
                DUMMY_PASSWORD_HASH,
            )

            # Reject authentication.
            return None

        # Reject an incorrect password.
        if not verify_password(
            password,
            user.password_hash,
        ):
            # Authentication failed.
            return None

        # Reject disabled users.
        if not user.is_active:
            # Do not authenticate inactive accounts.
            return None

        # Authentication succeeded.
        return user

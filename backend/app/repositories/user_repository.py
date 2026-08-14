# Import UUID typing.
from uuid import UUID

# Import SQLAlchemy's SELECT construct.
from sqlalchemy import select

# Import the asynchronous SQLAlchemy session.
from sqlalchemy.ext.asyncio import AsyncSession

# Import the User ORM model.
from app.models.user import User


# Encapsulate database operations involving users.
class UserRepository:
    # Create the repository with one request-scoped session.
    def __init__(
        self,
        session: AsyncSession,
    ) -> None:
        # Store the database session.
        self.session = session

    # Find one user by email address.
    async def get_by_email(
        self,
        email: str,
    ) -> User | None:
        # Build a case-normalized user lookup.
        statement = select(User).where(
            User.email == email.lower(),
        )

        # Execute the asynchronous query.
        result = await self.session.execute(
            statement,
        )

        # Return the user or None.
        return result.scalar_one_or_none()

    # Find one user by UUID.
    async def get_by_id(
        self,
        user_id: UUID,
    ) -> User | None:
        # Use SQLAlchemy's primary-key lookup.
        return await self.session.get(
            User,
            user_id,
        )

    # Create one user.
    async def create(
        self,
        *,
        email: str,
        full_name: str,
        password_hash: str,
        role: str = "viewer",
    ) -> User:
        # Construct the ORM object.
        user = User(
            # Normalize the email before persistence.
            email=email.lower(),
            # Store the display name.
            full_name=full_name,
            # Store only the password hash.
            password_hash=password_hash,
            # Store the application role.
            role=role,
        )

        # Add the user to the transaction.
        self.session.add(user)

        # Commit the transaction.
        await self.session.commit()

        # Refresh database-generated fields.
        await self.session.refresh(user)

        # Return the persisted user.
        return user

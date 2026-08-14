# Import dependency annotation support.
from typing import Annotated

# Import UUID conversion.
from uuid import UUID

# Import FastAPI dependency and HTTP error utilities.
from fastapi import Depends, HTTPException, status

# Import FastAPI's OAuth2 bearer-token extractor.
from fastapi.security import OAuth2PasswordBearer

# Import PyJWT's invalid-token exception.
from jwt.exceptions import InvalidTokenError

# Import the asynchronous SQLAlchemy session.
from sqlalchemy.ext.asyncio import AsyncSession

# Import JWT decoding.
from app.core.security import decode_access_token

# Import the database dependency.
from app.db.session import get_db_session

# Import the User model.
from app.models.user import User

# Import the user repository.
from app.repositories.user_repository import UserRepository

# Tell FastAPI where clients obtain bearer tokens.
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
)


# Create a reusable database-session dependency type.
DatabaseSession = Annotated[
    AsyncSession,
    Depends(get_db_session),
]


# Create a reusable bearer-token dependency type.
BearerToken = Annotated[
    str,
    Depends(oauth2_scheme),
]


# Resolve the currently authenticated user.
async def get_current_user(
    # Read the bearer token.
    token: BearerToken,
    # Receive the request-scoped database session.
    session: DatabaseSession,
) -> User:
    # Create the standard authentication error.
    credentials_error = HTTPException(
        # Return HTTP 401.
        status_code=status.HTTP_401_UNAUTHORIZED,
        # Keep the response intentionally generic.
        detail="Could not validate credentials.",
        # Tell clients that Bearer authentication is expected.
        headers={
            "WWW-Authenticate": "Bearer",
        },
    )

    try:
        # Validate the token and read its subject.
        subject = decode_access_token(
            token,
        )

        # Convert the token subject into the user UUID.
        user_id = UUID(subject)

    except (
        InvalidTokenError,
        ValueError,
    ) as error:
        # Suppress sensitive parsing details from the API response.
        raise credentials_error from error

    # Create the repository.
    repository = UserRepository(
        session,
    )

    # Retrieve the authenticated user.
    user = await repository.get_by_id(
        user_id,
    )

    # Reject tokens for users that no longer exist.
    if user is None:
        # Return the standard authentication error.
        raise credentials_error

    # Reject disabled users.
    if not user.is_active:
        # Return a forbidden response.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    # Return the authenticated user.
    return user


# Create an Annotated dependency usable directly by endpoints.
CurrentUser = Annotated[
    User,
    Depends(get_current_user),
]

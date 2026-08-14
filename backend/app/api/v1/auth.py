# Import dependency annotation support.
from typing import Annotated

# Import FastAPI routing and HTTP exceptions.
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

# Import FastAPI's standard OAuth2 login form.
from fastapi.security import OAuth2PasswordRequestForm

# Import authentication dependencies.
from app.api.dependencies import (
    CurrentUser,
    DatabaseSession,
)

# Import JWT generation.
from app.core.security import create_access_token

# Import response schemas.
from app.schemas.auth import TokenResponse
from app.schemas.user import UserRead

# Import the authentication service.
from app.services.auth_service import AuthService

# Create the authentication router.
router = APIRouter()


# Authenticate a user and issue a JWT.
@router.post(
    "/login",
    response_model=TokenResponse,
)
async def login(
    # Read username and password from the OAuth2 form.
    form_data: Annotated[
        OAuth2PasswordRequestForm,
        Depends(),
    ],
    # Receive the request database session.
    session: DatabaseSession,
) -> TokenResponse:
    # Create the authentication service.
    authentication = AuthService(
        session,
    )

    # Treat OAuth2's username field as the user's email address.
    user = await authentication.authenticate(
        email=form_data.username,
        password=form_data.password,
    )

    # Reject invalid credentials.
    if user is None:
        # Return HTTP 401 without revealing whether the email exists.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # Create an access token containing the user UUID.
    access_token = create_access_token(
        subject=str(user.id),
    )

    # Return the OAuth2 bearer-token response.
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
    )


# Return information about the authenticated user.
@router.get(
    "/me",
    response_model=UserRead,
)
async def read_current_user(
    # Resolve the current user from the bearer token.
    current_user: CurrentUser,
) -> UserRead:
    # Convert the SQLAlchemy model into the Pydantic response.
    return UserRead.model_validate(
        current_user,
    )

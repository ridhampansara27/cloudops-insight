# Import dependency annotation support.
from typing import Annotated

# Import UUID conversion.
from uuid import UUID

# Import FastAPI dependency and HTTP error utilities.
from fastapi import Depends, Header, HTTPException, status

# Import FastAPI's OAuth2 bearer-token extractor.
from fastapi.security import OAuth2PasswordBearer

# Import PyJWT's invalid-token exception.
from jwt.exceptions import InvalidTokenError

# Import SQLAlchemy query support.
from sqlalchemy import select

# Import the asynchronous SQLAlchemy session.
from sqlalchemy.ext.asyncio import AsyncSession

# Import JWT decoding.
from app.core.security import decode_access_token

# Import tenant authorization primitives.
from app.core.tenancy import (
    TENANT_ROLES,
    TenantContext,
    ensure_tenant_role,
)

# Import the database dependency.
from app.db.session import get_db_session

# Import tenant membership models.
from app.models.organization import Organization, OrganizationMembership

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
        raise credentials_error

    # Reject disabled users.
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    return user


# Create an Annotated dependency usable directly by endpoints.
CurrentUser = Annotated[
    User,
    Depends(get_current_user),
]


async def get_tenant_context(
    # Require normal authentication first.
    current_user: CurrentUser,
    # Use the same request-scoped database transaction.
    session: DatabaseSession,
    # Allow users with multiple organizations to select one explicitly.
    x_organization_id: Annotated[
        str | None,
        Header(
            alias="X-Organization-ID",
        ),
    ] = None,
) -> TenantContext:
    """Resolve the authenticated user's active organization membership."""

    requested_organization_id: UUID | None = None

    if x_organization_id is not None:
        try:
            requested_organization_id = UUID(
                x_organization_id,
            )

        except ValueError as error:
            # Avoid revealing whether any real organization ID exists.
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found.",
            ) from error

    statement = (
        select(
            OrganizationMembership,
        )
        .join(
            Organization,
            Organization.id == OrganizationMembership.organization_id,
        )
        .where(
            OrganizationMembership.user_id == current_user.id,
            OrganizationMembership.is_active.is_(True),
            Organization.is_active.is_(True),
        )
        .order_by(
            OrganizationMembership.created_at,
            OrganizationMembership.id,
        )
    )

    if requested_organization_id is not None:
        statement = statement.where(
            OrganizationMembership.organization_id == requested_organization_id,
        )

    result = await session.execute(
        statement,
    )

    memberships = list(
        result.scalars().all(),
    )

    if requested_organization_id is not None:
        if len(memberships) != 1:
            # Cross-tenant organization probes deliberately receive 404.
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found.",
            )

    else:
        if not memberships:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No active organization membership.",
            )

        if len(memberships) > 1:
            # Future multi-workspace users must explicitly select a tenant.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Multiple organizations are available. Provide X-Organization-ID."
                ),
            )

    membership = memberships[0]

    return TenantContext(
        organization_id=membership.organization_id,
        membership_id=membership.id,
        user_id=current_user.id,
        role=membership.role,
    )


# Reusable tenant context for customer-facing endpoints.
CurrentTenant = Annotated[
    TenantContext,
    Depends(get_tenant_context),
]


def require_tenant_roles(
    *allowed_roles: str,
):
    """Build a FastAPI dependency requiring organization-level roles."""

    configured_roles = frozenset(
        allowed_roles,
    )

    unknown_roles = configured_roles - TENANT_ROLES

    if unknown_roles:
        raise ValueError(
            "Unknown tenant roles: "
            + ", ".join(
                sorted(
                    unknown_roles,
                )
            )
        )

    async def dependency(
        tenant: CurrentTenant,
    ) -> TenantContext:
        return ensure_tenant_role(
            tenant,
            configured_roles,
        )

    return dependency


# Common reusable organization authorization levels.
TenantOwner = Annotated[
    TenantContext,
    Depends(
        require_tenant_roles(
            "owner",
        )
    ),
]

TenantOwnerOrAdmin = Annotated[
    TenantContext,
    Depends(
        require_tenant_roles(
            "owner",
            "admin",
        )
    ),
]

TenantWriteAccess = Annotated[
    TenantContext,
    Depends(
        require_tenant_roles(
            "owner",
            "admin",
            "member",
        )
    ),
]

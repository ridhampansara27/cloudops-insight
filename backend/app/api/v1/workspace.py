"""Profile, organization and member administration API."""

from uuid import UUID

from fastapi import (
    APIRouter,
    HTTPException,
    Response,
    status,
)

from app.api.dependencies import (
    CurrentTenant,
    CurrentUser,
    DatabaseSession,
    TenantOwner,
    TenantOwnerOrAdmin,
)
from app.schemas.workspace import (
    MemberRoleUpdate,
    OrganizationRead,
    OrganizationUpdate,
    ProfileUpdate,
    WorkspaceMemberRead,
    WorkspaceProfileRead,
)
from app.services.workspace_administration_service import (
    LastWorkspaceOwnerError,
    WorkspaceAdministrationService,
    WorkspaceMemberNotFoundError,
    WorkspaceOrganizationNotFoundError,
)

router = APIRouter()


@router.get(
    "/profile",
    response_model=WorkspaceProfileRead,
)
async def read_profile(
    current_user: CurrentUser,
) -> WorkspaceProfileRead:
    """Return the authenticated user's identity profile."""

    return WorkspaceProfileRead.model_validate(
        current_user,
    )


@router.patch(
    "/profile",
    response_model=WorkspaceProfileRead,
)
async def update_profile(
    payload: ProfileUpdate,
    current_user: CurrentUser,
    session: DatabaseSession,
) -> WorkspaceProfileRead:
    """Update the authenticated user's display profile."""

    user = await WorkspaceAdministrationService(
        session,
    ).update_profile(
        user=current_user,
        full_name=payload.full_name,
    )

    return WorkspaceProfileRead.model_validate(
        user,
    )


@router.get(
    "/organization",
    response_model=OrganizationRead,
)
async def read_organization(
    tenant: CurrentTenant,
    session: DatabaseSession,
) -> OrganizationRead:
    """Return only the caller's selected organization."""

    try:
        organization = await WorkspaceAdministrationService(
            session,
        ).get_organization(
            organization_id=tenant.org_id,
        )

    except WorkspaceOrganizationNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization was not found.",
        ) from error

    return OrganizationRead(
        id=organization.id,
        name=organization.name,
        is_active=organization.is_active,
        current_role=tenant.role,
        created_at=organization.created_at,
        updated_at=organization.updated_at,
    )


@router.patch(
    "/organization",
    response_model=OrganizationRead,
)
async def update_organization(
    payload: OrganizationUpdate,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> OrganizationRead:
    """Allow only owners/admins to rename their current organization."""

    try:
        organization = await WorkspaceAdministrationService(
            session,
        ).update_organization(
            organization_id=tenant.org_id,
            name=payload.name,
        )

    except WorkspaceOrganizationNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization was not found.",
        ) from error

    return OrganizationRead(
        id=organization.id,
        name=organization.name,
        is_active=organization.is_active,
        current_role=tenant.role,
        created_at=organization.created_at,
        updated_at=organization.updated_at,
    )


@router.get(
    "/members",
    response_model=list[WorkspaceMemberRead],
)
async def list_members(
    tenant: CurrentTenant,
    session: DatabaseSession,
) -> list[WorkspaceMemberRead]:
    """List active members from only the selected tenant."""

    members = await WorkspaceAdministrationService(
        session,
    ).list_members(
        organization_id=tenant.org_id,
    )

    return [
        WorkspaceMemberRead(
            membership_id=member.membership_id,
            user_id=member.user_id,
            email=member.email,
            full_name=member.full_name,
            role=member.role,
            is_active=member.is_active,
            joined_at=member.joined_at,
        )
        for member in members
    ]


@router.patch(
    "/members/{membership_id}/role",
    response_model=WorkspaceMemberRead,
)
async def update_member_role(
    membership_id: UUID,
    payload: MemberRoleUpdate,
    tenant: TenantOwner,
    session: DatabaseSession,
) -> WorkspaceMemberRead:
    """Allow an owner to change one current-tenant member role."""

    try:
        member = await WorkspaceAdministrationService(
            session,
        ).update_member_role(
            organization_id=tenant.org_id,
            membership_id=membership_id,
            role=payload.role,
        )

    except WorkspaceMemberNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace member was not found.",
        ) from error

    except LastWorkspaceOwnerError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=("The organization must retain at least one active owner."),
        ) from error

    return WorkspaceMemberRead(
        membership_id=member.membership_id,
        user_id=member.user_id,
        email=member.email,
        full_name=member.full_name,
        role=member.role,
        is_active=member.is_active,
        joined_at=member.joined_at,
    )


@router.delete(
    "/members/{membership_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_member(
    membership_id: UUID,
    tenant: TenantOwner,
    session: DatabaseSession,
) -> Response:
    """Deactivate one current-tenant membership."""

    try:
        await WorkspaceAdministrationService(
            session,
        ).remove_member(
            organization_id=tenant.org_id,
            membership_id=membership_id,
        )

    except WorkspaceMemberNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace member was not found.",
        ) from error

    except LastWorkspaceOwnerError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=("The organization must retain at least one active owner."),
        ) from error

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )

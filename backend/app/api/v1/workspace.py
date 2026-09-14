"""Profile, organization and member administration API."""

from uuid import UUID

from fastapi import (
    APIRouter,
    HTTPException,
    Response,
    status,
)
from sqlalchemy import select

from app.api.dependencies import (
    CurrentTenant,
    CurrentUser,
    DatabaseSession,
    TenantOwner,
    TenantOwnerOrAdmin,
)
from app.models.organization import (
    Organization,
    OrganizationMembership,
)
from app.schemas.workspace import (
    MemberRoleUpdate,
    OrganizationRead,
    OrganizationUpdate,
    ProfileUpdate,
    WorkspaceInvitationAcceptRequest,
    WorkspaceInvitationAcceptResponse,
    WorkspaceInvitationCreate,
    WorkspaceInvitationRead,
    WorkspaceMemberRead,
    WorkspaceOrganizationChoice,
    WorkspaceProfileRead,
)
from app.services.auth_email_service import (
    AuthEmailService,
)
from app.services.workspace_administration_service import (
    LastWorkspaceOwnerError,
    WorkspaceAdministrationService,
    WorkspaceMemberNotFoundError,
    WorkspaceOrganizationNotFoundError,
)
from app.services.workspace_invitation_service import (
    WorkspaceInvitationAcceptanceError,
    WorkspaceInvitationAlreadyMemberError,
    WorkspaceInvitationConflictError,
    WorkspaceInvitationDeliveryError,
    WorkspaceInvitationNotFoundError,
    WorkspaceInvitationRoleForbiddenError,
    WorkspaceInvitationService,
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


def _invitation_response(
    invitation,
) -> WorkspaceInvitationRead:
    """Convert service metadata to a secret-free API response."""

    return WorkspaceInvitationRead(
        id=invitation.id,
        organization_id=invitation.organization_id,
        invited_email=invitation.invited_email,
        role=invitation.role,
        status=invitation.status,
        invited_by_user_id=invitation.invited_by_user_id,
        expires_at=invitation.expires_at,
        accepted_at=invitation.accepted_at,
        revoked_at=invitation.revoked_at,
        created_at=invitation.created_at,
    )


@router.post(
    "/invitations",
    response_model=WorkspaceInvitationRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_workspace_invitation(
    payload: WorkspaceInvitationCreate,
    current_user: CurrentUser,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> WorkspaceInvitationRead:
    """Create and deliver one current-tenant workspace invitation."""

    email_sender = AuthEmailService()

    # Fail before persisting an invitation when SMTP is known to be
    # unavailable. The service still revokes an invite if actual delivery
    # unexpectedly fails after persistence.
    if not email_sender.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Workspace invitation delivery is currently unavailable.",
        )

    try:
        invitation = await WorkspaceInvitationService(
            session,
            email_sender=email_sender,
        ).issue_invitation(
            organization_id=tenant.org_id,
            invited_email=str(
                payload.email,
            ),
            role=payload.role,
            invited_by_user_id=current_user.id,
            inviter_name=current_user.full_name,
            inviter_role=tenant.role,
        )

    except WorkspaceInvitationNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization was not found.",
        ) from error

    except WorkspaceInvitationAlreadyMemberError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already an active workspace member.",
        ) from error

    except WorkspaceInvitationRoleForbiddenError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot grant the requested workspace role.",
        ) from error

    except WorkspaceInvitationConflictError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A workspace invitation conflict occurred.",
        ) from error

    except WorkspaceInvitationDeliveryError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Workspace invitation delivery failed.",
        ) from error

    return _invitation_response(
        invitation,
    )


@router.get(
    "/invitations",
    response_model=list[WorkspaceInvitationRead],
)
async def list_workspace_invitations(
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> list[WorkspaceInvitationRead]:
    """List invitation metadata from only the current organization."""

    invitations = await WorkspaceInvitationService(
        session,
    ).list_invitations(
        organization_id=tenant.org_id,
    )

    return [
        _invitation_response(
            invitation,
        )
        for invitation in invitations
    ]


@router.delete(
    "/invitations/{invitation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_workspace_invitation(
    invitation_id: UUID,
    tenant: TenantOwnerOrAdmin,
    session: DatabaseSession,
) -> Response:
    """Revoke only an invitation belonging to the selected tenant."""

    try:
        await WorkspaceInvitationService(
            session,
        ).revoke_invitation(
            organization_id=tenant.org_id,
            invitation_id=invitation_id,
        )

    except WorkspaceInvitationNotFoundError as error:
        # Preserve tenant isolation: foreign invitation UUIDs appear absent.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace invitation was not found.",
        ) from error

    except WorkspaceInvitationConflictError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This workspace invitation can no longer be revoked.",
        ) from error

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )


@router.post(
    "/invitations/accept",
    response_model=WorkspaceInvitationAcceptResponse,
)
async def accept_workspace_invitation(
    payload: WorkspaceInvitationAcceptRequest,
    session: DatabaseSession,
) -> WorkspaceInvitationAcceptResponse:
    """Consume one workspace invitation without requiring prior login."""

    try:
        accepted = await WorkspaceInvitationService(
            session,
        ).accept_invitation(
            raw_token=payload.token,
            full_name=payload.full_name,
            password=payload.password,
        )

    except WorkspaceInvitationAcceptanceError as error:
        # Keep one public failure message for expired, revoked, replayed,
        # unknown-token and existing-account password failures.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=("Invitation is invalid, expired, or could not be accepted."),
        ) from error

    return WorkspaceInvitationAcceptResponse(
        organization_id=accepted.organization_id,
        organization_name=accepted.organization_name,
        user_id=accepted.user_id,
        email=accepted.email,
        role=accepted.role,
        account_created=accepted.account_created,
    )


@router.get(
    "/organizations",
    response_model=list[WorkspaceOrganizationChoice],
)
async def list_available_organizations(
    current_user: CurrentUser,
    session: DatabaseSession,
) -> list[WorkspaceOrganizationChoice]:
    """List active organizations available to the authenticated user."""

    result = await session.execute(
        select(
            OrganizationMembership,
            Organization,
        )
        .join(
            Organization,
            Organization.id == OrganizationMembership.organization_id,
        )
        .where(
            OrganizationMembership.user_id == current_user.id,
            OrganizationMembership.is_active.is_(
                True,
            ),
            Organization.is_active.is_(
                True,
            ),
        )
        .order_by(
            OrganizationMembership.created_at,
            OrganizationMembership.id,
        )
    )

    return [
        WorkspaceOrganizationChoice(
            id=organization.id,
            membership_id=membership.id,
            name=organization.name,
            role=membership.role,
        )
        for membership, organization in result.all()
    ]

"""Workspace, profile and membership API contracts."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
)

TenantRole = Literal[
    "owner",
    "admin",
    "member",
    "viewer",
]


class ProfileUpdate(BaseModel):
    """Editable identity profile fields."""

    model_config = ConfigDict(
        extra="forbid",
    )

    full_name: str = Field(
        min_length=2,
        max_length=160,
    )


class WorkspaceProfileRead(BaseModel):
    """Authenticated user's profile."""

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID

    email: EmailStr

    full_name: str

    role: str

    is_active: bool

    email_verified_at: datetime | None

    password_changed_at: datetime

    created_at: datetime

    updated_at: datetime


class OrganizationUpdate(BaseModel):
    """Editable organization metadata."""

    model_config = ConfigDict(
        extra="forbid",
    )

    name: str = Field(
        min_length=2,
        max_length=160,
    )


class OrganizationRead(BaseModel):
    """Current tenant organization."""

    id: UUID

    name: str

    is_active: bool

    current_role: TenantRole

    created_at: datetime

    updated_at: datetime


class WorkspaceMemberRead(BaseModel):
    """One active organization membership and identity."""

    membership_id: UUID

    user_id: UUID

    email: EmailStr

    full_name: str

    role: TenantRole

    is_active: bool

    joined_at: datetime


class MemberRoleUpdate(BaseModel):
    """Change one organization member's tenant role."""

    model_config = ConfigDict(
        extra="forbid",
    )

    role: TenantRole


class WorkspaceInvitationCreate(BaseModel):
    """Invite one email address into the current organization."""

    model_config = ConfigDict(
        extra="forbid",
    )

    email: EmailStr

    role: TenantRole


class WorkspaceInvitationRead(BaseModel):
    """Safe invitation metadata without bearer material."""

    id: UUID

    organization_id: UUID

    invited_email: EmailStr

    role: TenantRole

    status: Literal[
        "pending",
        "accepted",
        "revoked",
        "expired",
    ]

    invited_by_user_id: UUID

    expires_at: datetime

    accepted_at: datetime | None

    revoked_at: datetime | None

    created_at: datetime


class WorkspaceInvitationAcceptRequest(BaseModel):
    """Consume one opaque workspace-invitation bearer."""

    model_config = ConfigDict(
        extra="forbid",
    )

    token: str = Field(
        min_length=32,
        max_length=512,
    )

    # This remains required for both new and existing identities so
    # the public endpoint does not reveal whether an account exists.
    full_name: str = Field(
        min_length=2,
        max_length=160,
    )

    password: str = Field(
        min_length=12,
        max_length=128,
    )


class WorkspaceInvitationAcceptResponse(BaseModel):
    """Safe result after successful invitation acceptance."""

    organization_id: UUID

    organization_name: str

    user_id: UUID

    email: EmailStr

    role: TenantRole

    account_created: bool


class WorkspaceOrganizationChoice(BaseModel):
    """One active workspace available to the authenticated user."""

    id: UUID

    membership_id: UUID

    name: str

    role: TenantRole

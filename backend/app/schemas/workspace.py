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

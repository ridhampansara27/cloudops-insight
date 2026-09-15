from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CloudAccountCreate(BaseModel):
    """Start AWS onboarding without accepting security credentials."""

    model_config = ConfigDict(
        extra="forbid",
    )

    name: str = Field(
        min_length=1,
        max_length=160,
    )

    provider: str = Field(
        default="aws",
        max_length=32,
    )

    external_account_id: str = Field(
        min_length=12,
        max_length=12,
        pattern=r"^\d{12}$",
    )

    enabled_regions: list[str] = Field(
        default_factory=list,
    )


class CloudAccountUpdate(BaseModel):
    """Allow safe customer-controlled integration settings."""

    model_config = ConfigDict(
        extra="forbid",
    )

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=160,
    )

    role_arn: str | None = Field(
        default=None,
        min_length=20,
        max_length=512,
    )

    enabled_regions: list[str] | None = None


class CloudAccountRead(BaseModel):
    """Public representation without exposing ExternalId."""

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    provider: str
    name: str
    external_account_id: str
    role_arn: str | None
    enabled_regions: list[str]
    status: str
    last_synced_at: datetime | None
    created_at: datetime
    updated_at: datetime
    last_validated_at: datetime | None
    last_validation_error: str | None
    sync_status: str
    sync_started_at: datetime | None
    last_sync_error: str | None
    disconnected_at: datetime | None


class CloudAccountOnboardingRead(CloudAccountRead):
    """Owner/Admin-only IAM onboarding material."""

    external_id: str

    platform_principal_arn: str | None

    suggested_role_name: str

    trust_policy: dict[str, Any] | None

    onboarding_ready: bool


class CloudAccountValidationResponse(BaseModel):
    connected: bool
    account_id: str
    caller_arn: str
    message: str


class CloudAccountDisconnectResponse(BaseModel):
    """Describe a safe CloudOps integration disconnect."""

    account_id: UUID

    status: str

    disconnected_at: datetime

    connection_revision: int

    account_budgets_deactivated: int

    message: str

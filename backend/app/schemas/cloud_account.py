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

    # AWS account IDs are exactly 12 decimal digits.
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

    # Role ARN is supplied only after CloudOps generated the ExternalId.
    role_arn: str | None = Field(
        default=None,
        min_length=20,
        max_length=512,
    )

    enabled_regions: list[str] | None = None


class CloudAccountRead(BaseModel):
    """Public integration representation without exposing ExternalId."""

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


class CloudAccountOnboardingRead(CloudAccountRead):
    """Owner/Admin-only information required to configure customer IAM."""

    external_id: str

    # This is the AWS IAM identity the customer's role must trust.
    platform_principal_arn: str | None

    suggested_role_name: str

    # Null only when the development environment has not configured
    # a platform AWS principal yet.
    trust_policy: dict[str, Any] | None

    onboarding_ready: bool


class CloudAccountValidationResponse(BaseModel):
    connected: bool
    account_id: str
    caller_arn: str
    message: str

"""Tenant authorization primitives for CloudOps Insight."""

from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, status

# Define every organization-level role supported by the SaaS.
TENANT_ROLES = frozenset(
    {
        "owner",
        "admin",
        "member",
        "viewer",
    }
)


# Carry authenticated tenant identity through request handling.
@dataclass(
    frozen=True,
    slots=True,
)
class TenantContext:
    """Describe the authenticated user's active organization membership."""

    organization_id: UUID
    membership_id: UUID
    user_id: UUID
    role: str


def ensure_tenant_role(
    context: TenantContext,
    allowed_roles: frozenset[str],
) -> TenantContext:
    """Require the current tenant membership to have an allowed role."""

    invalid_roles = allowed_roles - TENANT_ROLES

    if invalid_roles:
        raise ValueError(
            "Unknown tenant role configuration: "
            + ", ".join(
                sorted(
                    invalid_roles,
                )
            )
        )

    if context.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient organization permissions.",
        )

    return context

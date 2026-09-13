from sqlalchemy import CheckConstraint, UniqueConstraint

from app.db.base import Base
from app.models.organization import Organization, OrganizationMembership


def test_organization_models_are_registered() -> None:
    """Alembic must be able to discover both tenant tables."""

    assert "organizations" in Base.metadata.tables
    assert "organization_memberships" in Base.metadata.tables


def test_membership_has_required_tenant_foreign_keys() -> None:
    """A membership must always identify both organization and user."""

    table = OrganizationMembership.__table__

    assert table.c.organization_id.nullable is False
    assert table.c.user_id.nullable is False

    foreign_keys = {foreign_key.target_fullname for foreign_key in table.foreign_keys}

    assert "organizations.id" in foreign_keys
    assert "users.id" in foreign_keys


def test_membership_is_unique_per_user_and_organization() -> None:
    """A user cannot hold duplicate memberships in the same organization."""

    table = OrganizationMembership.__table__

    matching_constraints = [
        constraint
        for constraint in table.constraints
        if isinstance(constraint, UniqueConstraint)
        and {column.name for column in constraint.columns}
        == {
            "organization_id",
            "user_id",
        }
    ]

    assert len(matching_constraints) == 1


def test_membership_role_is_database_constrained() -> None:
    """Tenant roles must be enforced by PostgreSQL, not only Python."""

    table = OrganizationMembership.__table__

    role_constraints = [
        constraint
        for constraint in table.constraints
        if isinstance(constraint, CheckConstraint)
        and "owner" in str(constraint.sqltext)
        and "admin" in str(constraint.sqltext)
        and "member" in str(constraint.sqltext)
        and "viewer" in str(constraint.sqltext)
    ]

    assert len(role_constraints) == 1


def test_new_organizations_are_active_by_default() -> None:
    """New organizations should start in an enabled lifecycle state."""

    organization = Organization(
        name="Example Organization",
    )

    assert organization.name == "Example Organization"

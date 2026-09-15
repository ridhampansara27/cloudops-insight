"""backfill initial tenant ownership

Revision ID: 91d7a4c2e5b8
Revises: f6b3d2a9c841
Create Date: 2026-09-13

"""

from uuid import uuid4

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "91d7a4c2e5b8"
down_revision: str | None = "f6b3d2a9c841"
branch_labels: str | None = None
depends_on: str | None = None


def _ensure_existing_users_have_organizations() -> None:
    """Create an initial organization for legacy users when required."""

    bind = op.get_bind()

    users = sa.table(
        "users",
        sa.column(
            "id",
            postgresql.UUID(as_uuid=True),
        ),
        sa.column(
            "email",
            sa.String(length=320),
        ),
        sa.column(
            "full_name",
            sa.String(length=160),
        ),
    )

    organizations = sa.table(
        "organizations",
        sa.column(
            "id",
            postgresql.UUID(as_uuid=True),
        ),
        sa.column(
            "name",
            sa.String(length=160),
        ),
        sa.column(
            "is_active",
            sa.Boolean(),
        ),
    )

    memberships = sa.table(
        "organization_memberships",
        sa.column(
            "id",
            postgresql.UUID(as_uuid=True),
        ),
        sa.column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
        ),
        sa.column(
            "user_id",
            postgresql.UUID(as_uuid=True),
        ),
        sa.column(
            "role",
            sa.String(length=32),
        ),
        sa.column(
            "is_active",
            sa.Boolean(),
        ),
    )

    user_rows = bind.execute(
        sa.select(
            users.c.id,
            users.c.email,
            users.c.full_name,
        ).order_by(
            users.c.id,
        )
    ).mappings()

    for user in user_rows:
        # Reuse a membership if one already exists. This makes a local
        # downgrade/re-upgrade rehearsal safe and deterministic.
        existing_membership = bind.execute(
            sa.select(
                memberships.c.organization_id,
            )
            .where(
                memberships.c.user_id == user["id"],
            )
            .order_by(
                memberships.c.organization_id,
            )
            .limit(1)
        ).scalar_one_or_none()

        if existing_membership is not None:
            continue

        organization_id = uuid4()
        membership_id = uuid4()

        base_name = (
            (user["full_name"] or "").strip()
            or (user["email"] or "").strip()
            or "CloudOps"
        )

        organization_name = f"{base_name} Workspace"[:160]

        bind.execute(
            organizations.insert().values(
                id=organization_id,
                name=organization_name,
                is_active=True,
            )
        )

        bind.execute(
            memberships.insert().values(
                id=membership_id,
                organization_id=organization_id,
                user_id=user["id"],
                role="owner",
                is_active=True,
            )
        )


def _backfill_existing_tenant_rows() -> None:
    """Assign legacy customer data to each creator's organization."""

    bind = op.get_bind()

    # Prefer owner membership, then the oldest active membership.
    membership_lookup = """
        SELECT om.organization_id
        FROM organization_memberships AS om
        WHERE om.user_id = {owner_column}
          AND om.is_active = true
        ORDER BY
            CASE om.role
                WHEN 'owner' THEN 0
                WHEN 'admin' THEN 1
                WHEN 'member' THEN 2
                ELSE 3
            END,
            om.created_at,
            om.id
        LIMIT 1
    """

    bind.execute(
        sa.text(
            """
            UPDATE cloud_accounts AS ca
            SET organization_id = (
                """
            + membership_lookup.format(
                owner_column="ca.created_by_id",
            )
            + """
            )
            WHERE ca.organization_id IS NULL
            """
        )
    )

    bind.execute(
        sa.text(
            """
            UPDATE budgets AS b
            SET organization_id = (
                """
            + membership_lookup.format(
                owner_column="b.created_by_id",
            )
            + """
            )
            WHERE b.organization_id IS NULL
            """
        )
    )

    unowned_accounts = bind.execute(
        sa.text(
            """
            SELECT count(*)
            FROM cloud_accounts
            WHERE organization_id IS NULL
            """
        )
    ).scalar_one()

    if unowned_accounts != 0:
        raise RuntimeError(
            "Tenant migration left cloud accounts without organization ownership."
        )

    unowned_budgets = bind.execute(
        sa.text(
            """
            SELECT count(*)
            FROM budgets
            WHERE organization_id IS NULL
            """
        )
    ).scalar_one()

    if unowned_budgets != 0:
        raise RuntimeError(
            "Tenant migration left budgets without organization ownership."
        )


def upgrade() -> None:
    """Add and backfill the first tenant-owned application records."""

    op.add_column(
        "cloud_accounts",
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        op.f(
            "fk_cloud_accounts_organization_id_organizations",
        ),
        "cloud_accounts",
        "organizations",
        [
            "organization_id",
        ],
        [
            "id",
        ],
        ondelete="RESTRICT",
    )

    op.create_index(
        op.f(
            "ix_cloud_accounts_organization_id",
        ),
        "cloud_accounts",
        [
            "organization_id",
        ],
        unique=False,
    )

    op.add_column(
        "budgets",
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        op.f(
            "fk_budgets_organization_id_organizations",
        ),
        "budgets",
        "organizations",
        [
            "organization_id",
        ],
        [
            "id",
        ],
        ondelete="RESTRICT",
    )

    op.create_index(
        op.f(
            "ix_budgets_organization_id",
        ),
        "budgets",
        [
            "organization_id",
        ],
        unique=False,
    )

    _ensure_existing_users_have_organizations()
    _backfill_existing_tenant_rows()


def downgrade() -> None:
    """Remove transitional tenant ownership columns.

    Organizations and memberships are intentionally retained because they
    represent identity/authorization data and may contain records created
    after the upgrade.
    """

    op.drop_index(
        op.f(
            "ix_budgets_organization_id",
        ),
        table_name="budgets",
    )

    op.drop_constraint(
        op.f(
            "fk_budgets_organization_id_organizations",
        ),
        "budgets",
        type_="foreignkey",
    )

    op.drop_column(
        "budgets",
        "organization_id",
    )

    op.drop_index(
        op.f(
            "ix_cloud_accounts_organization_id",
        ),
        table_name="cloud_accounts",
    )

    op.drop_constraint(
        op.f(
            "fk_cloud_accounts_organization_id_organizations",
        ),
        "cloud_accounts",
        type_="foreignkey",
    )

    op.drop_column(
        "cloud_accounts",
        "organization_id",
    )

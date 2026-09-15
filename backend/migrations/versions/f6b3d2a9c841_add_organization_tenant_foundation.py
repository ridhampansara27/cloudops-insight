"""add organization tenant foundation

Revision ID: f6b3d2a9c841
Revises: a82c91f04b73
Create Date: 2026-09-13

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "f6b3d2a9c841"
down_revision: str | None = "a82c91f04b73"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Create the initial multi-tenant organization foundation."""

    op.create_table(
        "organizations",
        sa.Column(
            "name",
            sa.String(length=160),
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name=op.f("pk_organizations"),
        ),
    )

    op.create_table(
        "organization_memberships",
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "role",
            sa.String(length=32),
            server_default="viewer",
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "role IN ('owner', 'admin', 'member', 'viewer')",
            name=op.f("ck_organization_memberships_role"),
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_organization_memberships_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_organization_memberships_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name=op.f("pk_organization_memberships"),
        ),
        sa.UniqueConstraint(
            "organization_id",
            "user_id",
            name="uq_organization_memberships_organization_id_user_id",
        ),
    )

    op.create_index(
        op.f("ix_organization_memberships_organization_id"),
        "organization_memberships",
        ["organization_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_organization_memberships_user_id"),
        "organization_memberships",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Remove the organization tenant foundation."""

    op.drop_index(
        op.f("ix_organization_memberships_user_id"),
        table_name="organization_memberships",
    )

    op.drop_index(
        op.f("ix_organization_memberships_organization_id"),
        table_name="organization_memberships",
    )

    op.drop_table("organization_memberships")
    op.drop_table("organizations")

"""add organization invitations

Revision ID: e7c1a4b92d6f
Revises: c52f7a8d1e34
Create Date: 2026-09-14

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e7c1a4b92d6f"

down_revision: str | Sequence[str] | None = "c52f7a8d1e34"

branch_labels: str | Sequence[str] | None = None

depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create secure organization invitation persistence."""

    op.create_table(
        "organization_invitations",
        sa.Column(
            "organization_id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "invited_email",
            sa.String(
                length=320,
            ),
            nullable=False,
        ),
        sa.Column(
            "role",
            sa.String(
                length=32,
            ),
            nullable=False,
        ),
        sa.Column(
            "token_hash",
            sa.String(
                length=64,
            ),
            nullable=False,
        ),
        sa.Column(
            "invited_by_user_id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "accepted_by_user_id",
            sa.UUID(),
            nullable=True,
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=False,
        ),
        sa.Column(
            "accepted_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=True,
        ),
        sa.Column(
            "revoked_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=True,
        ),
        sa.Column(
            "id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True,
            ),
            server_default=sa.text(
                "now()",
            ),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(
                timezone=True,
            ),
            server_default=sa.text(
                "now()",
            ),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            [
                "accepted_by_user_id",
            ],
            [
                "users.id",
            ],
            name=("fk_organization_invitations_accepted_by_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            [
                "invited_by_user_id",
            ],
            [
                "users.id",
            ],
            name=("fk_organization_invitations_invited_by_user_id_users"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            [
                "organization_id",
            ],
            [
                "organizations.id",
            ],
            name=("fk_organization_invitations_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name=("pk_organization_invitations"),
        ),
        sa.UniqueConstraint(
            "token_hash",
            name=("uq_organization_invitations_token_hash"),
        ),
    )

    op.create_index(
        "ix_organization_invitations_organization_id",
        "organization_invitations",
        [
            "organization_id",
        ],
        unique=False,
    )

    op.create_index(
        "ix_organization_invitations_invited_email",
        "organization_invitations",
        [
            "invited_email",
        ],
        unique=False,
    )

    # At most one live pending invitation for one email within one
    # organization. Expired invitations are revoked before replacement.
    op.create_index(
        "uq_organization_invitations_pending_email",
        "organization_invitations",
        [
            "organization_id",
            "invited_email",
        ],
        unique=True,
        postgresql_where=sa.text("accepted_at IS NULL AND revoked_at IS NULL"),
    )


def downgrade() -> None:
    """Remove organization invitation persistence."""

    op.drop_index(
        "uq_organization_invitations_pending_email",
        table_name=("organization_invitations"),
    )

    op.drop_index(
        "ix_organization_invitations_invited_email",
        table_name=("organization_invitations"),
    )

    op.drop_index(
        "ix_organization_invitations_organization_id",
        table_name=("organization_invitations"),
    )

    op.drop_table(
        "organization_invitations",
    )

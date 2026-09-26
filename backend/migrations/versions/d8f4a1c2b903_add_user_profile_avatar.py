"""Add persistent sanitized user profile avatars.

Revision ID: d8f4a1c2b903
Revises: b7e1c4d9f203
"""

import sqlalchemy as sa
from alembic import op


revision = "d8f4a1c2b903"
down_revision = "b7e1c4d9f203"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add optional sanitized avatar state to authenticated users."""

    op.add_column(
        "users",
        sa.Column(
            "avatar_bytes",
            sa.LargeBinary(),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "avatar_updated_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove persisted profile-avatar state."""

    op.drop_column(
        "users",
        "avatar_updated_at",
    )

    op.drop_column(
        "users",
        "avatar_bytes",
    )

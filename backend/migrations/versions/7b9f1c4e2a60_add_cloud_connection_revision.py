"""add cloud connection revision

Revision ID: 7b9f1c4e2a60
Revises: 91d7a4c2e5b8
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "7b9f1c4e2a60"
down_revision: str | None = "91d7a4c2e5b8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add generation tracking and safe-disconnect timestamp."""

    op.add_column(
        "cloud_accounts",
        sa.Column(
            "connection_revision",
            sa.Integer(),
            server_default="1",
            nullable=False,
        ),
    )

    op.add_column(
        "cloud_accounts",
        sa.Column(
            "disconnected_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove connection lifecycle fields."""

    op.drop_column(
        "cloud_accounts",
        "disconnected_at",
    )

    op.drop_column(
        "cloud_accounts",
        "connection_revision",
    )

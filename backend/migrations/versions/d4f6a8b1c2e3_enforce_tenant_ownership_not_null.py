"""enforce tenant ownership not null

Revision ID: d4f6a8b1c2e3
Revises: e7c1a4b92d6f
Create Date: 2026-09-17

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d4f6a8b1c2e3"
down_revision: str | None = "e7c1a4b92d6f"
branch_labels: str | None = None
depends_on: str | None = None


def _require_complete_tenant_ownership() -> None:
    """Fail rather than silently accepting tenant-owned rows without owners."""

    bind = op.get_bind()

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
            "Cannot enforce tenant ownership: "
            "cloud_accounts contains rows without organization_id."
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
            "Cannot enforce tenant ownership: "
            "budgets contains rows without organization_id."
        )


def upgrade() -> None:
    """Require tenant ownership for cloud accounts and budgets."""

    _require_complete_tenant_ownership()

    op.alter_column(
        "cloud_accounts",
        "organization_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    op.alter_column(
        "budgets",
        "organization_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )


def downgrade() -> None:
    """Restore transitional nullable tenant ownership."""

    op.alter_column(
        "budgets",
        "organization_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )

    op.alter_column(
        "cloud_accounts",
        "organization_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )

"""allow unquantified recommendation savings

Revision ID: a82c91f04b73
Revises: 919347627df1
Create Date: 2026-09-06

"""

from alembic import op
import sqlalchemy as sa


revision: str = "a82c91f04b73"
down_revision: str | None = "919347627df1"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Allow recommendations without fabricated monetary estimates."""

    op.alter_column(
        "recommendations",
        "estimated_monthly_savings",
        existing_type=sa.Numeric(
            precision=18,
            scale=2,
        ),
        nullable=True,
    )


def downgrade() -> None:
    """Restore the original non-null recommendation schema."""

    op.execute(
        """
        UPDATE recommendations
        SET estimated_monthly_savings = 0
        WHERE estimated_monthly_savings IS NULL
        """
    )

    op.alter_column(
        "recommendations",
        "estimated_monthly_savings",
        existing_type=sa.Numeric(
            precision=18,
            scale=2,
        ),
        nullable=False,
    )

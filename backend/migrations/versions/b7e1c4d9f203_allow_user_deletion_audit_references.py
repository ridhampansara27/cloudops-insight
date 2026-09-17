"""Allow user deletion while preserving shared tenant audit records.

Revision ID: b7e1c4d9f203
Revises: a3c9e7f1b642
"""

import sqlalchemy as sa
from alembic import op

revision = "b7e1c4d9f203"
down_revision = "a3c9e7f1b642"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Allow creator/inviter references to become NULL when a user is deleted."""

    # Cloud accounts belong to organizations, not permanently to the user
    # who originally created the integration.
    op.drop_constraint(
        "fk_cloud_accounts_created_by_id_users",
        "cloud_accounts",
        type_="foreignkey",
    )

    op.alter_column(
        "cloud_accounts",
        "created_by_id",
        existing_type=sa.UUID(),
        nullable=True,
    )

    op.create_foreign_key(
        "fk_cloud_accounts_created_by_id_users",
        "cloud_accounts",
        "users",
        ["created_by_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Budgets likewise remain organization-owned after their creator leaves.
    op.drop_constraint(
        "fk_budgets_created_by_id_users",
        "budgets",
        type_="foreignkey",
    )

    op.alter_column(
        "budgets",
        "created_by_id",
        existing_type=sa.UUID(),
        nullable=True,
    )

    op.create_foreign_key(
        "fk_budgets_created_by_id_users",
        "budgets",
        "users",
        ["created_by_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Invitations may remain useful/auditable after the inviting identity
    # itself is deleted.
    op.drop_constraint(
        "fk_organization_invitations_invited_by_user_id_users",
        "organization_invitations",
        type_="foreignkey",
    )

    op.alter_column(
        "organization_invitations",
        "invited_by_user_id",
        existing_type=sa.UUID(),
        nullable=True,
    )

    op.create_foreign_key(
        "fk_organization_invitations_invited_by_user_id_users",
        "organization_invitations",
        "users",
        ["invited_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Restore mandatory creator references only when no NULL values exist."""

    connection = op.get_bind()

    null_references = connection.execute(
        sa.text(
            """
            SELECT
                (
                    SELECT count(*)
                    FROM cloud_accounts
                    WHERE created_by_id IS NULL
                )
                +
                (
                    SELECT count(*)
                    FROM budgets
                    WHERE created_by_id IS NULL
                )
                +
                (
                    SELECT count(*)
                    FROM organization_invitations
                    WHERE invited_by_user_id IS NULL
                )
            """
        )
    ).scalar_one()

    if null_references:
        raise RuntimeError(
            "Cannot downgrade user-deletion audit references: "
            "deleted-user references now contain NULL values."
        )

    op.drop_constraint(
        "fk_organization_invitations_invited_by_user_id_users",
        "organization_invitations",
        type_="foreignkey",
    )

    op.alter_column(
        "organization_invitations",
        "invited_by_user_id",
        existing_type=sa.UUID(),
        nullable=False,
    )

    op.create_foreign_key(
        "fk_organization_invitations_invited_by_user_id_users",
        "organization_invitations",
        "users",
        ["invited_by_user_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_constraint(
        "fk_budgets_created_by_id_users",
        "budgets",
        type_="foreignkey",
    )

    op.alter_column(
        "budgets",
        "created_by_id",
        existing_type=sa.UUID(),
        nullable=False,
    )

    op.create_foreign_key(
        "fk_budgets_created_by_id_users",
        "budgets",
        "users",
        ["created_by_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_constraint(
        "fk_cloud_accounts_created_by_id_users",
        "cloud_accounts",
        type_="foreignkey",
    )

    op.alter_column(
        "cloud_accounts",
        "created_by_id",
        existing_type=sa.UUID(),
        nullable=False,
    )

    op.create_foreign_key(
        "fk_cloud_accounts_created_by_id_users",
        "cloud_accounts",
        "users",
        ["created_by_id"],
        ["id"],
        ondelete="RESTRICT",
    )

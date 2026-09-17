"""harden aws account claiming

Revision ID: a3c9e7f1b642
Revises: d4f6a8b1c2e3
Create Date: 2026-09-17

"""

import sqlalchemy as sa
from alembic import op

revision: str = "a3c9e7f1b642"
down_revision: str | None = "d4f6a8b1c2e3"
branch_labels: str | None = None
depends_on: str | None = None


OLD_GLOBAL_CONSTRAINT = "uq_cloud_accounts_provider_external_account_id"

TENANT_CONSTRAINT = "uq_cloud_accounts_org_provider_external_account_id"

CONNECTED_INDEX = "uq_cloud_accounts_connected_provider_external_account_id"


def upgrade() -> None:
    """Allow pending tenant claims while globally protecting connected claims."""

    # Existing global uniqueness guarantees that creating both narrower
    # protections cannot encounter pre-existing duplicates.
    op.create_unique_constraint(
        TENANT_CONSTRAINT,
        "cloud_accounts",
        [
            "organization_id",
            "provider",
            "external_account_id",
        ],
    )

    op.create_index(
        CONNECTED_INDEX,
        "cloud_accounts",
        [
            "provider",
            "external_account_id",
        ],
        unique=True,
        postgresql_where=sa.text(
            "status = 'connected'",
        ),
    )

    # Pending/error/disconnected onboarding records may now coexist across
    # different organizations.
    op.drop_constraint(
        OLD_GLOBAL_CONSTRAINT,
        "cloud_accounts",
        type_="unique",
    )


def downgrade() -> None:
    """Restore historical global uniqueness only when it is lossless."""

    bind = op.get_bind()

    duplicate_groups = bind.execute(
        sa.text(
            """
            SELECT count(*)
            FROM (
                SELECT
                    provider,
                    external_account_id
                FROM cloud_accounts
                GROUP BY
                    provider,
                    external_account_id
                HAVING count(*) > 1
            ) AS duplicate_accounts
            """
        )
    ).scalar_one()

    if duplicate_groups != 0:
        raise RuntimeError(
            "Cannot downgrade AWS account claiming: multiple organizations "
            "now contain the same provider account ID."
        )

    op.create_unique_constraint(
        OLD_GLOBAL_CONSTRAINT,
        "cloud_accounts",
        [
            "provider",
            "external_account_id",
        ],
    )

    op.drop_index(
        CONNECTED_INDEX,
        table_name="cloud_accounts",
    )

    op.drop_constraint(
        TENANT_CONSTRAINT,
        "cloud_accounts",
        type_="unique",
    )

"""add auth security foundation

Revision ID: c52f7a8d1e34
Revises: 7b9f1c4e2a60
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c52f7a8d1e34"
down_revision: str | None = "7b9f1c4e2a60"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add verified identities and hashed authentication-token storage."""

    op.add_column(
        "users",
        sa.Column(
            "email_verified_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "password_changed_at",
            sa.DateTime(
                timezone=True,
            ),
            server_default=sa.text(
                "now()",
            ),
            nullable=False,
        ),
    )

    # Existing deployments already authenticated these users before
    # verification existed. Backfill them as verified to prevent an
    # authentication migration from locking out legitimate operators.
    op.execute(
        sa.text(
            """
            UPDATE users
            SET email_verified_at = COALESCE(
                email_verified_at,
                created_at,
                now()
            )
            WHERE email_verified_at IS NULL
            """
        ),
    )

    op.create_table(
        "auth_tokens",
        sa.Column(
            "user_id",
            postgresql.UUID(
                as_uuid=True,
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
            "purpose",
            sa.String(
                length=32,
            ),
            nullable=False,
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=False,
        ),
        sa.Column(
            "used_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=True,
        ),
        sa.Column(
            "id",
            postgresql.UUID(
                as_uuid=True,
            ),
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
        sa.CheckConstraint(
            "purpose IN ('email_verification', 'password_reset')",
            name=op.f(
                "ck_auth_tokens_purpose",
            ),
        ),
        sa.ForeignKeyConstraint(
            [
                "user_id",
            ],
            [
                "users.id",
            ],
            name=op.f(
                "fk_auth_tokens_user_id_users",
            ),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name=op.f(
                "pk_auth_tokens",
            ),
        ),
    )

    op.create_index(
        "ix_auth_tokens_token_hash",
        "auth_tokens",
        [
            "token_hash",
        ],
        unique=True,
    )

    op.create_index(
        "ix_auth_tokens_user_purpose",
        "auth_tokens",
        [
            "user_id",
            "purpose",
        ],
        unique=False,
    )

    op.create_table(
        "refresh_sessions",
        sa.Column(
            "user_id",
            postgresql.UUID(
                as_uuid=True,
            ),
            nullable=False,
        ),
        sa.Column(
            "family_id",
            postgresql.UUID(
                as_uuid=True,
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
            "expires_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=False,
        ),
        sa.Column(
            "last_used_at",
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
            "replaced_by_id",
            postgresql.UUID(
                as_uuid=True,
            ),
            nullable=True,
        ),
        sa.Column(
            "id",
            postgresql.UUID(
                as_uuid=True,
            ),
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
                "replaced_by_id",
            ],
            [
                "refresh_sessions.id",
            ],
            name=op.f(
                "fk_refresh_sessions_replaced_by_id_refresh_sessions",
            ),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            [
                "user_id",
            ],
            [
                "users.id",
            ],
            name=op.f(
                "fk_refresh_sessions_user_id_users",
            ),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name=op.f(
                "pk_refresh_sessions",
            ),
        ),
    )

    op.create_index(
        "ix_refresh_sessions_token_hash",
        "refresh_sessions",
        [
            "token_hash",
        ],
        unique=True,
    )

    op.create_index(
        "ix_refresh_sessions_family_id",
        "refresh_sessions",
        [
            "family_id",
        ],
        unique=False,
    )

    op.create_index(
        "ix_refresh_sessions_user_id",
        "refresh_sessions",
        [
            "user_id",
        ],
        unique=False,
    )


def downgrade() -> None:
    """Remove commercial authentication persistence."""

    op.drop_index(
        "ix_refresh_sessions_user_id",
        table_name="refresh_sessions",
    )

    op.drop_index(
        "ix_refresh_sessions_family_id",
        table_name="refresh_sessions",
    )

    op.drop_index(
        "ix_refresh_sessions_token_hash",
        table_name="refresh_sessions",
    )

    op.drop_table(
        "refresh_sessions",
    )

    op.drop_index(
        "ix_auth_tokens_user_purpose",
        table_name="auth_tokens",
    )

    op.drop_index(
        "ix_auth_tokens_token_hash",
        table_name="auth_tokens",
    )

    op.drop_table(
        "auth_tokens",
    )

    op.drop_column(
        "users",
        "password_changed_at",
    )

    op.drop_column(
        "users",
        "email_verified_at",
    )

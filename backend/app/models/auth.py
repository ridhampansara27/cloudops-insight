"""Persistence models for commercial authentication security state."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import (
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


class AuthToken(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    """Store only hashes of short-lived one-time authentication tokens."""

    __tablename__ = "auth_tokens"

    __table_args__ = (
        CheckConstraint(
            "purpose IN ('email_verification', 'password_reset')",
            name="purpose",
        ),
        Index(
            "ix_auth_tokens_token_hash",
            "token_hash",
            unique=True,
        ),
        Index(
            "ix_auth_tokens_user_purpose",
            "user_id",
            "purpose",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(
            as_uuid=True,
        ),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    # Never persist the bearer token itself.
    token_hash: Mapped[str] = mapped_column(
        String(
            64,
        ),
        nullable=False,
    )

    purpose: Mapped[str] = mapped_column(
        String(
            32,
        ),
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(
            timezone=True,
        ),
        nullable=False,
    )

    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(
            timezone=True,
        ),
        nullable=True,
    )


class RefreshSession(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    """Represent one rotating refresh-token generation."""

    __tablename__ = "refresh_sessions"

    __table_args__ = (
        Index(
            "ix_refresh_sessions_token_hash",
            "token_hash",
            unique=True,
        ),
        Index(
            "ix_refresh_sessions_family_id",
            "family_id",
        ),
        Index(
            "ix_refresh_sessions_user_id",
            "user_id",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(
            as_uuid=True,
        ),
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    # Sessions created by refresh rotation retain the same family ID.
    #
    # If a previously rotated token is replayed later, the complete
    # family can be revoked rather than trusting the replayed token.
    family_id: Mapped[UUID] = mapped_column(
        PG_UUID(
            as_uuid=True,
        ),
        default=uuid4,
        nullable=False,
    )

    # Store HMAC-SHA256 only, never the browser refresh token.
    token_hash: Mapped[str] = mapped_column(
        String(
            64,
        ),
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(
            timezone=True,
        ),
        nullable=False,
    )

    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(
            timezone=True,
        ),
        nullable=True,
    )

    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(
            timezone=True,
        ),
        nullable=True,
    )

    # Link one rotated generation to its successor for auditability.
    replaced_by_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(
            as_uuid=True,
        ),
        ForeignKey(
            "refresh_sessions.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

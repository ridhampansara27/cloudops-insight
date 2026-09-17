"""Persistent secure organization invitations."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.db.base import Base
from app.models.mixins import (
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


class OrganizationInvitation(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    """One expiring invitation to join an organization."""

    __tablename__ = "organization_invitations"

    __table_args__ = (
        UniqueConstraint(
            "token_hash",
            name=("uq_organization_invitations_token_hash"),
        ),
        Index(
            "ix_organization_invitations_organization_id",
            "organization_id",
        ),
        Index(
            "ix_organization_invitations_invited_email",
            "invited_email",
        ),
        Index(
            "uq_organization_invitations_pending_email",
            "organization_id",
            "invited_email",
            unique=True,
            postgresql_where=text("accepted_at IS NULL AND revoked_at IS NULL"),
        ),
    )

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "organizations.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    invited_email: Mapped[str] = mapped_column(
        String(
            320,
        ),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(
        String(
            32,
        ),
        nullable=False,
    )

    # Persist only the HMAC digest.
    # The raw invitation bearer must never enter PostgreSQL.
    token_hash: Mapped[str] = mapped_column(
        String(
            64,
        ),
        nullable=False,
    )

    invited_by_user_id: Mapped[UUID | None] = mapped_column(
        # Keep invitation audit history if the inviting user later
        # deletes their CloudOps identity.
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    accepted_by_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(
            timezone=True,
        ),
        nullable=False,
    )

    accepted_at: Mapped[datetime | None] = mapped_column(
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

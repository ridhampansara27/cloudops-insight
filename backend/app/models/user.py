from datetime import datetime

# Import SQLAlchemy column types.
from sqlalchemy import Boolean, DateTime, String, func

# Import SQLAlchemy ORM typing helpers.
from sqlalchemy.orm import Mapped, mapped_column

# Import the application's declarative database base.
from app.db.base import Base

# Import reusable model mixins.
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


# Define one CloudOps Insight user.
class User(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    # Define the PostgreSQL table name.
    __tablename__ = "users"

    # Store the unique login email.
    email: Mapped[str] = mapped_column(
        # Support normal email-address lengths.
        String(320),
        # Prevent duplicate user emails.
        unique=True,
        # Create an index for login lookups.
        index=True,
        # Require every user to have an email.
        nullable=False,
    )

    # Store the user's visible name.
    full_name: Mapped[str] = mapped_column(
        # Limit the display name to a sensible size.
        String(160),
        # Require a display name.
        nullable=False,
    )

    # Store only the password hash, never the original password.
    password_hash: Mapped[str] = mapped_column(
        # Allow enough space for modern password hashes.
        String(255),
        # Require every local user to have a password hash.
        nullable=False,
    )

    # Store the application role.
    role: Mapped[str] = mapped_column(
        # Allow values such as admin, operator, finops, and viewer.
        String(32),
        # Give new users the lowest default privilege.
        default="viewer",
        # Require a role.
        nullable=False,
    )

    # Store whether authentication is currently allowed.
    is_active: Mapped[bool] = mapped_column(
        # Store a native PostgreSQL boolean.
        Boolean,
        # Activate new users by default.
        default=True,
        # Require an explicit active state.
        nullable=False,
    )

    # Store when ownership of the login email was confirmed.
    #
    # Existing production users are backfilled as verified by the
    # migration. New commercial signups will remain NULL until they
    # complete the one-time verification link.
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(
            timezone=True,
        ),
        nullable=True,
    )

    # Record the latest password-change boundary.
    #
    # This is useful for security-event auditing and later invalidating
    # authentication sessions created before a credential change.
    password_changed_at: Mapped[datetime] = mapped_column(
        DateTime(
            timezone=True,
        ),
        server_default=func.now(),
        nullable=False,
    )

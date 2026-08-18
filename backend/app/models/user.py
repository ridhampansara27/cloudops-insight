# Import SQLAlchemy column types.
from sqlalchemy import Boolean, String

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

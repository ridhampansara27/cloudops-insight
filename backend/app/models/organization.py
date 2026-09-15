# Import UUID typing.
from uuid import UUID

# Import SQLAlchemy database constructs.
from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String, UniqueConstraint

# Import SQLAlchemy ORM helpers.
from sqlalchemy.orm import Mapped, mapped_column, relationship

# Import the application database base.
from app.db.base import Base

# Import shared model mixins.
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


# Define one CloudOps Insight customer/workspace.
class Organization(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    # Store organizations in their own tenant-root table.
    __tablename__ = "organizations"

    # Store the customer/workspace display name.
    name: Mapped[str] = mapped_column(
        # Keep organization names reasonably bounded.
        String(160),
        # Every organization needs a name.
        nullable=False,
    )

    # Allow an organization to be disabled without destroying its data.
    is_active: Mapped[bool] = mapped_column(
        # Store a native PostgreSQL boolean.
        Boolean,
        # New organizations are active by default.
        default=True,
        # Also provide a database-side default.
        server_default="true",
        # Require an explicit lifecycle state.
        nullable=False,
    )

    # Expose organization memberships through the ORM.
    memberships: Mapped[list["OrganizationMembership"]] = relationship(
        # Connect both sides of the relationship.
        back_populates="organization",
        # Let PostgreSQL perform FK cascading when an organization is deleted.
        passive_deletes=True,
    )


# Define one user's membership inside an organization.
class OrganizationMembership(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    # Store tenant membership separately from global user identity.
    __tablename__ = "organization_memberships"

    # Enforce one membership per user per organization and valid SaaS roles.
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "user_id",
            name="uq_organization_memberships_organization_id_user_id",
        ),
        CheckConstraint(
            "role IN ('owner', 'admin', 'member', 'viewer')",
            name="role",
        ),
    )

    # Reference the organization that owns this membership.
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "organizations.id",
            ondelete="CASCADE",
        ),
        # Speed tenant membership lookups.
        index=True,
        # Every membership belongs to an organization.
        nullable=False,
    )

    # Reference the authenticated CloudOps user.
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        # Speed current-user membership lookups.
        index=True,
        # Every membership belongs to a user.
        nullable=False,
    )

    # Store the user's authorization role inside this organization.
    role: Mapped[str] = mapped_column(
        # Support owner/admin/member/viewer.
        String(32),
        # Use least privilege when an explicit role is not supplied.
        default="viewer",
        # Protect direct database inserts as well.
        server_default="viewer",
        # Require an organization role.
        nullable=False,
    )

    # Support suspending membership without deleting audit history.
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
    )

    # Link membership back to its organization.
    organization: Mapped["Organization"] = relationship(
        back_populates="memberships",
    )

    # Resolve the user through SQLAlchemy's model registry.
    user = relationship(
        "User",
    )

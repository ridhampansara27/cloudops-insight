from datetime import datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
)


class UserRead(BaseModel):
    """Public representation of the authenticated identity."""

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID

    email: EmailStr

    full_name: str

    # Global application role remains separate from tenant membership role.
    role: str

    is_active: bool

    # NULL means the email address has not completed verification.
    email_verified_at: datetime | None

    password_changed_at: datetime

    created_at: datetime

    updated_at: datetime

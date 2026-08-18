# Import datetime and UUID types.
from datetime import datetime
from uuid import UUID

# Import Pydantic model configuration.
from pydantic import BaseModel, ConfigDict, EmailStr


# Define the public user representation.
class UserRead(BaseModel):
    # Allow Pydantic to read attributes from SQLAlchemy ORM objects.
    model_config = ConfigDict(
        from_attributes=True,
    )

    # Return the user's UUID.
    id: UUID

    # Return the login email.
    email: EmailStr

    # Return the display name.
    full_name: str

    # Return the application role.
    role: str

    # Return whether login is allowed.
    is_active: bool

    # Return creation timestamp.
    created_at: datetime

    # Return most recent modification timestamp.
    updated_at: datetime

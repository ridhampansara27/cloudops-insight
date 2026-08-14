# Import Pydantic's base schema class.
from pydantic import BaseModel


# Define the successful login response.
class TokenResponse(BaseModel):
    # Return the encoded JWT token.
    access_token: str

    # Tell clients that the token uses Bearer authentication.
    token_type: str = "bearer"

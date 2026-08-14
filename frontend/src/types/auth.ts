// Define the bearer-token response returned by FastAPI.
export interface LoginResponse {
  // Store the signed JWT.
  access_token: string;

  // FastAPI returns bearer for this application.
  token_type: string;
}

// Define the authenticated user returned by /auth/me.
export interface AuthenticatedUser {
  // Store the backend UUID.
  id: string;

  // Store the user's email address.
  email: string;

  // Store the visible user name.
  full_name: string;

  // Store application authorization role.
  role: string;

  // Store whether the account is enabled.
  is_active: boolean;

  // Store record creation timestamp.
  created_at: string;

  // Store record update timestamp.
  updated_at: string;
}
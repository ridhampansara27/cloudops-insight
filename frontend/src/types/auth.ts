// Define the bearer-token response returned by FastAPI.
export interface LoginResponse {
  access_token: string;

  token_type: string;
}


// Define generic authentication workflow responses.
export interface AuthMessageResponse {
  message: string;
}


// Define commercial signup input.
export interface SignupInput {
  email: string;

  full_name: string;

  organization_name: string;

  password: string;
}


// Define the authenticated user returned by /auth/me.
export interface AuthenticatedUser {
  id: string;

  email: string;

  full_name: string;

  // Global application role remains separate from tenant membership role.
  role: string;

  is_active: boolean;

  // Null means email ownership has not yet been verified.
  email_verified_at:
    | string
    | null;

  // Security boundary for the latest password change.
  password_changed_at: string;

  created_at: string;

  updated_at: string;
}
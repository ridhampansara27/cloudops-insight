// Import the reusable HTTP client.
import {
  apiRequest,
} from "@/lib/api-client";

// Import authentication models.
import type {
  AuthenticatedUser,
  LoginResponse,
} from "@/types/auth";

// Define login input.
export interface LoginInput {
  // Use email as OAuth2's username field.
  email: string;

  // Store the entered password.
  password: string;
}

// Authenticate against FastAPI.
export async function login(
  input: LoginInput,
): Promise<LoginResponse> {
  // Create OAuth2 form fields.
  const form =
    new URLSearchParams();

  // FastAPI's OAuth2 form expects "username".
  form.set(
    "username",
    input.email,
  );

  // Add the password.
  form.set(
    "password",
    input.password,
  );

  // Call the public login endpoint.
  return apiRequest<LoginResponse>(
    "/api/v1/auth/login",
    {
      // Use POST.
      method: "POST",

      // Send form-encoded credentials.
      form,

      // Login itself does not require authentication.
      requiresAuth: false,
    },
  );
}

// Retrieve the authenticated user's profile.
export async function getCurrentUser(): Promise<AuthenticatedUser> {
  // Call the JWT-protected current-user endpoint.
  return apiRequest<AuthenticatedUser>(
    "/api/v1/auth/me",
  );
}
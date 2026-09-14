// Import the reusable HTTP client.
import {
  apiRequest,
} from "@/lib/api-client";

// Import authentication models.
import type {
  AuthenticatedUser,
  AuthMessageResponse,
  LoginResponse,
  SignupInput,
} from "@/types/auth";


// Define login input.
export interface LoginInput {
  email: string;

  password: string;
}


// Authenticate against FastAPI.
export async function login(
  input: LoginInput,
): Promise<LoginResponse> {
  const form =
    new URLSearchParams();

  form.set(
    "username",
    input.email,
  );

  form.set(
    "password",
    input.password,
  );

  return apiRequest<LoginResponse>(
    "/api/v1/auth/login",
    {
      method: "POST",
      form,
      requiresAuth: false,
    },
  );
}


// Register the first owner of a new organization.
//
// The backend intentionally returns the same response for a newly
// created email and an already-existing email.
export async function signup(
  input: SignupInput,
): Promise<AuthMessageResponse> {
  return apiRequest<AuthMessageResponse>(
    "/api/v1/auth/signup",
    {
      method: "POST",
      json: input,
      requiresAuth: false,
    },
  );
}


// Consume one verification bearer from the email link.
export async function verifyEmail(
  token: string,
): Promise<AuthMessageResponse> {
  return apiRequest<AuthMessageResponse>(
    "/api/v1/auth/verify-email",
    {
      method: "POST",
      json: {
        token,
      },
      requiresAuth: false,
    },
  );
}


// Request another verification message.
//
// The backend intentionally does not reveal whether the email exists.
export async function resendVerification(
  email: string,
): Promise<AuthMessageResponse> {
  return apiRequest<AuthMessageResponse>(
    "/api/v1/auth/resend-verification",
    {
      method: "POST",
      json: {
        email,
      },
      requiresAuth: false,
    },
  );
}


// Request password recovery without revealing account existence.
export async function forgotPassword(
  email: string,
): Promise<AuthMessageResponse> {
  return apiRequest<AuthMessageResponse>(
    "/api/v1/auth/forgot-password",
    {
      method: "POST",
      json: {
        email,
      },
      requiresAuth: false,
    },
  );
}


// Consume one password-reset bearer and set a new password.
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<AuthMessageResponse> {
  return apiRequest<AuthMessageResponse>(
    "/api/v1/auth/reset-password",
    {
      method: "POST",
      json: {
        token,
        new_password:
          newPassword,
      },
      requiresAuth: false,
    },
  );
}


// Revoke the browser's current refresh-session family.
export async function logoutSession(): Promise<void> {
  return apiRequest<void>(
    "/api/v1/auth/logout",
    {
      method: "POST",

      // Logout authenticates with the HttpOnly refresh cookie rather
      // than requiring a still-valid access JWT.
      requiresAuth: false,
    },
  );
}


// Retrieve the authenticated user's profile.
export async function getCurrentUser(): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>(
    "/api/v1/auth/me",
  );
}
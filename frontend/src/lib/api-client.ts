// Import API error helpers.
import {
  ApiError,
  getApiErrorMessage,
} from "@/lib/api-error";

// Import the global authentication store.
import {
  useAuthStore,
} from "@/stores/auth-store";

// Read the optional external FastAPI URL.
//
// During normal Vite development this is:
// http://127.0.0.1:8000
//
// In Docker/Kubernetes it can be empty,
// causing the frontend to use the browser's current origin.
const API_BASE_URL = (
  import.meta.env
    .VITE_API_BASE_URL ??
  ""
).replace(
  /\/$/,
  "",
);

// Define supported API-request configuration.
interface ApiRequestOptions
  extends Omit<
    RequestInit,
    "body"
  > {
  // Allow JSON request bodies.
  json?: unknown;

  // Allow URL-encoded form requests.
  form?: URLSearchParams;

  // Allow public requests such as login.
  requiresAuth?: boolean;
}

// Send one request to FastAPI.
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  // Read authentication requirements.
  const {
    json,
    form,
    requiresAuth = true,
    headers,
    ...requestOptions
  } = options;

  // Read the current token outside React components.
  const accessToken =
    useAuthStore.getState()
      .accessToken;

  // Create request headers.
  const requestHeaders =
    new Headers(
      headers,
    );

  // Add bearer authentication when required and available.
  if (
    requiresAuth &&
    accessToken
  ) {
    requestHeaders.set(
      "Authorization",
      `Bearer ${accessToken}`,
    );
  }

  // Prepare the request body.
  let body:
    | string
    | URLSearchParams
    | undefined;

  // Handle JSON requests.
  if (json !== undefined) {
    // Tell FastAPI that JSON is being sent.
    requestHeaders.set(
      "Content-Type",
      "application/json",
    );

    // Convert the JavaScript value into JSON text.
    body = JSON.stringify(
      json,
    );
  }

  // Handle form-based OAuth2 login requests.
  if (form !== undefined) {
    // Tell FastAPI that URL-encoded form data is being sent.
    requestHeaders.set(
      "Content-Type",
      "application/x-www-form-urlencoded",
    );

    // Use URLSearchParams directly as the request body.
    body = form;
  }

  // Send the HTTP request.
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      // Forward request configuration.
      ...requestOptions,

      // Add calculated headers.
      headers:
        requestHeaders,

      // Add the calculated request body.
      body,
    },
  );

  // Handle successful requests without response content.
  if (
    response.status === 204
  ) {
    // Return an empty typed result.
    return undefined as T;
  }

  // Read JSON when FastAPI returned a JSON body.
  const responseBody =
    await response
      .json()
      .catch(() => null);

  // Handle unsuccessful responses.
  if (!response.ok) {
    // Clear authentication when an existing session becomes unauthorized.
    if (
      response.status === 401 &&
      accessToken
    ) {
      useAuthStore
        .getState()
        .logout();
    }

    // Convert the backend failure into a typed error.
    throw new ApiError(
      getApiErrorMessage(
        responseBody,
      ),
      response.status,
      responseBody,
    );
  }

  // Return the successful typed response.
  return responseBody as T;
}
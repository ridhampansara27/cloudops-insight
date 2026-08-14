// Define the structure FastAPI commonly returns for errors.
interface FastApiErrorBody {
  // Store FastAPI's error description.
  detail?: unknown;
}

// Define an error class specifically for API failures.
export class ApiError extends Error {
  // Store the HTTP response status.
  readonly status: number;

  // Store the original server response when available.
  readonly body: unknown;

  // Create a typed API error.
  constructor(
    message: string,
    status: number,
    body: unknown,
  ) {
    // Initialize the normal JavaScript Error object.
    super(message);

    // Give the error a useful class name.
    this.name = "ApiError";

    // Store the HTTP status.
    this.status = status;

    // Store the response body.
    this.body = body;
  }
}

// Convert an unknown FastAPI response into a readable message.
export function getApiErrorMessage(
  body: unknown,
): string {
  // Ensure the response is an object.
  if (
    typeof body === "object" &&
    body !== null
  ) {
    // Treat the object as a possible FastAPI error.
    const errorBody =
      body as FastApiErrorBody;

    // Return a simple string detail when provided.
    if (
      typeof errorBody.detail ===
      "string"
    ) {
      return errorBody.detail;
    }
  }

  // Fall back to a generic message.
  return "An unexpected API error occurred.";
}
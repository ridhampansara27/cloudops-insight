// Import TanStack Query's shared cache client.
import {
  QueryClient,
} from "@tanstack/react-query";

// Import typed API errors.
import {
  ApiError,
} from "@/lib/api-error";


// Determine whether a failed query should retry.
function shouldRetryQuery(
  // Receive current failure count.
  failureCount: number,

  // Receive the thrown request error.
  error: unknown,
): boolean {
  // Never retry normal client/authentication failures.
  if (
    error instanceof
      ApiError &&
    error.status >= 400 &&
    error.status < 500
  ) {
    // Stop retrying invalid requests.
    return false;
  }

  // Allow at most two attempts for network/server failures.
  return failureCount < 2;
}


// Create one query client for CloudOps Insight.
export const queryClient =
  new QueryClient({
    // Configure global query behavior.
    defaultOptions: {
      // Configure read operations.
      queries: {
        // Consider successful data fresh for thirty seconds.
        staleTime:
          30_000,

        // Keep inactive cache records for five minutes.
        gcTime:
          5 * 60_000,

        // Retry only appropriate failures.
        retry:
          shouldRetryQuery,

        // Avoid automatic refetch whenever the browser receives focus.
        refetchOnWindowFocus:
          false,

        // Refresh data after connectivity returns.
        refetchOnReconnect:
          true,
      },

      // Configure write operations.
      mutations: {
        // Never automatically repeat side-effecting mutations.
        retry:
          0,
      },
    },
  });
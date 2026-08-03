// Import TanStack Query's central cache client.
import { QueryClient } from "@tanstack/react-query";

// Create one query client for the complete application.
export const queryClient = new QueryClient({
  // Configure default behavior for all data-fetching queries.
  defaultOptions: {
    queries: {
      // Consider fetched data fresh for thirty seconds.
      staleTime: 30_000,

      // Remove unused cached data after five minutes.
      gcTime: 5 * 60_000,

      // Retry failed network queries twice.
      retry: 2,

      // Avoid unnecessary refetching whenever the browser regains focus.
      refetchOnWindowFocus: false,

      // Refetch when connectivity returns.
      refetchOnReconnect: true,
    },

    mutations: {
      // Retry a failed mutation once.
      retry: 1,
    },
  },
});
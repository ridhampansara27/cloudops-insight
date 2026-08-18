// Import TanStack Query.
import {
  useQuery,
} from "@tanstack/react-query";

// Import API client.
import {
  apiRequest,
} from "@/lib/api-client";

// Import query keys.
import {
  queryKeys,
} from "@/lib/query-keys";

// Import response model.
import type {
  DashboardSummaryResponse,
} from "@/types/api";

// Request dashboard KPI information.
async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  // Call the authenticated FastAPI endpoint.
  return apiRequest<DashboardSummaryResponse>(
    "/api/v1/dashboard/summary",
  );
}

// Expose dashboard data to React components.
export function useDashboardSummary() {
  // Create a cached dashboard query.
  return useQuery({
    // Identify this data in TanStack Query's cache.
    queryKey:
      queryKeys.dashboard
        .summary,

    // Define how the data is loaded.
    queryFn:
      getDashboardSummary,
  });
}
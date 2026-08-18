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

// Import API response type.
import type {
  CostSummaryApiResponse,
} from "@/types/api";

// Request cost summary.
async function getCostSummary(): Promise<CostSummaryApiResponse> {
  // Load the real PostgreSQL-backed cost summary.
  return apiRequest<CostSummaryApiResponse>(
    "/api/v1/costs/summary",
  );
}

// Expose cost summary to React components.
export function useCostSummary() {
  // Create the cached query.
  return useQuery({
    queryKey:
      queryKeys.costs.summary,

    queryFn:
      getCostSummary,
  });
}
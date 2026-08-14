// Import TanStack Query.
import {
  useQuery,
} from "@tanstack/react-query";

// Import API client.
import {
  apiRequest,
} from "@/lib/api-client";

// Import cache keys.
import {
  queryKeys,
} from "@/lib/query-keys";

// Import API response models.
import type {
  ResourceApiResponse,
  ResourceListResponse,
} from "@/types/api";

// Define supported resource filters.
export interface ResourceFilters {
  // Store one-based page number.
  page: number;

  // Store number of rows per page.
  pageSize: number;

  // Store search text.
  search?: string;

  // Store service filter.
  service?: string;

  // Store environment filter.
  environment?: string;

  // Store health filter.
  healthState?: string;
}

// Request a filtered resource page.
async function getResources(
  filters: ResourceFilters,
): Promise<ResourceListResponse> {
  // Create URL parameters.
  const params =
    new URLSearchParams();

  // Add required pagination.
  params.set(
    "page",
    String(filters.page),
  );

  // Add page size.
  params.set(
    "page_size",
    String(
      filters.pageSize,
    ),
  );

  // Add search when supplied.
  if (filters.search) {
    params.set(
      "search",
      filters.search,
    );
  }

  // Add service filter when supplied.
  if (filters.service) {
    params.set(
      "service",
      filters.service,
    );
  }

  // Add environment filter.
  if (
    filters.environment
  ) {
    params.set(
      "environment",
      filters.environment,
    );
  }

  // Add health-state filter.
  if (
    filters.healthState
  ) {
    params.set(
      "health_state",
      filters.healthState,
    );
  }

  // Load resources from FastAPI.
  return apiRequest<ResourceListResponse>(
    `/api/v1/resources?${params.toString()}`,
  );
}

// Request one resource.
async function getResource(
  resourceId: string,
): Promise<ResourceApiResponse> {
  // Call the resource detail endpoint.
  return apiRequest<ResourceApiResponse>(
    `/api/v1/resources/${resourceId}`,
  );
}

// Expose a filtered resource query.
export function useResources(
  filters: ResourceFilters,
) {
  // Cache each unique filter combination independently.
  return useQuery({
    queryKey:
      queryKeys.resources.list(
        filters,
      ),

    queryFn: () =>
      getResources(
        filters,
      ),
  });
}

// Expose one resource-detail query.
export function useResource(
  resourceId: string,
) {
  // Create a resource-specific query.
  return useQuery({
    queryKey:
      queryKeys.resources.detail(
        resourceId,
      ),

    queryFn: () =>
      getResource(
        resourceId,
      ),

    // Avoid invalid requests before a route ID exists.
    enabled:
      resourceId.length > 0,
  });
}
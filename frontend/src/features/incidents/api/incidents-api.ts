// Import TanStack Query APIs.
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

// Import API client.
import {
  apiRequest,
} from "@/lib/api-client";

// Import cache keys.
import {
  queryKeys,
} from "@/lib/query-keys";

// Import incident model.
import type {
  IncidentApiResponse,
} from "@/types/api";

// Load incidents.
async function getIncidents(): Promise<IncidentApiResponse[]> {
  return apiRequest<IncidentApiResponse[]>(
    "/api/v1/incidents",
  );
}

// Update incident state.
async function updateIncidentStatus(
  input: {
    id: string;
    status: string;
  },
): Promise<IncidentApiResponse> {
  return apiRequest<IncidentApiResponse>(
    `/api/v1/incidents/${input.id}/status`,
    {
      method: "PATCH",
      json: {
        status:
          input.status,
      },
    },
  );
}

// Expose incidents.
export function useIncidents() {
  return useQuery({
    queryKey:
      queryKeys.incidents,

    queryFn:
      getIncidents,
  });
}

// Expose incident-status mutation.
export function useUpdateIncidentStatus() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      updateIncidentStatus,

    onSuccess: async () => {
      // Refresh incident list and dashboard KPIs.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            queryKeys.incidents,
        }),

        queryClient.invalidateQueries({
          queryKey:
            queryKeys.dashboard
              .summary,
        }),
      ]);
    },
  });
}
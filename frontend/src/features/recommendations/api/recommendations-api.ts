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

// Import API model.
import type {
  RecommendationApiResponse,
} from "@/types/api";

// Load optimization recommendations.
async function getRecommendations(): Promise<
  RecommendationApiResponse[]
> {
  return apiRequest<
    RecommendationApiResponse[]
  >(
    "/api/v1/recommendations",
  );
}

// Change recommendation workflow status.
async function updateRecommendationStatus(
  input: {
    id: string;
    status: string;
  },
): Promise<RecommendationApiResponse> {
  return apiRequest<RecommendationApiResponse>(
    `/api/v1/recommendations/${input.id}/status`,
    {
      method: "PATCH",
      json: {
        status:
          input.status,
      },
    },
  );
}

// Expose recommendation query.
export function useRecommendations() {
  return useQuery({
    queryKey:
      queryKeys.recommendations,

    queryFn:
      getRecommendations,
  });
}

// Expose recommendation workflow mutation.
export function useUpdateRecommendationStatus() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      updateRecommendationStatus,

    onSuccess: async () => {
      // Recommendation state affects both its page and dashboard savings.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            queryKeys.recommendations,
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
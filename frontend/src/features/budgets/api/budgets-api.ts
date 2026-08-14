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

// Import query keys.
import {
  queryKeys,
} from "@/lib/query-keys";

// Import budget response type.
import type {
  BudgetApiResponse,
} from "@/types/api";

// Define budget creation input.
export interface CreateBudgetInput {
  name: string;
  scope_type: string;
  scope_value: string;
  monthly_limit: number;
  warning_threshold: number;
  critical_threshold: number;
}

// Define budget update input.
export interface UpdateBudgetInput {
  id: string;
  name?: string;
  monthly_limit?: number;
  warning_threshold?: number;
  critical_threshold?: number;
  is_active?: boolean;
}

// Load budgets.
async function getBudgets(): Promise<BudgetApiResponse[]> {
  return apiRequest<BudgetApiResponse[]>(
    "/api/v1/budgets",
  );
}

// Create a budget.
async function createBudget(
  input: CreateBudgetInput,
): Promise<BudgetApiResponse> {
  return apiRequest<BudgetApiResponse>(
    "/api/v1/budgets",
    {
      method: "POST",
      json: input,
    },
  );
}

// Update a budget.
async function updateBudget(
  input: UpdateBudgetInput,
): Promise<BudgetApiResponse> {
  const {
    id,
    ...changes
  } = input;

  return apiRequest<BudgetApiResponse>(
    `/api/v1/budgets/${id}`,
    {
      method: "PATCH",
      json: changes,
    },
  );
}

// Delete a budget.
async function deleteBudget(
  budgetId: string,
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/budgets/${budgetId}`,
    {
      method: "DELETE",
    },
  );
}

// Query all budgets.
export function useBudgets() {
  return useQuery({
    queryKey:
      queryKeys.budgets,

    queryFn:
      getBudgets,
  });
}

// Create a budget mutation.
export function useCreateBudget() {
  // Access the cache manager.
  const queryClient =
    useQueryClient();

  // Create mutation.
  return useMutation({
    mutationFn:
      createBudget,

    // Refresh dependent data after successful creation.
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            queryKeys.budgets,
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

// Update a budget mutation.
export function useUpdateBudget() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      updateBudget,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          queryKeys.budgets,
      });
    },
  });
}

// Delete a budget mutation.
export function useDeleteBudget() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      deleteBudget,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey:
          queryKeys.budgets,
      });
    },
  });
}
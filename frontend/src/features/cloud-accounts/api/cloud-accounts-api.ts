// Import TanStack Query APIs.
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

// Import reusable API client.
import {
  apiRequest,
} from "@/lib/api-client";

// Import query keys.
import {
  queryKeys,
} from "@/lib/query-keys";

// Import API models.
import type {
  CloudAccountApiResponse,
  CloudAccountSyncQueuedResponse,
} from "@/types/api";


// Define AWS account registration input.
export interface CreateCloudAccountInput {
  // Store visible account name.
  name: string;

  // CloudOps currently supports AWS.
  provider: "aws";

  // Store twelve-digit AWS account ID.
  external_account_id: string;

  // Store optional AssumeRole ARN.
  role_arn:
    | string
    | null;

  // Store optional STS ExternalId.
  external_id:
    | string
    | null;

  // Store regions CloudOps should discover.
  enabled_regions: string[];
}


// Retrieve registered cloud accounts.
async function getCloudAccounts(): Promise<
  CloudAccountApiResponse[]
> {
  // Call FastAPI.
  return apiRequest<
    CloudAccountApiResponse[]
  >(
    "/api/v1/cloud-accounts",
  );
}


// Register a cloud account.
async function createCloudAccount(
  input: CreateCloudAccountInput,
): Promise<CloudAccountApiResponse> {
  // Submit account configuration.
  return apiRequest<CloudAccountApiResponse>(
    "/api/v1/cloud-accounts",
    {
      method: "POST",
      json: input,
    },
  );
}


// Validate AWS connectivity.
async function validateCloudAccount(
  accountId: string,
): Promise<unknown> {
  // Ask FastAPI to call STS.
  return apiRequest(
    `/api/v1/cloud-accounts/${accountId}/validate`,
    {
      method: "POST",
    },
  );
}


// Queue real AWS inventory discovery.
async function syncCloudAccount(
  accountId: string,
): Promise<CloudAccountSyncQueuedResponse> {
  // Queue the Celery worker task.
  return apiRequest<CloudAccountSyncQueuedResponse>(
    `/api/v1/cloud-accounts/${accountId}/sync`,
    {
      method: "POST",
    },
  );
}


// Query all registered accounts.
export function useCloudAccounts() {
  // Poll periodically so worker state becomes visible automatically.
  return useQuery({
    queryKey:
      queryKeys.cloudAccounts
        .all,

    queryFn:
      getCloudAccounts,

    // Refresh background synchronization state every five seconds.
    refetchInterval:
      5_000,
  });
}


// Create cloud-account mutation.
export function useCreateCloudAccount() {
  // Access TanStack's cache.
  const queryClient =
    useQueryClient();

  // Create mutation.
  return useMutation({
    mutationFn:
      createCloudAccount,

    onSuccess: async () => {
      // Refresh account inventory.
      await queryClient.invalidateQueries({
        queryKey:
          queryKeys.cloudAccounts
            .all,
      });
    },
  });
}


// Validate AWS account mutation.
export function useValidateCloudAccount() {
  // Access cache.
  const queryClient =
    useQueryClient();

  // Create mutation.
  return useMutation({
    mutationFn:
      validateCloudAccount,

    onSuccess: async () => {
      // Refresh account connection state.
      await queryClient.invalidateQueries({
        queryKey:
          queryKeys.cloudAccounts
            .all,
      });
    },
  });
}


// Queue AWS synchronization mutation.
export function useSyncCloudAccount() {
  // Access cache.
  const queryClient =
    useQueryClient();

  // Create mutation.
  return useMutation({
    mutationFn:
      syncCloudAccount,

    onSuccess: async () => {
      // Refresh queued synchronization state.
      await queryClient.invalidateQueries({
        queryKey:
          queryKeys.cloudAccounts
            .all,
      });
    },
  });
}
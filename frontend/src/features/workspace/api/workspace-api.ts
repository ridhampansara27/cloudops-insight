import {
  useQuery,
} from "@tanstack/react-query";

import {
  apiRequest,
} from "@/lib/api-client";

import {
  queryKeys,
} from "@/lib/query-keys";

import type {
  WorkspaceOrganizationChoice,
} from "@/features/workspace/workspace-types";


async function getAvailableOrganizations(): Promise<
  WorkspaceOrganizationChoice[]
> {
  return apiRequest<
    WorkspaceOrganizationChoice[]
  >(
    "/api/v1/workspace/organizations",
  );
}


export function useAvailableOrganizations() {
  return useQuery({
    queryKey:
      queryKeys.workspace
        .organizations,

    queryFn:
      getAvailableOrganizations,

    staleTime:
      30_000,
  });
}
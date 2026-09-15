import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  apiRequest,
} from "@/lib/api-client";

import {
  queryKeys,
} from "@/lib/query-keys";

import type {
  AcceptWorkspaceInvitationInput,
  CreateWorkspaceInvitationInput,
  WorkspaceInvitation,
  WorkspaceInvitationAcceptance,
  WorkspaceMember,
  WorkspaceOrganization,
  WorkspaceOrganizationChoice,
  WorkspaceProfile,
  WorkspaceRole,
} from "@/features/workspace/workspace-types";


// ============================================================
// Workspace discovery
// ============================================================

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


// ============================================================
// Profile
// ============================================================

async function getWorkspaceProfile(): Promise<
  WorkspaceProfile
> {
  return apiRequest<
    WorkspaceProfile
  >(
    "/api/v1/workspace/profile",
  );
}


async function updateWorkspaceProfile(
  fullName: string,
): Promise<
  WorkspaceProfile
> {
  return apiRequest<
    WorkspaceProfile
  >(
    "/api/v1/workspace/profile",
    {
      method:
        "PATCH",

      json: {
        full_name:
          fullName,
      },
    },
  );
}


export function useWorkspaceProfile() {
  return useQuery({
    queryKey:
      queryKeys.workspace
        .profile,

    queryFn:
      getWorkspaceProfile,
  });
}


export function useUpdateWorkspaceProfile() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      updateWorkspaceProfile,

    onSuccess:
      async (
        profile,
      ) => {
        queryClient.setQueryData(
          queryKeys.workspace
            .profile,
          profile,
        );

        await queryClient.invalidateQueries({
          queryKey:
            queryKeys.currentUser,
        });
      },
  });
}


// ============================================================
// Organization
// ============================================================

async function getWorkspaceOrganization(): Promise<
  WorkspaceOrganization
> {
  return apiRequest<
    WorkspaceOrganization
  >(
    "/api/v1/workspace/organization",
  );
}


async function updateWorkspaceOrganization(
  name: string,
): Promise<
  WorkspaceOrganization
> {
  return apiRequest<
    WorkspaceOrganization
  >(
    "/api/v1/workspace/organization",
    {
      method:
        "PATCH",

      json: {
        name,
      },
    },
  );
}


export function useWorkspaceOrganization() {
  return useQuery({
    queryKey:
      queryKeys.workspace
        .organization,

    queryFn:
      getWorkspaceOrganization,
  });
}


export function useUpdateWorkspaceOrganization() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      updateWorkspaceOrganization,

    onSuccess:
      async (
        organization,
      ) => {
        queryClient.setQueryData(
          queryKeys.workspace
            .organization,
          organization,
        );

        await queryClient.invalidateQueries({
          queryKey:
            queryKeys.workspace
              .organizations,
        });
      },
  });
}


// ============================================================
// Members
// ============================================================

async function getWorkspaceMembers(): Promise<
  WorkspaceMember[]
> {
  return apiRequest<
    WorkspaceMember[]
  >(
    "/api/v1/workspace/members",
  );
}


async function updateWorkspaceMemberRole(
  input: {
    membershipId: string;

    role: WorkspaceRole;
  },
): Promise<
  WorkspaceMember
> {
  return apiRequest<
    WorkspaceMember
  >(
    `/api/v1/workspace/members/${input.membershipId}/role`,
    {
      method:
        "PATCH",

      json: {
        role:
          input.role,
      },
    },
  );
}


async function removeWorkspaceMember(
  membershipId: string,
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/workspace/members/${membershipId}`,
    {
      method:
        "DELETE",
    },
  );
}


export function useWorkspaceMembers() {
  return useQuery({
    queryKey:
      queryKeys.workspace
        .members,

    queryFn:
      getWorkspaceMembers,
  });
}


export function useUpdateWorkspaceMemberRole() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      updateWorkspaceMemberRole,

    onSuccess:
      async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              queryKeys.workspace
                .members,
          }),

          queryClient.invalidateQueries({
            queryKey:
              queryKeys.workspace
                .organization,
          }),

          queryClient.invalidateQueries({
            queryKey:
              queryKeys.workspace
                .organizations,
          }),
        ]);
      },
  });
}


export function useRemoveWorkspaceMember() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      removeWorkspaceMember,

    onSuccess:
      async () => {
        await queryClient.invalidateQueries({
          queryKey:
            queryKeys.workspace
              .members,
        });
      },
  });
}


// ============================================================
// Invitations
// ============================================================

async function getWorkspaceInvitations(): Promise<
  WorkspaceInvitation[]
> {
  return apiRequest<
    WorkspaceInvitation[]
  >(
    "/api/v1/workspace/invitations",
  );
}


async function createWorkspaceInvitation(
  input:
    CreateWorkspaceInvitationInput,
): Promise<
  WorkspaceInvitation
> {
  return apiRequest<
    WorkspaceInvitation
  >(
    "/api/v1/workspace/invitations",
    {
      method:
        "POST",

      json: {
        email:
          input.email,

        role:
          input.role,
      },
    },
  );
}


async function revokeWorkspaceInvitation(
  invitationId: string,
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/workspace/invitations/${invitationId}`,
    {
      method:
        "DELETE",
    },
  );
}


export function useWorkspaceInvitations(
  enabled: boolean,
) {
  return useQuery({
    queryKey:
      queryKeys.workspace
        .invitations,

    queryFn:
      getWorkspaceInvitations,

    enabled,
  });
}


export function useCreateWorkspaceInvitation() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      createWorkspaceInvitation,

    onSuccess:
      async () => {
        await queryClient.invalidateQueries({
          queryKey:
            queryKeys.workspace
              .invitations,
        });
      },
  });
}


export function useRevokeWorkspaceInvitation() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      revokeWorkspaceInvitation,

    onSuccess:
      async () => {
        await queryClient.invalidateQueries({
          queryKey:
            queryKeys.workspace
              .invitations,
        });
      },
  });
}


// ============================================================
// Public invitation acceptance
// ============================================================

async function acceptWorkspaceInvitation(
  input:
    AcceptWorkspaceInvitationInput,
): Promise<
  WorkspaceInvitationAcceptance
> {
  return apiRequest<
    WorkspaceInvitationAcceptance
  >(
    "/api/v1/workspace/invitations/accept",
    {
      method:
        "POST",

      requiresAuth:
        false,

      json: input,
    },
  );
}


export function useAcceptWorkspaceInvitation() {
  return useMutation({
    mutationFn:
      acceptWorkspaceInvitation,
  });
}
import {
  type FormEvent,
  useState,
} from "react";

import {
  Building2,
  CircleCheckBig,
  Clock3,
  MailPlus,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import {
  toast,
} from "sonner";

import {
  DeleteAccountDialog,
} from "@/features/auth/delete-account-dialog";

import {
  deleteAccount,
} from "@/features/auth/api/auth-api";

import {
  InviteMemberDialog,
} from "@/features/workspace/invite-member-dialog";

import {
  useCreateWorkspaceInvitation,
  useRemoveWorkspaceMember,
  useRevokeWorkspaceInvitation,
  useUpdateWorkspaceMemberRole,
  useUpdateWorkspaceOrganization,
  useUpdateWorkspaceProfile,
  useWorkspaceInvitations,
  useWorkspaceMembers,
  useWorkspaceOrganization,
  useWorkspaceProfile,
} from "@/features/workspace/api/workspace-api";

import type {
  WorkspaceInvitationStatus,
  WorkspaceRole,
} from "@/features/workspace/workspace-types";

import {
  useWorkspaceStore,
} from "@/features/workspace/workspace-store";

import {
  useAuthStore,
} from "@/stores/auth-store";

import {
  ApiError,
} from "@/lib/api-error";

import {
  formatTimestamp,
} from "@/lib/formatters";

import {
  PageErrorState,
} from "@/components/shared/page-error-state";

import {
  PageLoadingState,
} from "@/components/shared/page-loading-state";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


function roleClasses(
  role: WorkspaceRole,
) {
  if (
    role ===
    "owner"
  ) {
    return "border-violet-400/20 bg-violet-400/8 text-violet-300";
  }

  if (
    role ===
    "admin"
  ) {
    return "border-cyan-400/20 bg-cyan-400/8 text-cyan-300";
  }

  if (
    role ===
    "member"
  ) {
    return "border-emerald-400/20 bg-emerald-400/8 text-emerald-300";
  }

  return "border-slate-400/20 bg-slate-400/8 text-slate-300";
}


function invitationClasses(
  status:
    WorkspaceInvitationStatus,
) {
  if (
    status ===
    "pending"
  ) {
    return "border-amber-400/20 bg-amber-400/8 text-amber-300";
  }

  if (
    status ===
    "accepted"
  ) {
    return "border-emerald-400/20 bg-emerald-400/8 text-emerald-300";
  }

  if (
    status ===
    "revoked"
  ) {
    return "border-rose-400/20 bg-rose-400/8 text-rose-300";
  }

  return "border-slate-400/20 bg-slate-400/8 text-slate-300";
}


function readableError(
  error: unknown,
  fallback: string,
) {
  if (
    error instanceof ApiError
  ) {
    return error.message;
  }

  return fallback;
}


export function SettingsPage() {
  const [
    inviteOpen,
    setInviteOpen,
  ] =
    useState(
      false,
    );

  const [
    deleteAccountOpen,
    setDeleteAccountOpen,
  ] =
    useState(
      false,
    );

  const [
    isDeletingAccount,
    setIsDeletingAccount,
  ] =
    useState(
      false,
    );


  const profileQuery =
    useWorkspaceProfile();

  const organizationQuery =
    useWorkspaceOrganization();

  const membersQuery =
    useWorkspaceMembers();


  const currentRole =
    organizationQuery.data
      ?.current_role;


  const canAdministerWorkspace =
    currentRole ===
      "owner" ||
    currentRole ===
      "admin";


  const invitationsQuery =
    useWorkspaceInvitations(
      canAdministerWorkspace,
    );


  const updateProfile =
    useUpdateWorkspaceProfile();

  const updateOrganization =
    useUpdateWorkspaceOrganization();

  const updateMemberRole =
    useUpdateWorkspaceMemberRole();

  const removeMember =
    useRemoveWorkspaceMember();

  const createInvitation =
    useCreateWorkspaceInvitation();

  const revokeInvitation =
    useRevokeWorkspaceInvitation();


  const setAuthUser =
    useAuthStore(
      (
        state,
      ) =>
        state.setUser,
    );

  const logout =
    useAuthStore(
      (
        state,
      ) =>
        state.logout,
    );

  const setActiveOrganizationId =
    useWorkspaceStore(
      (
        state,
      ) =>
        state.setActiveOrganizationId,
    );


  if (
    profileQuery.isPending ||
    organizationQuery.isPending ||
    membersQuery.isPending
  ) {
    return (
      <PageLoadingState />
    );
  }


  if (
    profileQuery.isError ||
    organizationQuery.isError ||
    membersQuery.isError
  ) {
    return (
      <PageErrorState
        description="CloudOps could not load your workspace administration data."
        onRetry={() => {
          void Promise.all([
            profileQuery.refetch(),
            organizationQuery.refetch(),
            membersQuery.refetch(),
          ]);
        }}
        title="Unable to load workspace settings"
      />
    );
  }


  const profile =
    profileQuery.data;

  const organization =
    organizationQuery.data;

  const members =
    membersQuery.data;

  const invitations =
    invitationsQuery.data ??
    [];


  const pendingInvitations =
    invitations.filter(
      (
        invitation,
      ) =>
        invitation.status ===
        "pending",
    );


  async function handleProfileSave(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const data =
      new FormData(
        event.currentTarget,
      );

    const fullName =
      String(
        data.get(
          "fullName",
        ) ??
        "",
      ).trim();


    if (
      fullName.length <
      2
    ) {
      toast.error(
        "Enter a valid display name.",
      );

      return;
    }


    try {
      const updated =
        await updateProfile.mutateAsync(
          fullName,
        );

      setAuthUser(
        updated,
      );

      toast.success(
        "Profile updated.",
      );

    } catch (error) {
      toast.error(
        readableError(
          error,
          "Unable to update profile.",
        ),
      );
    }
  }


  async function handleOrganizationSave(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const data =
      new FormData(
        event.currentTarget,
      );

    const name =
      String(
        data.get(
          "organizationName",
        ) ??
        "",
      ).trim();


    if (
      name.length <
      2
    ) {
      toast.error(
        "Enter a valid workspace name.",
      );

      return;
    }


    try {
      await updateOrganization.mutateAsync(
        name,
      );

      toast.success(
        "Workspace updated.",
      );

    } catch (error) {
      toast.error(
        readableError(
          error,
          "Unable to update workspace.",
        ),
      );
    }
  }


  async function handleRoleChange(
    membershipId: string,
    role: WorkspaceRole,
  ) {
    try {
      await updateMemberRole.mutateAsync({
        membershipId,
        role,
      });

      toast.success(
        "Member role updated.",
      );

    } catch (error) {
      toast.error(
        readableError(
          error,
          "Unable to change this member role.",
        ),
      );
    }
  }


  async function handleRemoveMember(
    membershipId: string,
    memberName: string,
  ) {
    const confirmed =
      window.confirm(
        `Remove ${memberName} from this workspace?`,
      );

    if (!confirmed) {
      return;
    }


    try {
      await removeMember.mutateAsync(
        membershipId,
      );

      toast.success(
        "Workspace member removed.",
      );

    } catch (error) {
      toast.error(
        readableError(
          error,
          "Unable to remove this workspace member.",
        ),
      );
    }
  }


  async function handleInvite(
    input: {
      email: string;

      role: WorkspaceRole;
    },
  ) {
    try {
      await createInvitation.mutateAsync(
        input,
      );

      toast.success(
        "Workspace invitation sent.",
      );

    } catch (error) {
      toast.error(
        readableError(
          error,
          "Unable to send workspace invitation.",
        ),
      );

      throw error;
    }
  }


  async function handleRevokeInvitation(
    invitationId: string,
  ) {
    try {
      await revokeInvitation.mutateAsync(
        invitationId,
      );

      toast.success(
        "Invitation revoked.",
      );

    } catch (error) {
      toast.error(
        readableError(
          error,
          "Unable to revoke this invitation.",
        ),
      );
    }
  }


  async function handleDeleteAccount(
    currentPassword: string,
  ) {
    if (isDeletingAccount) {
      return;
    }

    setIsDeletingAccount(
      true,
    );

    try {
      await deleteAccount(
        currentPassword,
      );

      // The backend has now deleted the identity and refresh sessions.
      // Clear browser-memory auth and persisted workspace selection before
      // hard navigation removes the remaining in-memory application cache.
      logout();

      setActiveOrganizationId(
        null,
      );

      window.location.replace(
        "/login",
      );

    } catch (error) {
      setIsDeletingAccount(
        false,
      );

      toast.error(
        readableError(
          error,
          "Unable to delete your CloudOps account.",
        ),
      );
    }
  }


  return (
    <section className="space-y-6">
      {/* =====================================================
          Settings hero
          ===================================================== */}
      <Card className="relative overflow-hidden border-primary/15 bg-card/68 py-0">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-28 -top-40 size-[420px] rounded-full bg-cyan-400/9 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-40 size-[400px] rounded-full bg-violet-500/9 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/65 to-transparent"
        />

        <CardContent className="relative grid gap-7 p-6 lg:grid-cols-[1.3fr_0.7fr] lg:p-7">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] text-primary">
              <Settings className="size-3.5" />

              Workspace control plane
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Identity, workspace and
              team administration.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage your identity, organization metadata, memberships and
              secure invitations without crossing the selected tenant boundary.
            </p>
          </div>

          <div className="rounded-2xl border border-border/65 bg-background/30 p-4 shadow-inner backdrop-blur-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
              Workspace posture
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">
                  Workspace
                </span>

                <span className="max-w-48 truncate text-sm font-semibold">
                  {
                    organization.name
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">
                  Your role
                </span>

                <Badge
                  className={
                    roleClasses(
                      organization.current_role,
                    )
                  }
                  variant="outline"
                >
                  {
                    organization.current_role
                  }
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">
                  Active members
                </span>

                <span className="text-sm font-semibold">
                  {
                    members.length
                  }
                </span>
              </div>

              {canAdministerWorkspace && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-muted-foreground">
                    Pending invites
                  </span>

                  <span className="text-sm font-semibold">
                    {
                      pendingInvitations.length
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>


      {/* =====================================================
          Profile + organization
          ===================================================== */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="cloudops-interactive overflow-hidden bg-card/72 py-0">
          <CardHeader className="border-b border-border/50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/8 text-cyan-300">
                <UserRound className="size-[18px]" />
              </div>

              <div>
                <CardTitle>
                  Profile
                </CardTitle>

                <CardDescription className="mt-1">
                  Manage your CloudOps identity.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            <form
              className="space-y-5"
              onSubmit={
                handleProfileSave
              }
            >
              <div className="space-y-2">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="settings-full-name"
                >
                  Full name
                </label>

                <Input
                  className="rounded-xl bg-background/30"
                  defaultValue={
                    profile.full_name
                  }
                  disabled={
                    updateProfile.isPending
                  }
                  id="settings-full-name"
                  key={
                    profile.full_name
                  }
                  minLength={
                    2
                  }
                  name="fullName"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="settings-email"
                >
                  Email
                </label>

                <Input
                  className="rounded-xl bg-background/20"
                  disabled
                  id="settings-email"
                  value={
                    profile.email
                  }
                />

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <CircleCheckBig className="size-3.5 text-emerald-300" />

                  {profile.email_verified_at
                    ? "Email ownership verified"
                    : "Email verification pending"}
                </div>
              </div>

              <Button
                className="rounded-xl"
                disabled={
                  updateProfile.isPending
                }
                type="submit"
              >
                <Save className="mr-2 size-4" />

                {updateProfile.isPending
                  ? "Saving..."
                  : "Save profile"}
              </Button>
            </form>
          </CardContent>
        </Card>


        <Card className="cloudops-interactive overflow-hidden bg-card/72 py-0">
          <CardHeader className="border-b border-border/50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/8 text-violet-300">
                <Building2 className="size-[18px]" />
              </div>

              <div>
                <CardTitle>
                  Workspace
                </CardTitle>

                <CardDescription className="mt-1">
                  Organization metadata for the selected tenant.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            <form
              className="space-y-5"
              onSubmit={
                handleOrganizationSave
              }
            >
              <div className="space-y-2">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="settings-workspace-name"
                >
                  Workspace name
                </label>

                <Input
                  className="rounded-xl bg-background/30"
                  defaultValue={
                    organization.name
                  }
                  disabled={
                    !canAdministerWorkspace ||
                    updateOrganization.isPending
                  }
                  id="settings-workspace-name"
                  key={
                    organization.name
                  }
                  minLength={
                    2
                  }
                  name="organizationName"
                  required
                />
              </div>

              <div className="rounded-xl border border-border/55 bg-background/20 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-300" />

                  <p className="text-sm font-semibold">
                    Current permission
                  </p>
                </div>

                <Badge
                  className={`mt-3 ${roleClasses(
                    organization.current_role,
                  )}`}
                  variant="outline"
                >
                  {
                    organization.current_role
                  }
                </Badge>

                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Only owners and administrators can rename this workspace.
                  Membership-role changes remain owner-only.
                </p>
              </div>

              {canAdministerWorkspace && (
                <Button
                  className="rounded-xl"
                  disabled={
                    updateOrganization.isPending
                  }
                  type="submit"
                >
                  <Save className="mr-2 size-4" />

                  {updateOrganization.isPending
                    ? "Saving..."
                    : "Save workspace"}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>


      {/* =====================================================
          Members
          ===================================================== */}
      <Card className="overflow-hidden bg-card/72 py-0">
        <CardHeader className="border-b border-border/50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/8 text-emerald-300">
              <Users className="size-[18px]" />
            </div>

            <div>
              <CardTitle>
                Team members
              </CardTitle>

              <CardDescription className="mt-1">
                Active identities with access to this workspace.
              </CardDescription>
            </div>
          </div>

          {canAdministerWorkspace && (
            <Button
              className="mt-4 rounded-xl sm:mt-0"
              onClick={() =>
                setInviteOpen(
                  true,
                )
              }
              type="button"
            >
              <MailPlus className="mr-2 size-4" />

              Invite member
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead>
                    Member
                  </TableHead>

                  <TableHead>
                    Role
                  </TableHead>

                  <TableHead>
                    Joined
                  </TableHead>

                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {members.map(
                  (
                    member,
                  ) => {
                    const isCurrentUser =
                      member.user_id ===
                      profile.id;

                    return (
                      <TableRow
                        className="border-border/45"
                        key={
                          member.membership_id
                        }
                      >
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {
                                  member.full_name
                                }
                              </p>

                              {isCurrentUser && (
                                <Badge
                                  className="border-primary/20 bg-primary/8 text-primary"
                                  variant="outline"
                                >
                                  You
                                </Badge>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {
                                member.email
                              }
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          {organization.current_role ===
                            "owner" &&
                          !isCurrentUser ? (
                            <NativeSelect
                              className="min-w-28 rounded-xl"
                              disabled={
                                updateMemberRole.isPending
                              }
                              onChange={(
                                event,
                              ) =>
                                void handleRoleChange(
                                  member.membership_id,
                                  event.target
                                    .value as WorkspaceRole,
                                )
                              }
                              value={
                                member.role
                              }
                            >
                              <NativeSelectOption value="owner">
                                Owner
                              </NativeSelectOption>

                              <NativeSelectOption value="admin">
                                Admin
                              </NativeSelectOption>

                              <NativeSelectOption value="member">
                                Member
                              </NativeSelectOption>

                              <NativeSelectOption value="viewer">
                                Viewer
                              </NativeSelectOption>
                            </NativeSelect>
                          ) : (
                            <Badge
                              className={
                                roleClasses(
                                  member.role,
                                )
                              }
                              variant="outline"
                            >
                              {
                                member.role
                              }
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {
                            formatTimestamp(
                              member.joined_at,
                            )
                          }
                        </TableCell>

                        <TableCell className="text-right">
                          {organization.current_role ===
                            "owner" &&
                          !isCurrentUser ? (
                            <Button
                              aria-label={`Remove ${member.full_name}`}
                              className="rounded-xl"
                              disabled={
                                removeMember.isPending
                              }
                              onClick={() =>
                                void handleRemoveMember(
                                  member.membership_id,
                                  member.full_name,
                                )
                              }
                              size="sm"
                              type="button"
                              variant="destructive"
                            >
                              <Trash2 className="mr-2 size-3.5" />

                              Remove
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  },
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>


      {/* =====================================================
          Invitations
          ===================================================== */}
      {canAdministerWorkspace && (
        <Card className="overflow-hidden bg-card/72 py-0">
          <CardHeader className="border-b border-border/50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/8 text-amber-300">
                <MailPlus className="size-[18px]" />
              </div>

              <div>
                <CardTitle>
                  Invitations
                </CardTitle>

                <CardDescription className="mt-1">
                  One-time workspace invitations and their current lifecycle.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {invitationsQuery.isPending ? (
              <div className="p-6 text-sm text-muted-foreground">
                Loading invitations...
              </div>
            ) : invitationsQuery.isError ? (
              <div className="p-6">
                <p className="text-sm font-medium text-destructive">
                  Unable to load invitations.
                </p>

                <Button
                  className="mt-3 rounded-xl"
                  onClick={() => {
                    void invitationsQuery.refetch();
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            ) : invitations.length ===
              0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
                <div className="flex size-11 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/8 text-cyan-300">
                  <MailPlus className="size-4" />
                </div>

                <p className="mt-4 text-sm font-semibold">
                  No invitations yet
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Invite a teammate when you are ready to share this workspace.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/20">
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead>
                        Invitee
                      </TableHead>

                      <TableHead>
                        Role
                      </TableHead>

                      <TableHead>
                        Status
                      </TableHead>

                      <TableHead>
                        Expires
                      </TableHead>

                      <TableHead className="text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {invitations.map(
                      (
                        invitation,
                      ) => (
                        <TableRow
                          className="border-border/45"
                          key={
                            invitation.id
                          }
                        >
                          <TableCell>
                            <p className="font-medium">
                              {
                                invitation.invited_email
                              }
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              Sent{" "}
                              {
                                formatTimestamp(
                                  invitation.created_at,
                                )
                              }
                            </p>
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={
                                roleClasses(
                                  invitation.role,
                                )
                              }
                              variant="outline"
                            >
                              {
                                invitation.role
                              }
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Badge
                              className={
                                invitationClasses(
                                  invitation.status,
                                )
                              }
                              variant="outline"
                            >
                              {
                                invitation.status
                              }
                            </Badge>
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 className="size-3.5" />

                              {
                                formatTimestamp(
                                  invitation.expires_at,
                                )
                              }
                            </span>
                          </TableCell>

                          <TableCell className="text-right">
                            {invitation.status ===
                              "pending" ? (
                              <Button
                                className="rounded-xl"
                                disabled={
                                  revokeInvitation.isPending
                                }
                                onClick={() =>
                                  void handleRevokeInvitation(
                                    invitation.id,
                                  )
                                }
                                size="sm"
                                type="button"
                                variant="destructive"
                              >
                                Revoke
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* =====================================================
          Account danger zone
          ===================================================== */}
      <Card className="overflow-hidden border-rose-400/20 bg-card/72 py-0">
        <CardHeader className="border-b border-rose-400/15 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-400/10 text-rose-300">
              <Trash2 className="size-[18px]" />
            </div>

            <div>
              <CardTitle>
                Danger zone
              </CardTitle>

              <CardDescription className="mt-1">
                Permanent identity and account lifecycle operations.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <div className="flex flex-col gap-4 rounded-xl border border-rose-400/15 bg-rose-400/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold">
                Delete CloudOps account
              </p>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Permanently delete your CloudOps identity. Shared workspace
                data is preserved, last-owner safety is enforced, and personal
                cloud integrations must be removed before deletion.
              </p>
            </div>

            <Button
              className="shrink-0 rounded-xl"
              onClick={() =>
                setDeleteAccountOpen(
                  true,
                )
              }
              type="button"
              variant="destructive"
            >
              <Trash2 className="mr-2 size-4" />

              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>


      <DeleteAccountDialog
        isDeleting={
          isDeletingAccount
        }
        key={
          deleteAccountOpen
            ? "delete-open"
            : "delete-closed"
        }
        onConfirm={
          handleDeleteAccount
        }
        onOpenChange={
          setDeleteAccountOpen
        }
        open={
          deleteAccountOpen
        }
      />


      {canAdministerWorkspace && (
        <InviteMemberDialog
          currentRole={
            organization.current_role
          }
          isInviting={
            createInvitation.isPending
          }
          onInvite={
            handleInvite
          }
          onOpenChange={
            setInviteOpen
          }
          open={
            inviteOpen
          }
        />
      )}
    </section>
  );
}
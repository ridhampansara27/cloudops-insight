import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Building2,
  CircleCheckBig,
  Clock3,
  ImagePlus,
  LoaderCircle,
  MailPlus,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import {
  toast,
} from "sonner";

import {
  DeleteAccountDialog,
} from "@/features/auth/delete-account-dialog";

import {
  ProfileAvatar,
} from "@/features/auth/profile-avatar";

import {
  deleteAccount,
  deleteCurrentUserAvatar,
  uploadCurrentUserAvatar,
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


const MAX_PROFILE_AVATAR_BYTES =
  5 *
  1024 *
  1024;


const PROFILE_AVATAR_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);


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

  const [
    selectedAvatar,
    setSelectedAvatar,
  ] =
    useState<
      File | null
    >(
      null,
    );

  const [
    avatarPreviewUrl,
    setAvatarPreviewUrl,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    isUploadingAvatar,
    setIsUploadingAvatar,
  ] =
    useState(
      false,
    );

  const [
    isRemovingAvatar,
    setIsRemovingAvatar,
  ] =
    useState(
      false,
    );

  const avatarInputRef =
    useRef<
      HTMLInputElement | null
    >(
      null,
    );


  // Release every temporary browser preview URL when it is replaced or when
  // Settings unmounts.
  useEffect(
    () => {
      if (
        !avatarPreviewUrl
      ) {
        return;
      }

      return () => {
        URL.revokeObjectURL(
          avatarPreviewUrl,
        );
      };
    },
    [
      avatarPreviewUrl,
    ],
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


  const authUser =
    useAuthStore(
      (
        state,
      ) =>
        state.user,
    );

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


  const profileInitials =
    profile.full_name
      .split(
        /\s+/,
      )
      .filter(
        Boolean,
      )
      .slice(
        0,
        2,
      )
      .map(
        (
          part,
        ) =>
          part.charAt(
            0,
          ),
      )
      .join("")
      .toUpperCase() ||
    "U";

  const hasAvatar =
    Boolean(
      authUser
        ?.avatar_updated_at,
    );

  const avatarBusy =
    isUploadingAvatar ||
    isRemovingAvatar;


  function clearAvatarSelection() {
    setSelectedAvatar(
      null,
    );

    setAvatarPreviewUrl(
      null,
    );

    if (
      avatarInputRef.current
    ) {
      avatarInputRef.current.value =
        "";
    }
  }


  function handleAvatarSelection(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.currentTarget
        .files?.[0];

    if (!file) {
      return;
    }

    if (
      !PROFILE_AVATAR_TYPES.has(
        file.type,
      )
    ) {
      toast.error(
        "Choose a JPEG, PNG or WebP image.",
      );

      event.currentTarget.value =
        "";

      return;
    }

    if (
      file.size <= 0
    ) {
      toast.error(
        "The selected image is empty.",
      );

      event.currentTarget.value =
        "";

      return;
    }

    if (
      file.size >
      MAX_PROFILE_AVATAR_BYTES
    ) {
      toast.error(
        "Profile photos must be 5 MB or smaller.",
      );

      event.currentTarget.value =
        "";

      return;
    }

    const previewUrl =
      URL.createObjectURL(
        file,
      );

    setSelectedAvatar(
      file,
    );

    setAvatarPreviewUrl(
      previewUrl,
    );
  }


  async function handleAvatarUpload() {
    if (
      !selectedAvatar ||
      isUploadingAvatar
    ) {
      return;
    }

    setIsUploadingAvatar(
      true,
    );

    try {
      const updated =
        await uploadCurrentUserAvatar(
          selectedAvatar,
        );

      // Updating the auth store changes avatar_updated_at, which creates a
      // fresh protected-image query key in the header immediately.
      setAuthUser(
        updated,
      );

      clearAvatarSelection();

      toast.success(
        "Profile photo updated.",
      );

    } catch (error) {
      toast.error(
        readableError(
          error,
          "Unable to update profile photo.",
        ),
      );

    } finally {
      setIsUploadingAvatar(
        false,
      );
    }
  }


  async function handleAvatarRemove() {
    if (
      isRemovingAvatar
    ) {
      return;
    }

    setIsRemovingAvatar(
      true,
    );

    try {
      const updated =
        await deleteCurrentUserAvatar();

      setAuthUser(
        updated,
      );

      clearAvatarSelection();

      toast.success(
        "Profile photo removed.",
      );

    } catch (error) {
      toast.error(
        readableError(
          error,
          "Unable to remove profile photo.",
        ),
      );

    } finally {
      setIsRemovingAvatar(
        false,
      );
    }
  }


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
              <div className="rounded-2xl border border-border/60 bg-background/25 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <ProfileAvatar
                    avatarUpdatedAt={
                      authUser?.avatar_updated_at
                    }
                    className="size-20 border border-primary/25 shadow-lg shadow-primary/5"
                    fallbackClassName="bg-gradient-to-br from-primary/25 to-violet-500/20 text-xl font-semibold text-foreground"
                    initials={
                      profileInitials
                    }
                    srcOverride={
                      avatarPreviewUrl ??
                      undefined
                    }
                    userId={
                      authUser?.id
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      Profile photo
                    </p>

                    <p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">
                      JPEG, PNG or WebP up to 5 MB. CloudOps securely validates,
                      resizes and removes image metadata before storing your
                      profile photo.
                    </p>

                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={
                        avatarBusy
                      }
                      onChange={
                        handleAvatarSelection
                      }
                      ref={
                        avatarInputRef
                      }
                      type="file"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className="rounded-xl"
                        disabled={
                          avatarBusy
                        }
                        onClick={() =>
                          avatarInputRef
                            .current
                            ?.click()
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <ImagePlus className="mr-2 size-4" />

                        {hasAvatar
                          ? "Change photo"
                          : "Choose photo"}
                      </Button>

                      {selectedAvatar && (
                        <Button
                          className="rounded-xl"
                          disabled={
                            avatarBusy
                          }
                          onClick={() =>
                            void handleAvatarUpload()
                          }
                          size="sm"
                          type="button"
                        >
                          {isUploadingAvatar ? (
                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 size-4" />
                          )}

                          {isUploadingAvatar
                            ? "Uploading..."
                            : "Save photo"}
                        </Button>
                      )}

                      {selectedAvatar && (
                        <Button
                          className="rounded-xl"
                          disabled={
                            avatarBusy
                          }
                          onClick={
                            clearAvatarSelection
                          }
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <X className="mr-2 size-4" />

                          Cancel
                        </Button>
                      )}

                      {hasAvatar &&
                        !selectedAvatar && (
                        <Button
                          className="rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          disabled={
                            avatarBusy
                          }
                          onClick={() =>
                            void handleAvatarRemove()
                          }
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          {isRemovingAvatar ? (
                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 size-4" />
                          )}

                          {isRemovingAvatar
                            ? "Removing..."
                            : "Remove photo"}
                        </Button>
                      )}
                    </div>

                    {selectedAvatar && (
                      <p className="mt-3 truncate text-[11px] text-muted-foreground">
                        {
                          selectedAvatar.name
                        }
                        {" - "}
                        {
                          (
                            selectedAvatar.size /
                            1024 /
                            1024
                          ).toFixed(
                            2,
                          )
                        }
                        {" MB selected"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

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
          Workspace access
          ===================================================== */}
      <div
        className={
          canAdministerWorkspace
            ? "grid items-start gap-5 xl:grid-cols-2"
            : "grid gap-5"
        }
      >
        {/* -----------------------------------------------------
            Team members
            ----------------------------------------------------- */}
        <Card className="overflow-hidden bg-card/72 py-0">
          <CardHeader className="border-b border-border/50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/8 text-emerald-300">
                  <Users className="size-[18px]" />
                </div>

                <div className="min-w-0">
                  <CardTitle>
                    Team members
                  </CardTitle>

                  <CardDescription className="mt-1">
                    People with active access to this workspace.
                  </CardDescription>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  className="rounded-full border-border/70 bg-background/35 px-2.5 py-1 text-muted-foreground"
                  variant="outline"
                >
                  {
                    members.length
                  }{" "}
                  {
                    members.length ===
                    1
                      ? "member"
                      : "members"
                  }
                </Badge>

                {canAdministerWorkspace && (
                  <Button
                    className="rounded-xl"
                    onClick={() =>
                      setInviteOpen(
                        true,
                      )
                    }
                    size="sm"
                    type="button"
                  >
                    <MailPlus className="mr-2 size-4" />

                    Invite
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3">
            <div className="cloudops-settings-list max-h-[430px] space-y-2 overflow-y-auto pr-1">
              {members.map(
                (
                  member,
                ) => {
                  const isCurrentUser =
                    member.user_id ===
                    profile.id;

                  return (
                    <div
                      className="rounded-2xl border border-border/55 bg-background/22 p-4 transition-colors hover:border-primary/20 hover:bg-accent/18"
                      key={
                        member.membership_id
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/7 text-primary">
                            <UserRound className="size-[18px]" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold">
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

                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {
                                member.email
                              }
                            </p>
                          </div>
                        </div>

                        {organization.current_role ===
                          "owner" &&
                        !isCurrentUser && (
                          <Button
                            aria-label={`Remove ${member.full_name}`}
                            className="shrink-0 rounded-xl"
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
                            variant="ghost"
                          >
                            <Trash2 className="size-4 text-rose-300" />
                          </Button>
                        )}
                      </div>

                      <div className="mt-4 grid gap-3 border-t border-border/40 pt-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Workspace role
                          </p>

                          <div className="mt-1.5">
                            {organization.current_role ===
                              "owner" &&
                            !isCurrentUser ? (
                              <NativeSelect
                                className="h-8 min-w-28 rounded-lg text-xs"
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
                          </div>
                        </div>

                        <div className="sm:text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Joined
                          </p>

                          <p className="mt-2 text-xs text-foreground/80">
                            {
                              formatTimestamp(
                                member.joined_at,
                              )
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </CardContent>
        </Card>


        {/* -----------------------------------------------------
            Invitations
            ----------------------------------------------------- */}
        {canAdministerWorkspace && (
          <Card className="overflow-hidden bg-card/72 py-0">
            <CardHeader className="border-b border-border/50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/8 text-amber-300">
                    <MailPlus className="size-[18px]" />
                  </div>

                  <div className="min-w-0">
                    <CardTitle>
                      Invitations
                    </CardTitle>

                    <CardDescription className="mt-1">
                      Pending and historical workspace invitations.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    className="rounded-full border-amber-400/20 bg-amber-400/7 px-2.5 py-1 text-amber-300"
                    variant="outline"
                  >
                    {
                      pendingInvitations.length
                    }{" "}
                    pending
                  </Badge>

                  <Badge
                    className="rounded-full border-border/70 bg-background/35 px-2.5 py-1 text-muted-foreground"
                    variant="outline"
                  >
                    {
                      invitations.length
                    }{" "}
                    total
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-3">
              {invitationsQuery.isPending ? (
                <div className="rounded-2xl border border-border/50 bg-background/20 p-5 text-sm text-muted-foreground">
                  Loading invitations...
                </div>
              ) : invitationsQuery.isError ? (
                <div className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.035] p-5">
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
                <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border/65 bg-background/18 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/8 text-cyan-300">
                      <MailPlus className="size-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        No invitations yet
                      </p>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Invite a teammate when you are ready to share this workspace.
                      </p>
                    </div>
                  </div>

                  <Button
                    className="shrink-0 rounded-xl"
                    onClick={() =>
                      setInviteOpen(
                        true,
                      )
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <MailPlus className="mr-2 size-3.5" />

                    Invite teammate
                  </Button>
                </div>
              ) : (
                <div className="cloudops-settings-list max-h-[430px] space-y-2 overflow-y-auto pr-1">
                  {invitations.map(
                    (
                      invitation,
                    ) => (
                      <div
                        className="rounded-2xl border border-border/55 bg-background/22 p-4 transition-colors hover:border-primary/20 hover:bg-accent/18"
                        key={
                          invitation.id
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
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
                          </div>

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
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/40 pt-3">
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

                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock3 className="size-3.5" />

                            Expires{" "}
                            {
                              formatTimestamp(
                                invitation.expires_at,
                              )
                            }
                          </span>

                          {invitation.status ===
                            "pending" && (
                            <Button
                              className="ml-auto rounded-xl"
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
                              variant="ghost"
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>


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
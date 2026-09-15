import {
  type FormEvent,
  useState,
} from "react";

import {
  MailPlus,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Input,
} from "@/components/ui/input";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import type {
  WorkspaceRole,
} from "@/features/workspace/workspace-types";


interface InviteMemberDialogProps {
  open: boolean;

  currentRole:
    WorkspaceRole;

  isInviting: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  onInvite: (
    input: {
      email: string;

      role:
        WorkspaceRole;
    },
  ) => Promise<void>;
}


export function InviteMemberDialog({
  open,
  currentRole,
  isInviting,
  onOpenChange,
  onInvite,
}: InviteMemberDialogProps) {
  const [
    formError,
    setFormError,
  ] =
    useState<
      string | null
    >(null);


  function handleOpenChange(
    nextOpen: boolean,
  ) {
    if (!nextOpen) {
      setFormError(
        null,
      );
    }

    onOpenChange(
      nextOpen,
    );
  }


  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isInviting) {
      return;
    }

    setFormError(
      null,
    );

    const formData =
      new FormData(
        event.currentTarget,
      );

    const email =
      String(
        formData.get(
          "email",
        ) ??
        "",
      )
        .trim()
        .toLowerCase();

    const role =
      String(
        formData.get(
          "role",
        ) ??
        "member",
      ) as WorkspaceRole;


    if (
      !email ||
      !email.includes(
        "@",
      )
    ) {
      setFormError(
        "Enter a valid email address.",
      );

      return;
    }


    if (
      currentRole ===
        "admin" &&
      role ===
        "owner"
    ) {
      setFormError(
        "Administrators cannot grant the owner role.",
      );

      return;
    }


    try {
      await onInvite({
        email,
        role,
      });

      handleOpenChange(
        false,
      );

    } catch {
      setFormError(
        "CloudOps could not send this invitation. Review the address and role, then try again.",
      );
    }
  }


  return (
    <Dialog
      onOpenChange={
        handleOpenChange
      }
      open={
        open
      }
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden border-border/70 bg-card/95 p-0 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:max-w-xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-28 size-64 rounded-full bg-cyan-400/8 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 size-64 rounded-full bg-violet-500/8 blur-3xl"
        />

        <DialogHeader className="relative border-b border-border/50 px-5 py-4 text-left sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/8 text-cyan-300">
              <MailPlus className="size-[18px]" />
            </div>

            <div>
              <DialogTitle>
                Invite workspace member
              </DialogTitle>

              <DialogDescription className="mt-1 leading-relaxed">
                CloudOps sends a one-time, expiring invitation link.
                The invitation never exposes its bearer through this dashboard.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className="relative flex min-h-0 flex-1 flex-col"
          key={
            open
              ? "invite-open"
              : "invite-closed"
          }
          onSubmit={
            handleSubmit
          }
        >
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="rounded-xl border border-border/55 bg-background/20 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Users className="size-4 text-primary" />

                <p className="text-sm font-semibold">
                  Member identity
                </p>
              </div>

              <div className="space-y-2">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="workspace-invite-email"
                >
                  Email address
                </label>

                <Input
                  autoComplete="email"
                  className="rounded-xl bg-background/30"
                  disabled={
                    isInviting
                  }
                  id="workspace-invite-email"
                  name="email"
                  placeholder="engineer@example.com"
                  required
                  type="email"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/55 bg-background/20 p-4">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="size-4 text-violet-300" />

                <p className="text-sm font-semibold">
                  Workspace permission
                </p>
              </div>

              <div className="space-y-2">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="workspace-invite-role"
                >
                  Role
                </label>

                <NativeSelect
                  defaultValue="member"
                  disabled={
                    isInviting
                  }
                  id="workspace-invite-role"
                  name="role"
                >
                  {currentRole ===
                    "owner" && (
                    <NativeSelectOption value="owner">
                      Owner
                    </NativeSelectOption>
                  )}

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

                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Owners control membership roles. Admins can manage
                  invitations and workspace metadata but cannot grant ownership.
                </p>
              </div>
            </div>

            {formError && (
              <div
                className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                {
                  formError
                }
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border/50 bg-background/75 px-5 py-3.5 backdrop-blur-xl sm:px-6">
            <Button
              className="rounded-xl"
              disabled={
                isInviting
              }
              onClick={() =>
                handleOpenChange(
                  false,
                )
              }
              type="button"
              variant="outline"
            >
              Cancel
            </Button>

            <Button
              className="rounded-xl"
              disabled={
                isInviting
              }
              type="submit"
            >
              <MailPlus className="mr-2 size-4" />

              {isInviting
                ? "Sending..."
                : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
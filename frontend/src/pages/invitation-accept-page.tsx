import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  Building2,
  CircleCheckBig,
  KeyRound,
  Link2Off,
  ShieldCheck,
} from "lucide-react";

import {
  useAcceptWorkspaceInvitation,
} from "@/features/workspace/api/workspace-api";

import type {
  WorkspaceInvitationAcceptance,
} from "@/features/workspace/workspace-types";

import {
  AuthShell,
} from "@/features/auth/auth-shell";

import {
  ApiError,
} from "@/lib/api-error";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";


export function InvitationAcceptPage() {
  const [
    token,
  ] = useState(
    () => {
      const fragment =
        new URLSearchParams(
          window.location.hash.slice(
            1,
          ),
        );

      return fragment.get(
        "token",
      );
    },
  );


  const [
    fullName,
    setFullName,
  ] =
    useState(
      "",
    );


  const [
    password,
    setPassword,
  ] =
    useState(
      "",
    );


  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState(
      "",
    );


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);


  const [
    accepted,
    setAccepted,
  ] =
    useState<
      WorkspaceInvitationAcceptance | null
    >(null);


  const acceptInvitation =
    useAcceptWorkspaceInvitation();


  // Remove the bearer from the browser-visible URL as soon as the page
  // has captured it into React memory.
  useEffect(
    () => {
      if (!token) {
        return;
      }

      window.history.replaceState(
        null,
        "",
        "/invitations/accept",
      );
    },
    [
      token,
    ],
  );


  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage(
      null,
    );


    if (!token) {
      setErrorMessage(
        "This invitation link is incomplete.",
      );

      return;
    }


    if (
      fullName.trim().length <
      2
    ) {
      setErrorMessage(
        "Enter your full name.",
      );

      return;
    }


    if (
      password.length <
      12
    ) {
      setErrorMessage(
        "Use at least 12 characters for your password.",
      );

      return;
    }


    if (
      password !==
      confirmPassword
    ) {
      setErrorMessage(
        "Passwords do not match.",
      );

      return;
    }


    try {
      const result =
        await acceptInvitation.mutateAsync({
          token,

          full_name:
            fullName.trim(),

          password,
        });

      setAccepted(
        result,
      );

    } catch (error) {
      if (
        error instanceof ApiError
      ) {
        setErrorMessage(
          error.message,
        );

      } else {
        setErrorMessage(
          "This invitation could not be accepted.",
        );
      }
    }
  }


  if (!token) {
    return (
      <AuthShell
        description="This workspace invitation is incomplete and cannot be validated."
        eyebrow="Invitation problem"
        title="Invitation unavailable"
      >
        <div
          className="rounded-2xl border border-destructive/25 bg-destructive/[0.07] p-5"
          role="alert"
        >
          <div className="flex size-11 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
            <Link2Off className="size-5" />
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Ask the workspace owner or administrator to send a new invitation.
          </p>
        </div>

        <Link
          className="mt-6 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-border/60 px-4 text-sm font-medium transition-colors hover:bg-accent"
          to="/login"
        >
          Back to sign in
        </Link>
      </AuthShell>
    );
  }


  if (accepted) {
    return (
      <AuthShell
        description="Your membership is ready. Sign in to enter the selected CloudOps workspace."
        eyebrow="Invitation accepted"
        title="Workspace access granted"
      >
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.055] p-5">
          <div className="flex size-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300">
            <CircleCheckBig className="size-5" />
          </div>

          <p className="mt-4 text-sm font-semibold">
            {
              accepted.organization_name
            }
          </p>

          <div className="mt-4 grid gap-2 rounded-xl border border-border/50 bg-background/25 p-4 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                Email
              </span>

              <span className="truncate font-medium">
                {
                  accepted.email
                }
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                Workspace role
              </span>

              <span className="font-medium capitalize">
                {
                  accepted.role
                }
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                Account
              </span>

              <span className="font-medium">
                {accepted.account_created
                  ? "Created"
                  : "Existing account linked"}
              </span>
            </div>
          </div>
        </div>

        <Link
          className="mt-6 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          to="/login"
        >
          Continue to sign in
        </Link>
      </AuthShell>
    );
  }


  return (
    <AuthShell
      description="Accept the invitation to join a tenant-isolated CloudOps workspace."
      eyebrow="Workspace invitation"
      title="Join your team"
    >
      <div className="mb-6 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.045] p-4">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 size-4 shrink-0 text-cyan-300" />

          <div>
            <p className="text-sm font-semibold">
              Secure invitation acceptance
            </p>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              If you already have a CloudOps account, enter your existing
              password. If this is your first CloudOps workspace, this password
              creates your account.
            </p>
          </div>
        </div>
      </div>

      <form
        className="space-y-5"
        onSubmit={
          handleSubmit
        }
      >
        <div className="space-y-2">
          <label
            className="text-sm font-medium"
            htmlFor="invitation-full-name"
          >
            Full name
          </label>

          <Input
            autoComplete="name"
            id="invitation-full-name"
            minLength={
              2
            }
            onChange={(
              event,
            ) =>
              setFullName(
                event.target
                  .value,
              )
            }
            required
            value={
              fullName
            }
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium"
            htmlFor="invitation-password"
          >
            Password
          </label>

          <Input
            autoComplete="current-password"
            id="invitation-password"
            minLength={
              12
            }
            onChange={(
              event,
            ) =>
              setPassword(
                event.target
                  .value,
              )
            }
            required
            type="password"
            value={
              password
            }
          />

          <p className="text-xs leading-5 text-muted-foreground">
            Use your current CloudOps password if you already have an account.
          </p>
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium"
            htmlFor="invitation-confirm-password"
          >
            Confirm password
          </label>

          <Input
            autoComplete="current-password"
            id="invitation-confirm-password"
            minLength={
              12
            }
            onChange={(
              event,
            ) =>
              setConfirmPassword(
                event.target
                  .value,
              )
            }
            required
            type="password"
            value={
              confirmPassword
            }
          />
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-violet-400/15 bg-violet-400/[0.045] p-3.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-violet-300" />

          <p className="text-xs leading-relaxed text-muted-foreground">
            The invitation token has already been removed from the visible URL
            and remains only in this page's in-memory state.
          </p>
        </div>

        {errorMessage && (
          <div
            aria-live="polite"
            className="rounded-xl border border-destructive/25 bg-destructive/10 p-3.5 text-sm text-destructive"
            role="alert"
          >
            {
              errorMessage
            }
          </div>
        )}

        <Button
          className="w-full rounded-xl"
          disabled={
            acceptInvitation.isPending
          }
          type="submit"
        >
          <KeyRound className="mr-2 size-4" />

          {acceptInvitation.isPending
            ? "Accepting invitation..."
            : "Accept invitation"}
        </Button>
      </form>

      <div className="mt-7 border-t border-border/50 pt-6">
        <Link
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          to="/login"
        >
          Already joined? Sign in
        </Link>
      </div>
    </AuthShell>
  );
}
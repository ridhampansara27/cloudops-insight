import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  ArrowLeft,
  CircleCheckBig,
  KeyRound,
  Link2Off,
} from "lucide-react";

import {
  resetPassword,
} from "@/features/auth/api/auth-api";

import {
  AuthShell,
} from "@/features/auth/auth-shell";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  ApiError,
} from "@/lib/api-error";


export function ResetPasswordPage() {
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
    password,
    setPassword,
  ] = useState(
    "",
  );

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState(
    "",
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(
    null,
  );

  const [
    resetComplete,
    setResetComplete,
  ] = useState(
    false,
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(
    false,
  );


  useEffect(
    () => {
      if (!token) {
        return;
      }

      window.history.replaceState(
        null,
        "",
        "/reset-password",
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
        "This password reset link is incomplete.",
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

    if (
      password.length <
      12
    ) {
      setErrorMessage(
        "Use at least 12 characters for your new password.",
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      await resetPassword(
        token,
        password,
      );

      setResetComplete(
        true,
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
          "Unable to reset the password right now.",
        );
      }

    } finally {
      setIsSubmitting(
        false,
      );
    }
  }


  if (resetComplete) {
    return (
      <AuthShell
        description="Your previous password and authentication sessions are no longer valid."
        eyebrow="Password updated"
        title="Password reset complete"
      >
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.055] p-5">
          <div className="flex size-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300">
            <CircleCheckBig className="size-5" />
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Sign in again using your new password.
          </p>
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


  if (!token) {
    return (
      <AuthShell
        description="The reset link is incomplete, expired from the browser address, or no longer contains its one-time token."
        eyebrow="Password recovery"
        title="Reset link unavailable"
      >
        <div
          className="rounded-2xl border border-destructive/25 bg-destructive/[0.07] p-5"
          role="alert"
        >
          <div className="flex size-11 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
            <Link2Off className="size-5" />
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Request a new password reset link to continue.
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            to="/forgot-password"
          >
            Request a new reset link
          </Link>

          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border/60 px-4 text-sm font-medium transition-colors hover:bg-accent"
            to="/login"
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }


  return (
    <AuthShell
      description="Choose a new password for your CloudOps Insight account."
      eyebrow="Secure recovery"
      title="Set a new password"
    >
      <form
        className="space-y-5"
        onSubmit={
          handleSubmit
        }
      >
        <div className="space-y-2">
          <label
            className="text-sm font-medium"
            htmlFor="new-password"
          >
            New password
          </label>

          <Input
            autoComplete="new-password"
            id="new-password"
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
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium"
            htmlFor="confirm-password"
          >
            Confirm new password
          </label>

          <Input
            autoComplete="new-password"
            id="confirm-password"
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

        <p className="text-xs leading-5 text-muted-foreground">
          Use at least 12 characters. Completing the reset invalidates
          older authentication credentials for this account.
        </p>

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
            isSubmitting
          }
          type="submit"
        >
          <KeyRound className="mr-2 size-4" />

          {isSubmitting
            ? "Updating password..."
            : "Set new password"}
        </Button>
      </form>

      <div className="mt-7 border-t border-border/50 pt-6">
        <Link
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          to="/forgot-password"
        >
          <ArrowLeft className="size-3.5" />

          Request another reset link
        </Link>
      </div>
    </AuthShell>
  );
}
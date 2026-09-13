import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import {
  CircleCheckBig,
  CircleX,
  LoaderCircle,
  MailWarning,
} from "lucide-react";

import {
  verifyEmail,
} from "@/features/auth/api/auth-api";

import {
  AuthShell,
} from "@/features/auth/auth-shell";

import {
  ApiError,
} from "@/lib/api-error";


type VerificationState =
  | "verifying"
  | "verified"
  | "failed";


export function VerifyEmailPage() {
  const [
    searchParams,
  ] = useSearchParams();

  const token =
    searchParams.get(
      "token",
    );

  const [
    state,
    setState,
  ] = useState<VerificationState>(
    "verifying",
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState(
    "Verification link is invalid or expired.",
  );

  // React development StrictMode may mount effects twice.
  // Never consume a one-time verification bearer twice.
  const started =
    useRef(
      false,
    );


  useEffect(
    () => {
      if (
        started.current
      ) {
        return;
      }

      started.current =
        true;

      if (!token) {
        return;
      }

      async function verify() {
        try {
          await verifyEmail(
            token as string,
          );

          setState(
            "verified",
          );

        } catch (error) {
          setState(
            "failed",
          );

          if (
            error instanceof ApiError
          ) {
            setErrorMessage(
              error.message,
            );
          }
        }
      }

      void verify();
    },
    [
      token,
    ],
  );


  if (!token) {
    return (
      <AuthShell
        description="This verification link is incomplete and cannot be validated."
        eyebrow="Verification problem"
        title="Unable to verify email"
      >
        <div
          className="rounded-2xl border border-destructive/25 bg-destructive/[0.07] p-5"
          role="alert"
        >
          <div className="flex size-11 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
            <CircleX className="size-5" />
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            This verification link does not contain a token.
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            to="/resend-verification"
          >
            <MailWarning className="mr-2 size-4" />

            Request a new link
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


  if (
    state ===
    "verifying"
  ) {
    return (
      <AuthShell
        description="CloudOps is validating this one-time verification link."
        eyebrow="Email verification"
        title="Verifying your email"
      >
        <div
          aria-live="polite"
          className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.045] p-5"
          role="status"
        >
          <LoaderCircle className="size-5 animate-spin text-cyan-300" />

          <p className="text-sm text-muted-foreground">
            Checking verification token...
          </p>
        </div>
      </AuthShell>
    );
  }


  if (
    state ===
    "verified"
  ) {
    return (
      <AuthShell
        description="Your email ownership has been confirmed. You can now authenticate to your CloudOps workspace."
        eyebrow="Verification complete"
        title="Email verified"
      >
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.055] p-5">
          <div className="flex size-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300">
            <CircleCheckBig className="size-5" />
          </div>

          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Your account is ready for sign in.
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


  return (
    <AuthShell
      description="The link may have expired, already been used, or been replaced by a newer verification email."
      eyebrow="Verification problem"
      title="Unable to verify email"
    >
      <div
        className="rounded-2xl border border-destructive/25 bg-destructive/[0.07] p-5"
        role="alert"
      >
        <div className="flex size-11 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive">
          <CircleX className="size-5" />
        </div>

        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {
            errorMessage
          }
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          to="/resend-verification"
        >
          <MailWarning className="mr-2 size-4" />

          Request a new link
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
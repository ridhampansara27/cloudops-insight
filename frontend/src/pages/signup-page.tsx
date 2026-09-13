import {
  type FormEvent,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  ArrowLeft,
  MailCheck,
  UserRoundPlus,
} from "lucide-react";

import {
  signup,
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


export function SignupPage() {
  const [
    fullName,
    setFullName,
  ] = useState(
    "",
  );

  const [
    organizationName,
    setOrganizationName,
  ] = useState(
    "",
  );

  const [
    email,
    setEmail,
  ] = useState(
    "",
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
    submitted,
    setSubmitted,
  ] = useState(
    false,
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(
    false,
  );


  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage(
      null,
    );

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
        "Use at least 12 characters for your password.",
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      await signup({
        email,
        full_name:
          fullName,
        organization_name:
          organizationName,
        password,
      });

      // Always show the same next step. The backend intentionally does
      // not reveal whether the address was new or already registered.
      setSubmitted(
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
          "Unable to create an account right now.",
        );
      }

    } finally {
      setIsSubmitting(
        false,
      );
    }
  }


  if (submitted) {
    return (
      <AuthShell
        description="For privacy, CloudOps shows the same next step whether the address was newly registered or already known."
        eyebrow="Check your inbox"
        title="Verify your email"
      >
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.045] p-5">
          <div className="flex size-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300">
            <MailCheck className="size-5" />
          </div>

          <p className="mt-4 text-sm font-medium">
            Verification requested
          </p>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            If this email can be registered, a verification message will
            arrive at{" "}
            <span className="font-medium text-foreground">
              {email}
            </span>
            .
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            to="/login"
          >
            Go to sign in
          </Link>

          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border/60 px-4 text-sm font-medium transition-colors hover:bg-accent"
            to="/resend-verification"
          >
            Resend verification
          </Link>
        </div>
      </AuthShell>
    );
  }


  return (
    <AuthShell
      description="Create your organization workspace. You will become its first owner after verifying your email."
      eyebrow="Create workspace"
      title="Start with CloudOps Insight"
    >
      <form
        className="space-y-4"
        onSubmit={
          handleSubmit
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="full-name"
            >
              Your name
            </label>

            <Input
              autoComplete="name"
              id="full-name"
              maxLength={
                160
              }
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
              htmlFor="organization"
            >
              Organization
            </label>

            <Input
              autoComplete="organization"
              id="organization"
              maxLength={
                160
              }
              minLength={
                2
              }
              onChange={(
                event,
              ) =>
                setOrganizationName(
                  event.target
                    .value,
                )
              }
              required
              value={
                organizationName
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium"
            htmlFor="email"
          >
            Work email
          </label>

          <Input
            autoComplete="email"
            id="email"
            onChange={(
              event,
            ) =>
              setEmail(
                event.target
                  .value,
              )
            }
            placeholder="you@company.com"
            required
            type="email"
            value={
              email
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="password"
            >
              Password
            </label>

            <Input
              autoComplete="new-password"
              id="password"
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
              Confirm password
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
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          Use at least 12 characters. CloudOps stores only a secure
          password hash.
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
          <UserRoundPlus className="mr-2 size-4" />

          {isSubmitting
            ? "Creating workspace..."
            : "Create workspace"}
        </Button>
      </form>

      <div className="mt-7 border-t border-border/50 pt-6">
        <Link
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          to="/login"
        >
          <ArrowLeft className="size-3.5" />

          Already have an account? Sign in
        </Link>
      </div>
    </AuthShell>
  );
}
import {
  type FormEvent,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  ArrowLeft,
  Eye,
  EyeOff,
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
  PasswordRequirements,
} from "@/features/auth/password-requirements";
import {
  isStrongNewPassword,
} from "@/features/auth/password-policy";

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
    showPassword,
    setShowPassword,
  ] = useState(
    false,
  );

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(
    false,
  );

  const [
    acceptedLegal,
    setAcceptedLegal,
  ] = useState(
    false,
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

    const normalizedFullName =
      fullName.trim();

    const normalizedOrganizationName =
      organizationName.trim();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      normalizedFullName.length <
      2
    ) {
      setErrorMessage(
        "Enter your full name.",
      );

      return;
    }

    if (
      normalizedOrganizationName.length <
      2
    ) {
      setErrorMessage(
        "Enter a valid workspace name.",
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
      !isStrongNewPassword(
        password,
      )
    ) {
      setErrorMessage(
        "Password must satisfy all security requirements below.",
      );

      return;
    }

    if (!acceptedLegal) {
      setErrorMessage(
        "Agree to the Terms of Use and acknowledge the Privacy Policy to continue.",
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      await signup({
        email:
          normalizedEmail,
        full_name:
          normalizedFullName,
        organization_name:
          normalizedOrganizationName,
        password,
      });

      setEmail(
        normalizedEmail,
      );

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
      description="Create your account and a workspace for yourself, a personal project, a team, or a company. You will become its first owner after verifying your email."
      eyebrow="Create account"
      title="Start with CloudOps Insight"
    >
      <form
        aria-busy={
          isSubmitting
        }
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
              Workspace name
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
            Email address
          </label>

          <Input
            autoCapitalize="none"
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
            placeholder="you@example.com"
            required
            spellCheck={
              false
            }
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

            <div className="relative">
              <Input
                autoComplete="new-password"
                className="pr-11"
                id="password"
                maxLength={
                  128
                }
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
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  password
                }
              />

              <button
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                aria-pressed={
                  showPassword
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current,
                  )
                }
                type="button"
              >
                {showPassword
                  ? (
                      <EyeOff className="size-4" />
                    )
                  : (
                      <Eye className="size-4" />
                    )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor="confirm-password"
            >
              Confirm password
            </label>

            <div className="relative">
              <Input
                autoComplete="new-password"
                className="pr-11"
                id="confirm-password"
                maxLength={
                  128
                }
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
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={
                  confirmPassword
                }
              />

              <button
                aria-label={
                  showConfirmPassword
                    ? "Hide confirmation password"
                    : "Show confirmation password"
                }
                aria-pressed={
                  showConfirmPassword
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) =>
                      !current,
                  )
                }
                type="button"
              >
                {showConfirmPassword
                  ? (
                      <EyeOff className="size-4" />
                    )
                  : (
                      <Eye className="size-4" />
                    )}
              </button>
            </div>
          </div>
        </div>

        <PasswordRequirements
          password={
            password
          }
        />

        <label
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-card/20 p-3.5 transition-colors hover:border-border"
          htmlFor="legal-acceptance"
        >
          <input
            checked={
              acceptedLegal
            }
            className="mt-0.5 size-4 shrink-0 accent-cyan-400"
            id="legal-acceptance"
            onChange={(
              event,
            ) =>
              setAcceptedLegal(
                event.target
                  .checked,
              )
            }
            required
            type="checkbox"
          />

          <span className="text-xs leading-5 text-muted-foreground">
            I agree to the{" "}
            <Link
              className="font-medium text-cyan-300 transition-colors hover:text-cyan-200"
              to="/terms"
            >
              Terms of Use
            </Link>
            {" "}and acknowledge the{" "}
            <Link
              className="font-medium text-cyan-300 transition-colors hover:text-cyan-200"
              to="/privacy"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>

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
            isSubmitting ||
            !acceptedLegal ||
            !isStrongNewPassword(
              password,
            ) ||
            password !==
              confirmPassword
          }
          type="submit"
        >
          <UserRoundPlus className="mr-2 size-4" />

          {isSubmitting
            ? "Creating account..."
            : "Create account"}
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
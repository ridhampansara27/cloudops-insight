import {
  type FormEvent,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  ArrowLeft,
  MailPlus,
} from "lucide-react";

import {
  forgotPassword,
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


export function ForgotPasswordPage() {
  const [
    email,
    setEmail,
  ] = useState(
    "",
  );

  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(
    null,
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

    setMessage(
      null,
    );

    setErrorMessage(
      null,
    );

    setIsSubmitting(
      true,
    );

    try {
      const response =
        await forgotPassword(
          email,
        );

      // Keep the backend's deliberately generic response.
      // Never reveal whether this email belongs to an account.
      setMessage(
        response.message,
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
          "Unable to request password recovery right now.",
        );
      }

    } finally {
      setIsSubmitting(
        false,
      );
    }
  }


  return (
    <AuthShell
      description="Enter your email address and, if an eligible account exists, CloudOps will send a one-time password reset link."
      eyebrow="Account recovery"
      title="Reset your password"
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
            htmlFor="email"
          >
            Email address
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

        <p className="text-xs leading-5 text-muted-foreground">
          For privacy, CloudOps gives the same response whether or not
          an account exists for this address.
        </p>

        {message && (
          <div
            aria-live="polite"
            className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3.5 text-sm leading-6 text-emerald-200"
            role="status"
          >
            {
              message
            }
          </div>
        )}

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
          <MailPlus className="mr-2 size-4" />

          {isSubmitting
            ? "Requesting reset..."
            : "Send reset link"}
        </Button>
      </form>

      <div className="mt-7 border-t border-border/50 pt-6">
        <Link
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          to="/login"
        >
          <ArrowLeft className="size-3.5" />

          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
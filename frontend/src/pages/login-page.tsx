import {
  type FormEvent,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ArrowRight,
  LockKeyhole,
} from "lucide-react";

import {
  getCurrentUser,
  login,
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

import {
  useAuthStore,
} from "@/stores/auth-store";


interface LoginLocationState {
  from?: {
    pathname?: string;
  };
}


export function LoginPage() {
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

  const setAccessToken =
    useAuthStore(
      (state) =>
        state.setAccessToken,
    );

  const setUser =
    useAuthStore(
      (state) =>
        state.setUser,
    );

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const locationState =
    location.state as
      | LoginLocationState
      | null;


  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessage(
      null,
    );

    setIsSubmitting(
      true,
    );

    try {
      const loginResponse =
        await login({
          email,
          password,
        });

      setAccessToken(
        loginResponse.access_token,
      );

      const currentUser =
        await getCurrentUser();

      setUser(
        currentUser,
      );

      const destination =
        locationState?.from
          ?.pathname ??
        "/";

      navigate(
        destination,
        {
          replace: true,
        },
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
          "Unable to connect to CloudOps Insight.",
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
      description="Access your cloud operations workspace."
      eyebrow="Secure access"
      title="Welcome back"
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
            autoComplete="username"
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

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <label
              className="text-sm font-medium"
              htmlFor="password"
            >
              Password
            </label>

            <Link
              className="text-xs font-medium text-cyan-300 transition-colors hover:text-cyan-200"
              to="/forgot-password"
            >
              Forgot password?
            </Link>
          </div>

          <Input
            autoComplete="current-password"
            id="password"
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
          <LockKeyhole className="mr-2 size-4" />

          {isSubmitting
            ? "Signing in..."
            : "Sign in"}
        </Button>
      </form>

      <div className="mt-7 space-y-3 border-t border-border/50 pt-6 text-sm">
        <p className="text-muted-foreground">
          New to CloudOps Insight?{" "}
          <Link
            className="font-medium text-cyan-300 transition-colors hover:text-cyan-200"
            to="/signup"
          >
            Create an account
          </Link>
        </p>

        <Link
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          to="/resend-verification"
        >
          Resend verification email

          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </AuthShell>
  );
}
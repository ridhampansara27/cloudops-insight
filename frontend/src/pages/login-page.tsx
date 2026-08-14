// Import React form typing and state.
import {
  type FormEvent,
  useState,
} from "react";

// Import navigation helpers.
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

// Import CloudOps icon.
import {
  CloudCog,
} from "lucide-react";

// Import authentication API functions.
import {
  getCurrentUser,
  login,
} from "@/features/auth/api/auth-api";

// Import reusable UI components.
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

// Import API-error handling.
import {
  ApiError,
} from "@/lib/api-error";

// Import authentication state.
import {
  useAuthStore,
} from "@/stores/auth-store";

// Define redirect-state structure.
interface LoginLocationState {
  // Store the protected page the user originally requested.
  from?: {
    pathname?: string;
  };
}

// Export the login screen.
export function LoginPage() {
  // Store the entered email address.
  const [email, setEmail] =
    useState("");

  // Store the entered password.
  const [
    password,
    setPassword,
  ] = useState("");

  // Store the login error.
  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  // Store submission state.
  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  // Read authentication actions.
  const setAccessToken =
    useAuthStore(
      (state) =>
        state.setAccessToken,
    );

  // Read the authenticated user setter.
  const setUser =
    useAuthStore(
      (state) =>
        state.setUser,
    );

  // Get React Router navigation.
  const navigate =
    useNavigate();

  // Read navigation state.
  const location =
    useLocation();

  // Cast route state to our expected structure.
  const locationState =
    location.state as
      | LoginLocationState
      | null;

  // Handle login submission.
  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    // Prevent full browser navigation.
    event.preventDefault();

    // Clear any previous error.
    setErrorMessage(
      null,
    );

    // Disable repeated submissions.
    setIsSubmitting(
      true,
    );

    try {
      // Authenticate with FastAPI.
      const loginResponse =
        await login({
          email,
          password,
        });

      // Store the returned JWT.
      setAccessToken(
        loginResponse.access_token,
      );

      // Request the user profile using the new token.
      const currentUser =
        await getCurrentUser();

      // Save current-user information.
      setUser(
        currentUser,
      );

      // Determine where to navigate after login.
      const destination =
        locationState?.from
          ?.pathname ??
        "/";

      // Navigate away from the login page.
      navigate(
        destination,
        {
          replace: true,
        },
      );
    } catch (error) {
      // Handle expected FastAPI errors.
      if (
        error instanceof ApiError
      ) {
        // Show the backend-safe error message.
        setErrorMessage(
          error.message,
        );
      } else {
        // Handle unexpected frontend/network errors.
        setErrorMessage(
          "Unable to connect to CloudOps Insight.",
        );
      }
    } finally {
      // Re-enable the form.
      setIsSubmitting(
        false,
      );
    }
  }

  // Render the authentication page.
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CloudCog className="size-6" />
          </div>

          <CardTitle className="text-2xl">
            CloudOps Insight
          </CardTitle>

          <CardDescription>
            Sign in to your cloud operations dashboard.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            className="space-y-4"
            onSubmit={
              handleSubmit
            }
          >
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium"
              >
                Email
              </label>

              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(
                  event,
                ) =>
                  setEmail(
                    event.target
                      .value,
                  )
                }
                placeholder="admin@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium"
              >
                Password
              </label>

              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={
                  password
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
              />
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {
                  errorMessage
                }
              </div>
            )}

            <Button
              className="w-full"
              type="submit"
              disabled={
                isSubmitting
              }
            >
              {isSubmitting
                ? "Signing in..."
                : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            CloudOps Insight development environment
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
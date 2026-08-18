// Import React's node type.
import type {
  ReactNode,
} from "react";

// Import React Router helpers.
import {
  Navigate,
  useLocation,
} from "react-router-dom";

// Import authentication state.
import {
  useAuthStore,
} from "@/stores/auth-store";

// Define protected-route properties.
interface ProtectedRouteProps {
  // Receive the protected application tree.
  children: ReactNode;
}

// Protect authenticated application routes.
export function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  // Read the current bearer token.
  const accessToken =
    useAuthStore(
      (state) =>
        state.accessToken,
    );

  // Read the current route.
  const location =
    useLocation();

  // Redirect unauthenticated users.
  if (!accessToken) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  // Render authenticated content.
  return children;
}
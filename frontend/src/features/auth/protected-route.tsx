import {
  type ReactNode,
  useEffect,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  getCurrentUser,
} from "@/features/auth/api/auth-api";

import {
  refreshAuthenticationSession,
} from "@/lib/api-client";

import {
  useAuthStore,
} from "@/stores/auth-store";

import type {
  AuthenticatedUser,
} from "@/types/auth";


interface ProtectedRouteProps {
  children:
    ReactNode;
}


interface RestoredSession {
  accessToken:
    string;

  user:
    AuthenticatedUser;
}


// Keep the browser-startup restoration single-flight as well.
//
// React development StrictMode may mount effects twice. Reusing this
// promise prevents two sequential refresh-token rotations during startup.
let sessionBootstrapPromise:
  | Promise<
      RestoredSession | null
    >
  | null =
    null;


function restoreBrowserSession():
Promise<
  RestoredSession | null
> {
  if (
    sessionBootstrapPromise ===
    null
  ) {
    sessionBootstrapPromise =
      (
        async () => {
          const accessToken =
            await refreshAuthenticationSession();

          if (!accessToken) {
            return null;
          }

          const user =
            await getCurrentUser();

          return {
            accessToken,
            user,
          };
        }
      )().catch(
        () => null,
      );
  }

  return sessionBootstrapPromise;
}


export function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const accessToken =
    useAuthStore(
      (
        state,
      ) =>
        state.accessToken,
    );

  const user =
    useAuthStore(
      (
        state,
      ) =>
        state.user,
    );

  const sessionStatus =
    useAuthStore(
      (
        state,
      ) =>
        state.sessionStatus,
    );

  const setAccessToken =
    useAuthStore(
      (
        state,
      ) =>
        state.setAccessToken,
    );

  const setUser =
    useAuthStore(
      (
        state,
      ) =>
        state.setUser,
    );

  const setSessionStatus =
    useAuthStore(
      (
        state,
      ) =>
        state.setSessionStatus,
    );

  const logout =
    useAuthStore(
      (
        state,
      ) =>
        state.logout,
    );

  const location =
    useLocation();


  useEffect(
    () => {
      let active =
        true;

      if (
        sessionStatus ===
        "checking"
      ) {
        void restoreBrowserSession()
          .then(
            (
              restored,
            ) => {
              if (!active) {
                return;
              }

              if (!restored) {
                logout();

                return;
              }

              setAccessToken(
                restored.accessToken,
              );

              setUser(
                restored.user,
              );

              setSessionStatus(
                "authenticated",
              );
            },
          );
      }

      return () => {
        active =
          false;
      };
    },
    [
      logout,
      sessionStatus,
      setAccessToken,
      setSessionStatus,
      setUser,
    ],
  );


  if (
    sessionStatus ===
    "checking"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div
          aria-live="polite"
          className="rounded-2xl border border-border/60 bg-card/70 px-6 py-5 text-sm text-muted-foreground shadow-xl backdrop-blur-xl"
          role="status"
        >
          Restoring secure session...
        </div>
      </main>
    );
  }


  if (
    sessionStatus !==
      "authenticated" ||
    !accessToken ||
    !user
  ) {
    return (
      <Navigate
        replace
        state={{
          from:
            location,
        }}
        to="/login"
      />
    );
  }


  return children;
}
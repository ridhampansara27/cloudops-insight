import {
  create,
} from "zustand";

import type {
  AuthenticatedUser,
} from "@/types/auth";


export type SessionStatus =
  | "checking"
  | "authenticated"
  | "anonymous";


interface AuthState {
  // Access JWT intentionally exists in JavaScript memory only.
  accessToken:
    | string
    | null;

  user:
    | AuthenticatedUser
    | null;

  sessionStatus:
    SessionStatus;

  setAccessToken: (
    accessToken:
      | string
      | null,
  ) => void;

  setUser: (
    user:
      | AuthenticatedUser
      | null,
  ) => void;

  setSessionStatus: (
    status: SessionStatus,
  ) => void;

  logout: () => void;
}


export const useAuthStore =
  create<AuthState>(
    (set) => ({
      accessToken:
        null,

      user:
        null,

      // On a fresh browser load we do not know whether an HttpOnly
      // refresh cookie exists until the backend is asked once.
      sessionStatus:
        "checking",

      setAccessToken: (
        accessToken,
      ) =>
        set({
          accessToken,
        }),

      setUser: (
        user,
      ) =>
        set({
          user,
        }),

      setSessionStatus: (
        sessionStatus,
      ) =>
        set({
          sessionStatus,
        }),

      // This clears only browser-memory state. Server logout is invoked
      // separately through the authenticated API workflow.
      logout: () =>
        set({
          accessToken:
            null,
          user:
            null,
          sessionStatus:
            "anonymous",
        }),
    }),
  );
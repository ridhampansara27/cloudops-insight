// Import Zustand's store creator.
import { create } from "zustand";

// Import persistence helpers.
import {
  createJSONStorage,
  persist,
} from "zustand/middleware";

// Import the authenticated-user model.
import type {
  AuthenticatedUser,
} from "@/types/auth";

// Define the authentication store.
interface AuthState {
  // Store the current bearer token.
  accessToken: string | null;

  // Store the current authenticated user.
  user: AuthenticatedUser | null;

  // Save a newly issued token.
  setAccessToken: (
    accessToken: string,
  ) => void;

  // Save the authenticated user.
  setUser: (
    user: AuthenticatedUser,
  ) => void;

  // Remove all authentication state.
  logout: () => void;
}

// Create the global authentication store.
export const useAuthStore =
  create<AuthState>()(
    persist(
      // Define the store implementation.
      (set) => ({
        // Start unauthenticated.
        accessToken: null,

        // Start without user information.
        user: null,

        // Store a new access token.
        setAccessToken: (
          accessToken,
        ) =>
          set({
            accessToken,
          }),

        // Store current-user information.
        setUser: (
          user,
        ) =>
          set({
            user,
          }),

        // Clear authentication information.
        logout: () =>
          set({
            accessToken: null,
            user: null,
          }),
      }),

      // Configure session persistence.
      {
        // Store authentication under a predictable key.
        name: "cloudops-auth",

        // Persist into sessionStorage instead of localStorage.
        storage: createJSONStorage(
          () => sessionStorage,
        ),

        // Persist only authentication data.
        partialize: (state) => ({
          accessToken:
            state.accessToken,
          user: state.user,
        }),
      },
    ),
  );
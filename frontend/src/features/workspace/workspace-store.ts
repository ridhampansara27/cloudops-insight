import {
  create,
} from "zustand";


const ACTIVE_ORGANIZATION_KEY =
  "cloudops.active-organization-id";


function readStoredOrganizationId():
  | string
  | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    return window.localStorage.getItem(
      ACTIVE_ORGANIZATION_KEY,
    );

  } catch {
    return null;
  }
}


function persistOrganizationId(
  organizationId:
    | string
    | null,
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    if (organizationId) {
      window.localStorage.setItem(
        ACTIVE_ORGANIZATION_KEY,
        organizationId,
      );

      return;
    }

    window.localStorage.removeItem(
      ACTIVE_ORGANIZATION_KEY,
    );

  } catch {
    // Workspace selection still works for this browser session even
    // when persistent storage is unavailable.
  }
}


interface WorkspaceState {
  activeOrganizationId:
    | string
    | null;

  setActiveOrganizationId: (
    organizationId:
      | string
      | null,
  ) => void;
}


export const useWorkspaceStore =
  create<WorkspaceState>(
    (set) => ({
      activeOrganizationId:
        readStoredOrganizationId(),

      setActiveOrganizationId: (
        activeOrganizationId,
      ) => {
        persistOrganizationId(
          activeOrganizationId,
        );

        set({
          activeOrganizationId,
        });
      },
    }),
  );
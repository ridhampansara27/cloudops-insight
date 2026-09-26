
// Import React form/state helpers.
import {
  type FormEvent,
  useState,
} from "react";

// Import React Router navigation.
import {
  useNavigate,
} from "react-router-dom";

import {
  toast,
} from "sonner";

// Import command-bar icons.
import {
  Bell,
  Copy,
  Globe2,
  LifeBuoy,
  LogOut,
  Search,
  Settings,
} from "lucide-react";

import {
  ProfileAvatar,
} from "@/features/auth/profile-avatar";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

// Import responsive navigation.
import {
  MobileNavigation,
} from "@/components/layout/mobile-navigation";

// Import the theme selector.
import {
  ThemeToggle,
} from "@/components/layout/theme-toggle";

import {
  SupportDialog,
} from "@/components/layout/support-dialog";

// Import authenticated-user state.
import {
  logoutSession,
} from "@/features/auth/api/auth-api";

import {
  useAuthStore,
} from "@/stores/auth-store";


import {
  useAvailableOrganizations,
} from "@/features/workspace/api/workspace-api";

import {
  useWorkspaceStore,
} from "@/features/workspace/workspace-store";


function compactIdentifier(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return "Unavailable";
  }

  if (
    value.length <=
    18
  ) {
    return value;
  }

  return `${value.slice(
    0,
    8,
  )}...${value.slice(
    -4,
  )}`;
}


async function copyIdentifier(
  value:
    | string
    | null
    | undefined,
  label: string,
) {
  if (!value) {
    toast.error(
      `${label} is unavailable.`,
    );

    return;
  }

  try {
    await navigator.clipboard.writeText(
      value,
    );

    toast.success(
      `${label} copied.`,
    );

  } catch {
    toast.error(
      `Unable to copy ${label.toLowerCase()}.`,
    );
  }
}


// Export the global application command bar.
export function AppHeader() {
  // Get React Router navigation.
  const navigate =
    useNavigate();

  // Read the genuine authenticated user.
  const user =
    useAuthStore(
      (
        state,
      ) =>
        state.user,
    );

  // Read the existing logout action.
  const logout =
    useAuthStore(
      (
        state,
      ) =>
        state.logout,
    );

  const organizationsQuery =
    useAvailableOrganizations();

  const activeOrganizationId =
    useWorkspaceStore(
      (
        state,
      ) =>
        state.activeOrganizationId,
    );

  const setActiveOrganizationId =
    useWorkspaceStore(
      (
        state,
      ) =>
        state.setActiveOrganizationId,
    );

  // Store global Resource Explorer search input.
  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] =
    useState(false);

  const [
    supportOpen,
    setSupportOpen,
  ] =
    useState(false);

  // Resolve the active workspace using genuine organization data.
  const activeOrganization =
    organizationsQuery.data
      ?.find(
        (
          organization,
        ) =>
          organization.id ===
          activeOrganizationId,
      ) ??
    null;

  // Format the genuine workspace role for display.
  const workspaceRole =
    activeOrganization
      ? activeOrganization.role
          .charAt(0)
          .toUpperCase() +
        activeOrganization.role
          .slice(1)
      : "Workspace member";

  // Build a safe user-facing display name.
  const displayName =
    user?.full_name
      ?.trim() ||
    user?.email
      ?.split(
        "@",
      )[0] ||
    "User";

  // Generate at most two initials from genuine user information.
  const initials =
    displayName
      .split(
        /\s+/,
      )
      .filter(
        Boolean,
      )
      .slice(
        0,
        2,
      )
      .map(
        (
          part,
        ) =>
          part.charAt(
            0,
          ),
      )
      .join("")
      .toUpperCase() ||
    "U";

  function handleWorkspaceChange(
    organizationId: string,
  ) {
    if (
      organizationId ===
      activeOrganizationId
    ) {
      return;
    }

    setActiveOrganizationId(
      organizationId,
    );

    window.location.assign(
      "/",
    );
  }


  // Preserve the existing global resource-search behavior.
  function handleSearch(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    // Prevent native form navigation.
    event.preventDefault();

    // Ignore surrounding whitespace.
    const query =
      searchQuery.trim();

    // Empty search still opens Resource Explorer.
    if (
      query.length ===
      0
    ) {
      navigate(
        "/cloud/resources",
      );

      return;
    }

    // Apply the search through the existing Resource Explorer query string.
    navigate(
      `/cloud/resources?search=${encodeURIComponent(
        query,
      )}`,
    );

    // Reset the command field after successful navigation.
    setSearchQuery(
      "",
    );
  }

  // Revoke the server-side refresh family before clearing memory.
  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(
      true,
    );

    try {
      await logoutSession();

      logout();

      navigate(
        "/login",
        {
          replace:
            true,
        },
      );

    } catch {
      // Do not pretend logout succeeded while an HttpOnly session may
      // still be active on the server/browser.
      setIsLoggingOut(
        false,
      );
    }
  }

  // Render the premium global command bar.
  return (
    <>
      <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-border/70 bg-background/68 px-4 shadow-[0_12px_36px_-30px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:px-6 lg:px-8">
      {/* Keep the existing mobile navigation entry point. */}
      <MobileNavigation />

      {/* Reserve the center-left region for resource command search. */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <form
          className="relative hidden w-full max-w-xl md:block"
          onSubmit={
            handleSearch
          }
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors" />

          <Input
            aria-label="Search resources"
            className="h-10 rounded-xl border-border/70 bg-card/50 pl-10 pr-14 text-sm shadow-inner backdrop-blur-xl transition-all placeholder:text-muted-foreground/70 hover:border-primary/35 hover:bg-card/75 hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_12%,transparent),0_10px_30px_-22px_color-mix(in_oklab,var(--primary)_65%,transparent)] focus-visible:border-primary/50 focus-visible:bg-card/85 focus-visible:ring-primary/20"
            placeholder="Search resources..."
            type="search"
            value={
              searchQuery
            }
            onChange={(
              event,
            ) =>
              setSearchQuery(
                event.target
                  .value,
              )
            }
          />

          {/* Enter is genuine form behavior, so this is not a fake shortcut. */}
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ?
          </span>
        </form>
      </div>

      {/* Render global operational controls. */}
      <div className="flex items-center gap-2">
        {organizationsQuery.data &&
          organizationsQuery.data.length > 1 &&
          activeOrganizationId && (
            <div className="hidden min-w-44 xl:block">
              <NativeSelect
                aria-label="Active workspace"
                className="h-9 rounded-xl border-border/70 bg-card/45 text-xs shadow-sm backdrop-blur-xl"
                onChange={(
                  event,
                ) =>
                  handleWorkspaceChange(
                    event.target.value,
                  )
                }
                value={
                  activeOrganizationId
                }
              >
                {organizationsQuery.data.map(
                  (
                    organization,
                  ) => (
                    <NativeSelectOption
                      key={
                        organization.id
                      }
                      value={
                        organization.id
                      }
                    >
                      {
                        organization.name
                      }
                    </NativeSelectOption>
                  ),
                )}
              </NativeSelect>
            </div>
          )}

        <Button
          aria-label="Open support"
          className="hidden rounded-xl border border-border/70 bg-card/45 px-3 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/70 xl:inline-flex"
          onClick={() =>
            setSupportOpen(
              true,
            )
          }
          title="CloudOps Support"
          variant="ghost"
        >
          <LifeBuoy className="size-4" />

          <span>
            Support
          </span>
        </Button>

        <Button
          aria-label="View incidents"
          className="rounded-xl border border-border/70 bg-card/45 shadow-sm backdrop-blur-xl hover:border-primary/25 hover:bg-accent/70"
          onClick={() =>
            navigate(
              "/monitoring/incidents",
            )
          }
          size="icon"
          title="View incidents"
          variant="ghost"
        >
          <Bell className="size-4" />
        </Button>

        {/* Keep light/dark/system switching available. */}
        <ThemeToggle />

        {/* Render genuine authenticated account and workspace details. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Open account details"
            className="hidden items-center gap-2.5 rounded-xl border border-border/70 bg-card/45 px-2 py-1.5 text-left shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/55 hover:shadow-lg hover:shadow-primary/5 sm:flex"
            title="View account and workspace details"
          >
            <ProfileAvatar
              avatarUpdatedAt={
                user?.avatar_updated_at
              }
              className="size-8 border border-primary/20 shadow-sm"
              fallbackClassName="bg-gradient-to-br from-primary/25 to-violet-500/20 text-xs font-semibold text-foreground"
              initials={
                initials
              }
              userId={
                user?.id
              }
            />

            <div className="min-w-0 pr-1">
              <p className="max-w-36 truncate text-xs font-semibold">
                {
                  displayName
                }
              </p>

              <p className="max-w-36 truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {
                  activeOrganization
                    ?.name ??
                  "CloudOps account"
                }
              </p>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-[320px] rounded-2xl border border-border/70 bg-popover/98 p-2 shadow-2xl"
            sideOffset={
              8
            }
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-3 pb-2 pt-2">
                Account
              </DropdownMenuLabel>

              <div className="rounded-xl border border-border/55 bg-background/25 p-3">
              <div className="flex items-center gap-3">
                <ProfileAvatar
                  avatarUpdatedAt={
                    user?.avatar_updated_at
                  }
                  className="size-10 border border-primary/20"
                  fallbackClassName="bg-gradient-to-br from-primary/25 to-violet-500/20 text-sm font-semibold"
                  initials={
                    initials
                  }
                  userId={
                    user?.id
                  }
                />

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {
                      displayName
                    }
                  </p>

                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {
                      user?.email ??
                      "Email unavailable"
                    }
                  </p>
                </div>
              </div>

              <div className="mt-3 border-t border-border/45 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                  Account ID
                </p>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <code
                    className="min-w-0 truncate font-mono text-[11px] text-foreground/85"
                    title={
                      user?.id ??
                      "Unavailable"
                    }
                  >
                    {
                      compactIdentifier(
                        user?.id,
                      )
                    }
                  </code>

                  {user?.id && (
                    <Button
                      aria-label="Copy full account ID"
                      className="size-7 shrink-0 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={() =>
                        void copyIdentifier(
                          user.id,
                          "Account ID",
                        )
                      }
                      size="icon"
                      title="Copy full account ID"
                      type="button"
                      variant="ghost"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              </div>
            </DropdownMenuGroup>

            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-3 pb-2 pt-4">
                Active workspace
              </DropdownMenuLabel>

            <div className="rounded-xl border border-border/55 bg-background/25 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold">
                  {
                    activeOrganization
                      ?.name ??
                    "Unavailable"
                  }
                </span>

                <span className="shrink-0 rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {
                    workspaceRole
                  }
                </span>
              </div>

              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                Workspace ID
              </p>

              <div className="mt-1 flex items-center justify-between gap-2">
                <code
                  className="min-w-0 truncate font-mono text-[11px] text-foreground/85"
                  title={
                    activeOrganization
                      ?.id ??
                    activeOrganizationId ??
                    "Unavailable"
                  }
                >
                  {
                    compactIdentifier(
                      activeOrganization
                        ?.id ??
                      activeOrganizationId,
                    )
                  }
                </code>

                {(activeOrganization?.id ??
                  activeOrganizationId) && (
                  <Button
                    aria-label="Copy full workspace ID"
                    className="size-7 shrink-0 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={() =>
                      void copyIdentifier(
                        activeOrganization
                          ?.id ??
                        activeOrganizationId,
                        "Workspace ID",
                      )
                    }
                    size="icon"
                    title="Copy full workspace ID"
                    type="button"
                    variant="ghost"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                )}
              </div>
              </div>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="my-2" />

            <DropdownMenuItem
              className="cursor-pointer rounded-xl px-3 py-2.5"
              onClick={() =>
                navigate(
                  "/settings",
                )
              }
            >
              <Settings className="size-4" />

              Workspace settings
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer rounded-xl px-3 py-2.5"
              onClick={() =>
                navigate(
                  "/",
                )
              }
            >
              <Globe2 className="size-4" />

              CloudOps public website
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>

        {/* Preserve real logout functionality. */}
        <Button
          aria-label="Sign out"
          className="rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          disabled={
            isLoggingOut
          }
          onClick={
            handleLogout
          }
          size="icon"
          title="Sign out"
          variant="ghost"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
      </header>

      <SupportDialog
        onOpenChange={
          setSupportOpen
        }
        open={
          supportOpen
        }
      />
    </>
  );
}

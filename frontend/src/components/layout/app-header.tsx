
// Import React form/state helpers.
import {
  type FormEvent,
  useState,
} from "react";

// Import React Router navigation.
import {
  useNavigate,
} from "react-router-dom";

// Import command-bar icons.
import {
  Bell,
  LogOut,
  Search,
} from "lucide-react";

// Import reusable visual primitives.
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

// Import responsive navigation.
import {
  MobileNavigation,
} from "@/components/layout/mobile-navigation";

// Import the theme selector.
import {
  ThemeToggle,
} from "@/components/layout/theme-toggle";

// Import authenticated-user state.
import {
  useAuthStore,
} from "@/stores/auth-store";


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

  // Store global Resource Explorer search input.
  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

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

  // Preserve the existing sign-out behavior.
  function handleLogout() {
    // Clear authentication state.
    logout();

    // Return the user to the login route.
    navigate(
      "/login",
      {
        replace:
          true,
      },
    );
  }

  // Render the premium global command bar.
  return (
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
            className="h-10 rounded-xl border-border/70 bg-card/50 pl-10 pr-14 text-sm shadow-inner backdrop-blur-xl transition-all placeholder:text-muted-foreground/70 focus-visible:border-primary/45 focus-visible:bg-card/80 focus-visible:ring-primary/20"
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

        {/* Render genuine authenticated-user identity. */}
        <div className="hidden items-center gap-2.5 rounded-xl border border-border/70 bg-card/45 px-2 py-1.5 shadow-sm backdrop-blur-xl sm:flex">
          <Avatar className="size-8 border border-primary/20 shadow-sm">
            <AvatarFallback className="bg-gradient-to-br from-primary/25 to-violet-500/20 text-xs font-semibold text-foreground">
              {
                initials
              }
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 pr-1">
            <p className="max-w-36 truncate text-xs font-semibold">
              {
                displayName
              }
            </p>

            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Operator
            </p>
          </div>
        </div>

        {/* Preserve real logout functionality. */}
        <Button
          aria-label="Sign out"
          className="rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
  );
}

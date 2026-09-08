// Import React form/state helpers.
import {
  type FormEvent,
  useState,
} from "react";

// Import React Router navigation.
import {
  useNavigate,
} from "react-router-dom";

// Import header icons.
import {
  Bell,
  LogOut,
  Search,
} from "lucide-react";

// Import reusable UI components.
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

import {
  Separator,
} from "@/components/ui/separator";

// Import mobile navigation.
import {
  MobileNavigation,
} from "@/components/layout/mobile-navigation";

// Import the theme control.
import {
  ThemeToggle,
} from "@/components/layout/theme-toggle";

// Import global authentication state.
import {
  useAuthStore,
} from "@/stores/auth-store";


// Export the application header.
export function AppHeader() {
  // Get React Router navigation.
  const navigate =
    useNavigate();

  // Read genuine authenticated-user information.
  const user =
    useAuthStore(
      (
        state,
      ) =>
        state.user,
    );

  // Read logout action.
  const logout =
    useAuthStore(
      (
        state,
      ) =>
        state.logout,
    );

  // Store global resource-search input.
  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  // Build a safe display name from authenticated-user data.
  const displayName =
    user?.full_name
      ?.trim() ||
    user?.email
      ?.split(
        "@",
      )[0] ||
    "User";

  // Generate at most two initials.
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

  // Send global searches to Resource Explorer.
  function handleSearch(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const query =
      searchQuery.trim();

    if (
      query.length ===
      0
    ) {
      navigate(
        "/cloud/resources",
      );

      return;
    }

    navigate(
      `/cloud/resources?search=${encodeURIComponent(
        query,
      )}`,
    );

    setSearchQuery(
      "",
    );
  }

  // Sign out.
  function handleLogout() {
    logout();

    navigate(
      "/login",
      {
        replace:
          true,
      },
    );
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/90 px-4 backdrop-blur-md sm:px-6">
      <MobileNavigation />

      <div className="flex flex-1 items-center gap-4">
        <form
          className="relative hidden w-full max-w-md md:block"
          onSubmit={
            handleSearch
          }
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            aria-label="Search resources"
            className="pl-9"
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
        </form>
      </div>

      <div className="flex items-center gap-2">
        <Button
          aria-label="View incidents"
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

        <ThemeToggle />

        <Separator
          className="mx-1 h-7"
          orientation="vertical"
        />

        <div className="flex items-center gap-2 px-2">
          <Avatar className="size-8">
            <AvatarFallback>
              {
                initials
              }
            </AvatarFallback>
          </Avatar>

          <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
            {
              displayName
            }
          </span>
        </div>

        <Button
          aria-label="Sign out"
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

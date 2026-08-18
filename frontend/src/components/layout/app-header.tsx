// Import React Router navigation.
import { useNavigate } from "react-router-dom";

// Import header icons.
import { Bell, LogOut, Search } from "lucide-react";

// Import reusable UI components.
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

// Import mobile navigation.
import { MobileNavigation } from "@/components/layout/mobile-navigation";

// Import the theme control.
import { ThemeToggle } from "@/components/layout/theme-toggle";

// Import the global authentication store.
import { useAuthStore } from "@/stores/auth-store";

// Export the application header.
export function AppHeader() {
  // Get React Router's navigation function.
  const navigate = useNavigate();

  // Get the logout action from the authentication store.
  const logout = useAuthStore((state) => state.logout);

  // Handle signing the current user out.
  const handleLogout = () => {
    // Clear authentication information from the Zustand store.
    logout();

    // Redirect the user to the login screen.
    // replace prevents navigating back to the protected page using the browser back button.
    navigate("/login", { replace: true });
  };

  // Render the top navigation bar.
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/90 px-4 backdrop-blur-md sm:px-6">
      {/* Render mobile navigation on smaller screens. */}
      <MobileNavigation />

      {/* Fill the available header space with the search section. */}
      <div className="flex flex-1 items-center gap-4">
        {/* Hide the resource search field on smaller screens. */}
        <div className="relative hidden w-full max-w-md md:block">
          {/* Display the search icon inside the input. */}
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          {/* Allow users to search application resources. */}
          <Input
            aria-label="Search resources"
            className="pl-9"
            placeholder="Search resources, accounts or incidents..."
            type="search"
          />
        </div>
      </div>

      {/* Render the header action controls. */}
      <div className="flex items-center gap-2">
        {/* Display the notifications button. */}
        <Button
          aria-label="View notifications"
          size="icon"
          variant="ghost"
        >
          {/* Display the notification bell icon. */}
          <Bell className="size-4" />
        </Button>

        {/* Allow the user to switch the application theme. */}
        <ThemeToggle />

        {/* Separate global controls from the user section. */}
        <Separator
          className="mx-1 h-7"
          orientation="vertical"
        />

        {/* Display the currently signed-in user. */}
        <Button
          className="gap-2 px-2"
          variant="ghost"
        >
          {/* Display the user's avatar. */}
          <Avatar className="size-8">
            {/* Display initials when no avatar image is available. */}
            <AvatarFallback>RP</AvatarFallback>
          </Avatar>

          {/* Display the user's name on sufficiently large screens. */}
          <span className="hidden text-sm font-medium sm:inline">
            Ridham
          </span>
        </Button>

        {/* Sign the current user out of the application. */}
        <Button
          aria-label="Sign out"
          onClick={handleLogout}
          size="icon"
          title="Sign out"
          variant="ghost"
        >
          {/* Display the logout icon. */}
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
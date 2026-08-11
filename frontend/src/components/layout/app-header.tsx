// Import header icons.
import { Bell, Search } from "lucide-react";

// Import reusable UI components.
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

// Import mobile navigation.
import { MobileNavigation } from "@/components/layout/mobile-navigation";

// Import the theme control.
import { ThemeToggle } from "@/components/layout/theme-toggle";

// Export the application header.
export function AppHeader() {
  // Render the top navigation bar.
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/90 px-4 backdrop-blur-md sm:px-6">
      <MobileNavigation />

      <div className="flex flex-1 items-center gap-4">
        <div className="relative hidden w-full max-w-md md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            aria-label="Search resources"
            className="pl-9"
            placeholder="Search resources, accounts or incidents..."
            type="search"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          aria-label="View notifications"
          size="icon"
          variant="ghost"
        >
          <Bell className="size-4" />
        </Button>

        <ThemeToggle />

        <Separator
          className="mx-1 h-7"
          orientation="vertical"
        />

        <Button
          className="gap-2 px-2"
          variant="ghost"
        >
          <Avatar className="size-8">
            <AvatarFallback>RP</AvatarFallback>
          </Avatar>

          <span className="hidden text-sm font-medium sm:inline">
            Ridham
          </span>
        </Button>
      </div>
    </header>
  );
}
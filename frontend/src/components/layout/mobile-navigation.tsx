// Import React state.
import { useState } from "react";

// Import navigation icon.
import {
  CloudCog,
  Menu,
} from "lucide-react";

// Import React Router navigation.
import { NavLink } from "react-router-dom";

// Import navigation configuration.
import { navigationGroups } from "@/app/navigation";

// Import reusable components.
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// Import class utility.
import { cn } from "@/lib/utils";

// Export mobile navigation.
export function MobileNavigation() {
  // Store sheet visibility.
  const [open, setOpen] =
    useState(false);

  // Render mobile menu.
  return (
    <>
      <Button
        // Hide this control on desktop.
        className="lg:hidden"

        // Use icon-only sizing.
        size="icon"

        // Use lightweight styling.
        variant="ghost"

        // Explain the button to assistive technologies.
        aria-label="Open navigation"

        // Open the mobile menu.
        onClick={() =>
          setOpen(true)
        }
      >
        <Menu className="size-5" />
      </Button>

      <Sheet
        // Control the sheet state.
        open={open}

        // Allow the sheet to close itself.
        onOpenChange={setOpen}
      >
        <SheetContent
          // Open from the left like the desktop sidebar.
          side="left"

          // Use a sidebar-like width.
          className="w-[300px] p-0"
        >
          <SheetHeader className="border-b p-5">
            <SheetTitle className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CloudCog className="size-5" />
              </span>

              CloudOps Insight
            </SheetTitle>

            <SheetDescription>
              Monitoring & FinOps
            </SheetDescription>
          </SheetHeader>

          <nav className="space-y-6 overflow-y-auto p-4">
            {navigationGroups.map(
              (group) => (
                <div key={group.label}>
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.label}
                  </p>

                  <div className="space-y-1">
                    {group.items.map(
                      (item) => {
                        // Read the configured icon.
                        const Icon =
                          item.icon;

                        // Render one navigation link.
                        return (
                          <NavLink
                            key={
                              item.href
                            }
                            to={item.href}
                            end={
                              item.href !==
                              "/cloud/resources"
                            }
                            onClick={() =>
                              setOpen(false)
                            }
                            className={({
                              isActive,
                            }) =>
                              cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                "hover:bg-accent hover:text-accent-foreground",
                                isActive &&
                                  "bg-primary text-primary-foreground",
                              )
                            }
                          >
                            <Icon className="size-4" />

                            {item.label}
                          </NavLink>
                        );
                      },
                    )}
                  </div>
                </div>
              ),
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}

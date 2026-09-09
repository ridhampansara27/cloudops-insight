
// Import React state.
import {
  useState,
} from "react";

// Import mobile-shell icons.
import {
  CloudCog,
  Menu,
  Sparkles,
} from "lucide-react";

// Import React Router navigation.
import {
  NavLink,
} from "react-router-dom";

// Import production navigation configuration.
import {
  navigationGroups,
} from "@/app/navigation";

// Import reusable controls.
import {
  Button,
} from "@/components/ui/button";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// Import class-name composition.
import {
  cn,
} from "@/lib/utils";


// Export the mobile command-center navigation.
export function MobileNavigation() {
  // Store sheet visibility.
  const [
    open,
    setOpen,
  ] =
    useState(false);

  // Render the mobile navigation entry point and sheet.
  return (
    <>
      <Button
        aria-label="Open navigation"
        className="mr-2 rounded-xl border border-border/70 bg-card/45 shadow-sm lg:hidden"
        onClick={() =>
          setOpen(
            true,
          )
        }
        size="icon"
        variant="ghost"
      >
        <Menu className="size-5" />
      </Button>

      <Sheet
        onOpenChange={
          setOpen
        }
        open={
          open
        }
      >
        <SheetContent
          className="w-[310px] border-r border-sidebar-border bg-sidebar/98 p-0 backdrop-blur-2xl"
          side="left"
        >
          <SheetHeader className="border-b border-sidebar-border p-5 text-left">
            <SheetTitle className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-br from-primary/25 via-primary/10 to-violet-500/15 text-primary shadow-lg shadow-primary/5">
                <CloudCog className="size-5" />
              </span>

              <span className="flex items-center gap-2">
                CloudOps Insight

                <Sparkles className="size-3.5 text-primary" />
              </span>
            </SheetTitle>

            <SheetDescription className="text-xs uppercase tracking-[0.13em]">
              Cloud Operations Command Center
            </SheetDescription>
          </SheetHeader>

          <nav className="space-y-6 overflow-y-auto p-4">
            {navigationGroups.map(
              (
                group,
              ) => (
                <div
                  key={
                    group.label
                  }
                >
                  <div className="mb-2 flex items-center gap-2 px-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {
                        group.label
                      }
                    </p>

                    <div className="h-px flex-1 bg-gradient-to-r from-sidebar-border to-transparent" />
                  </div>

                  <div className="space-y-1">
                    {group.items.map(
                      (
                        item,
                      ) => {
                        // Read the configured navigation icon.
                        const Icon =
                          item.icon;

                        // Render the same production route as desktop navigation.
                        return (
                          <NavLink
                            className={({
                              isActive,
                            }) =>
                              cn(
                                "cloudops-nav-pop flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium",
                                "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                isActive &&
                                  "bg-gradient-to-r from-primary/16 via-primary/8 to-transparent text-sidebar-foreground ring-1 ring-inset ring-primary/20",
                              )
                            }
                            end={
                              item.href !==
                              "/cloud/resources"
                            }
                            key={
                              item.href
                            }
                            onClick={() =>
                              setOpen(
                                false,
                              )
                            }
                            to={
                              item.href
                            }
                          >
                            <span className="flex size-8 items-center justify-center rounded-lg border border-sidebar-border/70 bg-sidebar-accent/40">
                              <Icon className="size-4" />
                            </span>

                            {
                              item.label
                            }
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


// Import visual identity icons.
import {
  CloudCog,
  ExternalLink,
  Sparkles,
} from "lucide-react";

// Import React Router navigation helpers.
import {
  Link,
  NavLink,
} from "react-router-dom";

// Import the application's production navigation map.
import {
  navigationGroups,
} from "@/app/navigation";

// Import the shared class-name utility.
import {
  cn,
} from "@/lib/utils";


// Export the desktop CloudOps command-center sidebar.
export function AppSidebar() {
  // Render grouped navigation without changing any route behavior.
  return (
    <aside className="relative hidden h-screen w-72 shrink-0 border-r border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:flex-col">
      {/* Add a subtle cyan glow behind the product identity. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-40 w-full bg-gradient-to-br from-primary/10 via-transparent to-transparent"
      />

      {/* Product identity is also the dashboard-home control. */}
      <Link
        aria-label="Go to dashboard"
        className="cloudops-nav-pop relative flex h-[72px] items-center gap-3 border-b border-sidebar-border px-5"
        title="Dashboard"
        to="/dashboard"
        viewTransition
      >
        <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/25 via-primary/10 to-violet-500/15 text-primary shadow-lg shadow-primary/5">
          <CloudCog className="relative z-10 size-5" />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10"
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
              CloudOps Insight
            </p>

            <Sparkles className="size-3.5 shrink-0 text-primary/80" />
          </div>

          <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-[0.13em] text-muted-foreground">
            Command Center
          </p>
        </div>
      </Link>

      {/* Render production navigation groups. */}
      <nav className="relative flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navigationGroups.map(
          (group) => (
            <div
              key={
                group.label
              }
            >
              <div className="mb-2 flex items-center gap-2 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                  {
                    group.label
                  }
                </p>

                <div className="h-px flex-1 bg-gradient-to-r from-sidebar-border to-transparent" />
              </div>

              <div className="space-y-1">
                {group.items.map(
                  (item) => {
                    // Read the configured route icon.
                    const Icon =
                      item.icon;

                    // Render the route without changing navigation semantics.
                    return (
                      <NavLink
                        className={({
                          isActive,
                        }) =>
                          cn(
                            "cloudops-nav-pop group relative flex items-center gap-3 overflow-hidden rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium",
                            "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                            isActive &&
                              "bg-gradient-to-r from-primary/16 via-primary/9 to-transparent text-sidebar-foreground ring-1 ring-inset ring-primary/20 shadow-sm",
                          )
                        }
                        end={
                          item.href !==
                          "/cloud/resources"
                        }
                        key={
                          item.href
                        }
                        to={
                          item.href
                        }
                        viewTransition
                      >
                        {/* Give active/hovered routes dimensional icon treatment. */}
                        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent transition-colors group-hover:border-sidebar-border group-hover:bg-sidebar-accent">
                          <Icon className="size-4 transition-colors group-hover:text-primary" />
                        </span>

                        <span className="truncate">
                          {
                            item.label
                          }
                        </span>

                        {/* Add a non-data decorative highlight to the active area. */}
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary opacity-0 shadow-[0_0_12px_currentColor] transition-opacity group-[.active]:opacity-100"
                        />
                      </NavLink>
                    );
                  },
                )}
              </div>
            </div>
          ),
        )}
      </nav>

      {/* Keep one compact shortcut back to the public CloudOps website. */}
      <div className="relative border-t border-sidebar-border p-2">
        <Link
          aria-label="Open CloudOps Insight public website"
          className="cloudops-nav-pop group flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/25 px-3 text-xs font-semibold text-muted-foreground shadow-inner transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground hover:shadow-lg hover:shadow-primary/5"
          title="CloudOps Insight public website"
          to="/"
        >
          <ExternalLink className="size-3.5 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />

          <span>
            Public website
          </span>
        </Link>
      </div>
    </aside>
  );
}

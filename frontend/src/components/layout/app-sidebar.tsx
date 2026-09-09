
// Import visual identity icons.
import {
  CloudCog,
  GitBranch,
  Sparkles,
} from "lucide-react";

// Import React Router navigation helpers.
import {
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

      {/* Render the product identity. */}
      <div className="relative flex h-[72px] items-center gap-3 border-b border-sidebar-border px-5">
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
      </div>

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

      {/* Show architecture context without inventing runtime status. */}
      <div className="relative border-t border-sidebar-border p-4">
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/30 p-3.5 shadow-inner">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg border border-primary/15 bg-primary/8 text-primary">
              <GitBranch className="size-4" />
            </div>

            <div>
              <p className="text-xs font-semibold text-sidebar-foreground">
                GitOps delivery
              </p>

              <p className="mt-0.5 text-[11px] text-muted-foreground">
                AWS ? EKS ? Argo CD
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Import the cloud logo icon.
import { CloudCog } from "lucide-react";

// Import navigation helpers.
import { NavLink } from "react-router-dom";

// Import the application's navigation definition.
import { navigationGroups } from "@/app/navigation";

// Import the class-name utility created by shadcn/ui.
import { cn } from "@/lib/utils";

// Export the desktop application sidebar.
export function AppSidebar() {
  // Render the sidebar and its grouped navigation.
  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
          <CloudCog className="size-5" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            CloudOps Insight
          </p>

          <p className="truncate text-xs text-muted-foreground">
            Monitoring & FinOps
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {group.label}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isActive &&
                          "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                      )
                    }
                    end={item.href === "/"}
                    key={item.href}
                    to={item.href}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-sidebar-accent p-3">
          <p className="text-xs font-medium">
            Development environment
          </p>

          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-emerald-500" />
            Local services available
          </div>
        </div>
      </div>
    </aside>
  );
}
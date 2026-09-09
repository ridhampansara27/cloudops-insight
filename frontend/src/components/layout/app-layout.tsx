
// Import the nested-route placeholder.
import {
  Outlet,
} from "react-router-dom";

// Import the persistent application shell.
import {
  AppHeader,
} from "@/components/layout/app-header";

import {
  AppSidebar,
} from "@/components/layout/app-sidebar";


// Export the authenticated CloudOps command-center layout.
export function AppLayout() {
  // Render atmospheric background layers underneath real page content.
  return (
    <div className="relative flex min-h-screen overflow-x-hidden bg-background">
      {/* Render the dark-first ambient gradient system. */}
      <div
        aria-hidden="true"
        className="cloudops-backdrop pointer-events-none fixed inset-0 z-0"
      />

      {/* Add a subtle infrastructure-grid texture. */}
      <div
        aria-hidden="true"
        className="cloudops-grid-mask pointer-events-none fixed inset-0 z-0"
      />

      {/* Keep the interactive application above decorative layers. */}
      <div className="relative z-10 flex min-h-screen w-full">
        <AppSidebar />

        {/* Allow route content to consume all remaining horizontal space. */}
        <div className="min-w-0 flex-1">
          <AppHeader />

          {/* Use a generous maximum width for large command-center screens. */}
          <main className="mx-auto w-full max-w-[1900px] p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

// Import the nested-route placeholder.
import { Outlet } from "react-router-dom";

// Import the main layout components.
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

// Export the authenticated dashboard layout.
export function AppLayout() {
  // Render the sidebar, header and active route.
  return (
    <div className="flex min-h-screen bg-muted/30">
      <AppSidebar />

      <div className="min-w-0 flex-1">
        <AppHeader />

        <main className="mx-auto w-full max-w-[1800px] p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
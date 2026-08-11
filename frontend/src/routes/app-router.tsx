// Import React Router's browser-router creator.
import { createBrowserRouter } from "react-router-dom";

// Import the application layout.
import { AppLayout } from "@/components/layout/app-layout";

// Import implemented pages.
import { DashboardPage } from "@/pages/dashboard-page";
import { PlaceholderPage } from "@/pages/placeholder-page";

// Import the resource inventory screen.
import { ResourceExplorerPage } from "@/pages/resource-explorer-page";

// Import the resource detail screen.
import { ResourceDetailPage } from "@/pages/resource-detail-page";

// Import the complete FinOps overview.
import { CostOverviewPage } from "@/pages/cost-overview-page";

// Import the interactive resource-level Cost Explorer.
import { CostExplorerPage } from "@/pages/cost-explorer-page";

// Import the FinOps budget-management screen.
import { BudgetsPage } from "@/pages/budgets-page";

// Import incident management.
import { IncidentsPage } from "@/pages/incidents-page";

// Import FinOps optimization recommendations.
import { RecommendationsPage } from "@/pages/recommendations-page";

// Import the global missing-route page.
import { NotFoundPage } from "@/pages/not-found-page";



// Export the complete frontend route configuration.
export const appRouter = createBrowserRouter([
  {
    // Apply the dashboard layout to all main application pages.
    element: <AppLayout />,

    // Define all nested application routes.
    children: [
      {
        // Render the overview dashboard at the root route.
        path: "/",
        element: <DashboardPage />,
      },
      {
        path: "/cloud/accounts",
        element: (
          <PlaceholderPage
            description="Connect and validate AWS accounts using secure read-only access."
            title="Cloud Accounts"
          />
        ),
      },
      {
        // Display the full cloud resource inventory.
        path: "/cloud/resources",

        // Render the Resource Explorer.
        element: <ResourceExplorerPage />,
      },
      {
        // Match one specific resource identifier.
        path: "/cloud/resources/:resourceId",

        // Display the requested resource details.
        element: <ResourceDetailPage />,
      },
      {
        path: "/cloud/tags",
        element: (
          <PlaceholderPage
            description="Review resource tags, environments, owners and cost allocation."
            title="Tags & Ownership"
          />
        ),
      },
      {
        path: "/monitoring/health",
        element: (
          <PlaceholderPage
            description="Monitor resource health, service status and operational signals."
            title="Health Monitoring"
          />
        ),
      },
      {
        // Display incident-management workflows.
        path: "/monitoring/incidents",

        // Render the incident screen.
        element: <IncidentsPage />,
      },
      {
        path: "/monitoring/alerts",
        element: (
          <PlaceholderPage
            description="Configure thresholds and review triggered monitoring alerts."
            title="Alerts"
          />
        ),
      },
      {
        // Display the complete FinOps overview.
        path: "/costs",

        // Render cost, budget, forecast, and anomaly information.
        element: <CostOverviewPage />,
      },
      {
        // Display interactive resource-level cost analysis.
        path: "/costs/explorer",

        // Render the Cost Explorer page.
        element: <CostExplorerPage />,

      },
      {
        // Display cloud budget management.
        path: "/costs/budgets",

        // Render the complete budget page.
        element: <BudgetsPage />,
      },
      {
        // Display FinOps recommendations.
        path: "/costs/recommendations",

        // Render the optimization page.
        element: <RecommendationsPage />,
      },
      {
        path: "/settings",
        element: (
          <PlaceholderPage
            description="Manage application, synchronization and user preferences."
            title="Settings"
          />
        ),
      },
      {
        // Match any application URL not handled above.
        path: "*",

        // Display the friendly 404 screen.
        element: <NotFoundPage />,
      },
    ],
  },
]);
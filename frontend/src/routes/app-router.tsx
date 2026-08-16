// Import React Router's browser-router creator.
import { createBrowserRouter } from "react-router-dom";

// Import the main authenticated application layout.
import { AppLayout } from "@/components/layout/app-layout";

// Import the authentication route guard.
import { ProtectedRoute } from "@/features/auth/protected-route";

// Import the public login page.
import { LoginPage } from "@/pages/login-page";

// Import the main dashboard page.
import { DashboardPage } from "@/pages/dashboard-page";

// Import the reusable placeholder page.
import { PlaceholderPage } from "@/pages/placeholder-page";

// Import the cloud resource inventory page.
import { ResourceExplorerPage } from "@/pages/resource-explorer-page";

// Import the individual cloud resource detail page.
import { ResourceDetailPage } from "@/pages/resource-detail-page";

// Import the complete FinOps overview page.
import { CostOverviewPage } from "@/pages/cost-overview-page";

// Import the interactive resource-level Cost Explorer page.
import { CostExplorerPage } from "@/pages/cost-explorer-page";

// Import the FinOps budget-management page.
import { BudgetsPage } from "@/pages/budgets-page";

// Import the incident-management page.
import { IncidentsPage } from "@/pages/incidents-page";

// Import the FinOps optimization recommendations page.
import { RecommendationsPage } from "@/pages/recommendations-page";

// Import the global missing-route page.
import { NotFoundPage } from "@/pages/not-found-page";

// Import AWS account-management page.
import {
  CloudAccountsPage,
} from "@/pages/cloud-accounts-page";







// Export the complete frontend route configuration.
export const appRouter = createBrowserRouter([
  {
    // Define the public login route.
    // This route stays outside ProtectedRoute so unauthenticated users can access it.
    path: "/login",

    // Render the login screen.
    element: <LoginPage />,
  },
  {
    // Define the root of the authenticated application.
    path: "/",

    // Protect the complete application layout.
    // Unauthenticated users will be handled by ProtectedRoute.
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),

    // Define all routes that require authentication.
    children: [
      {
        // Render the overview dashboard at the root route.
        path: "/",

        // Display the dashboard page.
        element: <DashboardPage />,
      },
      
      {
        // Expose connected-cloud account management.
        path: "/cloud/accounts",

        // Render AWS account management.
        element: <CloudAccountsPage />,
      },
      {
        // Display the full cloud resource inventory.
        path: "/cloud/resources",

        // Render the Resource Explorer.
        element: <ResourceExplorerPage />,
      },
      {
        // Match one specific cloud-resource identifier.
        path: "/cloud/resources/:resourceId",

        // Display the requested resource details.
        element: <ResourceDetailPage />,
      },
      {
        // Display the cloud tagging and ownership route.
        path: "/cloud/tags",

        // Use a placeholder until tag-management functionality is implemented.
        element: (
          <PlaceholderPage
            description="Review resource tags, environments, owners and cost allocation."
            title="Tags & Ownership"
          />
        ),
      },
      {
        // Display infrastructure health monitoring.
        path: "/monitoring/health",

        // Use a placeholder until the health-monitoring feature is implemented.
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

        // Render the incident-management screen.
        element: <IncidentsPage />,
      },
      {
        // Display monitoring alerts.
        path: "/monitoring/alerts",

        // Use a placeholder until alert-management functionality is implemented.
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
        // Display FinOps optimization recommendations.
        path: "/costs/recommendations",

        // Render the optimization recommendations page.
        element: <RecommendationsPage />,
      },
      {
        // Display application settings.
        path: "/settings",

        // Use a placeholder until the settings feature is implemented.
        element: (
          <PlaceholderPage
            description="Manage application, synchronization and user preferences."
            title="Settings"
          />
        ),
      },
      {
        // Match every authenticated application URL not handled above.
        path: "*",

        // Display the friendly 404 screen.
        element: <NotFoundPage />,
      },
    ],
  },
]);
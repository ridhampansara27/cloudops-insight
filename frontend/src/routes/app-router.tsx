// Import React Router's browser-router creator.
import { createBrowserRouter } from "react-router-dom";

// Import authenticated application layout.
import { AppLayout } from "@/components/layout/app-layout";

// Import authentication protection.
import { ProtectedRoute } from "@/features/auth/protected-route";

// Import public authentication page.
import { LoginPage } from "@/pages/login-page";

// Import implemented application pages.
import { DashboardPage } from "@/pages/dashboard-page";
import { CloudAccountsPage } from "@/pages/cloud-accounts-page";
import { ResourceExplorerPage } from "@/pages/resource-explorer-page";
import { ResourceDetailPage } from "@/pages/resource-detail-page";
import { IncidentsPage } from "@/pages/incidents-page";
import { CostOverviewPage } from "@/pages/cost-overview-page";
import { CostExplorerPage } from "@/pages/cost-explorer-page";
import { BudgetsPage } from "@/pages/budgets-page";
import { RecommendationsPage } from "@/pages/recommendations-page";
import { NotFoundPage } from "@/pages/not-found-page";

// Define the CloudOps Insight v1 route tree.
export const appRouter = createBrowserRouter([
  {
    // Keep login publicly accessible.
    path: "/login",
    element: <LoginPage />,
  },
  {
    // Protect all application functionality.
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),

    children: [
      {
        // Main operational dashboard.
        path: "/",
        element: <DashboardPage />,
      },
      {
        // Connected AWS account management.
        path: "/cloud/accounts",
        element: <CloudAccountsPage />,
      },
      {
        // Discovered AWS resource inventory.
        path: "/cloud/resources",
        element: <ResourceExplorerPage />,
      },
      {
        // Individual AWS resource details and monitoring.
        path: "/cloud/resources/:resourceId",
        element: <ResourceDetailPage />,
      },
      {
        // Monitoring incident workflow.
        path: "/monitoring/incidents",
        element: <IncidentsPage />,
      },
      {
        // FinOps overview.
        path: "/costs",
        element: <CostOverviewPage />,
      },
      {
        // Interactive cost analysis.
        path: "/costs/explorer",
        element: <CostExplorerPage />,
      },
      {
        // Budget configuration and utilization.
        path: "/costs/budgets",
        element: <BudgetsPage />,
      },
      {
        // Rule-based optimization recommendations.
        path: "/costs/recommendations",
        element: <RecommendationsPage />,
      },
      {
        // Handle removed placeholder routes and unknown URLs cleanly.
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

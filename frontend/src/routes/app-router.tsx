// Import React Router's browser-router creator.
import {
  createBrowserRouter,
} from "react-router-dom";

// Import the authenticated shell eagerly.
import {
  AppLayout,
} from "@/components/layout/app-layout";

// Import authentication protection eagerly.
import {
  ProtectedRoute,
} from "@/features/auth/protected-route";


// Load the login page only when needed.
async function loadLoginRoute() {
  const {
    LoginPage,
  } =
    await import(
      "@/pages/login-page"
    );

  return {
    Component:
      LoginPage,
  };
}


// Load the operational dashboard only when visited.
async function loadDashboardRoute() {
  const {
    DashboardPage,
  } =
    await import(
      "@/pages/dashboard-page"
    );

  return {
    Component:
      DashboardPage,
  };
}


// Load connected AWS accounts only when visited.
async function loadCloudAccountsRoute() {
  const {
    CloudAccountsPage,
  } =
    await import(
      "@/pages/cloud-accounts-page"
    );

  return {
    Component:
      CloudAccountsPage,
  };
}


// Load Resource Explorer only when visited.
async function loadResourceExplorerRoute() {
  const {
    ResourceExplorerPage,
  } =
    await import(
      "@/pages/resource-explorer-page"
    );

  return {
    Component:
      ResourceExplorerPage,
  };
}


// Load resource detail monitoring only when visited.
async function loadResourceDetailRoute() {
  const {
    ResourceDetailPage,
  } =
    await import(
      "@/pages/resource-detail-page"
    );

  return {
    Component:
      ResourceDetailPage,
  };
}


// Load incident workflows only when visited.
async function loadIncidentsRoute() {
  const {
    IncidentsPage,
  } =
    await import(
      "@/pages/incidents-page"
    );

  return {
    Component:
      IncidentsPage,
  };
}


// Load the FinOps overview only when visited.
async function loadCostOverviewRoute() {
  const {
    CostOverviewPage,
  } =
    await import(
      "@/pages/cost-overview-page"
    );

  return {
    Component:
      CostOverviewPage,
  };
}


// Load Cost Explorer only when visited.
async function loadCostExplorerRoute() {
  const {
    CostExplorerPage,
  } =
    await import(
      "@/pages/cost-explorer-page"
    );

  return {
    Component:
      CostExplorerPage,
  };
}


// Load budget governance only when visited.
async function loadBudgetsRoute() {
  const {
    BudgetsPage,
  } =
    await import(
      "@/pages/budgets-page"
    );

  return {
    Component:
      BudgetsPage,
  };
}


// Load optimization recommendations only when visited.
async function loadRecommendationsRoute() {
  const {
    RecommendationsPage,
  } =
    await import(
      "@/pages/recommendations-page"
    );

  return {
    Component:
      RecommendationsPage,
  };
}


// Load the 404 page only for unknown routes.
async function loadNotFoundRoute() {
  const {
    NotFoundPage,
  } =
    await import(
      "@/pages/not-found-page"
    );

  return {
    Component:
      NotFoundPage,
  };
}


// Define the CloudOps Insight route tree.
export const appRouter =
  createBrowserRouter([
    {
      // Keep login publicly accessible.
      path:
        "/login",

      // Code-split the public authentication page.
      lazy:
        loadLoginRoute,
    },
    {
      // Protect every application route.
      path:
        "/",

      // Keep the shared authenticated shell mounted.
      element: (
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      ),

      children: [
        {
          // Main operational dashboard.
          index:
            true,

          lazy:
            loadDashboardRoute,
        },
        {
          // Connected AWS accounts.
          path:
            "cloud/accounts",

          lazy:
            loadCloudAccountsRoute,
        },
        {
          // Synchronized AWS resource inventory.
          path:
            "cloud/resources",

          lazy:
            loadResourceExplorerRoute,
        },
        {
          // Individual AWS resource monitoring.
          path:
            "cloud/resources/:resourceId",

          lazy:
            loadResourceDetailRoute,
        },
        {
          // Operational incident workflow.
          path:
            "monitoring/incidents",

          lazy:
            loadIncidentsRoute,
        },
        {
          // FinOps overview.
          path:
            "costs",

          lazy:
            loadCostOverviewRoute,
        },
        {
          // AWS billing exploration.
          path:
            "costs/explorer",

          lazy:
            loadCostExplorerRoute,
        },
        {
          // Budget governance.
          path:
            "costs/budgets",

          lazy:
            loadBudgetsRoute,
        },
        {
          // Optimization recommendations.
          path:
            "costs/recommendations",

          lazy:
            loadRecommendationsRoute,
        },
        {
          // Unknown/removed routes.
          path:
            "*",

          lazy:
            loadNotFoundRoute,
        },
      ],
    },
  ]);

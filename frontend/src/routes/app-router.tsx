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


import {
  WorkspaceGate,
} from "@/features/workspace/workspace-gate";



// Load the commercial public homepage only when requested.
async function loadLandingRoute() {
  const {
    LandingPage,
  } =
    await import(
      "@/pages/landing-page"
    );

  return {
    Component:
      LandingPage,
  };
}
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


// Load commercial signup only when visited.
async function loadSignupRoute() {
  const {
    SignupPage,
  } =
    await import(
      "@/pages/signup-page"
    );

  return {
    Component:
      SignupPage,
  };
}


// Load email verification only when opened from an email link.
async function loadVerifyEmailRoute() {
  const {
    VerifyEmailPage,
  } =
    await import(
      "@/pages/verify-email-page"
    );

  return {
    Component:
      VerifyEmailPage,
  };
}


// Load verification resend only when requested.
async function loadResendVerificationRoute() {
  const {
    ResendVerificationPage,
  } =
    await import(
      "@/pages/resend-verification-page"
    );

  return {
    Component:
      ResendVerificationPage,
  };
}


// Load password recovery only when requested.
async function loadForgotPasswordRoute() {
  const {
    ForgotPasswordPage,
  } =
    await import(
      "@/pages/forgot-password-page"
    );

  return {
    Component:
      ForgotPasswordPage,
  };
}


// Load the reset form only from a recovery link.
async function loadResetPasswordRoute() {
  const {
    ResetPasswordPage,
  } =
    await import(
      "@/pages/reset-password-page"
    );

  return {
    Component:
      ResetPasswordPage,
  };
}


// Load public workspace invitation acceptance from an email link.
async function loadInvitationAcceptRoute() {
  const {
    InvitationAcceptPage,
  } =
    await import(
      "@/pages/invitation-accept-page"
    );

  return {
    Component:
      InvitationAcceptPage,
  };
}



// Load the public About page only when requested.
async function loadAboutRoute() {
  const {
    AboutPage,
  } =
    await import(
      "@/pages/about-page"
    );

  return {
    Component:
      AboutPage,
  };
}
// Load the public privacy notice only when requested.
async function loadPrivacyRoute() {
  const {
    PrivacyPage,
  } =
    await import(
      "@/pages/legal-pages"
    );

  return {
    Component:
      PrivacyPage,
  };
}


// Load the public terms only when requested.
async function loadTermsRoute() {
  const {
    TermsPage,
  } =
    await import(
      "@/pages/legal-pages"
    );

  return {
    Component:
      TermsPage,
  };
}


// Load provider information without requiring authentication.
async function loadImpressumRoute() {
  const {
    ImpressumPage,
  } =
    await import(
      "@/pages/legal-pages"
    );

  return {
    Component:
      ImpressumPage,
  };
}


// Load the public contact page.
async function loadContactRoute() {
  const {
    ContactPage,
  } =
    await import(
      "@/pages/legal-pages"
    );

  return {
    Component:
      ContactPage,
  };
}


// Load commercial workspace settings only when visited.
async function loadSettingsRoute() {
  const {
    SettingsPage,
  } =
    await import(
      "@/pages/settings-page"
    );

  return {
    Component:
      SettingsPage,
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
      // Public commercial homepage.
      path:
        "/",

      lazy:
        loadLandingRoute,
    },
    {
      // Public company/product story.
      path:
        "/about",

      lazy:
        loadAboutRoute,
    },
    {
      // Public authentication entry point.
      path:
        "/login",

      lazy:
        loadLoginRoute,
    },
    {
      // Commercial tenant-owner registration.
      path:
        "/signup",

      lazy:
        loadSignupRoute,
    },
    {
      // Consume one email-verification link.
      path:
        "/verify-email",

      lazy:
        loadVerifyEmailRoute,
    },
    {
      // Request another verification email.
      path:
        "/resend-verification",

      lazy:
        loadResendVerificationRoute,
    },
    {
      // Request password recovery.
      path:
        "/forgot-password",

      lazy:
        loadForgotPasswordRoute,
    },
    {
      // Consume a password-reset token.
      path:
        "/reset-password",

      lazy:
        loadResetPasswordRoute,
    },
    {
      // Accept a workspace invitation.
      path:
        "/invitations/accept",

      lazy:
        loadInvitationAcceptRoute,
    },
    {
      // Public privacy information.
      path:
        "/privacy",

      lazy:
        loadPrivacyRoute,
    },
    {
      // Public service terms.
      path:
        "/terms",

      lazy:
        loadTermsRoute,
    },
    {
      // Public provider information.
      path:
        "/impressum",

      lazy:
        loadImpressumRoute,
    },
    {
      // Public contact information.
      path:
        "/contact",

      lazy:
        loadContactRoute,
    },

    {
      // All routes below this point require authentication.
      element: (
        <ProtectedRoute>
          <WorkspaceGate>
            <AppLayout />
          </WorkspaceGate>
        </ProtectedRoute>
      ),

      children: [
        {
          // Main operational dashboard.
          path:
            "dashboard",

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
          // Identity, workspace and team administration.
          path:
            "settings",

          lazy:
            loadSettingsRoute,
        },
      ],
    },

    {
      // Unknown public or application routes.
      path:
        "*",

      lazy:
        loadNotFoundRoute,
    },
  ]);
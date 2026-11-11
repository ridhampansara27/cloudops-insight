// Browser-tab titles for each route. The homepage keeps the full SEO title
// from index.html; every other page gets "<Page> | CloudOps Insight".

const SITE_NAME = "CloudOps Insight";

const HOME_TITLE =
  "CloudOps Insight | AWS Cloud Monitoring, FinOps & Cost Optimization";

const ROUTE_TITLES: Record<string, string> = {
  "/about": "About",
  "/login": "Sign in",
  "/signup": "Create account",
  "/verify-email": "Verify email",
  "/resend-verification": "Resend verification email",
  "/forgot-password": "Forgot password",
  "/reset-password": "Reset password",
  "/invitations/accept": "Accept invitation",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Use",
  "/impressum": "Impressum",
  "/contact": "Contact",
  "/dashboard": "Dashboard",
  "/cloud/accounts": "AWS accounts",
  "/cloud/resources": "Resources",
  "/monitoring/incidents": "Incidents",
  "/costs": "Cost overview",
  "/costs/explorer": "Cost explorer",
  "/costs/budgets": "Budgets",
  "/costs/recommendations": "Recommendations",
  "/settings": "Settings",
};

// Resolve the browser-tab title for a pathname.
export function titleForPath(pathname: string): string {
  const path =
    pathname.length > 1
      ? pathname.replace(/\/+$/, "")
      : pathname;

  if (path === "/" || path === "") {
    return HOME_TITLE;
  }

  const pageTitle =
    ROUTE_TITLES[path] ??
    (path.startsWith("/cloud/resources/")
      ? "Resource details"
      : "Page not found");

  return `${pageTitle} | ${SITE_NAME}`;
}

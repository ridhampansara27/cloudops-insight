// Import the backend dashboard response type.
import type {
  DashboardSummaryResponse,
} from "@/types/api";

// Import the dashboard presentation model.
import type {
  DashboardMetric,
} from "@/types/dashboard";

// Import shared currency formatting.
import {
  formatCurrency,
} from "@/lib/formatters";

// Convert backend dashboard data into MetricCard models.
export function createDashboardMetrics(
  summary: DashboardSummaryResponse,
): DashboardMetric[] {
  // Return the six KPI cards used by the dashboard.
  return [
    {
      // Uniquely identify the total-resource metric.
      id: "total-resources",

      // Display the metric label.
      label: "Tracked resources",

      // Convert the numeric backend value to display text.
      value: String(
        summary.total_resources,
      ),

      // Historical comparison is not available from the API yet.
      change: 0,

      // Use neutral because no historical comparison exists yet.
      trend: "neutral",

      // Explain the source of the value.
      comparisonLabel:
        "Live inventory",

      // Select the resource metric visual treatment.
      category: "resources",
    },
    {
      // Uniquely identify the healthy-resource metric.
      id: "healthy-resources",

      // Display the metric label.
      label: "Healthy",

      // Display the number of healthy resources.
      value: String(
        summary.healthy_resources,
      ),

      // Historical comparison is not available yet.
      change: 0,

      // Avoid claiming an artificial trend.
      trend: "neutral",

      // Explain that this represents current health.
      comparisonLabel:
        "Current health",

      // Use the health visual category.
      category: "health",
    },
    {
      // Uniquely identify the critical-resource metric.
      id: "critical-resources",

      // Display the metric label.
      label: "Critical",

      // Display the number of critical resources.
      value: String(
        summary.critical_resources,
      ),

      // Historical comparison is not available yet.
      change: 0,

      // Avoid fabricating a trend.
      trend: "neutral",

      // Explain why these resources matter.
      comparisonLabel:
        "Requires attention",

      // Use the health visual category.
      category: "health",
    },
    {
      // Uniquely identify the active-incident metric.
      id: "active-incidents",

      // Display the metric label.
      label: "Active incidents",

      // Display unresolved incident count.
      value: String(
        summary.active_incidents,
      ),

      // Historical incident comparison is not available yet.
      change: 0,

      // Avoid claiming an artificial incident trend.
      trend: "neutral",

      // Explain the incident state represented.
      comparisonLabel:
        "Currently unresolved",

      // Use incident visual treatment.
      category: "incidents",
    },
    {
      // Uniquely identify the current-month cost metric.
      id: "month-to-date-cost",

      // Display the metric label.
      label: "MTD cost",

      // Format the backend monetary value using its currency.
      value: formatCurrency(
        summary.month_to_date_cost,
        summary.currency,
      ),

      // Previous-period comparison is not available yet.
      change: 0,

      // Avoid creating a fake cost trend.
      trend: "neutral",

      // Explain the represented billing period.
      comparisonLabel:
        "Current month",

      // Use cost visual treatment.
      category: "cost",
    },
    {
      // Uniquely identify the optimization-saving metric.
      id: "potential-savings",

      // Display the metric label.
      label: "Quantified savings",

      // Format the backend saving opportunity.
      value: formatCurrency(
        summary.potential_monthly_savings,
        summary.currency,
      ),

      // Historical recommendation comparison is not available yet.
      change: 0,

      // Avoid claiming a fake trend.
      trend: "neutral",

      // Explain where the saving opportunity comes from.
      comparisonLabel:
        "Available estimates",

      // Use savings visual treatment.
      category: "savings",
    },
  ];
}

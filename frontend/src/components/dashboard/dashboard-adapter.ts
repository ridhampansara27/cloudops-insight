// Import shared monetary formatting.
import {
  formatCurrency,
} from "@/lib/formatters";

// Import frontend dashboard models.
import type {
  DashboardMetric,
} from "@/types/dashboard";

// Import FastAPI response models.
import type {
  DashboardSummaryResponse,
} from "@/types/api";


// Convert FastAPI dashboard data into existing MetricCard models.
export function createDashboardMetrics(
  // Receive the backend dashboard summary.
  summary: DashboardSummaryResponse,
): DashboardMetric[] {
  // Return the six primary operational metrics.
  return [
    {
      // Identify the metric.
      id: "resources",

      // Display the metric title.
      label: "Resources",

      // Display discovered resource count.
      value:
        summary.total_resources.toString(),

      // No comparison API exists yet.
      change: 0,

      // Mark comparison as neutral.
      trend: "neutral",

      // Explain that this is live inventory information.
      comparisonLabel:
        "Live inventory",

      // Select the resource icon.
      category: "resources",
    },
    {
      // Identify healthy resources.
      id: "healthy",

      // Display metric label.
      label: "Healthy",

      // Display healthy resource count.
      value:
        summary.healthy_resources.toString(),

      // No previous-period comparison exists yet.
      change: 0,

      // Avoid showing a misleading trend.
      trend: "neutral",

      // Explain data source.
      comparisonLabel:
        "Current health",

      // Select the health icon.
      category: "health",
    },
    {
      // Identify critical resources.
      id: "critical",

      // Display the critical resource label.
      label: "Critical",

      // Display critical resource count.
      value:
        summary.critical_resources.toString(),

      // No comparison yet.
      change: 0,

      // Use neutral trend.
      trend: "neutral",

      // Explain the metric.
      comparisonLabel:
        "Requires attention",

      // Use health styling.
      category: "health",
    },
    {
      // Identify incident KPI.
      id: "incidents",

      // Display active incident label.
      label: "Active incidents",

      // Display active incident count.
      value:
        summary.active_incidents.toString(),

      // No comparison yet.
      change: 0,

      // Do not imply movement.
      trend: "neutral",

      // Explain current state.
      comparisonLabel:
        "Currently unresolved",

      // Use incident visual treatment.
      category: "incidents",
    },
    {
      // Identify current cloud spending.
      id: "mtd-cost",

      // Display cost label.
      label: "MTD cost",

      // Format the real billing value.
      value: formatCurrency(
        summary.month_to_date_cost,
        summary.currency,
      ),

      // No previous-period API yet.
      change: 0,

      // Avoid a fake trend.
      trend: "neutral",

      // Explain reporting period.
      comparisonLabel:
        "Current month",

      // Use cost icon.
      category: "cost",
    },
    {
      // Identify optimization savings.
      id: "savings",

      // Display savings label.
      label: "Potential savings",

      // Format current open optimization savings.
      value: formatCurrency(
        summary.potential_monthly_savings,
        summary.currency,
      ),

      // No comparison yet.
      change: 0,

      // Mark as neutral.
      trend: "neutral",

      // Explain the value.
      comparisonLabel:
        "Open recommendations",

      // Use optimization icon.
      category: "savings",
    },
  ];
}
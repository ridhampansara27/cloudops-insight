// Define the allowed trend directions.
export type TrendDirection = "up" | "down" | "neutral";

// Define one overview KPI card.
export interface DashboardMetric {
  // Uniquely identify the metric.
  id: string;

  // Display the KPI label.
  label: string;

  // Display the formatted metric value.
  value: string;

  // Display the relative change.
  change: number;

  // Define whether the relative change moved up or down.
  trend: TrendDirection;

  // Explain what period is being compared.
  comparisonLabel: string;

  // Define the metric category for visual treatment.
  category:
    | "resources"
    | "health"
    | "incidents"
    | "cost"
    | "forecast"
    | "savings";
}

// Define one daily cost data point.
export interface DailyCostPoint {
  // Store the ISO-formatted date.
  date: string;

  // Store the current-period daily cost.
  current: number;

  // Store the previous-period daily cost.
  previous: number;

  // Store an optional forecast value.
  forecast?: number;
}

// Define one high-cost resource.
export interface HighCostResource {
  // Uniquely identify the resource.
  id: string;

  // Display the cloud resource name.
  name: string;

  // Display the AWS service.
  service: string;

  // Display the resource environment.
  environment: string;

  // Display the resource health.
  health: "healthy" | "warning" | "critical";

  // Store the month-to-date cost.
  monthToDateCost: number;

  // Store the forecasted month-end cost.
  forecastCost: number;

  // Store the cost-change percentage.
  changePercentage: number;
}

// Define one active incident.
export interface ActiveIncident {
  // Uniquely identify the incident.
  id: string;

  // Display the affected resource.
  resourceName: string;

  // Display the incident title.
  title: string;

  // Define operational severity.
  severity: "critical" | "high" | "medium" | "low";

  // Store the incident's opening time.
  startedAt: string;

  // Display the current incident status.
  status: "open" | "acknowledged" | "investigating";
}
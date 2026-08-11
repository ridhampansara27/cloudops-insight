// Define one cost aggregation grouped by cloud service.
export interface ServiceCost {
  // AWS service name displayed to the user.
  service: string;

  // Month-to-date cost for this service.
  cost: number;

  // Percentage of total cloud spending.
  percentage: number;

  // Percentage change compared with the previous equivalent period.
  changePercentage: number;
}

// Define one daily cost point used by the trend chart.
export interface CostTrendPoint {
  // ISO-formatted billing date.
  date: string;

  // Actual cost for the current period.
  currentCost: number;

  // Cost for the comparable previous period.
  previousCost: number;

  // Optional forecasted cost for future dates.
  forecastCost?: number;
}

// Define cost grouped by deployment environment.
export interface EnvironmentCost {
  // Environment name.
  environment:
    | "development"
    | "staging"
    | "production";

  // Month-to-date cost attributed to the environment.
  cost: number;

  // Percentage of total environment-attributed spending.
  percentage: number;

  // Cost change relative to the previous period.
  changePercentage: number;
}

// Define the overall monthly cost summary.
export interface CostSummary {
  // Actual month-to-date spend.
  monthToDateCost: number;

  // Comparable spend during the previous period.
  previousPeriodCost: number;

  // Predicted total spend for the current month.
  forecastCost: number;

  // Configured monthly budget.
  monthlyBudget: number;

  // Potential monthly savings from recommendations.
  potentialSavings: number;

  // Percentage change against the previous period.
  costChangePercentage: number;

  // Timestamp of the latest billing synchronization.
  lastUpdatedAt: string;
}

// Define one cost anomaly shown by the FinOps interface.
export interface CostAnomaly {
  // Unique anomaly identifier.
  id: string;

  // Human-readable anomaly title.
  title: string;

  // AWS service associated with the anomaly.
  service: string;

  // Optional affected resource name.
  resourceName?: string;

  // Operational severity.
  severity:
    | "high"
    | "medium"
    | "low";

  // Amount by which observed cost exceeded the expected baseline.
  unexpectedCost: number;

  // Percentage deviation from expected cost.
  deviationPercentage: number;

  // Timestamp when the anomaly was detected.
  detectedAt: string;

  // Current anomaly workflow status.
  status:
    | "open"
    | "investigating"
    | "resolved";
}

// Define one detailed resource-level cost record.
export interface ResourceCostRecord {
  // Internal record identifier.
  id: string;

  // Internal CloudOps resource identifier.
  resourceId: string;

  // Display name of the AWS resource.
  resourceName: string;

  // AWS service.
  service: string;

  // Deployment environment.
  environment:
    | "development"
    | "staging"
    | "production";

  // AWS region.
  region: string;

  // Cost incurred during the record's billing period.
  cost: number;

  // Previous comparable cost.
  previousCost: number;

  // Forecasted month-end cost.
  forecastCost: number;

  // Percentage cost change.
  changePercentage: number;

  // Resource owner used for cost allocation.
  owner: string;
}
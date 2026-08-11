// Import all cost-domain type definitions.
import type {
  CostAnomaly,
  CostSummary,
  CostTrendPoint,
  EnvironmentCost,
  ResourceCostRecord,
  ServiceCost,
} from "@/types/cost";

// Export the overall mock cost summary.
export const costSummary: CostSummary = {
  // Month-to-date AWS spending.
  monthToDateCost: 428.3,

  // Comparable previous-period spending.
  previousPeriodCost: 401.05,

  // Forecasted month-end AWS spending.
  forecastCost: 612.4,

  // Monthly demonstration budget.
  monthlyBudget: 650,

  // Potential savings identified by optimization rules.
  potentialSavings: 96.2,

  // Percentage increase against the previous period.
  costChangePercentage: 6.8,

  // Simulated billing synchronization time.
  lastUpdatedAt: "2026-08-08T12:00:00Z",
};

// Export mock AWS service cost distribution.
export const serviceCosts: ServiceCost[] = [
  {
    service: "Amazon RDS",
    cost: 132.4,
    percentage: 30.9,
    changePercentage: 8.7,
  },
  {
    service: "Amazon EC2",
    cost: 118.2,
    percentage: 27.6,
    changePercentage: 11.4,
  },
  {
    service: "Amazon EKS",
    cost: 72.18,
    percentage: 16.8,
    changePercentage: 14.9,
  },
  {
    service: "Elastic Load Balancing",
    cost: 44.32,
    percentage: 10.3,
    changePercentage: 4.2,
  },
  {
    service: "Amazon S3",
    cost: 28.91,
    percentage: 6.8,
    changePercentage: -2.7,
  },
  {
    service: "Other",
    cost: 32.29,
    percentage: 7.6,
    changePercentage: 1.4,
  },
];

// Export cost grouped by deployment environment.
export const environmentCosts: EnvironmentCost[] = [
  {
    environment: "production",
    cost: 301.8,
    percentage: 70.5,
    changePercentage: 8.4,
  },
  {
    environment: "staging",
    cost: 79.5,
    percentage: 18.6,
    changePercentage: 5.1,
  },
  {
    environment: "development",
    cost: 47,
    percentage: 10.9,
    changePercentage: -4.7,
  },
];

// Export daily cost data for the current and previous period.
export const costTrendPoints: CostTrendPoint[] = [
  {
    date: "2026-08-01",
    currentCost: 48.2,
    previousCost: 43.8,
  },
  {
    date: "2026-08-02",
    currentCost: 51.4,
    previousCost: 46.1,
  },
  {
    date: "2026-08-03",
    currentCost: 54.8,
    previousCost: 49.6,
  },
  {
    date: "2026-08-04",
    currentCost: 52.1,
    previousCost: 50.4,
  },
  {
    date: "2026-08-05",
    currentCost: 56.7,
    previousCost: 51.8,
  },
  {
    date: "2026-08-06",
    currentCost: 58.9,
    previousCost: 53.4,
  },
  {
    date: "2026-08-07",
    currentCost: 54.2,
    previousCost: 52.9,
  },
  {
    date: "2026-08-08",
    currentCost: 52,
    previousCost: 53.05,
  },
  {
    date: "2026-08-09",
    currentCost: 0,
    previousCost: 51.7,
    forecastCost: 54.9,
  },
  {
    date: "2026-08-10",
    currentCost: 0,
    previousCost: 48.9,
    forecastCost: 56.4,
  },
  {
    date: "2026-08-11",
    currentCost: 0,
    previousCost: 51.3,
    forecastCost: 58.1,
  },
  {
    date: "2026-08-12",
    currentCost: 0,
    previousCost: 50.6,
    forecastCost: 57.2,
  },
];

// Export mock cost anomalies.
export const costAnomalies: CostAnomaly[] = [
  {
    id: "ANOM-001",
    title: "Unexpected EC2 compute increase",
    service: "Amazon EC2",
    resourceName: "analytics-worker-01",
    severity: "high",
    unexpectedCost: 14.8,
    deviationPercentage: 42.6,
    detectedAt: "2026-08-08T08:30:00Z",
    status: "investigating",
  },
  {
    id: "ANOM-002",
    title: "RDS daily cost above baseline",
    service: "Amazon RDS",
    resourceName: "cloudops-prod-postgres",
    severity: "medium",
    unexpectedCost: 7.4,
    deviationPercentage: 18.9,
    detectedAt: "2026-08-07T13:20:00Z",
    status: "open",
  },
  {
    id: "ANOM-003",
    title: "New load-balancer usage detected",
    service: "Elastic Load Balancing",
    resourceName: "cloudops-public-alb",
    severity: "low",
    unexpectedCost: 3.1,
    deviationPercentage: 11.2,
    detectedAt: "2026-08-06T10:45:00Z",
    status: "open",
  },
];

// Export resource-level cost data.
export const resourceCostRecords: ResourceCostRecord[] = [
  {
    id: "cost-001",
    resourceId: "resource-002",
    resourceName: "cloudops-prod-postgres",
    service: "Amazon RDS",
    environment: "production",
    region: "eu-central-1",
    cost: 84.62,
    previousCost: 75.76,
    forecastCost: 121.4,
    changePercentage: 11.7,
    owner: "Platform Team",
  },
  {
    id: "cost-002",
    resourceId: "resource-003",
    resourceName: "analytics-worker-01",
    service: "Amazon EC2",
    environment: "staging",
    region: "eu-central-1",
    cost: 46.81,
    previousCost: 38.24,
    forecastCost: 68.3,
    changePercentage: 22.4,
    owner: "Analytics Team",
  },
  {
    id: "cost-003",
    resourceId: "resource-001",
    resourceName: "cloudops-prod-api",
    service: "Amazon EC2",
    environment: "production",
    region: "eu-central-1",
    cost: 38.42,
    previousCost: 36.11,
    forecastCost: 54.7,
    changePercentage: 6.4,
    owner: "Platform Team",
  },
  {
    id: "cost-004",
    resourceId: "resource-004",
    resourceName: "cloudops-public-alb",
    service: "Elastic Load Balancing",
    environment: "production",
    region: "eu-central-1",
    cost: 31.27,
    previousCost: 29.89,
    forecastCost: 44.8,
    changePercentage: 4.6,
    owner: "Platform Team",
  },
  {
    id: "cost-005",
    resourceId: "resource-005",
    resourceName: "cloudops-assets",
    service: "Amazon S3",
    environment: "production",
    region: "eu-central-1",
    cost: 3.82,
    previousCost: 3.91,
    forecastCost: 5.1,
    changePercentage: -2.3,
    owner: "Frontend Team",
  },
  {
    id: "cost-006",
    resourceId: "resource-006",
    resourceName: "cloudops-dev-api",
    service: "Amazon EC2",
    environment: "development",
    region: "eu-central-1",
    cost: 8.24,
    previousCost: 10.02,
    forecastCost: 10.2,
    changePercentage: -17.8,
    owner: "Platform Team",
  },
];
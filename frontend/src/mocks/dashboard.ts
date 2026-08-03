// Import dashboard type definitions.
import type {
  ActiveIncident,
  DailyCostPoint,
  DashboardMetric,
  HighCostResource,
} from "@/types/dashboard";

// Export mock top-level dashboard metrics.
export const dashboardMetrics: DashboardMetric[] = [
  {
    id: "total-resources",
    label: "Total resources",
    value: "143",
    change: 8.3,
    trend: "up",
    comparisonLabel: "vs. last month",
    category: "resources",
  },
  {
    id: "healthy-resources",
    label: "Healthy resources",
    value: "127",
    change: 2.4,
    trend: "up",
    comparisonLabel: "vs. last week",
    category: "health",
  },
  {
    id: "open-incidents",
    label: "Open incidents",
    value: "7",
    change: 12.5,
    trend: "down",
    comparisonLabel: "vs. last week",
    category: "incidents",
  },
  {
    id: "month-cost",
    label: "Month-to-date cost",
    value: "€428.30",
    change: 6.8,
    trend: "up",
    comparisonLabel: "vs. previous period",
    category: "cost",
  },
  {
    id: "forecast-cost",
    label: "Forecasted cost",
    value: "€612.40",
    change: 4.2,
    trend: "up",
    comparisonLabel: "vs. previous month",
    category: "forecast",
  },
  {
    id: "potential-savings",
    label: "Potential savings",
    value: "€96.20",
    change: 18.7,
    trend: "up",
    comparisonLabel: "identified this month",
    category: "savings",
  },
];

// Export mock daily cost data.
export const dailyCostPoints: DailyCostPoint[] = [
  { date: "2026-07-20", current: 12.8, previous: 10.4 },
  { date: "2026-07-21", current: 13.5, previous: 11.2 },
  { date: "2026-07-22", current: 14.1, previous: 12.5 },
  { date: "2026-07-23", current: 13.9, previous: 11.8 },
  { date: "2026-07-24", current: 15.6, previous: 12.9 },
  { date: "2026-07-25", current: 16.2, previous: 13.1 },
  { date: "2026-07-26", current: 15.8, previous: 13.6 },
  { date: "2026-07-27", current: 17.4, previous: 14.2 },
  { date: "2026-07-28", current: 16.9, previous: 14.8 },
  { date: "2026-07-29", current: 18.1, previous: 15.1 },
  { date: "2026-07-30", current: 18.8, previous: 15.5 },
  { date: "2026-07-31", current: 19.4, previous: 16.0 },
  { date: "2026-08-01", current: 20.1, previous: 16.8 },
  { date: "2026-08-02", current: 21.3, previous: 17.2 },
];

// Export mock highest-cost resources.
export const highCostResources: HighCostResource[] = [
  {
    id: "rds-1",
    name: "cloudops-prod-postgres",
    service: "Amazon RDS",
    environment: "production",
    health: "healthy",
    monthToDateCost: 84.62,
    forecastCost: 121.4,
    changePercentage: 11.7,
  },
  {
    id: "eks-1",
    name: "platform-production",
    service: "Amazon EKS",
    environment: "production",
    health: "warning",
    monthToDateCost: 72.18,
    forecastCost: 104.7,
    changePercentage: 16.2,
  },
  {
    id: "ec2-1",
    name: "analytics-worker-01",
    service: "Amazon EC2",
    environment: "staging",
    health: "warning",
    monthToDateCost: 46.81,
    forecastCost: 68.3,
    changePercentage: 22.4,
  },
  {
    id: "alb-1",
    name: "cloudops-public-alb",
    service: "Elastic Load Balancing",
    environment: "production",
    health: "healthy",
    monthToDateCost: 31.27,
    forecastCost: 44.8,
    changePercentage: 4.6,
  },
];

// Export mock active incidents.
export const activeIncidents: ActiveIncident[] = [
  {
    id: "INC-2026-0042",
    resourceName: "analytics-worker-01",
    title: "Sustained CPU utilization above 90%",
    severity: "critical",
    startedAt: "2026-08-03T12:42:00Z",
    status: "investigating",
  },
  {
    id: "INC-2026-0041",
    resourceName: "platform-production",
    title: "Two Kubernetes Pods unavailable",
    severity: "high",
    startedAt: "2026-08-03T11:18:00Z",
    status: "acknowledged",
  },
  {
    id: "INC-2026-0039",
    resourceName: "cloudops-prod-postgres",
    title: "Database connections approaching threshold",
    severity: "medium",
    startedAt: "2026-08-03T08:04:00Z",
    status: "open",
  },
];
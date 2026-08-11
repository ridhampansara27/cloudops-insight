// Define the AWS services initially supported by CloudOps Insight.
export type CloudService =
  | "EC2"
  | "RDS"
  | "ECS"
  | "ALB"
  | "S3";

// Define the supported deployment environments.
export type ResourceEnvironment =
  | "development"
  | "staging"
  | "production";

// Define the operational health states calculated by CloudOps Insight.
export type ResourceHealth =
  | "healthy"
  | "warning"
  | "critical"
  | "unknown";

// Define the native AWS lifecycle state of a resource.
export type CloudResourceState =
  | "running"
  | "stopped"
  | "available"
  | "active"
  | "unknown";

// Describe one discovered cloud resource.
export interface CloudResource {
  // Internal CloudOps Insight identifier.
  id: string;

  // Human-readable resource name.
  name: string;

  // Cloud-provider-native resource identifier.
  resourceId: string;

  // AWS service category.
  service: CloudService;

  // AWS region containing the resource.
  region: string;

  // Deployment environment inferred from tags.
  environment: ResourceEnvironment;

  // Resource owner or responsible team.
  owner: string;

  // Native AWS lifecycle state.
  cloudState: CloudResourceState;

  // Health state calculated by CloudOps Insight.
  health: ResourceHealth;

  // Average CPU utilization when available.
  cpuUtilization?: number;

  // Average memory utilization when available.
  memoryUtilization?: number;

  // Month-to-date resource cost.
  monthToDateCost: number;

  // Forecasted month-end resource cost.
  forecastCost: number;

  // Cost change relative to the previous comparable period.
  costChangePercentage: number;

  // Timestamp of the most recent resource synchronization.
  lastSyncedAt: string;

  // Resource tags used for filtering and ownership.
  tags: Record<string, string>;
}
// Import the incident model.
import type { Incident } from "@/types/incident";

// Export realistic operational incidents.
export const mockIncidents: Incident[] = [
  {
    id: "INC-2026-0042",
    title: "Sustained CPU utilization above 90%",
    resourceName: "analytics-worker-01",
    resourceId: "resource-003",
    severity: "critical",
    status: "investigating",
    description:
      "Average EC2 CPU utilization remained above 90% for more than fifteen minutes.",
    startedAt: "2026-08-11T08:42:00Z",
    assignedTo: "Platform Team",
  },
  {
    id: "INC-2026-0041",
    title: "Database connections approaching limit",
    resourceName: "cloudops-prod-postgres",
    resourceId: "resource-002",
    severity: "high",
    status: "acknowledged",
    description:
      "RDS database connection utilization exceeded the configured warning threshold.",
    startedAt: "2026-08-11T07:18:00Z",
    assignedTo: "Platform Team",
  },
  {
    id: "INC-2026-0039",
    title: "Elevated ALB target response time",
    resourceName: "cloudops-public-alb",
    resourceId: "resource-004",
    severity: "medium",
    status: "open",
    description:
      "Application Load Balancer target response time increased above baseline.",
    startedAt: "2026-08-10T19:04:00Z",
  },
  {
    id: "INC-2026-0034",
    title: "Development API unavailable",
    resourceName: "cloudops-dev-api",
    resourceId: "resource-006",
    severity: "low",
    status: "resolved",
    description:
      "Development EC2 instance was intentionally stopped.",
    startedAt: "2026-08-09T12:10:00Z",
    resolvedAt: "2026-08-09T12:30:00Z",
    assignedTo: "Platform Team",
  },
];
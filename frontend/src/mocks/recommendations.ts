// Import recommendation model.
import type { Recommendation } from "@/types/recommendation";

// Export demonstration recommendations.
export const mockRecommendations: Recommendation[] = [
  {
    id: "REC-001",
    title: "Downsize underutilized EC2 instance",
    description:
      "Reduce instance size because average CPU utilization remains low.",
    resourceName: "cloudops-prod-api",
    service: "Amazon EC2",
    estimatedMonthlySavings: 21.4,
    risk: "medium",
    confidence: "high",
    status: "open",
    evidence:
      "Seven-day average CPU utilization is 8.6%, with peak utilization below 24%.",
  },
  {
    id: "REC-002",
    title: "Stop development EC2 outside working hours",
    description:
      "Schedule the development instance to run only during active development periods.",
    resourceName: "cloudops-dev-api",
    service: "Amazon EC2",
    estimatedMonthlySavings: 18.7,
    risk: "low",
    confidence: "high",
    status: "open",
    evidence:
      "The instance has no production traffic and is idle for approximately fourteen hours per day.",
  },
  {
    id: "REC-003",
    title: "Review RDS instance sizing",
    description:
      "Database utilization indicates potential capacity reduction.",
    resourceName: "cloudops-prod-postgres",
    service: "Amazon RDS",
    estimatedMonthlySavings: 31.8,
    risk: "medium",
    confidence: "medium",
    status: "open",
    evidence:
      "CPU and connection utilization remain below provisioned capacity during most observed periods.",
  },
  {
    id: "REC-004",
    title: "Configure S3 lifecycle policy",
    description:
      "Move older objects to lower-cost storage classes.",
    resourceName: "cloudops-assets",
    service: "Amazon S3",
    estimatedMonthlySavings: 8.6,
    risk: "low",
    confidence: "medium",
    status: "open",
    evidence:
      "A large portion of stored objects has not been accessed during the observed period.",
  },
];
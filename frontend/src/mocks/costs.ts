// Import the cost type.
import type { ServiceCost } from "@/types/cost";

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
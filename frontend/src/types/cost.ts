// Define one cost aggregation grouped by cloud service.
export interface ServiceCost {
  // AWS service name.
  service: string;

  // Month-to-date cost.
  cost: number;

  // Percentage of total cloud cost.
  percentage: number;

  // Change compared with the previous equivalent period.
  changePercentage: number;
}
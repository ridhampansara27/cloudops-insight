// Import the budget model used by the frontend.
import type { Budget } from "@/types/budget";

// Export realistic demonstration budgets.
export const mockBudgets: Budget[] = [
  {
    // Identify this budget.
    id: "budget-001",

    // Display the budget name.
    name: "AWS Monthly Budget",

    // Apply the budget to the entire account.
    scopeType: "account",

    // Display the account scope.
    scopeValue: "Primary AWS Account",

    // Configure the monthly limit.
    monthlyLimit: 650,

    // Store current spending.
    currentSpend: 428.3,

    // Store projected month-end spending.
    forecastSpend: 612.4,

    // Warn when eighty percent is consumed.
    warningThreshold: 80,

    // Consider one hundred percent critical.
    criticalThreshold: 100,

    // Store the calculated state.
    status: "warning",
  },

  {
    // Identify the production budget.
    id: "budget-002",

    // Display the production budget name.
    name: "Production Environment",

    // Scope this budget to one environment.
    scopeType: "environment",

    // Define the environment.
    scopeValue: "production",

    // Configure the monthly production limit.
    monthlyLimit: 400,

    // Store current production spending.
    currentSpend: 301.8,

    // Store forecast production spending.
    forecastSpend: 417.5,

    // Configure the warning threshold.
    warningThreshold: 80,

    // Configure the critical threshold.
    criticalThreshold: 100,

    // Forecast currently exceeds the budget.
    status: "forecast-exceeded",
  },

  {
    // Identify the RDS budget.
    id: "budget-003",

    // Display its name.
    name: "Database Services",

    // Scope the budget to an AWS service.
    scopeType: "service",

    // Define the service.
    scopeValue: "Amazon RDS",

    // Set the monthly service budget.
    monthlyLimit: 180,

    // Store current RDS spending.
    currentSpend: 132.4,

    // Store projected RDS spending.
    forecastSpend: 168.2,

    // Configure warning threshold.
    warningThreshold: 80,

    // Configure critical threshold.
    criticalThreshold: 100,

    // This budget remains healthy.
    status: "healthy",
  },
];
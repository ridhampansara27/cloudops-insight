// Define the dimensions against which a budget can be applied.
export type BudgetScopeType =
  | "account"
  | "service";

// Define the possible calculated budget states.
export type BudgetStatus =
  | "healthy"
  | "warning"
  | "forecast-exceeded";

// Define one CloudOps budget.
export interface Budget {
  // Store the unique frontend identifier.
  id: string;

  // Store the human-readable budget name.
  name: string;

  // Define the dimension used by this budget.
  scopeType: BudgetScopeType;

  // Store the selected scope value.
  scopeValue: string;

  // Store the configured monthly spending limit.
  monthlyLimit: number;

  // Store current month-to-date spending.
  currentSpend: number;

  // Store the expected month-end spending.
  forecastSpend: number;

  // Define the percentage at which warning status begins.
  warningThreshold: number;

  // Define the percentage considered critical.
  criticalThreshold: number;

  // Store the current calculated state.
  status: BudgetStatus;
}

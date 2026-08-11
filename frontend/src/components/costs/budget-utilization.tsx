// Import the budget icon.
import {
  CircleAlert,
  WalletCards,
} from "lucide-react";

// Import the reusable progress component.
import { Progress } from "@/components/ui/progress";

// Import reusable card components.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import the overall cost summary.
import { costSummary } from "@/mocks/costs";

// Format one monetary value as euros.
function formatCurrency(value: number): string {
  // Create a localized currency formatter.
  return new Intl.NumberFormat("de-DE", {
    // Use currency formatting.
    style: "currency",

    // Display euros.
    currency: "EUR",
  }).format(value);
}

// Export the monthly budget status card.
export function BudgetUtilization() {
  // Calculate how much of the monthly budget has already been consumed.
  const actualUtilization =
    (costSummary.monthToDateCost /
      costSummary.monthlyBudget) *
    100;

  // Calculate projected month-end budget utilization.
  const forecastUtilization =
    (costSummary.forecastCost /
      costSummary.monthlyBudget) *
    100;

  // Determine whether the forecast is likely to exceed the budget.
  const forecastExceeded =
    forecastUtilization > 100;

  // Render the budget card.
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Monthly budget</CardTitle>

            <CardDescription className="mt-1">
              Actual spending and month-end forecast against the configured
              budget.
            </CardDescription>
          </div>

          <WalletCards className="size-5 text-primary" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <div className="mb-2 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Current spend
              </p>

              <p className="text-2xl font-semibold">
                {formatCurrency(costSummary.monthToDateCost)}
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              of {formatCurrency(costSummary.monthlyBudget)}
            </p>
          </div>

          <Progress
            // Keep the displayed progress between zero and one hundred.
            value={Math.min(actualUtilization, 100)}
          />

          <p className="mt-2 text-xs text-muted-foreground">
            {actualUtilization.toFixed(1)}% of the monthly budget used
          </p>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <CircleAlert
              className={
                forecastExceeded
                  ? "mt-0.5 size-4 text-rose-500"
                  : "mt-0.5 size-4 text-amber-500"
              }
            />

            <div>
              <p className="text-sm font-medium">
                Forecast: {formatCurrency(costSummary.forecastCost)}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Projected utilization is{" "}
                {forecastUtilization.toFixed(1)}% of the configured monthly
                budget.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
// Import FinOps KPI icons.
import {
  CircleDollarSign,
  Lightbulb,
  TrendingUp,
  WalletCards,
} from "lucide-react";

// Import FinOps dashboard components.
import { BudgetUtilization } from "@/components/costs/budget-utilization";
import { CostAnomalies } from "@/components/costs/cost-anomalies";
import { CostTrendChart } from "@/components/costs/cost-trend-chart";
import { EnvironmentCosts } from "@/components/costs/environment-costs";

// Reuse the service-cost component already used by the main dashboard.
import { CostByService } from "@/components/dashboard/cost-by-service";

// Import reusable card components.
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import the overall mock cost summary.
import { costSummary } from "@/mocks/costs";

// Format euro values consistently.
function formatCurrency(value: number): string {
  // Create the localized currency formatter.
  return new Intl.NumberFormat("de-DE", {
    // Format as currency.
    style: "currency",

    // Use euros.
    currency: "EUR",
  }).format(value);
}

// Export the complete Cost Overview page.
export function CostOverviewPage() {
  // Render the FinOps overview.
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            FinOps overview
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Cloud cost management
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Track AWS spending, understand cost drivers, compare periods,
            monitor budgets, and identify optimization opportunities.
          </p>
        </div>

        <div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
          Billing data updated{" "}
          {new Date(
            costSummary.lastUpdatedAt,
          ).toLocaleString("de-DE")}
        </div>
      </div>

      {/* Display the four primary FinOps KPIs. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Month-to-date
            </CardTitle>

            <CircleDollarSign className="size-4 text-primary" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(costSummary.monthToDateCost)}
            </p>

            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              +{costSummary.costChangePercentage.toFixed(1)}% vs. previous
              period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Month-end forecast
            </CardTitle>

            <TrendingUp className="size-4 text-primary" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(costSummary.forecastCost)}
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              Estimated final monthly spend
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly budget
            </CardTitle>

            <WalletCards className="size-4 text-primary" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(costSummary.monthlyBudget)}
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              {(
                (costSummary.monthToDateCost /
                  costSummary.monthlyBudget) *
                100
              ).toFixed(1)}
              % consumed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Potential savings
            </CardTitle>

            <Lightbulb className="size-4 text-primary" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(costSummary.potentialSavings)}
            </p>

            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
              Identified optimization opportunity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Display the primary billing trend chart. */}
      <CostTrendChart />

      {/* Compare service and environment allocation. */}
      <div className="grid gap-6 xl:grid-cols-2">
        <CostByService />

        <EnvironmentCosts />
      </div>

      {/* Display budget health and current cost anomalies. */}
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <BudgetUtilization />

        <CostAnomalies />
      </div>
    </section>
  );
}
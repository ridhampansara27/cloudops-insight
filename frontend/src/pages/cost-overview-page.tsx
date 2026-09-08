// Import FinOps icons.
import {
  CircleDollarSign,
  Database,
  Lightbulb,
  TrendingUp,
  WalletCards,
} from "lucide-react";

// Import cost components.
import {
  BudgetUtilization,
} from "@/components/costs/budget-utilization";

import {
  CostTrendChart,
} from "@/components/costs/cost-trend-chart";

import {
  CostByService,
} from "@/components/dashboard/cost-by-service";

// Import reusable API states.
import {
  PageErrorState,
} from "@/components/shared/page-error-state";

import {
  PageLoadingState,
} from "@/components/shared/page-loading-state";

// Import cards.
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import real hooks.
import {
  useBudgets,
} from "@/features/budgets/api/budgets-api";

import {
  useCostSummary,
} from "@/features/costs/api/costs-api";

import {
  useRecommendations,
} from "@/features/recommendations/api/recommendations-api";

// Import formatting helpers.
import {
  formatCurrency,
  toNumber,
} from "@/lib/formatters";


// Export real Cost Overview page.
export function CostOverviewPage() {
  // Load real costs.
  const costQuery =
    useCostSummary();

  // Load configured budgets.
  const budgetsQuery =
    useBudgets();

  // Load optimization recommendations.
  const recommendationsQuery =
    useRecommendations();

  // Handle loading.
  if (
    costQuery.isPending ||
    budgetsQuery.isPending ||
    recommendationsQuery.isPending
  ) {
    return (
      <PageLoadingState />
    );
  }

  // Handle backend failures.
  if (
    costQuery.isError ||
    budgetsQuery.isError ||
    recommendationsQuery.isError
  ) {
    return (
      <PageErrorState
        title="Unable to load FinOps data"
        description="Cost, budget or recommendation data could not be retrieved."
        onRetry={() => {
          // Retry costs.
          void costQuery.refetch();

          // Retry budgets.
          void budgetsQuery.refetch();

          // Retry recommendations.
          void recommendationsQuery.refetch();
        }}
      />
    );
  }

  // Store cost response.
  const costs =
    costQuery.data;

  // Find the first active account-level budget.
  const accountBudget =
    budgetsQuery.data.find(
      (budget) =>
        budget.is_active &&
        budget.scope_type ===
          "account",
    );

  // Normalize budget amount.
  const monthlyBudget =
    accountBudget
      ? toNumber(
          accountBudget.monthly_limit,
        )
      : null;

  // Calculate total savings from open recommendations.
  const potentialSavings =
    recommendationsQuery.data
      .filter(
        (
          recommendation,
        ) =>
          recommendation.status ===
          "open",
      )
      .reduce(
        (
          total,
          recommendation,
        ) =>
          total +
          toNumber(
            recommendation
              .estimated_monthly_savings ?? 0,
          ),
        0,
      );

  // Determine number of days represented by the API response.
  const observedDays =
    costs.daily.length;

  // Calculate average observed daily spend.
  const averageDailyCost =
    observedDays === 0
      ? 0
      : costs.month_to_date /
        observedDays;

  // Determine number of days in the current month.
  const now =
    new Date();

  // Calculate current month's final day.
  const daysInMonth =
    new Date(
      now.getFullYear(),
      now.getMonth() +
        1,
      0,
    ).getDate();

  // Create a clearly labeled simple run-rate estimate.
  const forecast =
    observedDays === 0
      ? null
      : averageDailyCost *
        daysInMonth;

  // Find the most recent billing date.
  const latestBillingDate =
    costs.daily.length >
    0
      ? costs.daily[
          costs.daily
            .length - 1
        ].date
      : null;

  // Render FinOps page.
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
            Cost information now comes from the FastAPI and PostgreSQL
            backend.
          </p>
        </div>

        <div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
          {latestBillingDate
            ? `Latest billing record: ${latestBillingDate}`
            : "No billing records available"}
        </div>
      </div>

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
              {formatCurrency(
                costs.month_to_date,
                costs.currency,
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Run-rate estimate
            </CardTitle>

            <TrendingUp className="size-4 text-primary" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {forecast ===
              null
                ? "N/A"
                : formatCurrency(
                    forecast,
                    costs.currency,
                  )}
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              Derived from available daily records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Account budget
            </CardTitle>

            <WalletCards className="size-4 text-primary" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {monthlyBudget ===
              null
                ? "Not configured"
                : formatCurrency(
                    monthlyBudget,
                    costs.currency,
                  )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quantified savings
            </CardTitle>

            <Lightbulb className="size-4 text-primary" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(
                potentialSavings,
                costs.currency,
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <CostTrendChart
        points={
          costs.daily
        }
        currency={
          costs.currency
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <CostByService
          services={
            costs.by_service
          }
          total={
            costs.month_to_date
          }
          currency={
            costs.currency
          }
        />

        <BudgetUtilization
          currentSpend={
            costs.month_to_date
          }
          monthlyBudget={
            monthlyBudget
          }
          forecast={
            forecast
          }
          currency={
            costs.currency
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Billing data coverage
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <Database className="size-5 text-primary" />

            <p className="mt-3 text-2xl font-semibold">
              {
                costs.daily.length
              }
            </p>

            <p className="text-sm text-muted-foreground">
              Daily billing records
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <CircleDollarSign className="size-5 text-primary" />

            <p className="mt-3 text-2xl font-semibold">
              {
                costs.by_service
                  .length
              }
            </p>

            <p className="text-sm text-muted-foreground">
              Cost service categories
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
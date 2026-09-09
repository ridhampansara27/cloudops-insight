// Import FinOps command-center icons.
import {
  ArrowRight,
  CalendarDays,
  CircleCheckBig,
  CircleDollarSign,
  Database,
  Lightbulb,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react";

// Import navigation links.
import {
  Link,
} from "react-router-dom";

// Import FinOps visualizations.
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

// Import reusable UI.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import real backend hooks.
import {
  useBudgets,
} from "@/features/budgets/api/budgets-api";

import {
  useCostSummary,
} from "@/features/costs/api/costs-api";

import {
  useRecommendations,
} from "@/features/recommendations/api/recommendations-api";

// Import billing-safe formatting helpers.
import {
  formatBillingAmount,
  formatCurrency,
  toNumber,
} from "@/lib/formatters";


// Format a genuine AWS billing date for compact UI presentation.
function formatBillingDate(
  value: string | null,
): string {
  // Explicitly represent missing data.
  if (
    value ===
    null
  ) {
    return "Not available";
  }

  // Convert the backend date into a browser Date.
  const date =
    new Date(
      value,
    );

  // Avoid displaying Invalid Date when provider data is malformed.
  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  // Return a compact localized date.
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}


// Export the genuine API-driven FinOps overview.
export function CostOverviewPage() {
  // Load real AWS cost information.
  const costQuery =
    useCostSummary();

  // Load real configured budgets.
  const budgetsQuery =
    useBudgets();

  // Load genuine optimization recommendations.
  const recommendationsQuery =
    useRecommendations();

  // Render first-load state.
  if (
    costQuery.isPending ||
    budgetsQuery.isPending ||
    recommendationsQuery.isPending
  ) {
    return (
      <PageLoadingState />
    );
  }

  // Render recoverable API failure.
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
          void costQuery.refetch();
          void budgetsQuery.refetch();
          void recommendationsQuery.refetch();
        }}
      />
    );
  }

  // Store successful cost response.
  const costs =
    costQuery.data;

  // Store active/open optimization opportunities.
  const openRecommendations =
    recommendationsQuery.data.filter(
      (
        recommendation,
      ) =>
        recommendation.status ===
        "open",
    );

  // Find the first active account-level budget.
  const accountBudget =
    budgetsQuery.data.find(
      (
        budget,
      ) =>
        budget.is_active &&
        budget.scope_type ===
          "account",
    );

  // Normalize the configured account budget.
  const monthlyBudget =
    accountBudget
      ? toNumber(
          accountBudget.monthly_limit,
        )
      : null;

  // Calculate quantified savings only from genuine open recommendations.
  const potentialSavings =
    openRecommendations.reduce(
      (
        total,
        recommendation,
      ) =>
        total +
        toNumber(
          recommendation
            .estimated_monthly_savings ??
            0,
        ),
      0,
    );

  // Count the number of daily Cost Explorer records returned.
  const observedDays =
    costs.daily.length;

  // Calculate the same explicitly simple run-rate used previously.
  const averageDailyCost =
    observedDays ===
    0
      ? 0
      : costs.month_to_date /
        observedDays;

  // Determine the number of days in the current calendar month.
  const now =
    new Date();

  const daysInMonth =
    new Date(
      now.getFullYear(),
      now.getMonth() +
        1,
      0,
    ).getDate();

  // Extrapolate only when genuine daily records exist.
  const forecast =
    observedDays ===
    0
      ? null
      : averageDailyCost *
        daysInMonth;

  // Extract valid billing dates for coverage context.
  const billingDates =
    costs.daily
      .map(
        (
          point,
        ) =>
          new Date(
            point.date,
          ).getTime(),
      )
      .filter(
        (
          value,
        ) =>
          Number.isFinite(
            value,
          ),
      )
      .sort(
        (
          left,
          right,
        ) =>
          left -
          right,
      );

  // Determine earliest synchronized billing record.
  const firstBillingDate =
    billingDates.length >
    0
      ? new Date(
          billingDates[
            0
          ],
        ).toISOString()
      : null;

  // Determine latest synchronized billing record.
  const latestBillingDate =
    billingDates.length >
    0
      ? new Date(
          billingDates[
            billingDates.length -
            1
          ],
        ).toISOString()
      : null;

  // Treat any genuine cost record or amount as billing availability.
  const hasBillingData =
    costs.daily.length >
      0 ||
    costs.by_service.length >
      0 ||
    costs.month_to_date !==
      0;

  // Read the backend budget evaluation state when available.
  const budgetStatus =
    accountBudget?.evaluation_status ??
    "not configured";

  // Define the command-center KPI strip.
  const metrics = [
    {
      label:
        "Month-to-date",

      value:
        formatBillingAmount(
          costs.month_to_date,
          costs.currency,
        ),

      helper:
        hasBillingData
          ? "Current synchronized AWS spend"
          : "Awaiting billing synchronization",

      Icon:
        CircleDollarSign,

      iconClass:
        "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",

      glowClass:
        "from-cyan-400/16 via-transparent to-transparent",
    },

    {
      label:
        "Run-rate estimate",

      value:
        forecast ===
        null
          ? "N/A"
          : formatBillingAmount(
              forecast,
              costs.currency,
            ),

      helper:
        observedDays ===
        0
          ? "No daily records available"
          : `Simple estimate from ${observedDays} daily records`,

      Icon:
        TrendingUp,

      iconClass:
        "border-violet-400/20 bg-violet-400/10 text-violet-300",

      glowClass:
        "from-violet-400/14 via-transparent to-transparent",
    },

    {
      label:
        "Account budget",

      value:
        monthlyBudget ===
        null
          ? "Not configured"
          : formatCurrency(
              monthlyBudget,
              costs.currency,
            ),

      helper:
        monthlyBudget ===
        null
          ? "No active account budget"
          : `Evaluation: ${budgetStatus}`,

      Icon:
        WalletCards,

      iconClass:
        "border-amber-400/20 bg-amber-400/10 text-amber-300",

      glowClass:
        "from-amber-400/14 via-transparent to-transparent",
    },

    {
      label:
        "Quantified savings",

      value:
        formatCurrency(
          potentialSavings,
          costs.currency,
        ),

      helper:
        `${openRecommendations.length} open recommendations`,

      Icon:
        Lightbulb,

      iconClass:
        "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",

      glowClass:
        "from-emerald-400/14 via-transparent to-transparent",
    },
  ];

  // Render the premium FinOps overview.
  return (
    <section className="space-y-6">
      {/* =====================================================
          FinOps hero
          ===================================================== */}
      <Card className="relative overflow-hidden border-primary/15 bg-card/68 py-0">
        {/* Cyan FinOps atmosphere. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-28 -top-40 size-[420px] rounded-full bg-cyan-400/9 blur-3xl"
        />

        {/* Violet secondary depth. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-40 size-[400px] rounded-full bg-violet-500/9 blur-3xl"
        />

        {/* Fine top highlight. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/65 to-transparent"
        />

        <CardContent className="relative grid gap-7 p-6 lg:grid-cols-[1.3fr_0.7fr] lg:p-7">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] text-primary">
              <CircleDollarSign className="size-3.5" />

              FinOps command center
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              AWS cost visibility and
              optimization in one view.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Track synchronized AWS billing, cost trajectory,
              account budgets and quantified optimization opportunities.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="group inline-flex h-10 items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 text-sm font-medium text-primary transition-all hover:-translate-y-0.5 hover:bg-primary/15"
                to="/costs/explorer"
              >
                Open Cost Explorer

                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                className="group inline-flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/30 px-4 text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-accent/35"
                to="/costs/recommendations"
              >
                View recommendations

                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Genuine billing posture. */}
          <div className="rounded-2xl border border-border/65 bg-background/30 p-4 shadow-inner backdrop-blur-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
              Billing posture
            </p>

            <div
              className={
                hasBillingData
                  ? "mt-3 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-3.5"
                  : "mt-3 flex items-start gap-3 rounded-xl border border-sky-400/20 bg-sky-400/8 p-3.5"
              }
            >
              <div
                className={
                  hasBillingData
                    ? "flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-400/15 bg-emerald-400/8 text-emerald-300"
                    : "flex size-9 shrink-0 items-center justify-center rounded-lg border border-sky-400/15 bg-sky-400/8 text-sky-300"
                }
              >
                {hasBillingData ? (
                  <CircleCheckBig className="size-[18px]" />
                ) : (
                  <RefreshCw className="size-[18px]" />
                )}
              </div>

              <div>
                <p
                  className={
                    hasBillingData
                      ? "text-sm font-semibold text-emerald-300"
                      : "text-sm font-semibold text-sky-300"
                  }
                >
                  {hasBillingData
                    ? "Billing data synchronized"
                    : "Awaiting billing data"}
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {hasBillingData
                    ? "AWS Cost Explorer records are available for this environment."
                    : "Cost information will appear after AWS billing synchronization completes."}
                </p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-border/45 rounded-xl border border-border/60 bg-card/30 px-3">
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Daily records
                </span>

                <span className="text-sm font-semibold tabular-nums">
                  {
                    costs.daily.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Service categories
                </span>

                <span className="text-sm font-semibold tabular-nums">
                  {
                    costs.by_service.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Resource-level mapping
                </span>

                <span className="text-sm font-semibold">
                  {costs.resource_level_available
                    ? "Available"
                    : "Unavailable"}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />

              {latestBillingDate
                ? (
                    <span>
                      Latest record{" "}
                      <span className="font-medium text-foreground">
                        {formatBillingDate(
                          latestBillingDate,
                        )}
                      </span>
                    </span>
                  )
                : (
                    <span>
                      No synchronized billing records
                    </span>
                  )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          Financial KPI strip
          ===================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(
          (
            metric,
          ) => {
            // Read the configured icon.
            const Icon =
              metric.Icon;

            return (
              <Card
                className="group relative min-h-[152px] overflow-hidden bg-card/72 py-0"
                key={
                  metric.label
                }
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70 ${metric.glowClass}`}
                />

                <CardContent className="relative flex h-full flex-col justify-between p-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {
                        metric.label
                      }
                    </p>

                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110 ${metric.iconClass}`}
                    >
                      <Icon className="size-[18px]" />
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="truncate text-2xl font-semibold tracking-[-0.035em]">
                      {
                        metric.value
                      }
                    </p>

                    <p className="mt-2 truncate text-xs text-muted-foreground">
                      {
                        metric.helper
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      {/* =====================================================
          Genuine daily cost trajectory
          ===================================================== */}
      <CostTrendChart
        currency={
          costs.currency
        }
        points={
          costs.daily
        }
      />

      {/* =====================================================
          Service allocation + account budget
          ===================================================== */}
      <div className="grid gap-6 xl:grid-cols-2">
        <CostByService
          currency={
            costs.currency
          }
          services={
            costs.by_service
          }
          total={
            costs.month_to_date
          }
        />

        <BudgetUtilization
          currency={
            costs.currency
          }
          currentSpend={
            costs.month_to_date
          }
          forecast={
            forecast
          }
          monthlyBudget={
            monthlyBudget
          }
        />
      </div>

      {/* =====================================================
          Billing coverage
          ===================================================== */}
      <Card className="bg-card/72">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Database className="size-4 text-primary" />

            Billing data coverage
          </CardTitle>

          <CardDescription>
            Visibility into the synchronized records powering this FinOps view.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 pt-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/55 bg-background/20 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              Daily records
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {
                costs.daily.length
              }
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Synchronized billing days
            </p>
          </div>

          <div className="rounded-xl border border-border/55 bg-background/20 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              Services
            </p>

            <p className="mt-3 text-2xl font-semibold">
              {
                costs.by_service.length
              }
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Billing service categories
            </p>
          </div>

          <div className="rounded-xl border border-border/55 bg-background/20 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              Coverage start
            </p>

            <p className="mt-3 text-sm font-semibold">
              {formatBillingDate(
                firstBillingDate,
              )}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Earliest available daily record
            </p>
          </div>

          <div className="rounded-xl border border-border/55 bg-background/20 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              Resource mapping
            </p>

            <p
              className={
                costs.resource_level_available
                  ? "mt-3 text-sm font-semibold text-emerald-300"
                  : "mt-3 text-sm font-semibold text-muted-foreground"
              }
            >
              {costs.resource_level_available
                ? "Available"
                : "Unavailable"}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Resource-level billing attribution
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

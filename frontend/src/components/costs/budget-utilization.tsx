// Import FinOps budget icons.
import {
  ArrowRight,
  Gauge,
  WalletCards,
} from "lucide-react";

// Import navigation.
import {
  Link,
} from "react-router-dom";

// Import reusable UI.
import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Progress,
} from "@/components/ui/progress";

// Import currency formatters.
import {
  formatBillingAmount,
  formatCurrency,
} from "@/lib/formatters";


// Define budget-utilization properties.
interface BudgetUtilizationProps {
  // Current genuine month-to-date spending.
  currentSpend: number;

  // Active account-level monthly budget.
  monthlyBudget:
    | number
    | null;

  // Simple run-rate estimate when daily data exists.
  forecast:
    | number
    | null;

  // Backend billing currency.
  currency: string;
}


// Export the account budget command card.
export function BudgetUtilization({
  currentSpend,
  monthlyBudget,
  forecast,
  currency,
}: BudgetUtilizationProps) {
  // Render an explicit configuration state when no budget exists.
  if (
    monthlyBudget ===
      null ||
    monthlyBudget <=
      0
  ) {
    return (
      <Card className="overflow-hidden bg-card/72">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2">
            <WalletCards className="size-4 text-amber-300" />

            Account budget
          </CardTitle>

          <CardDescription>
            Month-to-date spending against an active account-level budget.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex min-h-[260px] flex-col items-center justify-center text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-amber-400/15 bg-amber-400/8 text-amber-300">
            <WalletCards className="size-5" />
          </div>

          <p className="mt-4 font-semibold">
            No account budget configured
          </p>

          <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Create an active account-level budget to track monthly
            utilization and compare it with synchronized AWS spending.
          </p>

          <Button
            className="mt-5 rounded-xl"
            render={
              <Link to="/costs/budgets" />
            }
            size="sm"
            variant="outline"
          >
            Open Budgets

            <ArrowRight className="ml-2 size-3.5" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Calculate utilization directly from real cost and budget values.
  const utilization =
    (
      currentSpend /
      monthlyBudget
    ) *
    100;

  // Calculate forecast utilization only when a run-rate exists.
  const forecastUtilization =
    forecast ===
    null
      ? null
      : (
          forecast /
          monthlyBudget
        ) *
        100;

  // Clamp only the visual progress bar.
  const visualUtilization =
    Math.min(
      Math.max(
        utilization,
        0,
      ),
      100,
    );

  // Determine budget semantic state.
  const utilizationState =
    utilization >=
    100
      ? {
          label:
            "Budget exceeded",

          className:
            "border-rose-400/20 bg-rose-400/8 text-rose-300",
        }
      : utilization >=
          80
        ? {
            label:
              "Approaching limit",

            className:
              "border-amber-400/20 bg-amber-400/8 text-amber-300",
          }
        : {
            label:
              "Within budget",

            className:
              "border-emerald-400/20 bg-emerald-400/8 text-emerald-300",
          };

  // Render genuine budget utilization.
  return (
    <Card className="overflow-hidden bg-card/72">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <WalletCards className="size-4 text-amber-300" />

              Account budget
            </CardTitle>

            <CardDescription className="mt-1">
              Synchronized AWS spending against the configured monthly limit.
            </CardDescription>
          </div>

          <span
            className={`shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] ${utilizationState.className}`}
          >
            {
              utilizationState.label
            }
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-2">
        {/* Current spend and configured limit. */}
        <div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                Month-to-date
              </p>

              <p className="mt-1 text-3xl font-semibold tracking-[-0.04em]">
                {formatBillingAmount(
                  currentSpend,
                  currency,
                )}
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              of{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(
                  monthlyBudget,
                  currency,
                )}
              </span>
            </p>
          </div>

          <Progress
            className="mt-4"
            value={
              visualUtilization
            }
          />

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {
                utilization.toFixed(
                  1,
                )
              }
              % consumed
            </p>

            <p className="text-xs text-muted-foreground">
              {formatCurrency(
                Math.max(
                  monthlyBudget -
                    currentSpend,
                  0,
                ),
                currency,
              )}
              {" "}
              remaining
            </p>
          </div>
        </div>

        {/* Run-rate context uses only the simple derived estimate. */}
        {forecast !==
          null && (
          <div className="rounded-xl border border-border/55 bg-background/20 p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-violet-400/15 bg-violet-400/8 text-violet-300">
                <Gauge className="size-4" />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Run-rate estimate{" "}
                  {formatBillingAmount(
                    forecast,
                    currency,
                  )}
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Approximately{" "}
                  {forecastUtilization?.toFixed(
                    1,
                  )}
                  % of the configured monthly budget based on
                  available daily billing records.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            className="rounded-xl"
            render={
              <Link to="/costs/budgets" />
            }
            size="sm"
            variant="ghost"
          >
            Manage budgets

            <ArrowRight className="ml-2 size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

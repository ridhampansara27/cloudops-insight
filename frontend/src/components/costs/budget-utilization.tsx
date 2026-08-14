// Import budget icon.
import {
  WalletCards,
} from "lucide-react";

// Import progress bar.
import {
  Progress,
} from "@/components/ui/progress";

// Import card components.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import currency formatter.
import {
  formatCurrency,
} from "@/lib/formatters";


// Define budget-utilization properties.
interface BudgetUtilizationProps {
  // Supply current month spending.
  currentSpend: number;

  // Supply account budget when configured.
  monthlyBudget:
    | number
    | null;

  // Supply calculated run-rate forecast.
  forecast:
    | number
    | null;

  // Supply billing currency.
  currency: string;
}


// Export real budget-utilization card.
export function BudgetUtilization({
  // Receive current spending.
  currentSpend,

  // Receive budget.
  monthlyBudget,

  // Receive forecast.
  forecast,

  // Receive currency.
  currency,
}: BudgetUtilizationProps) {
  // Handle missing budget configuration.
  if (
    monthlyBudget ===
      null ||
    monthlyBudget <= 0
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Monthly budget
          </CardTitle>

          <CardDescription>
            No active account-level budget has been configured.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            Create an account budget from the Budgets page to track
            utilization here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate current budget utilization.
  const utilization =
    (
      currentSpend /
      monthlyBudget
    ) *
    100;

  // Calculate forecast utilization when available.
  const forecastUtilization =
    forecast === null
      ? null
      : (
          forecast /
          monthlyBudget
        ) *
        100;

  // Render budget status.
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>
              Monthly budget
            </CardTitle>

            <CardDescription className="mt-1">
              Real month-to-date cost against the configured account budget.
            </CardDescription>
          </div>

          <WalletCards className="size-5 text-primary" />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div>
          <div className="mb-2 flex items-end justify-between gap-4">
            <p className="text-2xl font-semibold">
              {formatCurrency(
                currentSpend,
                currency,
              )}
            </p>

            <p className="text-sm text-muted-foreground">
              of{" "}
              {formatCurrency(
                monthlyBudget,
                currency,
              )}
            </p>
          </div>

          <Progress
            value={Math.min(
              utilization,
              100,
            )}
          />

          <p className="mt-2 text-xs text-muted-foreground">
            {
              utilization.toFixed(
                1,
              )
            }
            % consumed
          </p>
        </div>

        {forecast !==
          null && (
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium">
              Run-rate estimate:{" "}
              {formatCurrency(
                forecast,
                currency,
              )}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Approximately{" "}
              {forecastUtilization?.toFixed(
                1,
              )}
              % of the configured budget based on available daily
              records.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
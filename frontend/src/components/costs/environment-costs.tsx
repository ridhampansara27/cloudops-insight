// Import the reusable dashboard card components.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import environment-level cost data.
import { environmentCosts } from "@/mocks/costs";

// Format one amount as euro currency.
function formatCurrency(value: number): string {
  // Create the localized currency formatter.
  return new Intl.NumberFormat("de-DE", {
    // Display currency formatting.
    style: "currency",

    // Use euros for current frontend demonstration data.
    currency: "EUR",
  }).format(value);
}

// Export the environment-cost allocation card.
export function EnvironmentCosts() {
  // Render all environment allocations.
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost by environment</CardTitle>

        <CardDescription>
          Month-to-date spending allocated across deployment environments.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {environmentCosts.map((environment) => (
          <div
            // Use the unique environment name as the React key.
            key={environment.environment}

            // Separate each environment visually.
            className="space-y-2"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium capitalize">
                  {environment.environment}
                </p>

                <p className="text-xs text-muted-foreground">
                  {environment.percentage.toFixed(1)}% of allocated spend
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold">
                  {formatCurrency(environment.cost)}
                </p>

                <p
                  className={
                    environment.changePercentage > 0
                      ? "text-xs text-amber-600 dark:text-amber-400"
                      : "text-xs text-emerald-600 dark:text-emerald-400"
                  }
                >
                  {environment.changePercentage > 0 ? "+" : ""}
                  {environment.changePercentage.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                // Use the primary application color for the allocation bar.
                className="h-full rounded-full bg-primary"

                // Scale the bar using the environment's cost percentage.
                style={{
                  width: `${environment.percentage}%`,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
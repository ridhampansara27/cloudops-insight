// Import the dashboard card components.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import mock service-cost data.
import { serviceCosts } from "@/mocks/costs";

// Format a monetary value as euro currency.
function formatCurrency(value: number): string {
  // Use German locale formatting.
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

// Export the cost-by-service component.
export function CostByService() {
  // Render service cost distribution.
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost by service</CardTitle>

        <CardDescription>
          Month-to-date AWS spending grouped by service.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {serviceCosts.map((service) => (
          <div
            className="space-y-2"
            key={service.service}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {service.service}
                </p>

                <p className="text-xs text-muted-foreground">
                  {service.percentage.toFixed(1)}% of spend
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold">
                  {formatCurrency(service.cost)}
                </p>

                <p
                  className={
                    service.changePercentage > 0
                      ? "text-xs text-amber-600 dark:text-amber-400"
                      : "text-xs text-emerald-600 dark:text-emerald-400"
                  }
                >
                  {service.changePercentage > 0 ? "+" : ""}
                  {service.changePercentage.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${service.percentage}%`,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
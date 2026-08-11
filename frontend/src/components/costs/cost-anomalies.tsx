// Import an anomaly icon.
import { TriangleAlert } from "lucide-react";

// Import reusable UI components.
import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import mock anomaly records.
import { costAnomalies } from "@/mocks/costs";

// Format currency consistently.
function formatCurrency(value: number): string {
  // Create the localized euro formatter.
  return new Intl.NumberFormat("de-DE", {
    // Format as currency.
    style: "currency",

    // Use euros.
    currency: "EUR",
  }).format(value);
}

// Export the anomaly list.
export function CostAnomalies() {
  // Render current FinOps anomalies.
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Cost anomalies</CardTitle>

            <CardDescription className="mt-1">
              Unexpected increases compared with normal spending patterns.
            </CardDescription>
          </div>

          <TriangleAlert className="size-5 text-amber-500" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {costAnomalies.map((anomaly) => (
          <div
            // Identify the anomaly uniquely.
            key={anomaly.id}

            // Display one anomaly as a structured card row.
            className="rounded-lg border p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    // Use destructive styling only for high-severity findings.
                    variant={
                      anomaly.severity === "high"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {anomaly.severity}
                  </Badge>

                  <span className="text-xs text-muted-foreground">
                    {anomaly.id}
                  </span>
                </div>

                <p className="mt-3 text-sm font-medium">
                  {anomaly.title}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {anomaly.resourceName ?? anomaly.service}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold">
                  +{formatCurrency(anomaly.unexpectedCost)}
                </p>

                <p className="text-xs text-amber-600 dark:text-amber-400">
                  +{anomaly.deviationPercentage.toFixed(1)}% deviation
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
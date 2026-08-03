// Import the dashboard KPI component.
import { MetricCard } from "@/components/dashboard/metric-card";

// Import badge and card components.
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import mock dashboard data.
import {
  activeIncidents,
  dashboardMetrics,
  highCostResources,
} from "@/mocks/dashboard";

// Format a number as a euro currency value.
function formatCurrency(value: number): string {
  // Use the German locale because the project is being developed in Germany.
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

// Export the main dashboard page.
export function DashboardPage() {
  // Render the operational overview.
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            Cloud operations overview
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Infrastructure health and cost
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Monitor AWS resource health, active incidents, cloud
            spending and optimization opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
          <span className="size-2 rounded-full bg-emerald-500" />
          Resource data updated 2 minutes ago
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Highest-cost resources</CardTitle>

            <CardDescription>
              Month-to-date cloud cost and forecast by resource.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {highCostResources.map((resource) => (
              <div
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                key={resource.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">
                      {resource.name}
                    </p>

                    <Badge
                      variant={
                        resource.health === "healthy"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {resource.health}
                    </Badge>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {resource.service} · {resource.environment}
                  </p>
                </div>

                <div className="grid shrink-0 grid-cols-3 gap-5 text-right text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      MTD
                    </p>

                    <p className="font-medium">
                      {formatCurrency(resource.monthToDateCost)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Forecast
                    </p>

                    <p className="font-medium">
                      {formatCurrency(resource.forecastCost)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Change
                    </p>

                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      +{resource.changePercentage}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active incidents</CardTitle>

            <CardDescription>
              Current infrastructure issues requiring attention.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {activeIncidents.map((incident) => (
              <div
                className="rounded-lg border p-4"
                key={incident.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <Badge
                    variant={
                      incident.severity === "critical"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {incident.severity}
                  </Badge>

                  <span className="text-xs text-muted-foreground">
                    {incident.id}
                  </span>
                </div>

                <p className="mt-3 text-sm font-medium">
                  {incident.title}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {incident.resourceName}
                </p>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="capitalize text-muted-foreground">
                    {incident.status}
                  </span>

                  <span className="text-muted-foreground">
                    Opened recently
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
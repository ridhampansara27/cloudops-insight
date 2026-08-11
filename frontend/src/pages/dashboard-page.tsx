// Import the dashboard KPI component.
import { MetricCard } from "@/components/dashboard/metric-card";

// Import the service-cost visualization.
import { CostByService } from "@/components/dashboard/cost-by-service";

// Import the resource-health visualization.
import { ResourceHealthSummary } from "@/components/dashboard/resource-health-summary";

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
    // Format the value as currency.
    style: "currency",

    // Display the value in euros.
    currency: "EUR",
  }).format(value);
}

// Export the main dashboard page.
export function DashboardPage() {
  // Render the operational overview.
  return (
    <section className="space-y-6">
      {/* Display the dashboard heading and synchronization status. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {/* Display the dashboard title and description. */}
        <div>
          {/* Display the dashboard section label. */}
          <p className="text-sm font-medium text-primary">
            Cloud operations overview
          </p>

          {/* Display the main dashboard heading. */}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Infrastructure health and cost
          </h1>

          {/* Explain the purpose of the dashboard. */}
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Monitor AWS resource health, active incidents, cloud spending and
            optimization opportunities.
          </p>
        </div>

        {/* Display the latest resource synchronization information. */}
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
          {/* Display a green status indicator. */}
          <span className="size-2 rounded-full bg-emerald-500" />

          {/* Display the synchronization status text. */}
          Resource data updated 2 minutes ago
        </div>
      </div>

      {/* Display the six main dashboard KPI cards. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {/* Render one KPI card for each dashboard metric. */}
        {dashboardMetrics.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
          />
        ))}
      </div>

      {/* Display infrastructure health and cloud-cost distribution. */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Show the distribution of healthy, warning, critical, and unknown resources. */}
        <ResourceHealthSummary />

        {/* Show month-to-date AWS spending grouped by service. */}
        <CostByService />
      </div>

      {/* Display expensive resources and active infrastructure incidents. */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Display the highest-cost AWS resources. */}
        <Card>
          {/* Display the card heading. */}
          <CardHeader>
            {/* Display the card title. */}
            <CardTitle>Highest-cost resources</CardTitle>

            {/* Explain the resource-cost information. */}
            <CardDescription>
              Month-to-date cloud cost and forecast by resource.
            </CardDescription>
          </CardHeader>

          {/* Display the high-cost resource list. */}
          <CardContent className="space-y-4">
            {/* Render every high-cost resource. */}
            {highCostResources.map((resource) => (
              <div
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                key={resource.id}
              >
                {/* Display resource identity and health. */}
                <div className="min-w-0">
                  {/* Display resource name and health badge. */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Display the resource name. */}
                    <p className="truncate font-medium">
                      {resource.name}
                    </p>

                    {/* Display the resource health state. */}
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

                  {/* Display service and environment information. */}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {resource.service} · {resource.environment}
                  </p>
                </div>

                {/* Display resource cost information. */}
                <div className="grid shrink-0 grid-cols-3 gap-5 text-right text-sm">
                  {/* Display month-to-date cost. */}
                  <div>
                    {/* Display the cost label. */}
                    <p className="text-xs text-muted-foreground">
                      MTD
                    </p>

                    {/* Display the formatted month-to-date cost. */}
                    <p className="font-medium">
                      {formatCurrency(resource.monthToDateCost)}
                    </p>
                  </div>

                  {/* Display forecasted month-end cost. */}
                  <div>
                    {/* Display the forecast label. */}
                    <p className="text-xs text-muted-foreground">
                      Forecast
                    </p>

                    {/* Display the formatted forecast cost. */}
                    <p className="font-medium">
                      {formatCurrency(resource.forecastCost)}
                    </p>
                  </div>

                  {/* Display cost-change information. */}
                  <div>
                    {/* Display the cost-change label. */}
                    <p className="text-xs text-muted-foreground">
                      Change
                    </p>

                    {/* Display the cost-change percentage. */}
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      +{resource.changePercentage}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Display currently active incidents. */}
        <Card>
          {/* Display the incident card heading. */}
          <CardHeader>
            {/* Display the incident section title. */}
            <CardTitle>Active incidents</CardTitle>

            {/* Explain what is displayed in the incident list. */}
            <CardDescription>
              Current infrastructure issues requiring attention.
            </CardDescription>
          </CardHeader>

          {/* Display active incidents. */}
          <CardContent className="space-y-4">
            {/* Render each active incident. */}
            {activeIncidents.map((incident) => (
              <div
                className="rounded-lg border p-4"
                key={incident.id}
              >
                {/* Display incident severity and identifier. */}
                <div className="flex items-start justify-between gap-3">
                  {/* Display the incident severity. */}
                  <Badge
                    variant={
                      incident.severity === "critical"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {incident.severity}
                  </Badge>

                  {/* Display the incident identifier. */}
                  <span className="text-xs text-muted-foreground">
                    {incident.id}
                  </span>
                </div>

                {/* Display the incident title. */}
                <p className="mt-3 text-sm font-medium">
                  {incident.title}
                </p>

                {/* Display the affected resource name. */}
                <p className="mt-1 text-xs text-muted-foreground">
                  {incident.resourceName}
                </p>

                {/* Display current incident status and timing information. */}
                <div className="mt-3 flex items-center justify-between text-xs">
                  {/* Display the current workflow status. */}
                  <span className="capitalize text-muted-foreground">
                    {incident.status}
                  </span>

                  {/* Display temporary timing information. */}
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
// Import the resource-health badge.
import {
  ResourceHealthBadge,
} from "@/components/shared/resource-health-badge";

// Import dashboard components.
import {
  CostByService,
} from "@/components/dashboard/cost-by-service";

import {
  MetricCard,
} from "@/components/dashboard/metric-card";

import {
  ResourceHealthSummary,
} from "@/components/dashboard/resource-health-summary";

// Import reusable cards.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import reusable loading/error states.
import {
  PageErrorState,
} from "@/components/shared/page-error-state";

import {
  PageLoadingState,
} from "@/components/shared/page-loading-state";

// Import dashboard metric adapter.
import {
  createDashboardMetrics,
} from "@/features/dashboard/dashboard-adapter";

// Import real API hooks.
import {
  useDashboardSummary,
} from "@/features/dashboard/api/dashboard-api";

import {
  useCostSummary,
} from "@/features/costs/api/costs-api";

import {
  useIncidents,
} from "@/features/incidents/api/incidents-api";

import {
  useResources,
} from "@/features/resources/api/resources-api";

// Import shared timestamp formatting.
import {
  formatTimestamp,
} from "@/lib/formatters";


// Export the real API-driven dashboard.
export function DashboardPage() {
  // Load dashboard KPI information.
  const dashboardQuery =
    useDashboardSummary();

  // Load real billing information.
  const costQuery =
    useCostSummary();

  // Load real incidents.
  const incidentsQuery =
    useIncidents();

  // Load enough resources for the dashboard's attention list.
  const resourcesQuery =
    useResources({
      // Load the first page.
      page: 1,

      // The backend currently allows a maximum of one hundred rows.
      pageSize: 100,
    });

  // Display the loading state during the first API load.
  if (
    dashboardQuery.isPending ||
    costQuery.isPending ||
    incidentsQuery.isPending ||
    resourcesQuery.isPending
  ) {
    // Render the reusable loading skeleton.
    return (
      <PageLoadingState />
    );
  }

  // Display an API error when any required dashboard query fails.
  if (
    dashboardQuery.isError ||
    costQuery.isError ||
    incidentsQuery.isError ||
    resourcesQuery.isError
  ) {
    // Render a friendly retry state.
    return (
      <PageErrorState
        title="Unable to load dashboard"
        description="CloudOps Insight could not retrieve the operational dashboard data."
        onRetry={() => {
          // Retry dashboard summary.
          void dashboardQuery.refetch();

          // Retry cost information.
          void costQuery.refetch();

          // Retry incidents.
          void incidentsQuery.refetch();

          // Retry resources.
          void resourcesQuery.refetch();
        }}
      />
    );
  }

  // Store the successful dashboard response.
  const summary =
    dashboardQuery.data;

  // Store the successful cost response.
  const costs =
    costQuery.data;

  // Store real incidents.
  const incidents =
    incidentsQuery.data;

  // Store real resource inventory.
  const resources =
    resourcesQuery.data.items;

  // Convert backend KPIs into MetricCard models.
  const metrics =
    createDashboardMetrics(
      summary,
    );

  // Select resources requiring operational attention.
  const attentionResources =
    resources
      .filter(
        (resource) =>
          resource.health_state ===
            "warning" ||
          resource.health_state ===
            "critical",
      )
      .slice(
        0,
        5,
      );

  // Select unresolved incidents for the dashboard.
  const activeIncidents =
    incidents
      .filter(
        (incident) =>
          incident.status !==
          "resolved",
      )
      .slice(
        0,
        4,
      );

  // Create a lookup from resource UUID to resource name.
  const resourceNames =
    new Map(
      resources.map(
        (resource) => [
          // Store resource UUID.
          resource.id,

          // Store display name.
          resource.name,
        ],
      ),
    );

  // Render the dashboard.
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
            Monitor cloud resource health, incidents, spending and
            optimization opportunities using the real CloudOps API.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
          <span className="size-2 rounded-full bg-emerald-500" />

          API connected
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map(
          (metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
            />
          ),
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ResourceHealthSummary
          total={
            summary.total_resources
          }
          healthy={
            summary.healthy_resources
          }
          warning={
            summary.warning_resources
          }
          critical={
            summary.critical_resources
          }
        />

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
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              Resources requiring attention
            </CardTitle>

            <CardDescription>
              Warning and critical resources from the live inventory.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {attentionResources.length ===
            0 ? (
              <div className="py-8 text-center">
                <p className="font-medium">
                  No unhealthy resources
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  All discovered resources are currently healthy.
                </p>
              </div>
            ) : (
              attentionResources.map(
                (resource) => (
                  <div
                    key={
                      resource.id
                    }
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {
                          resource.name
                        }
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {
                          resource.service
                        }{" "}
                        ·{" "}
                        {
                          resource.region
                        }
                      </p>
                    </div>

                    <ResourceHealthBadge
                      health={
                        resource.health_state
                      }
                    />
                  </div>
                ),
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Active incidents
            </CardTitle>

            <CardDescription>
              Current infrastructure issues requiring attention.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {activeIncidents.length ===
            0 ? (
              <div className="py-8 text-center">
                <p className="font-medium">
                  No active incidents
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  There are currently no unresolved operational incidents.
                </p>
              </div>
            ) : (
              activeIncidents.map(
                (incident) => (
                  <div
                    key={
                      incident.id
                    }
                    className="rounded-lg border p-4"
                  >
                    <p className="text-sm font-medium">
                      {
                        incident.title
                      }
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {resourceNames.get(
                        incident.resource_id,
                      ) ??
                        incident.resource_id}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">
                        {
                          incident.status
                        }
                      </span>

                      <span>
                        {formatTimestamp(
                          incident.started_at,
                        )}
                      </span>
                    </div>
                  </div>
                ),
              )
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
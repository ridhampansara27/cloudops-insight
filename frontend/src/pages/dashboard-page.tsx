// Import command-center icons.
import {
  Activity,
  ArrowRight,
  CircleCheckBig,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

// Import route navigation.
import {
  Link,
} from "react-router-dom";

// Import resource-health presentation.
import {
  ResourceHealthBadge,
} from "@/components/shared/resource-health-badge";

// Import dashboard visualizations.
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

// Import dashboard KPI adapter.
import {
  createDashboardMetrics,
} from "@/features/dashboard/dashboard-adapter";

// Import genuine API hooks.
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

// Import shared display formatting.
import {
  formatBillingAmount,
  formatTimestamp,
} from "@/lib/formatters";


// Export the genuine API-driven command center.
export function DashboardPage() {
  // Load dashboard KPIs.
  const dashboardQuery =
    useDashboardSummary();

  // Load AWS billing information.
  const costQuery =
    useCostSummary();

  // Load genuine incidents.
  const incidentsQuery =
    useIncidents();

  // Load synchronized inventory for attention cards.
  const resourcesQuery =
    useResources({
      page:
        1,
      pageSize:
        100,
    });

  // Keep the existing first-load behavior.
  if (
    dashboardQuery.isPending ||
    costQuery.isPending ||
    incidentsQuery.isPending ||
    resourcesQuery.isPending
  ) {
    return (
      <PageLoadingState />
    );
  }

  // Keep the existing recoverable error behavior.
  if (
    dashboardQuery.isError ||
    costQuery.isError ||
    incidentsQuery.isError ||
    resourcesQuery.isError
  ) {
    return (
      <PageErrorState
        title="Unable to load dashboard"
        description="CloudOps Insight could not retrieve the operational command-center data."
        onRetry={() => {
          void dashboardQuery.refetch();
          void costQuery.refetch();
          void incidentsQuery.refetch();
          void resourcesQuery.refetch();
        }}
      />
    );
  }

  // Store successful API responses.
  const summary =
    dashboardQuery.data;

  const costs =
    costQuery.data;

  const incidents =
    incidentsQuery.data;

  const resources =
    resourcesQuery.data
      .items;

  // Adapt genuine backend KPIs into visual cards.
  const metrics =
    createDashboardMetrics(
      summary,
    );

  // Select only warning and critical resources.
  const attentionResources =
    resources
      .filter(
        (
          resource,
        ) =>
          resource.health_state ===
            "warning" ||
          resource.health_state ===
            "critical",
      )
      .slice(
        0,
        5,
      );

  // Select unresolved incidents only.
  const activeIncidents =
    incidents
      .filter(
        (
          incident,
        ) =>
          incident.status !==
          "resolved",
      )
      .slice(
        0,
        4,
      );

  // Map resource UUIDs to human-readable resource names.
  const resourceNames =
    new Map(
      resources.map(
        (
          resource,
        ) => [
          resource.id,
          resource.name,
        ],
      ),
    );

  // Count genuine warning + critical infrastructure signals.
  const operationalSignals =
    summary.warning_resources +
    summary.critical_resources;

  // Derive a human-readable posture only from genuine backend state.
  const posture =
    summary.critical_resources >
      0 ||
    summary.active_incidents >
      0
      ? {
          label:
            "Action required",
          description:
            "Critical infrastructure or unresolved incidents require review.",
          classes:
            "border-rose-400/20 bg-rose-400/8 text-rose-300",
          Icon:
            ShieldAlert,
        }
      : summary.warning_resources >
          0
        ? {
            label:
              "Watch",
            description:
              "Warning-level resource signals are currently present.",
            classes:
              "border-amber-400/20 bg-amber-400/8 text-amber-300",
            Icon:
              Activity,
          }
        : summary.total_resources ===
            0
          ? {
              label:
                "Awaiting inventory",
              description:
                "No AWS resources have been synchronized into this environment yet.",
              classes:
                "border-sky-400/20 bg-sky-400/8 text-sky-300",
              Icon:
                RefreshCw,
            }
          : {
              label:
                "Stable",
              description:
                "No warning, critical, or unresolved incident signals are present.",
              classes:
                "border-emerald-400/20 bg-emerald-400/8 text-emerald-300",
              Icon:
                CircleCheckBig,
            };

  // Read the selected posture icon.
  const PostureIcon =
    posture.Icon;

  // Render the CloudOps command center.
  return (
    <section className="space-y-7">
      {/* =====================================================
          Command-center hero
          ===================================================== */}
      <Card className="relative overflow-hidden border-primary/20 bg-card/68 py-0 shadow-2xl shadow-black/15">
        {/* Cyan atmosphere. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-40 size-[430px] rounded-full bg-cyan-400/10 blur-3xl"
        />

        {/* Violet atmosphere. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-44 size-[430px] rounded-full bg-violet-500/10 blur-3xl"
        />

        {/* Fine highlight along the top. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
        />

        <CardContent className="relative grid gap-8 p-6 lg:grid-cols-[1.35fr_0.65fr] lg:p-8">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="size-3.5" />

              AWS operations command center
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl xl:text-[44px] xl:leading-[1.05]">
              Infrastructure health,
              cost and operational
              signals in one view.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
              Monitor synchronized AWS inventory, resource health,
              incidents, billing activity and quantified optimization
              opportunities from the same operational workspace.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="group inline-flex h-10 items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 text-sm font-medium text-primary transition-all hover:-translate-y-0.5 hover:bg-primary/15"
                to="/cloud/resources"
              >
                Explore resources

                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                className="group inline-flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/35 px-4 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-accent/40"
                to="/costs"
              >
                Open FinOps

                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Real operational posture panel. */}
          <div className="rounded-2xl border border-border/70 bg-background/35 p-4 shadow-inner backdrop-blur-xl sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
              Operational posture
            </p>

            <div
              className={`mt-3 flex items-start gap-3 rounded-xl border p-3.5 ${posture.classes}`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-current/5">
                <PostureIcon className="size-[18px]" />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  {
                    posture.label
                  }
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {
                    posture.description
                  }
                </p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-border/50 rounded-xl border border-border/60 bg-card/35 px-3">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-muted-foreground">
                  Tracked resources
                </span>

                <span className="text-sm font-semibold tabular-nums">
                  {
                    summary.total_resources
                  }
                </span>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-muted-foreground">
                  Health signals
                </span>

                <span className="text-sm font-semibold tabular-nums">
                  {
                    operationalSignals
                  }
                </span>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-muted-foreground">
                  Open incidents
                </span>

                <span className="text-sm font-semibold tabular-nums">
                  {
                    summary.active_incidents
                  }
                </span>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-muted-foreground">
                  Month-to-date
                </span>

                <span className="text-sm font-semibold">
                  {formatBillingAmount(
                    summary.month_to_date_cost,
                    summary.currency,
                  )}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              {summary.last_resource_sync_at ? (
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-30" />

                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
              ) : (
                <span className="inline-flex size-2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.45)]" />
              )}

              <span>
                {summary.last_resource_sync_at
                  ? `AWS inventory synced ${formatTimestamp(
                      summary.last_resource_sync_at,
                    )}`
                  : "Awaiting first AWS inventory synchronization"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          KPI command strip
          ===================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map(
          (
            metric,
          ) => (
            <MetricCard
              key={
                metric.id
              }
              metric={
                metric
              }
            />
          ),
        )}
      </div>

      {/* =====================================================
          Health + FinOps visualizations
          ===================================================== */}
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
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

      {/* =====================================================
          Operational focus queues
          ===================================================== */}
      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <Card className="bg-card/72">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>
                  Resources requiring attention
                </CardTitle>

                <CardDescription className="mt-1">
                  Warning and critical resources from synchronized inventory.
                </CardDescription>
              </div>

              <Link
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                to="/cloud/resources"
              >
                View inventory
              </Link>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            {attentionResources.length ===
            0 ? (
              <div className="flex min-h-[210px] flex-col items-center justify-center text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/8 text-emerald-300">
                  <CircleCheckBig className="size-5" />
                </div>

                <p className="mt-4 font-semibold">
                  No warning or critical resources
                </p>

                <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  No synchronized inventory currently requires warning or
                  critical attention. Resources without sufficient metrics
                  may remain Unknown.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {attentionResources.map(
                  (
                    resource,
                  ) => (
                    <Link
                      className="group flex flex-col gap-3 rounded-xl border border-border/55 bg-background/20 p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-accent/25 sm:flex-row sm:items-center sm:justify-between"
                      key={
                        resource.id
                      }
                      to={`/cloud/resources/${resource.id}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold group-hover:text-primary">
                          {
                            resource.name
                          }
                        </p>

                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {
                            resource.service
                          }
                          {" ? "}
                          {
                            resource.region
                          }
                          {resource.environment
                            ? ` ? ${resource.environment}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <ResourceHealthBadge
                          health={
                            resource.health_state
                          }
                        />

                        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </Link>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/72">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>
                  Active incidents
                </CardTitle>

                <CardDescription className="mt-1">
                  Current unresolved operational events.
                </CardDescription>
              </div>

              <Link
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                to="/monitoring/incidents"
              >
                Open incidents
              </Link>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            {activeIncidents.length ===
            0 ? (
              <div className="flex min-h-[210px] flex-col items-center justify-center text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl border border-sky-400/15 bg-sky-400/8 text-sky-300">
                  <ShieldAlert className="size-5" />
                </div>

                <p className="mt-4 font-semibold">
                  No active incidents
                </p>

                <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  There are currently no unresolved operational incidents.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeIncidents.map(
                  (
                    incident,
                  ) => (
                    <Link
                      className="group block rounded-xl border border-border/55 bg-background/20 p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-accent/25"
                      key={
                        incident.id
                      }
                      to="/monitoring/incidents"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold group-hover:text-primary">
                            {
                              incident.title
                            }
                          </p>

                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {resourceNames.get(
                              incident.resource_id,
                            ) ??
                              incident.resource_id}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {
                            incident.severity
                          }
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
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
                    </Link>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

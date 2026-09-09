// Import operational resource-detail icons.
import {
  Activity,
  ArrowLeft,
  Box,
  Cloud,
  Clock3,
  Fingerprint,
  Gauge,
  MapPin,
  RefreshCw,
  Server,
  UserRound,
} from "lucide-react";

// Import React Router APIs.
import {
  Link,
  useParams,
} from "react-router-dom";

// Import the genuine CloudWatch chart surface.
import {
  ResourceMetricsChart,
} from "@/components/resources/resource-metrics-chart";

// Import normalized CloudOps health presentation.
import {
  ResourceHealthBadge,
} from "@/components/shared/resource-health-badge";

// Import reusable API states.
import {
  PageErrorState,
} from "@/components/shared/page-error-state";

import {
  PageLoadingState,
} from "@/components/shared/page-loading-state";

// Import reusable UI.
import {
  Badge,
} from "@/components/ui/badge";

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

// Import genuine resource and CloudWatch queries.
import {
  useResource,
  useResourceMetrics,
} from "@/features/resources/api/resources-api";

// Import timestamp presentation.
import {
  formatTimestamp,
} from "@/lib/formatters";


// Format provider metadata without inventing display values.
function formatMetadataValue(
  value: unknown,
): string {
  // Explicitly represent missing provider values.
  if (
    value === null ||
    value === undefined
  ) {
    return "Not available";
  }

  // Render scalar values directly.
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(
      value,
    );
  }

  // Preserve genuine structured provider metadata as JSON.
  return (
    JSON.stringify(
      value,
    ) ??
    "Not available"
  );
}


// Export the operational resource investigation page.
export function ResourceDetailPage() {
  // Read the backend CloudOps resource UUID from the route.
  const {
    resourceId = "",
  } =
    useParams<{
      resourceId:
        string;
    }>();

  // Load the genuine resource inventory object.
  const resourceQuery =
    useResource(
      resourceId,
    );

  // Load the most recent twenty-four hours of stored CloudWatch data.
  const metricsQuery =
    useResourceMetrics(
      resourceId,
      24,
    );

  // Render resource first-load state.
  if (
    resourceQuery.isPending
  ) {
    return (
      <PageLoadingState />
    );
  }

  // Render resource retrieval failure.
  if (
    resourceQuery.isError
  ) {
    return (
      <section className="space-y-6">
        <Button
          className="rounded-xl"
          render={
            <Link to="/cloud/resources" />
          }
          variant="outline"
        >
          <ArrowLeft className="mr-2 size-4" />

          Back to resources
        </Button>

        <PageErrorState
          title="Resource not found"
          description="CloudOps Insight could not retrieve this synchronized AWS resource."
          onRetry={() => {
            void resourceQuery.refetch();
          }}
        />
      </section>
    );
  }

  // Store successful genuine resource information.
  const resource =
    resourceQuery.data;

  // Convert provider metadata into visible key/value entries.
  const metadataEntries =
    Object.entries(
      resource.resource_metadata,
    );

  // Define real inventory-context cards.
  const contextCards = [
    {
      label:
        "Service",

      value:
        resource.service,

      helper:
        resource.resource_type,

      Icon:
        Cloud,

      style:
        "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    },

    {
      label:
        "Region",

      value:
        resource.region,

      helper:
        resource.availability_zone ??
        "Regional resource",

      Icon:
        MapPin,

      style:
        "border-sky-400/20 bg-sky-400/10 text-sky-300",
    },

    {
      label:
        "Owner",

      value:
        resource.owner ??
        "Unassigned",

      helper:
        "Inventory ownership",

      Icon:
        UserRound,

      style:
        "border-violet-400/20 bg-violet-400/10 text-violet-300",
    },

    {
      label:
        "Cloud state",

      value:
        resource.cloud_state,

      helper:
        "Provider-native state",

      Icon:
        Server,

      style:
        "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    },
  ];

  // Render the resource command-center investigation view.
  return (
    <section className="space-y-6">
      {/* =====================================================
          Back navigation
          ===================================================== */}
      <Button
        className="-ml-2 rounded-xl text-muted-foreground hover:text-foreground"
        render={
          <Link to="/cloud/resources" />
        }
        variant="ghost"
      >
        <ArrowLeft className="mr-2 size-4" />

        Resource Explorer
      </Button>

      {/* =====================================================
          Resource identity hero
          ===================================================== */}
      <Card className="relative overflow-hidden border-primary/15 bg-card/68 py-0">
        {/* Add subdued cyan atmosphere. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-40 size-[420px] rounded-full bg-cyan-400/9 blur-3xl"
        />

        {/* Add a secondary violet dimension. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-40 size-[380px] rounded-full bg-violet-500/8 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/65 to-transparent"
        />

        <CardContent className="relative grid gap-6 p-6 lg:grid-cols-[1.35fr_0.65fr] lg:p-7">
          {/* Primary resource identity. */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                <Box className="size-3.5" />

                AWS resource
              </span>

              <ResourceHealthBadge
                health={
                  resource.health_state
                }
              />
            </div>

            <h1 className="mt-5 break-words text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              {
                resource.name
              }
            </h1>

            <div className="mt-3 flex items-start gap-2">
              <Fingerprint className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

              <p className="break-all font-mono text-xs leading-5 text-muted-foreground">
                {
                  resource.provider_resource_id
                }
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Badge
                className="border-cyan-400/20 bg-cyan-400/8 text-cyan-300"
                variant="outline"
              >
                {
                  resource.service
                }
              </Badge>

              <Badge
                className="border-violet-400/20 bg-violet-400/8 capitalize text-violet-200"
                variant="outline"
              >
                {resource.environment ??
                  "Unassigned"}
              </Badge>

              <Badge
                className="border-border/70 bg-muted/35 capitalize"
                variant="outline"
              >
                {
                  resource.cloud_state
                }
              </Badge>

              <Badge
                className="border-sky-400/15 bg-sky-400/7 text-sky-200"
                variant="outline"
              >
                {
                  resource.region
                }
              </Badge>
            </div>
          </div>

          {/* Resource observation/synchronization posture. */}
          <div className="rounded-2xl border border-border/65 bg-background/30 p-4 shadow-inner backdrop-blur-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
              Inventory posture
            </p>

            <div className="mt-4 space-y-1 divide-y divide-border/45">
              <div className="flex items-start justify-between gap-4 pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="size-3.5 text-primary" />

                  Health
                </div>

                <ResourceHealthBadge
                  health={
                    resource.health_state
                  }
                />
              </div>

              <div className="flex items-start justify-between gap-4 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />

                  Last observed
                </div>

                <span className="max-w-[58%] text-right text-xs font-medium text-foreground">
                  {formatTimestamp(
                    resource.last_seen_at,
                  )}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 pt-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="size-3.5" />

                  Last synchronized
                </div>

                <span className="max-w-[58%] text-right text-xs font-medium text-foreground">
                  {formatTimestamp(
                    resource.last_synced_at,
                  )}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          Resource context strip
          ===================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {contextCards.map(
          (
            item,
          ) => {
            // Read configured icon.
            const Icon =
              item.Icon;

            return (
              <Card
                className="group min-h-[135px] bg-card/72 py-0"
                key={
                  item.label
                }
              >
                <CardContent className="flex h-full flex-col justify-between p-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {
                        item.label
                      }
                    </p>

                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110 ${item.style}`}
                    >
                      <Icon className="size-[18px]" />
                    </div>
                  </div>

                  <div className="mt-5 min-w-0">
                    <p className="truncate text-xl font-semibold capitalize tracking-tight">
                      {
                        item.value
                      }
                    </p>

                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {
                        item.helper
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
          Inventory identity + provider metadata
          ===================================================== */}
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-card/72">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="size-4 text-primary" />

              Resource identity
            </CardTitle>

            <CardDescription>
              Provider and CloudOps inventory identifiers.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-0 pt-1">
            <div className="border-b border-border/45 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                Resource type
              </p>

              <p className="mt-1.5 break-all text-sm font-medium">
                {
                  resource.resource_type
                }
              </p>
            </div>

            <div className="border-b border-border/45 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                Availability zone
              </p>

              <p className="mt-1.5 text-sm font-medium">
                {resource.availability_zone ??
                  "Regional resource"}
              </p>
            </div>

            <div className="border-b border-border/45 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                Cloud account UUID
              </p>

              <p className="mt-1.5 break-all font-mono text-xs text-foreground">
                {
                  resource.cloud_account_id
                }
              </p>
            </div>

            <div className="py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                ARN
              </p>

              <p className="mt-1.5 break-all font-mono text-xs leading-5 text-foreground">
                {resource.arn ??
                  "Not available"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/72">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Server className="size-4 text-violet-300" />

              Provider metadata
            </CardTitle>

            <CardDescription>
              Provider-specific properties captured during AWS discovery.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            {metadataEntries.length ===
            0 ? (
              <div className="flex min-h-[230px] flex-col items-center justify-center text-center">
                <div className="flex size-11 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/8 text-violet-300">
                  <Server className="size-5" />
                </div>

                <p className="mt-4 font-semibold">
                  No provider metadata
                </p>

                <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  No additional provider-specific properties were stored
                  for this resource.
                </p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {metadataEntries.map(
                  ([
                    key,
                    value,
                  ]) => (
                    <div
                      className="rounded-xl border border-border/55 bg-background/20 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-accent/25"
                      key={
                        key
                      }
                    >
                      <p className="break-all text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
                        {
                          key
                        }
                      </p>

                      <p className="mt-2 break-all text-xs font-medium leading-5 text-foreground">
                        {formatMetadataValue(
                          value,
                        )}
                      </p>
                    </div>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* =====================================================
          CloudWatch monitoring
          ===================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="size-4 text-sky-300" />

              <p className="text-sm font-semibold">
                CloudWatch monitoring
              </p>
            </div>

            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
              Performance metrics
            </h2>

            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              CloudWatch metric samples synchronized from AWS for the
              most recent 24-hour monitoring window.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground">
            24 hour window
          </div>
        </div>

        {/* Distinguish real request loading from a genuine empty response. */}
        {metricsQuery.isPending ? (
          <Card className="bg-card/72">
            <CardContent className="flex min-h-[280px] flex-col items-center justify-center">
              <RefreshCw className="size-5 animate-spin text-primary" />

              <p className="mt-3 text-sm font-medium">
                Loading CloudWatch metrics
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Reading synchronized monitoring samples.
              </p>
            </CardContent>
          </Card>
        ) : metricsQuery.isError ? (
          <Card className="bg-card/72">
            <CardContent className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <Activity className="size-6 text-rose-300" />

              <p className="mt-3 font-semibold">
                Unable to load CloudWatch metrics
              </p>

              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Resource information is available, but recent monitoring
                samples could not be retrieved.
              </p>

              <Button
                className="mt-4 rounded-xl"
                onClick={() => {
                  void metricsQuery.refetch();
                }}
                size="sm"
                variant="outline"
              >
                <RefreshCw className="mr-2 size-3.5" />

                Retry metrics
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ResourceMetricsChart
            series={
              metricsQuery.data ??
              []
            }
          />
        )}
      </div>
    </section>
  );
}

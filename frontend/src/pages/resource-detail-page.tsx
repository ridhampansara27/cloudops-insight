// Import detail-page icons.
import {
  ArrowLeft,
  Cloud,
  MapPin,
  Server,
  UserRound,
} from "lucide-react";

// Import React Router APIs.
import {
  Link,
  useParams,
} from "react-router-dom";

// Import resource metrics chart.
import {
  ResourceMetricsChart,
} from "@/components/resources/resource-metrics-chart";

// Import resource health badge.
import {
  ResourceHealthBadge,
} from "@/components/shared/resource-health-badge";

// Import reusable states.
import {
  PageErrorState,
} from "@/components/shared/page-error-state";

import {
  PageLoadingState,
} from "@/components/shared/page-loading-state";

// Import UI components.
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

// Import resource API queries.
import {
  useResource,
  useResourceMetrics,
} from "@/features/resources/api/resources-api";

// Import timestamp formatting.
import {
  formatTimestamp,
} from "@/lib/formatters";



// Export resource detail page.
export function ResourceDetailPage() {
  // Read the backend resource UUID from the route.
  const {
    resourceId = "",
  } =
    useParams<{
      resourceId: string;
    }>();

  // Load the real resource.
  const resourceQuery =
    useResource(
      resourceId,
    );

  // Load the most recent twenty-four hours of monitoring data.
  const metricsQuery =
    useResourceMetrics(
      resourceId,
      24,
    );

  // Display loading state.
  if (
    resourceQuery.isPending
  ) {
    return (
      <PageLoadingState />
    );
  }

  // Display error state.
  if (
    resourceQuery.isError
  ) {
    return (
      <section className="space-y-6">
        <Button
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
          description="CloudOps Insight could not retrieve this resource."
          onRetry={() => {
            // Retry backend request.
            void resourceQuery.refetch();
          }}
        />
      </section>
    );
  }

  // Store successful resource data.
  const resource =
    resourceQuery.data;

  // Convert metadata into displayable key/value pairs.
  const metadataEntries =
    Object.entries(
      resource.resource_metadata,
    );

  // Render resource detail.
  return (
    <section className="space-y-6">
      <Button
        render={
          <Link to="/cloud/resources" />
        }
        variant="ghost"
        className="-ml-3"
      >
        <ArrowLeft className="mr-2 size-4" />

        Resources
      </Button>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {
                resource.name
              }
            </h1>

            <ResourceHealthBadge
              health={
                resource.health_state
              }
            />
          </div>

          <p className="mt-2 break-all text-sm text-muted-foreground">
            {
              resource.provider_resource_id
            }
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">
              {
                resource.service
              }
            </Badge>

            <Badge
              variant="secondary"
              className="capitalize"
            >
              {resource.environment ??
                "Unassigned"}
            </Badge>

            <Badge
              variant="outline"
              className="capitalize"
            >
              {
                resource.cloud_state
              }
            </Badge>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Last synchronized{" "}
          {formatTimestamp(
            resource.last_synced_at,
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Service
            </CardDescription>
          </CardHeader>

          <CardContent className="flex items-center justify-between">
            <p className="text-xl font-semibold">
              {
                resource.service
              }
            </p>

            <Cloud className="size-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Cloud state
            </CardDescription>
          </CardHeader>

          <CardContent className="flex items-center justify-between">
            <p className="text-xl font-semibold capitalize">
              {
                resource.cloud_state
              }
            </p>

            <Server className="size-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Region
            </CardDescription>
          </CardHeader>

          <CardContent className="flex items-center justify-between">
            <p className="text-xl font-semibold">
              {
                resource.region
              }
            </p>

            <MapPin className="size-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Owner
            </CardDescription>
          </CardHeader>

          <CardContent className="flex items-center justify-between">
            <p className="truncate text-xl font-semibold">
              {resource.owner ??
                "Unassigned"}
            </p>

            <UserRound className="size-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Resource information
            </CardTitle>

            <CardDescription>
              Provider and CloudOps inventory metadata.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">
                Resource type
              </p>

              <p className="mt-1 font-medium">
                {
                  resource.resource_type
                }
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Availability zone
              </p>

              <p className="mt-1 font-medium">
                {resource.availability_zone ??
                  "Regional resource"}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Cloud account
              </p>

              <p className="mt-1 break-all font-medium">
                {
                  resource.cloud_account_id
                }
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                ARN
              </p>

              <p className="mt-1 break-all font-medium">
                {resource.arn ??
                  "Not available"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Provider metadata
            </CardTitle>

            <CardDescription>
              Provider-specific properties stored during resource discovery.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {metadataEntries.length ===
            0 ? (
              <p className="text-sm text-muted-foreground">
                No additional metadata is available.
              </p>
            ) : (
              metadataEntries.map(
                ([
                  key,
                  value,
                ]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between gap-4 rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm">
                      {key}
                    </span>

                    <span className="max-w-[60%] break-all text-right text-sm font-medium">
                      {typeof value ===
                        "string" ||
                      typeof value ===
                        "number" ||
                      typeof value ===
                        "boolean"
                        ? String(
                            value,
                          )
                        : JSON.stringify(
                            value,
                          )}
                    </span>
                  </div>
                ),
              )
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Performance metrics
          </CardTitle>

          <CardDescription>
            CloudWatch metrics will be connected during the AWS
            monitoring integration phase.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ResourceMetricsChart
            series={
              metricsQuery.data ??
              []
            }
          />
        </CardContent>
      </Card>
    </section>
  );
}
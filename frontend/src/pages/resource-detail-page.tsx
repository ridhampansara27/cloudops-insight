// Import icons used by the resource detail screen.
import {
  ArrowLeft,
  Cpu,
  Database,
  DollarSign,
  MapPin,
  Server,
  Tag,
  UserRound,
} from "lucide-react";

// Import React Router utilities.
import {
  Link,
  useParams,
} from "react-router-dom";

// Import the resource-health badge.
import { ResourceHealthBadge } from "@/components/shared/resource-health-badge";

// Import reusable UI components.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import the mock resource inventory.
import { mockResources } from "@/mocks/resources";

// Format euro currency.
function formatCurrency(value: number): string {
  // Create the currency formatter.
  return new Intl.NumberFormat("de-DE", {
    // Display euro formatting.
    style: "currency",

    // Use euros.
    currency: "EUR",
  }).format(value);
}

// Export the resource detail screen.
export function ResourceDetailPage() {
  // Read the dynamic resource ID from the URL.
  const { resourceId } = useParams<{
    resourceId: string;
  }>();

  // Find the requested resource.
  const resource = mockResources.find(
    (item) => item.id === resourceId,
  );

  // Render a friendly state when no resource exists.
  if (!resource) {
    return (
      <section className="space-y-6">
        <Button
          render={<Link to="/cloud/resources" />}
          variant="outline"
        >
          <ArrowLeft className="mr-2 size-4" />

          Back to resources
        </Button>

        <Card>
          <CardContent className="py-16 text-center">
            <h1 className="text-xl font-semibold">
              Resource not found
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              The requested cloud resource does not exist in the current
              inventory.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Render the selected AWS resource.
  return (
    <section className="space-y-6">
      {/* Return to the Resource Explorer. */}
      <Button
        render={<Link to="/cloud/resources" />}
        variant="ghost"
        className="-ml-3"
      >
        <ArrowLeft className="mr-2 size-4" />

        Resources
      </Button>

      {/* Display resource identity. */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {resource.name}
            </h1>

            <ResourceHealthBadge
              health={resource.health}
            />
          </div>

          <p className="mt-2 break-all text-sm text-muted-foreground">
            {resource.resourceId}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">
              {resource.service}
            </Badge>

            <Badge
              variant="secondary"
              className="capitalize"
            >
              {resource.environment}
            </Badge>

            <Badge
              variant="outline"
              className="capitalize"
            >
              {resource.cloudState}
            </Badge>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Last synchronized{" "}
          {new Date(
            resource.lastSyncedAt,
          ).toLocaleString("de-DE")}
        </p>
      </div>

      {/* Display primary operational metrics. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Month-to-date cost
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-semibold">
                {formatCurrency(
                  resource.monthToDateCost,
                )}
              </p>

              <DollarSign className="size-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Forecasted cost
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-semibold">
                {formatCurrency(
                  resource.forecastCost,
                )}
              </p>

              <Database className="size-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              CPU utilization
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-semibold">
                {resource.cpuUtilization === undefined
                  ? "N/A"
                  : `${resource.cpuUtilization.toFixed(
                      1,
                    )}%`}
              </p>

              <Cpu className="size-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Cost change
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-semibold">
                {resource.costChangePercentage > 0
                  ? "+"
                  : ""}
                {resource.costChangePercentage.toFixed(
                  1,
                )}
                %
              </p>

              <Server className="size-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Display resource metadata and tags. */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              Resource information
            </CardTitle>

            <CardDescription>
              Cloud metadata and ownership information.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="size-4 text-muted-foreground" />

              <div>
                <p className="text-xs text-muted-foreground">
                  Region
                </p>

                <p className="text-sm font-medium">
                  {resource.region}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <UserRound className="size-4 text-muted-foreground" />

              <div>
                <p className="text-xs text-muted-foreground">
                  Owner
                </p>

                <p className="text-sm font-medium">
                  {resource.owner}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Server className="size-4 text-muted-foreground" />

              <div>
                <p className="text-xs text-muted-foreground">
                  Service
                </p>

                <p className="text-sm font-medium">
                  Amazon {resource.service}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Resource tags
            </CardTitle>

            <CardDescription>
              Tags used for ownership, environment, and cost allocation.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {Object.entries(
              resource.tags,
            ).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Tag className="size-4 text-muted-foreground" />

                  <span className="text-sm">
                    {key}
                  </span>
                </div>

                <Badge variant="secondary">
                  {value}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Reserve an area for real CloudWatch charts later. */}
      <Card>
        <CardHeader>
          <CardTitle>
            Performance metrics
          </CardTitle>

          <CardDescription>
            CloudWatch metric charts will be connected during the AWS
            monitoring integration phase.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex min-h-60 items-center justify-center rounded-lg border border-dashed bg-muted/20">
            <p className="text-sm text-muted-foreground">
              CPU, memory, network, requests, and service-specific metrics
              will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
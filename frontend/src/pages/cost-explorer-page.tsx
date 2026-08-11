// Import React utilities for derived filtering state.
import {
  useMemo,
  useState,
} from "react";

// Import the search icon.
import { Search } from "lucide-react";

// Import React Router navigation.
import { Link } from "react-router-dom";

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

import { Input } from "@/components/ui/input";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Import resource-level mock cost information.
import { resourceCostRecords } from "@/mocks/costs";

// Format one amount as euro currency.
function formatCurrency(value: number): string {
  // Create a German-localized euro formatter.
  return new Intl.NumberFormat("de-DE", {
    // Display monetary formatting.
    style: "currency",

    // Use euros.
    currency: "EUR",
  }).format(value);
}

// Export the interactive Cost Explorer.
export function CostExplorerPage() {
  // Store free-text search.
  const [searchQuery, setSearchQuery] =
    useState("");

  // Store the service filter.
  const [serviceFilter, setServiceFilter] =
    useState("all");

  // Store the environment filter.
  const [
    environmentFilter,
    setEnvironmentFilter,
  ] = useState("all");

  // Calculate the filtered resource-cost dataset.
  const filteredRecords = useMemo(() => {
    // Normalize search text.
    const normalizedSearch =
      searchQuery.trim().toLowerCase();

    // Apply every active filter.
    return resourceCostRecords.filter((record) => {
      // Match resource name, service, owner, or region.
      const matchesSearch =
        normalizedSearch.length === 0 ||
        record.resourceName
          .toLowerCase()
          .includes(normalizedSearch) ||
        record.service
          .toLowerCase()
          .includes(normalizedSearch) ||
        record.owner
          .toLowerCase()
          .includes(normalizedSearch) ||
        record.region
          .toLowerCase()
          .includes(normalizedSearch);

      // Match the service filter.
      const matchesService =
        serviceFilter === "all" ||
        record.service === serviceFilter;

      // Match the environment filter.
      const matchesEnvironment =
        environmentFilter === "all" ||
        record.environment ===
          environmentFilter;

      // Return only records satisfying all filters.
      return (
        matchesSearch &&
        matchesService &&
        matchesEnvironment
      );
    });
  }, [
    // Recalculate when search changes.
    searchQuery,

    // Recalculate when service changes.
    serviceFilter,

    // Recalculate when environment changes.
    environmentFilter,
  ]);

  // Calculate total cost for the visible records.
  const visibleCost = filteredRecords.reduce(
    // Add each visible record's cost.
    (total, record) => total + record.cost,

    // Start from zero.
    0,
  );

  // Calculate the forecast for the visible records.
  const visibleForecast = filteredRecords.reduce(
    // Add each resource forecast.
    (total, record) =>
      total + record.forecastCost,

    // Start from zero.
    0,
  );

  // Render the Cost Explorer.
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          FinOps analysis
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Cost Explorer
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Analyze cloud spending by resource, service, environment, owner,
          and region.
        </p>
      </div>

      {/* Display current filtered totals. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Matching resources
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {filteredRecords.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Visible MTD cost
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(visibleCost)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Visible forecast
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(visibleForecast)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Display Cost Explorer controls. */}
      <Card>
        <CardHeader>
          <CardTitle>Query</CardTitle>

          <CardDescription>
            Filter resource-level cloud costs using operational dimensions.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                // Store the current search query.
                value={searchQuery}

                // Update search state as the user types.
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value,
                  )
                }

                // Explain searchable dimensions.
                placeholder="Search resource, service, owner or region..."

                // Leave room for the search icon.
                className="pl-9"
              />
            </div>

            <NativeSelect
              // Store the selected service.
              value={serviceFilter}

              // Update the service filter.
              onChange={(event) =>
                setServiceFilter(
                  event.target.value,
                )
              }
            >
              <NativeSelectOption value="all">
                All services
              </NativeSelectOption>

              <NativeSelectOption value="Amazon EC2">
                Amazon EC2
              </NativeSelectOption>

              <NativeSelectOption value="Amazon RDS">
                Amazon RDS
              </NativeSelectOption>

              <NativeSelectOption value="Amazon S3">
                Amazon S3
              </NativeSelectOption>

              <NativeSelectOption value="Elastic Load Balancing">
                Elastic Load Balancing
              </NativeSelectOption>
            </NativeSelect>

            <NativeSelect
              // Store the selected environment.
              value={environmentFilter}

              // Update the environment filter.
              onChange={(event) =>
                setEnvironmentFilter(
                  event.target.value,
                )
              }
            >
              <NativeSelectOption value="all">
                All environments
              </NativeSelectOption>

              <NativeSelectOption value="development">
                Development
              </NativeSelectOption>

              <NativeSelectOption value="staging">
                Staging
              </NativeSelectOption>

              <NativeSelectOption value="production">
                Production
              </NativeSelectOption>
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      {/* Display detailed resource-level cost records. */}
      <Card>
        <CardHeader>
          <CardTitle>Resource costs</CardTitle>

          <CardDescription>
            Month-to-date resource cost, forecast, trend, and ownership.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>MTD</TableHead>
                  <TableHead>Previous</TableHead>
                  <TableHead>Forecast</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="min-w-[200px]">
                          <p className="font-medium">
                            {record.resourceName}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {record.region}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {record.service}
                        </Badge>
                      </TableCell>

                      <TableCell className="capitalize">
                        {record.environment}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {record.owner}
                      </TableCell>

                      <TableCell className="font-medium">
                        {formatCurrency(record.cost)}
                      </TableCell>

                      <TableCell>
                        {formatCurrency(record.previousCost)}
                      </TableCell>

                      <TableCell>
                        {formatCurrency(record.forecastCost)}
                      </TableCell>

                      <TableCell>
                        <span
                          className={
                            record.changePercentage > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }
                        >
                          {record.changePercentage > 0 ? "+" : ""}
                          {record.changePercentage.toFixed(1)}%
                        </span>
                      </TableCell>

                      <TableCell>
                        <Button
                          // Render the action as a resource-detail link.
                          render={
                            <Link
                              to={`/cloud/resources/${record.resourceId}`}
                            />
                          }

                          // Keep the table action visually lightweight.
                          variant="outline"

                          // Use the compact button size.
                          size="sm"
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      // Span every table column.
                      colSpan={9}

                      // Display a centered empty state.
                      className="h-40 text-center"
                    >
                      No cost records match the current query.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
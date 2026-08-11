// Import React utilities.
import {
  // Memoize filtered resource results.
  useMemo,

  // Store filter state.
  useState,
} from "react";

// Import icons used by the page.
import {
  Boxes,
  CircleAlert,
  CircleCheckBig,
  Search,
  TriangleAlert,
} from "lucide-react";

// Import reusable UI components.
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

// Import the resource table.
import { ResourceDataTable } from "@/features/resources/resource-data-table";

// Import the mock AWS resources.
import { mockResources } from "@/mocks/resources";

// Export the Resource Explorer page.
export function ResourceExplorerPage() {
  // Store the free-text search query.
  const [searchQuery, setSearchQuery] =
    useState("");

  // Store the selected AWS service.
  const [serviceFilter, setServiceFilter] =
    useState("all");

  // Store the selected environment.
  const [
    environmentFilter,
    setEnvironmentFilter,
  ] = useState("all");

  // Store the selected health state.
  const [healthFilter, setHealthFilter] =
    useState("all");

  // Calculate the resource inventory after applying all filters.
  const filteredResources = useMemo(() => {
    // Normalize the search string for case-insensitive comparison.
    const normalizedSearch =
      searchQuery.trim().toLowerCase();

    // Return only resources matching all active filters.
    return mockResources.filter((resource) => {
      // Match resource name, identifier, owner, service, or region.
      const matchesSearch =
        normalizedSearch.length === 0 ||
        resource.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        resource.resourceId
          .toLowerCase()
          .includes(normalizedSearch) ||
        resource.owner
          .toLowerCase()
          .includes(normalizedSearch) ||
        resource.service
          .toLowerCase()
          .includes(normalizedSearch) ||
        resource.region
          .toLowerCase()
          .includes(normalizedSearch);

      // Match the selected service.
      const matchesService =
        serviceFilter === "all" ||
        resource.service === serviceFilter;

      // Match the selected environment.
      const matchesEnvironment =
        environmentFilter === "all" ||
        resource.environment ===
          environmentFilter;

      // Match the selected health state.
      const matchesHealth =
        healthFilter === "all" ||
        resource.health === healthFilter;

      // Require every active filter to match.
      return (
        matchesSearch &&
        matchesService &&
        matchesEnvironment &&
        matchesHealth
      );
    });
  }, [
    // Recalculate when search changes.
    searchQuery,

    // Recalculate when the service filter changes.
    serviceFilter,

    // Recalculate when the environment filter changes.
    environmentFilter,

    // Recalculate when the health filter changes.
    healthFilter,
  ]);

  // Calculate total resources.
  const totalResources = mockResources.length;

  // Calculate healthy resources.
  const healthyResources = mockResources.filter(
    (resource) => resource.health === "healthy",
  ).length;

  // Calculate warning resources.
  const warningResources = mockResources.filter(
    (resource) => resource.health === "warning",
  ).length;

  // Calculate critical resources.
  const criticalResources = mockResources.filter(
    (resource) => resource.health === "critical",
  ).length;

  // Render the Resource Explorer.
  return (
    <section className="space-y-6">
      {/* Display the page heading. */}
      <div>
        <p className="text-sm font-medium text-primary">
          Cloud inventory
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Resource Explorer
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Search and analyze discovered AWS infrastructure across
          services, environments, regions, health states, and cost.
        </p>
      </div>

      {/* Display inventory summary cards. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total resources card. */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total resources
            </CardTitle>

            <Boxes className="size-4 text-primary" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {totalResources}
            </p>
          </CardContent>
        </Card>

        {/* Healthy resources card. */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Healthy
            </CardTitle>

            <CircleCheckBig className="size-4 text-emerald-500" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {healthyResources}
            </p>
          </CardContent>
        </Card>

        {/* Warning resources card. */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Warning
            </CardTitle>

            <TriangleAlert className="size-4 text-amber-500" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {warningResources}
            </p>
          </CardContent>
        </Card>

        {/* Critical resources card. */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical
            </CardTitle>

            <CircleAlert className="size-4 text-rose-500" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {criticalResources}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Display search and filtering controls. */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_180px_180px_180px]">
            {/* Search resources. */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                // Store the current search query.
                value={searchQuery}

                // Update search when the user types.
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }

                // Explain searchable fields.
                placeholder="Search name, ID, owner, service or region..."

                // Leave space for the search icon.
                className="pl-9"
              />
            </div>

            {/* AWS service filter. */}
            <NativeSelect
              // Store the current service filter.
              value={serviceFilter}

              // Update the selected service.
              onChange={(event) =>
                setServiceFilter(
                  event.target.value,
                )
              }
            >
              <NativeSelectOption value="all">
                All services
              </NativeSelectOption>

              <NativeSelectOption value="EC2">
                EC2
              </NativeSelectOption>

              <NativeSelectOption value="RDS">
                RDS
              </NativeSelectOption>

              <NativeSelectOption value="ECS">
                ECS
              </NativeSelectOption>

              <NativeSelectOption value="ALB">
                ALB
              </NativeSelectOption>

              <NativeSelectOption value="S3">
                S3
              </NativeSelectOption>
            </NativeSelect>

            {/* Environment filter. */}
            <NativeSelect
              value={environmentFilter}
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

            {/* Health-state filter. */}
            <NativeSelect
              value={healthFilter}
              onChange={(event) =>
                setHealthFilter(
                  event.target.value,
                )
              }
            >
              <NativeSelectOption value="all">
                All health states
              </NativeSelectOption>

              <NativeSelectOption value="healthy">
                Healthy
              </NativeSelectOption>

              <NativeSelectOption value="warning">
                Warning
              </NativeSelectOption>

              <NativeSelectOption value="critical">
                Critical
              </NativeSelectOption>

              <NativeSelectOption value="unknown">
                Unknown
              </NativeSelectOption>
            </NativeSelect>
          </div>

          {/* Display active filter result count. */}
          <p className="mt-4 text-xs text-muted-foreground">
            {filteredResources.length} of{" "}
            {mockResources.length} resources match the current filters.
          </p>
        </CardContent>
      </Card>

      {/* Display the filtered resource inventory. */}
      <ResourceDataTable data={filteredResources} />
    </section>
  );
}
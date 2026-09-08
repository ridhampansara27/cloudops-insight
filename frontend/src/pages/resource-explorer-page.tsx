// Import React state and deferred-value support.
import {
  useDeferredValue,
  useState,
} from "react";

// Import URL-backed search state.
import {
  useSearchParams,
} from "react-router-dom";

// Import resource icons.
import {
  Boxes,
  CircleAlert,
  CircleCheckBig,
  Search,
  TriangleAlert,
} from "lucide-react";

// Import reusable API states.
import {
  PageErrorState,
} from "@/components/shared/page-error-state";

import {
  PageLoadingState,
} from "@/components/shared/page-loading-state";

// Import cards and inputs.
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

// Import resource table.
import {
  ResourceDataTable,
} from "@/features/resources/resource-data-table";

// Import real API hooks.
import {
  useDashboardSummary,
} from "@/features/dashboard/api/dashboard-api";

import {
  useResources,
} from "@/features/resources/api/resources-api";


// Export API-driven Resource Explorer.
export function ResourceExplorerPage() {
  // Store current server page.
  const [
    page,
    setPage,
  ] =
    useState(1);

  // Use ten resources per page.
  const pageSize = 10;

  // Keep resource search in the URL so global search can
  // deep-link directly into the filtered Resource Explorer.
  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams();

  const searchQuery =
    searchParams.get(
      "search",
    ) ??
    "";

  // Defer rapid search-input updates.
  const deferredSearch =
    useDeferredValue(
      searchQuery.trim(),
    );

  // Store service filter.
  const [
    serviceFilter,
    setServiceFilter,
  ] =
    useState("all");

  // Store environment filter.
  const [
    environmentFilter,
    setEnvironmentFilter,
  ] =
    useState("all");

  // Store health filter.
  const [
    healthFilter,
    setHealthFilter,
  ] =
    useState("all");

  // Load global inventory counts.
  const summaryQuery =
    useDashboardSummary();

  // Load the requested backend resource page.
  const resourcesQuery =
    useResources({
      // Send current page.
      page,

      // Send server page size.
      pageSize,

      // Send search text only when non-empty.
      search:
        deferredSearch ||
        undefined,

      // Send service filter only when selected.
      service:
        serviceFilter ===
        "all"
          ? undefined
          : serviceFilter,

      // Send environment only when selected.
      environment:
        environmentFilter ===
        "all"
          ? undefined
          : environmentFilter,

      // Send health only when selected.
      healthState:
        healthFilter ===
        "all"
          ? undefined
          : healthFilter,
    });

  // Display initial loading state.
  if (
    summaryQuery.isPending ||
    resourcesQuery.isPending
  ) {
    return (
      <PageLoadingState />
    );
  }

  // Display backend failure state.
  if (
    summaryQuery.isError ||
    resourcesQuery.isError
  ) {
    return (
      <PageErrorState
        title="Unable to load resources"
        description="The resource inventory could not be retrieved from CloudOps Insight."
        onRetry={() => {
          // Retry inventory summary.
          void summaryQuery.refetch();

          // Retry resource page.
          void resourcesQuery.refetch();
        }}
      />
    );
  }

  // Store global resource summary.
  const summary =
    summaryQuery.data;

  // Store current resource page.
  const resourcePage =
    resourcesQuery.data;

  // Render Resource Explorer.
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          Cloud inventory
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Resource Explorer
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Search and analyze synchronized AWS resources across
          connected cloud accounts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total resources
            </CardTitle>

            <Boxes className="size-4 text-primary" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {
                summary.total_resources
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Healthy
            </CardTitle>

            <CircleCheckBig className="size-4 text-emerald-500" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {
                summary.healthy_resources
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Warning
            </CardTitle>

            <TriangleAlert className="size-4 text-amber-500" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {
                summary.warning_resources
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical
            </CardTitle>

            <CircleAlert className="size-4 text-rose-500" />
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {
                summary.critical_resources
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_180px_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={
                  searchQuery
                }
                onChange={(
                  event,
                ) => {
                  // Store search in the URL.
                  const nextSearch =
                    event.target
                      .value;

                  setSearchParams(
                    (
                      currentParams,
                    ) => {
                      const nextParams =
                        new URLSearchParams(
                          currentParams,
                        );

                      if (
                        nextSearch.trim()
                          .length >
                        0
                      ) {
                        nextParams.set(
                          "search",
                          nextSearch,
                        );
                      } else {
                        nextParams.delete(
                          "search",
                        );
                      }

                      return nextParams;
                    },
                    {
                      replace:
                        true,
                    },
                  );

                  // Return to first server page.
                  setPage(
                    1,
                  );
                }}
                placeholder="Search resource name or provider ID..."
                className="pl-9"
              />
            </div>

            <NativeSelect
              aria-label="Filter resources by service"
              value={
                serviceFilter
              }
              onChange={(
                event,
              ) => {
                // Store service filter.
                setServiceFilter(
                  event.target
                    .value,
                );

                // Reset server page.
                setPage(
                  1,
                );
              }}
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

              <NativeSelectOption value="ELB">
                ALB / ELB
              </NativeSelectOption>

              <NativeSelectOption value="S3">
                S3
              </NativeSelectOption>
            </NativeSelect>

            <NativeSelect
              aria-label="Filter resources by environment"
              value={
                environmentFilter
              }
              onChange={(
                event,
              ) => {
                // Store environment.
                setEnvironmentFilter(
                  event.target
                    .value,
                );

                // Reset server page.
                setPage(
                  1,
                );
              }}
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

            <NativeSelect
              aria-label="Filter resources by health state"
              value={
                healthFilter
              }
              onChange={(
                event,
              ) => {
                // Store health filter.
                setHealthFilter(
                  event.target
                    .value,
                );

                // Reset backend page.
                setPage(
                  1,
                );
              }}
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

          <p className="mt-4 text-xs text-muted-foreground">
            {
              resourcePage.total
            }{" "}
            resources match the current server-side filters.
            {resourcesQuery.isFetching &&
              " Refreshing…"}
          </p>
        </CardContent>
      </Card>

      <ResourceDataTable
        data={
          resourcePage.items
        }
        page={
          resourcePage.page
        }
        pageSize={
          resourcePage.page_size
        }
        total={
          resourcePage.total
        }
        totalPages={
          resourcePage.total_pages
        }
        onPageChange={
          setPage
        }
      />
    </section>
  );
}

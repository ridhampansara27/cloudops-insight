// Import React state helpers used by the server-backed explorer.
import {
  useDeferredValue,
  useState,
} from "react";

// Import URL-backed resource searching.
import {
  useSearchParams,
} from "react-router-dom";

// Import inventory and filter icons.
import {
  Boxes,
  CircleAlert,
  CircleCheckBig,
  Database,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react";

// Import reusable API states.
import {
  PageErrorState,
} from "@/components/shared/page-error-state";

import {
  PageLoadingState,
} from "@/components/shared/page-loading-state";

// Import reusable UI surfaces.
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

import {
  Input,
} from "@/components/ui/input";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

// Import the genuine server-paginated resource table.
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


// Export the genuine AWS Resource Explorer.
export function ResourceExplorerPage() {
  // Track the current one-based backend page.
  const [
    page,
    setPage,
  ] =
    useState(1);

  // Keep the existing controlled server page size.
  const pageSize =
    10;

  // Keep search in the URL so the global header can deep-link here.
  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams();

  // Read current URL search text.
  const searchQuery =
    searchParams.get(
      "search",
    ) ??
    "";

  // Prevent every keystroke from immediately triggering backend work.
  const deferredSearch =
    useDeferredValue(
      searchQuery.trim(),
    );

  // Store genuine backend-supported service filter.
  const [
    serviceFilter,
    setServiceFilter,
  ] =
    useState("all");

  // Store genuine backend-supported environment filter.
  const [
    environmentFilter,
    setEnvironmentFilter,
  ] =
    useState("all");

  // Store genuine backend-supported health filter.
  const [
    healthFilter,
    setHealthFilter,
  ] =
    useState("all");

  // Load global inventory counters.
  const summaryQuery =
    useDashboardSummary();

  // Request only the filtered backend resource page.
  const resourcesQuery =
    useResources({
      page,
      pageSize,

      search:
        deferredSearch ||
        undefined,

      service:
        serviceFilter ===
        "all"
          ? undefined
          : serviceFilter,

      environment:
        environmentFilter ===
        "all"
          ? undefined
          : environmentFilter,

      healthState:
        healthFilter ===
        "all"
          ? undefined
          : healthFilter,
    });

  // Render the first-load skeleton.
  if (
    summaryQuery.isPending ||
    resourcesQuery.isPending
  ) {
    return (
      <PageLoadingState />
    );
  }

  // Render a retryable API failure.
  if (
    summaryQuery.isError ||
    resourcesQuery.isError
  ) {
    return (
      <PageErrorState
        title="Unable to load resources"
        description="The synchronized AWS inventory could not be retrieved."
        onRetry={() => {
          void summaryQuery.refetch();
          void resourcesQuery.refetch();
        }}
      />
    );
  }

  // Store genuine global inventory summary.
  const summary =
    summaryQuery.data;

  // Store the genuine filtered server page.
  const resourcePage =
    resourcesQuery.data;

  // Determine whether any user-controlled filter is active.
  const hasActiveFilters =
    searchQuery.trim()
      .length >
      0 ||
    serviceFilter !==
      "all" ||
    environmentFilter !==
      "all" ||
    healthFilter !==
      "all";

  // Count active filters for command-center context.
  const activeFilterCount =
    [
      searchQuery.trim()
        .length >
        0,
      serviceFilter !==
        "all",
      environmentFilter !==
        "all",
      healthFilter !==
        "all",
    ].filter(
      Boolean,
    ).length;

  // Clear every Resource Explorer filter at once.
  function clearFilters() {
    // Remove only the resource-search query parameter.
    setSearchParams(
      (
        currentParams,
      ) => {
        const nextParams =
          new URLSearchParams(
            currentParams,
          );

        nextParams.delete(
          "search",
        );

        return nextParams;
      },
      {
        replace:
          true,
      },
    );

    // Restore every local filter.
    setServiceFilter(
      "all",
    );

    setEnvironmentFilter(
      "all",
    );

    setHealthFilter(
      "all",
    );

    // Return server pagination to the beginning.
    setPage(
      1,
    );
  }

  // Define summary tiles from genuine backend counters.
  const inventoryMetrics = [
    {
      label:
        "Tracked resources",

      value:
        summary.total_resources,

      helper:
        "Synchronized inventory",

      icon:
        Boxes,

      iconClass:
        "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",

      glowClass:
        "from-cyan-400/15 via-transparent to-transparent",
    },
    {
      label:
        "Healthy",

      value:
        summary.healthy_resources,

      helper:
        "Normal health state",

      icon:
        CircleCheckBig,

      iconClass:
        "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",

      glowClass:
        "from-emerald-400/14 via-transparent to-transparent",
    },
    {
      label:
        "Warning",

      value:
        summary.warning_resources,

      helper:
        "Requires observation",

      icon:
        TriangleAlert,

      iconClass:
        "border-amber-400/20 bg-amber-400/10 text-amber-300",

      glowClass:
        "from-amber-400/14 via-transparent to-transparent",
    },
    {
      label:
        "Critical",

      value:
        summary.critical_resources,

      helper:
        "Requires attention",

      icon:
        CircleAlert,

      iconClass:
        "border-rose-400/20 bg-rose-400/10 text-rose-300",

      glowClass:
        "from-rose-400/14 via-transparent to-transparent",
    },
  ];

  // Render Resource Explorer.
  return (
    <section className="space-y-6">
      {/* =====================================================
          Resource Explorer hero
          ===================================================== */}
      <Card className="relative overflow-hidden border-primary/15 bg-card/68 py-0">
        {/* Add subtle cloud-console depth. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-28 size-72 rounded-full bg-cyan-400/8 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 size-72 rounded-full bg-violet-500/7 blur-3xl"
        />

        <CardContent className="relative flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-7">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] text-primary">
              <Database className="size-3.5" />

              AWS inventory
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Resource Explorer
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Search, filter and inspect synchronized AWS resources
              across connected cloud accounts.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/30 px-4 py-3 backdrop-blur-xl">
            <div className="flex size-9 items-center justify-center rounded-lg border border-cyan-400/15 bg-cyan-400/8 text-cyan-300">
              <Boxes className="size-4" />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Inventory
              </p>

              <p className="mt-0.5 text-sm font-semibold">
                {
                  summary.total_resources
                }
                {" "}
                tracked resources
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          Inventory health strip
          ===================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {inventoryMetrics.map(
          (
            metric,
          ) => {
            // Read the configured icon component.
            const Icon =
              metric.icon;

            // Render one genuine inventory KPI.
            return (
              <Card
                className="group relative min-h-[138px] overflow-hidden bg-card/72 py-0"
                key={
                  metric.label
                }
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70 ${metric.glowClass}`}
                />

                <CardContent className="relative flex h-full flex-col justify-between p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {
                          metric.label
                        }
                      </p>

                      <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
                        {
                          metric.value
                        }
                      </p>
                    </div>

                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110 ${metric.iconClass}`}
                    >
                      <Icon className="size-[18px]" />
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    {
                      metric.helper
                    }
                  </p>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      {/* =====================================================
          Filter command bar
          ===================================================== */}
      <Card className="bg-card/72">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary" />

                Inventory filters
              </CardTitle>

              <CardDescription className="mt-1">
                Filters are applied against the synchronized backend inventory.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <span className="rounded-lg border border-primary/20 bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">
                  {
                    activeFilterCount
                  }
                  {" "}
                  active
                </span>
              )}

              {hasActiveFilters && (
                <Button
                  className="rounded-xl"
                  onClick={
                    clearFilters
                  }
                  size="sm"
                  variant="ghost"
                >
                  <X className="mr-1.5 size-3.5" />

                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          <div className="grid gap-3 lg:grid-cols-[minmax(300px,1fr)_190px_190px_190px]">
            {/* Search remains URL-backed for global deep-link support. */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                aria-label="Search AWS resources"
                className="h-10 rounded-xl border-border/70 bg-background/30 pl-10 shadow-inner focus-visible:border-primary/40 focus-visible:ring-primary/15"
                onChange={(
                  event,
                ) => {
                  // Read the next input value.
                  const nextSearch =
                    event.target
                      .value;

                  // Persist the resource search in the URL.
                  setSearchParams(
                    (
                      currentParams,
                    ) => {
                      const nextParams =
                        new URLSearchParams(
                          currentParams,
                        );

                      // Add non-empty resource searches.
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
                        // Remove empty searches entirely.
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

                  // Search changes always return to page one.
                  setPage(
                    1,
                  );
                }}
                placeholder="Name or provider resource ID..."
                type="search"
                value={
                  searchQuery
                }
              />
            </div>

            {/* Filter by genuine AWS service values supported by the API. */}
            <NativeSelect
              aria-label="Filter resources by service"
              className="w-full"
              onChange={(
                event,
              ) => {
                setServiceFilter(
                  event.target
                    .value,
                );

                setPage(
                  1,
                );
              }}
              value={
                serviceFilter
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

              <NativeSelectOption value="ELB">
                ALB / ELB
              </NativeSelectOption>

              <NativeSelectOption value="S3">
                S3
              </NativeSelectOption>
            </NativeSelect>

            {/* Filter by normalized environment. */}
            <NativeSelect
              aria-label="Filter resources by environment"
              className="w-full"
              onChange={(
                event,
              ) => {
                setEnvironmentFilter(
                  event.target
                    .value,
                );

                setPage(
                  1,
                );
              }}
              value={
                environmentFilter
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

            {/* Filter by CloudOps health classification. */}
            <NativeSelect
              aria-label="Filter resources by health state"
              className="w-full"
              onChange={(
                event,
              ) => {
                setHealthFilter(
                  event.target
                    .value,
                );

                setPage(
                  1,
                );
              }}
              value={
                healthFilter
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

          {/* Show genuine query state and server result count. */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {
                  resourcePage.total
                }
              </span>
              {" "}
              resources match the current server-side query.
            </p>

            {resourcesQuery.isFetching && (
              <span className="inline-flex items-center gap-2 text-xs text-primary">
                <RefreshCw className="size-3.5 animate-spin" />

                Refreshing inventory
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Render the genuine paginated backend inventory. */}
      <ResourceDataTable
        data={
          resourcePage.items
        }
        hasActiveFilters={
          hasActiveFilters
        }
        onPageChange={
          setPage
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
      />
    </section>
  );
}

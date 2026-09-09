// Import React state used by service-level analysis.
import {
  useState,
} from "react";

// Import FinOps investigation icons.
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Database,
  Layers3,
  Search,
  SearchX,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";

// Import the daily cost trajectory already used by Cost Overview.
import {
  CostTrendChart,
} from "@/components/costs/cost-trend-chart";

// Import reusable API states.
import {
  PageErrorState,
} from "@/components/shared/page-error-state";

import {
  PageLoadingState,
} from "@/components/shared/page-loading-state";

// Import reusable UI.
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Import the genuine AWS cost API.
import {
  useCostSummary,
} from "@/features/costs/api/costs-api";

// Import monetary formatting helpers.
import {
  formatBillingAmount,
} from "@/lib/formatters";


// Format one genuine backend billing date for compact presentation.
function formatBillingDate(
  value: string | null,
): string {
  // Explicitly represent unavailable billing dates.
  if (
    value ===
    null
  ) {
    return "Not available";
  }

  // Parse the backend date.
  const date =
    new Date(
      value,
    );

  // Preserve the original value when JavaScript cannot parse it.
  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  // Return a compact date.
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}


// Export the production FinOps investigation workspace.
export function CostExplorerPage() {
  // Load genuine AWS Cost Explorer data from FastAPI.
  const costQuery =
    useCostSummary();

  // Store service-search text locally.
  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  // Render initial API loading state.
  if (
    costQuery.isPending
  ) {
    return (
      <PageLoadingState />
    );
  }

  // Render retryable API failure.
  if (
    costQuery.isError
  ) {
    return (
      <PageErrorState
        title="Unable to load Cost Explorer"
        description="AWS billing records could not be retrieved."
        onRetry={() => {
          void costQuery.refetch();
        }}
      />
    );
  }

  // Store successful genuine billing response.
  const costs =
    costQuery.data;

  // Normalize service-search text.
  const normalizedSearch =
    searchQuery
      .trim()
      .toLowerCase();

  // Filter only genuine service-level records.
  const visibleServices =
    costs.by_service
      .filter(
        (
          record,
        ) =>
          normalizedSearch.length ===
            0 ||
          record.service
            .toLowerCase()
            .includes(
              normalizedSearch,
            ),
      )
      // Rank the visible dataset by highest monetary amount.
      .sort(
        (
          left,
          right,
        ) =>
          right.amount -
          left.amount,
      );

  // Calculate the genuine total represented by visible services.
  const visibleCost =
    visibleServices.reduce(
      (
        total,
        record,
      ) =>
        total +
        record.amount,
      0,
    );

  // Calculate positive service spend for allocation percentages.
  // Credits remain visible but never generate negative-width bars.
  const positiveVisibleSpend =
    visibleServices.reduce(
      (
        total,
        record,
      ) =>
        total +
        Math.max(
          record.amount,
          0,
        ),
      0,
    );

  // Determine whether any genuine billing information exists.
  const hasBillingData =
    costs.daily.length >
      0 ||
    costs.by_service.length >
      0 ||
    costs.month_to_date !==
      0;

  // Detect the valid-but-small AWS billing case.
  const hasSubCentActivity =
    hasBillingData &&
    Math.abs(
      costs.month_to_date,
    ) <
      0.005;

  // Calculate the total represented by actual daily records.
  const dailyRecordedTotal =
    costs.daily.reduce(
      (
        total,
        point,
      ) =>
        total +
        point.amount,
      0,
    );

  // Calculate average daily record only when daily data exists.
  const averageDailyCost =
    costs.daily.length ===
    0
      ? null
      : dailyRecordedTotal /
        costs.daily.length;

  // Find the largest genuine daily billing value.
  const peakDailyRecord =
    costs.daily.length ===
    0
      ? null
      : costs.daily.reduce(
          (
            currentPeak,
            point,
          ) =>
            point.amount >
            currentPeak.amount
              ? point
              : currentPeak,
        );

  // Extract valid billing timestamps.
  const billingDates =
    costs.daily
      .map(
        (
          point,
        ) =>
          new Date(
            point.date,
          ).getTime(),
      )
      .filter(
        (
          value,
        ) =>
          Number.isFinite(
            value,
          ),
      )
      .sort(
        (
          left,
          right,
        ) =>
          left -
          right,
      );

  // Determine visible billing-period start.
  const coverageStart =
    billingDates.length >
    0
      ? new Date(
          billingDates[
            0
          ],
        ).toISOString()
      : null;

  // Determine visible billing-period end.
  const coverageEnd =
    billingDates.length >
    0
      ? new Date(
          billingDates[
            billingDates.length -
            1
          ],
        ).toISOString()
      : null;

  // Determine whether the service search is active.
  const hasSearch =
    normalizedSearch.length >
    0;

  // Define genuine investigation KPI cards.
  const metrics = [
    {
      label:
        "Matching services",

      value:
        String(
          visibleServices.length,
        ),

      helper:
        hasSearch
          ? `${costs.by_service.length} total service records`
          : "Current service-level dataset",

      Icon:
        Layers3,

      iconClass:
        "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",

      glowClass:
        "from-cyan-400/16 via-transparent to-transparent",
    },

    {
      label:
        "Visible MTD cost",

      value:
        formatBillingAmount(
          visibleCost,
          costs.currency,
        ),

      helper:
        hasSearch
          ? "Cost represented by current search"
          : "All synchronized service records",

      Icon:
        CircleDollarSign,

      iconClass:
        "border-sky-400/20 bg-sky-400/10 text-sky-300",

      glowClass:
        "from-sky-400/14 via-transparent to-transparent",
    },

    {
      label:
        "Average daily",

      value:
        averageDailyCost ===
        null
          ? "N/A"
          : formatBillingAmount(
              averageDailyCost,
              costs.currency,
            ),

      helper:
        costs.daily.length ===
        0
          ? "No daily records available"
          : `${costs.daily.length} synchronized daily records`,

      Icon:
        TrendingUp,

      iconClass:
        "border-violet-400/20 bg-violet-400/10 text-violet-300",

      glowClass:
        "from-violet-400/14 via-transparent to-transparent",
    },

    {
      label:
        "Peak daily record",

      value:
        peakDailyRecord ===
        null
          ? "N/A"
          : formatBillingAmount(
              peakDailyRecord.amount,
              costs.currency,
            ),

      helper:
        peakDailyRecord ===
        null
          ? "No daily records available"
          : formatBillingDate(
              peakDailyRecord.date,
            ),

      Icon:
        CalendarDays,

      iconClass:
        "border-amber-400/20 bg-amber-400/10 text-amber-300",

      glowClass:
        "from-amber-400/14 via-transparent to-transparent",
    },
  ];

  // Render the Cost Explorer investigation workspace.
  return (
    <section className="space-y-6">
      {/* =====================================================
          Cost Explorer hero
          ===================================================== */}
      <Card className="relative overflow-hidden border-primary/15 bg-card/68 py-0">
        {/* Cyan investigation atmosphere. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-28 -top-40 size-[410px] rounded-full bg-cyan-400/9 blur-3xl"
        />

        {/* Violet secondary dimension. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-40 size-[400px] rounded-full bg-violet-500/9 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/65 to-transparent"
        />

        <CardContent className="relative grid gap-7 p-6 lg:grid-cols-[1.3fr_0.7fr] lg:p-7">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] text-primary">
              <Sparkles className="size-3.5" />

              FinOps investigation
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Explore AWS billing
              records and service spend.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Investigate synchronized Cost Explorer records,
              service-level allocation, daily billing movement and
              available resource attribution.
            </p>
          </div>

          {/* Genuine dataset posture. */}
          <div className="rounded-2xl border border-border/65 bg-background/30 p-4 shadow-inner backdrop-blur-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
              Dataset posture
            </p>

            <div
              className={
                hasBillingData
                  ? "mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-3.5"
                  : "mt-3 rounded-xl border border-sky-400/20 bg-sky-400/8 p-3.5"
              }
            >
              <p
                className={
                  hasBillingData
                    ? "text-sm font-semibold text-emerald-300"
                    : "text-sm font-semibold text-sky-300"
                }
              >
                {hasBillingData
                  ? "Billing records available"
                  : "Awaiting billing records"}
              </p>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {hasBillingData
                  ? "Cost Explorer service and daily records are available for analysis."
                  : "This workspace will populate after AWS billing synchronization completes."}
              </p>
            </div>

            <div className="mt-4 divide-y divide-border/45 rounded-xl border border-border/60 bg-card/30 px-3">
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Service records
                </span>

                <span className="text-sm font-semibold">
                  {
                    costs.by_service.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Daily records
                </span>

                <span className="text-sm font-semibold">
                  {
                    costs.daily.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Allocation
                </span>

                <span className="text-sm font-semibold">
                  {costs.resource_level_available
                    ? "Resource level"
                    : "Service level"}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />

              {coverageStart &&
              coverageEnd ? (
                <span>
                  {formatBillingDate(
                    coverageStart,
                  )}
                  {" ? "}
                  {formatBillingDate(
                    coverageEnd,
                  )}
                </span>
              ) : (
                <span>
                  No billing coverage window
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          Investigation KPI strip
          ===================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(
          (
            metric,
          ) => {
            // Read the configured icon.
            const Icon =
              metric.Icon;

            return (
              <Card
                className="group relative min-h-[150px] overflow-hidden bg-card/72 py-0"
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
                    <p className="text-sm font-medium text-muted-foreground">
                      {
                        metric.label
                      }
                    </p>

                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110 ${metric.iconClass}`}
                    >
                      <Icon className="size-[18px]" />
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="truncate text-2xl font-semibold tracking-[-0.035em]">
                      {
                        metric.value
                      }
                    </p>

                    <p className="mt-2 truncate text-xs text-muted-foreground">
                      {
                        metric.helper
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
          Preserve truthful sub-cent provider activity
          ===================================================== */}
      {hasSubCentActivity && (
        <Card className="border-violet-400/15 bg-violet-400/[0.035]">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/8 text-violet-300">
              <CircleDollarSign className="size-4" />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Sub-cent AWS billing activity detected
              </p>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                CloudOps preserves the provider values at billing precision.
                Monetary labels use additional decimal places when necessary
                so small AWS charges or credits remain visible.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =====================================================
          Actual daily billing trajectory
          ===================================================== */}
      <CostTrendChart
        currency={
          costs.currency
        }
        points={
          costs.daily
        }
      />

      {/* =====================================================
          Service query
          ===================================================== */}
      <Card className="bg-card/72">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="size-4 text-primary" />

                Service query
              </CardTitle>

              <CardDescription className="mt-1">
                Filter the genuine AWS service-level billing records
                synchronized for the current month.
              </CardDescription>
            </div>

            {hasSearch && (
              <Button
                className="rounded-xl"
                onClick={() =>
                  setSearchQuery(
                    "",
                  )
                }
                size="sm"
                variant="ghost"
              >
                <X className="mr-1.5 size-3.5" />

                Clear search
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="relative max-w-2xl">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              aria-label="Search AWS billing services"
              className="h-10 rounded-xl border-border/70 bg-background/30 pl-10 shadow-inner focus-visible:border-primary/40 focus-visible:ring-primary/15"
              onChange={(
                event,
              ) =>
                setSearchQuery(
                  event.target
                    .value,
                )
              }
              placeholder="Search AWS service..."
              type="search"
              value={
                searchQuery
              }
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {
                  visibleServices.length
                }
              </span>
              {" "}
              matching service records
            </p>

            <p className="text-xs text-muted-foreground">
              Visible cost{" "}
              <span className="font-semibold text-foreground">
                {formatBillingAmount(
                  visibleCost,
                  costs.currency,
                )}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          Ranked service-cost investigation table
          ===================================================== */}
      <Card className="overflow-hidden bg-card/72 py-0">
        <CardHeader className="border-b border-border/50 p-4 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="size-4 text-sky-300" />

                Service cost allocation
              </CardTitle>

              <CardDescription className="mt-1">
                Month-to-date AWS billing grouped and ranked by service.
              </CardDescription>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-1 text-xs text-muted-foreground">
              {
                visibleServices.length
              }
              {" "}
              results
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="h-11 w-16 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Rank
                  </TableHead>

                  <TableHead className="h-11 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    AWS service
                  </TableHead>

                  <TableHead className="h-11 min-w-[220px] text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Allocation
                  </TableHead>

                  <TableHead className="h-11 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Month-to-date
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {visibleServices.length >
                0 ? (
                  visibleServices.map(
                    (
                      record,
                      index,
                    ) => {
                      // Calculate positive-spend allocation percentage.
                      const allocation =
                        positiveVisibleSpend <=
                        0
                          ? 0
                          : (
                              Math.max(
                                record.amount,
                                0,
                              ) /
                              positiveVisibleSpend
                            ) *
                            100;

                      // Render one genuine billing-service row.
                      return (
                        <TableRow
                          className="group border-border/45 transition-colors hover:bg-primary/[0.045]"
                          key={
                            record.service
                          }
                        >
                          <TableCell>
                            <span className="flex size-7 items-center justify-center rounded-lg border border-border/60 bg-muted/25 text-[11px] font-semibold text-muted-foreground">
                              {
                                index +
                                1
                              }
                            </span>
                          </TableCell>

                          <TableCell>
                            <div className="flex min-w-[220px] items-center gap-3">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/8 text-cyan-300">
                                <Database className="size-4" />
                              </div>

                              <div>
                                <p className="text-sm font-semibold">
                                  {
                                    record.service
                                  }
                                </p>

                                <p className="mt-0.5 text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
                                  AWS billing service
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex min-w-[200px] items-center gap-3">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 shadow-[0_0_12px_rgba(56,189,248,0.32)]"
                                  style={{
                                    width:
                                      `${Math.min(
                                        allocation,
                                        100,
                                      )}%`,
                                  }}
                                />
                              </div>

                              <span className="w-12 text-right text-[11px] tabular-nums text-muted-foreground">
                                {allocation.toFixed(
                                  1,
                                )}
                                %
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <span
                              className={
                                record.amount <
                                0
                                  ? "font-semibold text-emerald-300"
                                  : "font-semibold text-foreground"
                              }
                            >
                              {formatBillingAmount(
                                record.amount,
                                costs.currency,
                              )}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    },
                  )
                ) : (
                  <TableRow>
                    <TableCell
                      className="h-[260px] text-center"
                      colSpan={
                        4
                      }
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
                          {hasSearch ? (
                            <SearchX className="size-5" />
                          ) : (
                            <Database className="size-5" />
                          )}
                        </div>

                        <p className="mt-4 font-semibold">
                          {hasSearch
                            ? "No services match this search"
                            : "No service-level billing records"}
                        </p>

                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {hasSearch
                            ? "Clear or change the service search to view other synchronized billing records."
                            : "AWS service costs will appear after Cost Explorer synchronization completes."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          Resource-level billing attribution
          ===================================================== */}
      <Card className="bg-card/72">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-start gap-3">
            <div
              className={
                costs.resource_level_available
                  ? "flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/8 text-emerald-300"
                  : "flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/8 text-violet-300"
              }
            >
              <Database className="size-[18px]" />
            </div>

            <div>
              <CardTitle>
                Resource-level allocation
              </CardTitle>

              <CardDescription className="mt-1">
                {costs.resource_level_available
                  ? "Mapped AWS resource-level billing records are available."
                  : "AWS Cost Explorer resource-level granularity is not currently available for this connected account."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {costs.resource_level_available ? (
            <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.045] p-4">
              <p className="text-sm font-semibold text-emerald-300">
                Resource attribution available
              </p>

              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                CloudOps has synchronized resource-level billing mapping
                from AWS for this dataset.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/55 bg-background/20 p-4">
              <p className="text-sm font-semibold">
                Service-level analysis only
              </p>

              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                CloudOps does not substitute demonstration values.
                Service-level AWS costs remain available above, and resource
                attribution will appear only when AWS provides mapped records.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

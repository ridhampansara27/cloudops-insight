// Import React utilities for filtering and stable derived datasets.
import {
  useMemo,
  useState,
} from "react";

// Import optimization-workspace icons.
import {
  ArrowUpRight,
  CircleCheckBig,
  CircleDollarSign,
  Filter,
  Gauge,
  Lightbulb,
  Search,
  SearchX,
  ShieldAlert,
  Sparkles,
  Target,
  X,
} from "lucide-react";

// Import resource navigation.
import {
  Link,
} from "react-router-dom";

// Import notifications.
import {
  toast,
} from "sonner";

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

import {
  Input,
} from "@/components/ui/input";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

// Import real recommendation APIs.
import {
  useRecommendations,
  useUpdateRecommendationStatus,
} from "@/features/recommendations/api/recommendations-api";

// Import synchronized resource inventory.
import {
  useResources,
} from "@/features/resources/api/resources-api";

// Import genuine numeric and timestamp formatting.
import {
  formatBillingAmount,
  formatTimestamp,
  toNumber,
} from "@/lib/formatters";


// Normalize recommendation risk into visual semantics.
function getRiskStyle(
  risk: string,
) {
  // Low implementation risk.
  if (
    risk ===
    "low"
  ) {
    return {
      badge:
        "border-emerald-400/20 bg-emerald-400/8 text-emerald-300",

      label:
        "Low risk",
    };
  }

  // Medium implementation risk.
  if (
    risk ===
    "medium"
  ) {
    return {
      badge:
        "border-amber-400/20 bg-amber-400/8 text-amber-300",

      label:
        "Medium risk",
    };
  }

  // High implementation risk.
  if (
    risk ===
    "high"
  ) {
    return {
      badge:
        "border-rose-400/20 bg-rose-400/8 text-rose-300",

      label:
        "High risk",
    };
  }

  // Preserve unexpected backend values without inventing meaning.
  return {
    badge:
      "border-border/70 bg-muted/30 text-muted-foreground",

    label:
      risk,
  };
}


// Normalize recommendation confidence into visual semantics.
function getConfidenceStyle(
  confidence: string,
) {
  // High-confidence evidence receives strongest positive treatment.
  if (
    confidence ===
    "high"
  ) {
    return {
      badge:
        "border-cyan-400/20 bg-cyan-400/8 text-cyan-300",

      label:
        "High confidence",
    };
  }

  // Medium confidence remains informational.
  if (
    confidence ===
    "medium"
  ) {
    return {
      badge:
        "border-violet-400/20 bg-violet-400/8 text-violet-300",

      label:
        "Medium confidence",
    };
  }

  // Low confidence is intentionally subdued.
  if (
    confidence ===
    "low"
  ) {
    return {
      badge:
        "border-border/70 bg-muted/30 text-muted-foreground",

      label:
        "Low confidence",
    };
  }

  // Preserve unknown backend values.
  return {
    badge:
      "border-border/70 bg-muted/30 text-muted-foreground",

    label:
      confidence,
  };
}


// Normalize workflow status into visual semantics.
function getStatusStyle(
  status: string,
) {
  // Open recommendations remain actionable.
  if (
    status ===
    "open"
  ) {
    return {
      badge:
        "border-sky-400/20 bg-sky-400/8 text-sky-300",

      label:
        "Open",
    };
  }

  // Accepted recommendations indicate operator approval.
  if (
    status ===
    "accepted"
  ) {
    return {
      badge:
        "border-emerald-400/20 bg-emerald-400/8 text-emerald-300",

      label:
        "Accepted",
    };
  }

  // Dismissed recommendations remain historical but low emphasis.
  if (
    status ===
    "dismissed"
  ) {
    return {
      badge:
        "border-border/70 bg-muted/30 text-muted-foreground",

      label:
        "Dismissed",
    };
  }

  // Preserve unexpected backend status values.
  return {
    badge:
      "border-border/70 bg-muted/30 text-muted-foreground",

    label:
      status,
  };
}


// Export the FinOps optimization workspace.
export function RecommendationsPage() {
  // Load genuine recommendations from FastAPI.
  const recommendationsQuery =
    useRecommendations();

  // Load synchronized resource inventory only for friendly context.
  const resourcesQuery =
    useResources({
      page:
        1,

      // Resolve a useful working set without creating synthetic inventory.
      pageSize:
        100,
    });

  // Initialize the existing status mutation.
  const updateRecommendation =
    useUpdateRecommendationStatus();

  // Store client-side search text.
  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  // Store implementation-risk filter.
  const [
    riskFilter,
    setRiskFilter,
  ] =
    useState("all");

  // Store recommendation workflow filter.
  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("all");

  // Keep the backend recommendation array reference stable.
  const recommendations =
    useMemo(
      () =>
        recommendationsQuery.data ??
        [],
      [
        recommendationsQuery.data,
      ],
    );

  // Create a resource UUID-to-resource lookup.
  // Recommendation functionality remains available even if this supporting
  // inventory request has not completed.
  const resourceLookup =
    useMemo(
      () =>
        new Map(
          (
            resourcesQuery.data
              ?.items ??
            []
          ).map(
            (
              resource,
            ) => [
              resource.id,
              resource,
            ],
          ),
        ),
      [
        resourcesQuery.data,
      ],
    );

  // Normalize free-text search once.
  const normalizedSearch =
    searchQuery
      .trim()
      .toLowerCase();

  // Derive the filtered optimization workspace from genuine records.
  const filteredRecommendations =
    useMemo(
      () =>
        recommendations
          .filter(
            (
              recommendation,
            ) => {
              // Resolve the related resource when inventory is available.
              const resource =
                resourceLookup.get(
                  recommendation.resource_id,
                );

              // Match risk filter.
              const matchesRisk =
                riskFilter ===
                  "all" ||
                recommendation.risk ===
                  riskFilter;

              // Match workflow status filter.
              const matchesStatus =
                statusFilter ===
                  "all" ||
                recommendation.status ===
                  statusFilter;

              // Match title, description, recommendation type,
              // resource name, service or provider resource ID.
              const searchableText =
                [
                  recommendation.title,
                  recommendation.description,
                  recommendation.recommendation_type,
                  resource?.name,
                  resource?.service,
                  resource?.provider_resource_id,
                ]
                  .filter(
                    Boolean,
                  )
                  .join(
                    " ",
                  )
                  .toLowerCase();

              const matchesSearch =
                normalizedSearch.length ===
                  0 ||
                searchableText.includes(
                  normalizedSearch,
                );

              return (
                matchesRisk &&
                matchesStatus &&
                matchesSearch
              );
            },
          )
          // Keep actionable records first, then rank by quantified savings.
          .sort(
            (
              left,
              right,
            ) => {
              // Open recommendations appear before historical workflow states.
              if (
                left.status ===
                  "open" &&
                right.status !==
                  "open"
              ) {
                return -1;
              }

              if (
                right.status ===
                  "open" &&
                left.status !==
                  "open"
              ) {
                return 1;
              }

              // Rank equal-status records by largest quantified saving.
              return (
                toNumber(
                  right.estimated_monthly_savings ??
                    0,
                ) -
                toNumber(
                  left.estimated_monthly_savings ??
                    0,
                )
              );
            },
          ),
      [
        recommendations,
        resourceLookup,
        riskFilter,
        statusFilter,
        normalizedSearch,
      ],
    );

  // Count genuine open opportunities.
  const openRecommendations =
    recommendations.filter(
      (
        recommendation,
      ) =>
        recommendation.status ===
        "open",
    );

  // Count accepted workflow records.
  const acceptedRecommendationCount =
    recommendations.filter(
      (
        recommendation,
      ) =>
        recommendation.status ===
        "accepted",
    ).length;

  // Count open high-confidence opportunities.
  const highConfidenceOpenCount =
    openRecommendations.filter(
      (
        recommendation,
      ) =>
        recommendation.confidence ===
        "high",
    ).length;

  // Count open high-risk opportunities for review context.
  const highRiskOpenCount =
    openRecommendations.filter(
      (
        recommendation,
      ) =>
        recommendation.risk ===
        "high",
    ).length;

  // Sum only genuinely quantified open monthly savings.
  const potentialSavings =
    openRecommendations.reduce(
      (
        total,
        recommendation,
      ) =>
        total +
        toNumber(
          recommendation
            .estimated_monthly_savings ??
            0,
        ),
      0,
    );

  // Determine whether filters/search currently modify the dataset.
  const hasActiveFilters =
    normalizedSearch.length >
      0 ||
    riskFilter !==
      "all" ||
    statusFilter !==
      "all";

  // Count active investigation controls.
  const activeFilterCount =
    [
      normalizedSearch.length >
        0,
      riskFilter !==
        "all",
      statusFilter !==
        "all",
    ].filter(
      Boolean,
    ).length;

  // Reset the client-side recommendation investigation.
  function clearFilters() {
    setSearchQuery(
      "",
    );

    setRiskFilter(
      "all",
    );

    setStatusFilter(
      "all",
    );
  }

  // Persist recommendation workflow changes through FastAPI.
  async function handleStatusChange(
    recommendationId:
      string,
    nextStatus:
      string,
  ) {
    try {
      await updateRecommendation.mutateAsync({
        id:
          recommendationId,

        status:
          nextStatus,
      });

      toast.success(
        "Recommendation updated.",
      );
    } catch {
      toast.error(
        "Unable to update recommendation.",
      );
    }
  }

  // Render the primary API loading state.
  if (
    recommendationsQuery.isPending
  ) {
    return (
      <PageLoadingState />
    );
  }

  // Render a retryable primary recommendation API failure.
  if (
    recommendationsQuery.isError
  ) {
    return (
      <PageErrorState
        title="Unable to load recommendations"
        description="CloudOps Insight could not retrieve optimization recommendations."
        onRetry={() => {
          void recommendationsQuery.refetch();
        }}
      />
    );
  }

  // Derive overall optimization posture from genuine workflow state.
  const optimizationPosture =
    openRecommendations.length >
    0
      ? {
          label:
            "Optimization opportunities available",

          description:
            `${openRecommendations.length} open recommendation${
              openRecommendations.length ===
              1
                ? ""
                : "s"
            } currently require review.`,

          classes:
            "border-cyan-400/20 bg-cyan-400/8 text-cyan-300",

          Icon:
            Lightbulb,
        }
      : recommendations.length ===
          0
        ? {
            label:
              "Awaiting recommendations",

            description:
              "No optimization recommendations are currently available.",

            classes:
              "border-sky-400/20 bg-sky-400/8 text-sky-300",

            Icon:
              Sparkles,
          }
        : {
            label:
              "No open opportunities",

            description:
              "All currently stored recommendations have already been reviewed.",

            classes:
              "border-emerald-400/20 bg-emerald-400/8 text-emerald-300",

            Icon:
              CircleCheckBig,
          };

  // Read posture icon.
  const PostureIcon =
    optimizationPosture.Icon;

  // Define genuine optimization KPI cards.
  const metrics = [
    {
      label:
        "Open opportunities",

      value:
        String(
          openRecommendations.length,
        ),

      helper:
        `${recommendations.length} total recommendations`,

      Icon:
        Lightbulb,

      iconClass:
        "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",

      glowClass:
        "from-cyan-400/16 via-transparent to-transparent",
    },

    {
      label:
        "Quantified savings",

      value:
        formatBillingAmount(
          potentialSavings,
          "USD",
        ),

      helper:
        "Open monthly estimates",

      Icon:
        CircleDollarSign,

      iconClass:
        "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",

      glowClass:
        "from-emerald-400/14 via-transparent to-transparent",
    },

    {
      label:
        "High confidence",

      value:
        String(
          highConfidenceOpenCount,
        ),

      helper:
        "Open recommendations",

      Icon:
        Target,

      iconClass:
        "border-violet-400/20 bg-violet-400/10 text-violet-300",

      glowClass:
        "from-violet-400/14 via-transparent to-transparent",
    },

    {
      label:
        "High risk",

      value:
        String(
          highRiskOpenCount,
        ),

      helper:
        "Open recommendations",

      Icon:
        ShieldAlert,

      iconClass:
        "border-rose-400/20 bg-rose-400/10 text-rose-300",

      glowClass:
        "from-rose-400/14 via-transparent to-transparent",
    },
  ];

  // Render the optimization command center.
  return (
    <section className="space-y-6">
      {/* =====================================================
          Optimization hero
          ===================================================== */}
      <Card className="relative overflow-hidden border-primary/15 bg-card/68 py-0">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-28 -top-40 size-[420px] rounded-full bg-cyan-400/9 blur-3xl"
        />

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
              <Lightbulb className="size-3.5" />

              FinOps optimization
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Turn cloud signals into
              prioritized optimization actions.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Review evidence-backed opportunities, quantified monthly
              savings, implementation risk and confidence before accepting
              or dismissing a recommendation.
            </p>
          </div>

          {/* Genuine optimization posture. */}
          <div className="rounded-2xl border border-border/65 bg-background/30 p-4 shadow-inner backdrop-blur-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
              Optimization posture
            </p>

            <div
              className={`mt-3 flex items-start gap-3 rounded-xl border p-3.5 ${optimizationPosture.classes}`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-current/5">
                <PostureIcon className="size-[18px]" />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  {
                    optimizationPosture.label
                  }
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {
                    optimizationPosture.description
                  }
                </p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-border/45 rounded-xl border border-border/60 bg-card/30 px-3">
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Open
                </span>

                <span className="text-sm font-semibold">
                  {
                    openRecommendations.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Accepted
                </span>

                <span className="text-sm font-semibold">
                  {
                    acceptedRecommendationCount
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Quantified monthly savings
                </span>

                <span className="text-sm font-semibold">
                  {formatBillingAmount(
                    potentialSavings,
                    "USD",
                  )}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          Optimization KPI strip
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
          Investigation filters
          ===================================================== */}
      <Card className="bg-card/72">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="size-4 text-primary" />

                Opportunity filters
              </CardTitle>

              <CardDescription className="mt-1">
                Search and filter the genuine backend recommendation dataset.
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

        <CardContent className="space-y-4 pt-2">
          <div className="grid gap-3 lg:grid-cols-[minmax(300px,1fr)_210px_210px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                aria-label="Search recommendations"
                className="h-10 rounded-xl border-border/70 bg-background/30 pl-10 shadow-inner focus-visible:border-primary/40 focus-visible:ring-primary/15"
                onChange={(
                  event,
                ) =>
                  setSearchQuery(
                    event.target
                      .value,
                  )
                }
                placeholder="Search recommendation, resource or service..."
                type="search"
                value={
                  searchQuery
                }
              />
            </div>

            <NativeSelect
              aria-label="Filter recommendations by risk"
              className="w-full"
              onChange={(
                event,
              ) =>
                setRiskFilter(
                  event.target
                    .value,
                )
              }
              value={
                riskFilter
              }
            >
              <NativeSelectOption value="all">
                All risk levels
              </NativeSelectOption>

              <NativeSelectOption value="low">
                Low risk
              </NativeSelectOption>

              <NativeSelectOption value="medium">
                Medium risk
              </NativeSelectOption>

              <NativeSelectOption value="high">
                High risk
              </NativeSelectOption>
            </NativeSelect>

            <NativeSelect
              aria-label="Filter recommendations by status"
              className="w-full"
              onChange={(
                event,
              ) =>
                setStatusFilter(
                  event.target
                    .value,
                )
              }
              value={
                statusFilter
              }
            >
              <NativeSelectOption value="all">
                All statuses
              </NativeSelectOption>

              <NativeSelectOption value="open">
                Open
              </NativeSelectOption>

              <NativeSelectOption value="accepted">
                Accepted
              </NativeSelectOption>

              <NativeSelectOption value="dismissed">
                Dismissed
              </NativeSelectOption>
            </NativeSelect>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {
                  filteredRecommendations.length
                }
              </span>
              {" "}
              recommendations match the current investigation.
            </p>

            {resourcesQuery.isError && (
              <p className="text-xs text-amber-300">
                Resource names are temporarily unavailable; recommendation
                workflow remains usable.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          Empty recommendation state
          ===================================================== */}
      {filteredRecommendations.length ===
        0 && (
        <Card className="bg-card/72">
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center text-center">
            <div className="flex size-13 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
              {hasActiveFilters ? (
                <SearchX className="size-5" />
              ) : (
                <Lightbulb className="size-5" />
              )}
            </div>

            <p className="mt-4 font-semibold">
              {hasActiveFilters
                ? "No recommendations match these filters"
                : "No optimization recommendations"}
            </p>

            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              {hasActiveFilters
                ? "Change or clear the current search, risk, or workflow filters."
                : "Optimization opportunities will appear when CloudOps identifies evidence-backed recommendations from synchronized infrastructure data."}
            </p>

            {hasActiveFilters && (
              <Button
                className="mt-5 rounded-xl"
                onClick={
                  clearFilters
                }
                size="sm"
                variant="outline"
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* =====================================================
          Recommendation investigation cards
          ===================================================== */}
      <div className="grid gap-5 xl:grid-cols-2">
        {filteredRecommendations.map(
          (
            recommendation,
          ) => {
            // Resolve related inventory context where available.
            const resource =
              resourceLookup.get(
                recommendation.resource_id,
              );

            // Read genuine semantic values.
            const riskStyle =
              getRiskStyle(
                recommendation.risk,
              );

            const confidenceStyle =
              getConfidenceStyle(
                recommendation.confidence,
              );

            const statusStyle =
              getStatusStyle(
                recommendation.status,
              );

            // Normalize genuine saving estimate.
            const estimatedSavings =
              recommendation
                .estimated_monthly_savings ===
              null
                ? null
                : toNumber(
                    recommendation
                      .estimated_monthly_savings,
                  );

            // Render one genuine optimization opportunity.
            return (
              <Card
                className="group overflow-hidden bg-card/72 py-0"
                key={
                  recommendation.id
                }
              >
                <CardHeader className="border-b border-border/50 p-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          className={
                            riskStyle.badge
                          }
                          variant="outline"
                        >
                          {
                            riskStyle.label
                          }
                        </Badge>

                        <Badge
                          className={
                            confidenceStyle.badge
                          }
                          variant="outline"
                        >
                          {
                            confidenceStyle.label
                          }
                        </Badge>

                        <Badge
                          className={
                            statusStyle.badge
                          }
                          variant="outline"
                        >
                          {
                            statusStyle.label
                          }
                        </Badge>
                      </div>

                      <CardTitle className="mt-4 leading-snug">
                        {
                          recommendation.title
                        }
                      </CardTitle>

                      <CardDescription className="mt-2">
                        {resource ? (
                          <Link
                            className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
                            to={`/cloud/resources/${resource.id}`}
                          >
                            <span>
                              {
                                resource.name
                              }
                              {" ? "}
                              {
                                resource.service
                              }
                            </span>

                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        ) : (
                          <span className="break-all">
                            {
                              recommendation.resource_id
                            }
                          </span>
                        )}
                      </CardDescription>
                    </div>

                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-primary transition-transform duration-300 group-hover:scale-110">
                      <Lightbulb className="size-[18px]" />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-4">
                  {/* Recommendation type. */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                      Recommendation type
                    </span>

                    <span className="max-w-[60%] truncate text-xs font-medium">
                      {
                        recommendation.recommendation_type
                      }
                    </span>
                  </div>

                  {/* Genuine recommendation explanation. */}
                  <p className="text-sm leading-6 text-muted-foreground">
                    {
                      recommendation.description
                    }
                  </p>

                  {/* Evidence supplied by the backend recommendation. */}
                  <div className="rounded-xl border border-border/55 bg-background/20 p-4">
                    <div className="flex items-center gap-2">
                      <Gauge className="size-3.5 text-violet-300" />

                      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                        Evidence
                      </p>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {
                        recommendation.evidence
                      }
                    </p>
                  </div>

                  {/* Genuine monthly savings estimate. */}
                  <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                      Estimated monthly saving
                    </p>

                    <p className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-emerald-300">
                      {estimatedSavings ===
                      null
                        ? "Estimate unavailable"
                        : formatBillingAmount(
                            estimatedSavings,
                            "USD",
                          )}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Backend recommendation estimate
                    </p>
                  </div>

                  {/* Record provenance/freshness. */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/45 pt-3 text-xs text-muted-foreground">
                    <span>
                      Created{" "}
                      {formatTimestamp(
                        recommendation.created_at,
                      )}
                    </span>

                    {resource && (
                      <span>
                        {
                          resource.region
                        }
                      </span>
                    )}
                  </div>

                  {/* Existing workflow mutations remain available only while open. */}
                  {recommendation.status ===
                    "open" && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        className="rounded-xl"
                        disabled={
                          updateRecommendation.isPending
                        }
                        onClick={() =>
                          void handleStatusChange(
                            recommendation.id,
                            "accepted",
                          )
                        }
                        size="sm"
                      >
                        <CircleCheckBig className="mr-2 size-3.5" />

                        Accept
                      </Button>

                      <Button
                        className="rounded-xl"
                        disabled={
                          updateRecommendation.isPending
                        }
                        onClick={() =>
                          void handleStatusChange(
                            recommendation.id,
                            "dismissed",
                          )
                        }
                        size="sm"
                        variant="outline"
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          },
        )}
      </div>
    </section>
  );
}

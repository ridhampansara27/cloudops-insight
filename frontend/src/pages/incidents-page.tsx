// Import React utilities for stable filtering and local investigation state.
import {
  useMemo,
  useState,
} from "react";

// Import incident-response icons.
import {
  Activity,
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  CircleDotDashed,
  Clock3,
  Eye,
  Filter,
  Radar,
  Search,
  SearchX,
  ShieldAlert,
  Siren,
  X,
} from "lucide-react";

// Import resource-detail navigation.
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

// Import real incident API.
import {
  useIncidents,
  useUpdateIncidentStatus,
} from "@/features/incidents/api/incidents-api";

// Import synchronized resource inventory for incident context.
import {
  useResources,
} from "@/features/resources/api/resources-api";

// Import shared timestamp formatting.
import {
  formatTimestamp,
} from "@/lib/formatters";


// ------------------------------------------------------------
// Incident presentation helpers
// ------------------------------------------------------------

// Map backend severity into operational visual semantics.
function getSeverityStyle(
  severity: string,
) {
  if (
    severity ===
    "critical"
  ) {
    return {
      badge:
        "border-rose-400/25 bg-rose-400/10 text-rose-300",

      icon:
        "border-rose-400/20 bg-rose-400/10 text-rose-300",

      label:
        "Critical",
    };
  }

  if (
    severity ===
    "high"
  ) {
    return {
      badge:
        "border-orange-400/25 bg-orange-400/10 text-orange-300",

      icon:
        "border-orange-400/20 bg-orange-400/10 text-orange-300",

      label:
        "High",
    };
  }

  if (
    severity ===
    "medium"
  ) {
    return {
      badge:
        "border-amber-400/25 bg-amber-400/10 text-amber-300",

      icon:
        "border-amber-400/20 bg-amber-400/10 text-amber-300",

      label:
        "Medium",
    };
  }

  if (
    severity ===
    "low"
  ) {
    return {
      badge:
        "border-sky-400/20 bg-sky-400/8 text-sky-300",

      icon:
        "border-sky-400/20 bg-sky-400/8 text-sky-300",

      label:
        "Low",
    };
  }

  return {
    badge:
      "border-border/70 bg-muted/30 text-muted-foreground",

    icon:
      "border-border/70 bg-muted/30 text-muted-foreground",

    label:
      severity,
  };
}


// Map backend workflow state into visual semantics.
function getStatusStyle(
  status: string,
) {
  if (
    status ===
    "open"
  ) {
    return {
      badge:
        "border-rose-400/20 bg-rose-400/8 text-rose-300",

      label:
        "Open",
    };
  }

  if (
    status ===
    "acknowledged"
  ) {
    return {
      badge:
        "border-amber-400/20 bg-amber-400/8 text-amber-300",

      label:
        "Acknowledged",
    };
  }

  if (
    status ===
    "investigating"
  ) {
    return {
      badge:
        "border-violet-400/20 bg-violet-400/8 text-violet-300",

      label:
        "Investigating",
    };
  }

  if (
    status ===
    "resolved"
  ) {
    return {
      badge:
        "border-emerald-400/20 bg-emerald-400/8 text-emerald-300",

      label:
        "Resolved",
    };
  }

  return {
    badge:
      "border-border/70 bg-muted/30 text-muted-foreground",

    label:
      status,
  };
}


// Map genuine incident provenance into presentation.
function getSourceStyle(
  source: string,
) {
  if (
    source ===
    "monitoring"
  ) {
    return {
      badge:
        "border-cyan-400/20 bg-cyan-400/8 text-cyan-300",

      label:
        "Monitoring",

      Icon:
        Radar,
    };
  }

  return {
    badge:
      "border-border/70 bg-muted/30 text-muted-foreground",

    label:
      source ===
      "manual"
        ? "Manual"
        : source,

    Icon:
      Eye,
  };
}


// Export the operational incident-response workspace.
export function IncidentsPage() {
  // Load genuine incidents from FastAPI/PostgreSQL.
  const incidentsQuery =
    useIncidents();

  // Load resource inventory only to enrich incident context.
  const resourcesQuery =
    useResources({
      page:
        1,

      pageSize:
        100,
    });

  // Initialize the existing incident workflow mutation.
  const updateIncident =
    useUpdateIncidentStatus();

  // Store free-text investigation query.
  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  // Store severity filter.
  const [
    severityFilter,
    setSeverityFilter,
  ] =
    useState("all");

  // Store workflow-state filter.
  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("all");

  // Store source/provenance filter.
  const [
    sourceFilter,
    setSourceFilter,
  ] =
    useState("all");

  // Keep incident array stable for derived computations.
  const incidents =
    useMemo(
      () =>
        incidentsQuery.data ??
        [],
      [
        incidentsQuery.data,
      ],
    );

  // Create a complete resource lookup for friendly operational context.
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

  // Normalize investigation text.
  const normalizedSearch =
    searchQuery
      .trim()
      .toLowerCase();

  // Filter the genuine backend incident dataset.
  const filteredIncidents =
    useMemo(
      () =>
        incidents.filter(
          (
            incident,
          ) => {
            // Resolve related resource when inventory is available.
            const resource =
              resourceLookup.get(
                incident.resource_id,
              );

            // Match supported severity filter.
            const matchesSeverity =
              severityFilter ===
                "all" ||
              incident.severity ===
                severityFilter;

            // Match supported workflow status.
            const matchesStatus =
              statusFilter ===
                "all" ||
              incident.status ===
                statusFilter;

            // Match monitoring/manual provenance.
            const matchesSource =
              sourceFilter ===
                "all" ||
              incident.source ===
                sourceFilter;

            // Build genuine searchable context.
            const searchableText =
              [
                incident.title,
                incident.description,
                incident.severity,
                incident.status,
                incident.source,
                resource?.name,
                resource?.service,
                resource?.region,
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
              matchesSeverity &&
              matchesStatus &&
              matchesSource &&
              matchesSearch
            );
          },
        ),
      [
        incidents,
        resourceLookup,
        severityFilter,
        statusFilter,
        sourceFilter,
        normalizedSearch,
      ],
    );

  // Count every currently unresolved incident.
  const activeIncidents =
    incidents.filter(
      (
        incident,
      ) =>
        incident.status !==
        "resolved",
    );

  // Count unresolved critical incidents.
  const criticalIncidents =
    activeIncidents.filter(
      (
        incident,
      ) =>
        incident.severity ===
        "critical",
    );

  // Count incidents currently in active investigation.
  const investigatingCount =
    incidents.filter(
      (
        incident,
      ) =>
        incident.status ===
        "investigating",
    ).length;

  // Count resolved incidents.
  const resolvedCount =
    incidents.filter(
      (
        incident,
      ) =>
        incident.status ===
        "resolved",
    ).length;

  // Count automatically created monitoring incidents.
  const monitoringIncidentCount =
    incidents.filter(
      (
        incident,
      ) =>
        incident.source ===
        "monitoring",
    ).length;

  // Determine whether the operator has active filters.
  const hasActiveFilters =
    normalizedSearch.length >
      0 ||
    severityFilter !==
      "all" ||
    statusFilter !==
      "all" ||
    sourceFilter !==
      "all";

  // Count active investigation constraints.
  const activeFilterCount =
    [
      normalizedSearch.length >
        0,
      severityFilter !==
        "all",
      statusFilter !==
        "all",
      sourceFilter !==
        "all",
    ].filter(
      Boolean,
    ).length;

  // Clear all incident investigation controls.
  function clearFilters() {
    setSearchQuery(
      "",
    );

    setSeverityFilter(
      "all",
    );

    setStatusFilter(
      "all",
    );

    setSourceFilter(
      "all",
    );
  }

  // Persist a genuine incident workflow change.
  async function handleStatusChange(
    incidentId:
      string,
    nextStatus:
      string,
  ) {
    try {
      await updateIncident.mutateAsync({
        id:
          incidentId,

        status:
          nextStatus,
      });

      toast.success(
        "Incident updated.",
      );
    } catch {
      toast.error(
        "Unable to update incident.",
      );
    }
  }

  // Render the primary incident API load state.
  if (
    incidentsQuery.isPending
  ) {
    return (
      <PageLoadingState />
    );
  }

  // Render a retryable incident API failure.
  if (
    incidentsQuery.isError
  ) {
    return (
      <PageErrorState
        title="Unable to load incidents"
        description="CloudOps Insight could not retrieve operational incidents."
        onRetry={() => {
          void incidentsQuery.refetch();
        }}
      />
    );
  }

  // Derive real command-center posture.
  const incidentPosture =
    criticalIncidents.length >
    0
      ? {
          label:
            "Critical response required",

          description:
            `${criticalIncidents.length} unresolved critical incident${
              criticalIncidents.length ===
              1
                ? ""
                : "s"
            } require operator attention.`,

          classes:
            "border-rose-400/20 bg-rose-400/8 text-rose-300",

          Icon:
            Siren,
        }
      : activeIncidents.length >
          0
        ? {
            label:
              "Active incidents",

            description:
              `${activeIncidents.length} unresolved incident${
                activeIncidents.length ===
                1
                  ? ""
                  : "s"
              } remain in the response workflow.`,

            classes:
              "border-amber-400/20 bg-amber-400/8 text-amber-300",

            Icon:
              ShieldAlert,
          }
        : incidents.length ===
            0
          ? {
              label:
                "No incidents detected",

              description:
                "No operational incidents are currently stored for synchronized infrastructure.",

              classes:
                "border-sky-400/20 bg-sky-400/8 text-sky-300",

              Icon:
                BellRing,
            }
          : {
              label:
                "All incidents resolved",

              description:
                "Every currently stored incident has completed the response workflow.",

              classes:
                "border-emerald-400/20 bg-emerald-400/8 text-emerald-300",

              Icon:
                CheckCircle2,
            };

  // Read posture icon.
  const PostureIcon =
    incidentPosture.Icon;

  // Define genuine operational KPI cards.
  const metrics = [
    {
      label:
        "Active incidents",

      value:
        String(
          activeIncidents.length,
        ),

      helper:
        `${incidents.length} total incidents`,

      Icon:
        BellRing,

      iconClass:
        "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",

      glowClass:
        "from-cyan-400/16 via-transparent to-transparent",
    },

    {
      label:
        "Critical",

      value:
        String(
          criticalIncidents.length,
        ),

      helper:
        "Unresolved incidents",

      Icon:
        Siren,

      iconClass:
        "border-rose-400/20 bg-rose-400/10 text-rose-300",

      glowClass:
        "from-rose-400/14 via-transparent to-transparent",
    },

    {
      label:
        "Investigating",

      value:
        String(
          investigatingCount,
        ),

      helper:
        "Active response workflow",

      Icon:
        Activity,

      iconClass:
        "border-violet-400/20 bg-violet-400/10 text-violet-300",

      glowClass:
        "from-violet-400/14 via-transparent to-transparent",
    },

    {
      label:
        "Resolved",

      value:
        String(
          resolvedCount,
        ),

      helper:
        "Completed incidents",

      Icon:
        CheckCircle2,

      iconClass:
        "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",

      glowClass:
        "from-emerald-400/14 via-transparent to-transparent",
    },
  ];

  // Render the incident response command center.
  return (
    <section className="space-y-6">
      {/* =====================================================
          Incident-response hero
          ===================================================== */}
      <Card className="relative overflow-hidden border-primary/15 bg-card/68 py-0">
        {/* Cyan monitoring atmosphere. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-28 -top-40 size-[420px] rounded-full bg-cyan-400/9 blur-3xl"
        />

        {/* Rose/violet operational depth. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-40 size-[400px] rounded-full bg-rose-500/7 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/65 to-transparent"
        />

        <CardContent className="relative grid gap-7 p-6 lg:grid-cols-[1.3fr_0.7fr] lg:p-7">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] text-primary">
              <ShieldAlert className="size-3.5" />

              Incident response
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Investigate, coordinate and
              resolve operational incidents.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Review infrastructure alerts, incident provenance,
              affected resources and response state from one operational
              workspace.
            </p>
          </div>

          {/* Genuine incident response posture. */}
          <div className="rounded-2xl border border-border/65 bg-background/30 p-4 shadow-inner backdrop-blur-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
              Response posture
            </p>

            <div
              className={`mt-3 flex items-start gap-3 rounded-xl border p-3.5 ${incidentPosture.classes}`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-current/5">
                <PostureIcon className="size-[18px]" />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  {
                    incidentPosture.label
                  }
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {
                    incidentPosture.description
                  }
                </p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-border/45 rounded-xl border border-border/60 bg-card/30 px-3">
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Unresolved
                </span>

                <span className="text-sm font-semibold">
                  {
                    activeIncidents.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Critical
                </span>

                <span className="text-sm font-semibold">
                  {
                    criticalIncidents.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Monitoring generated
                </span>

                <span className="text-sm font-semibold">
                  {
                    monitoringIncidentCount
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          Incident KPI strip
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
                    <p className="text-2xl font-semibold tracking-[-0.035em]">
                      {
                        metric.value
                      }
                    </p>

                    <p className="mt-2 text-xs text-muted-foreground">
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
          Incident investigation controls
          ===================================================== */}
      <Card className="bg-card/72">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="size-4 text-primary" />

                Incident filters
              </CardTitle>

              <CardDescription className="mt-1">
                Search and filter the genuine operational incident dataset.
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
          <div className="grid gap-3 xl:grid-cols-[minmax(300px,1fr)_180px_190px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                aria-label="Search incidents"
                className="h-10 rounded-xl border-border/70 bg-background/30 pl-10 shadow-inner focus-visible:border-primary/40 focus-visible:ring-primary/15"
                onChange={(
                  event,
                ) =>
                  setSearchQuery(
                    event.target
                      .value,
                  )
                }
                placeholder="Search incident, resource or service..."
                type="search"
                value={
                  searchQuery
                }
              />
            </div>

            <NativeSelect
              aria-label="Filter incidents by severity"
              className="w-full"
              onChange={(
                event,
              ) =>
                setSeverityFilter(
                  event.target
                    .value,
                )
              }
              value={
                severityFilter
              }
            >
              <NativeSelectOption value="all">
                All severities
              </NativeSelectOption>

              <NativeSelectOption value="critical">
                Critical
              </NativeSelectOption>

              <NativeSelectOption value="high">
                High
              </NativeSelectOption>

              <NativeSelectOption value="medium">
                Medium
              </NativeSelectOption>

              <NativeSelectOption value="low">
                Low
              </NativeSelectOption>
            </NativeSelect>

            <NativeSelect
              aria-label="Filter incidents by status"
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

              <NativeSelectOption value="acknowledged">
                Acknowledged
              </NativeSelectOption>

              <NativeSelectOption value="investigating">
                Investigating
              </NativeSelectOption>

              <NativeSelectOption value="resolved">
                Resolved
              </NativeSelectOption>
            </NativeSelect>

            <NativeSelect
              aria-label="Filter incidents by source"
              className="w-full"
              onChange={(
                event,
              ) =>
                setSourceFilter(
                  event.target
                    .value,
                )
              }
              value={
                sourceFilter
              }
            >
              <NativeSelectOption value="all">
                All sources
              </NativeSelectOption>

              <NativeSelectOption value="monitoring">
                Monitoring
              </NativeSelectOption>

              <NativeSelectOption value="manual">
                Manual
              </NativeSelectOption>
            </NativeSelect>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {
                  filteredIncidents.length
                }
              </span>
              {" "}
              incidents match the current investigation.
            </p>

            {resourcesQuery.isError && (
              <p className="text-xs text-amber-300">
                Resource context is temporarily unavailable; incident workflow remains usable.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          Empty incident state
          ===================================================== */}
      {filteredIncidents.length ===
        0 && (
        <Card className="bg-card/72">
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center text-center">
            <div className="flex size-13 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
              {hasActiveFilters ? (
                <SearchX className="size-5" />
              ) : (
                <ShieldAlert className="size-5" />
              )}
            </div>

            <p className="mt-4 font-semibold">
              {hasActiveFilters
                ? "No incidents match these filters"
                : "No operational incidents"}
            </p>

            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              {hasActiveFilters
                ? "Change or clear the current search, severity, status or source filters."
                : "No synchronized resources currently have stored operational incidents."}
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
          Operational incident cards
          ===================================================== */}
      <div className="space-y-4">
        {filteredIncidents.map(
          (
            incident,
          ) => {
            // Resolve affected infrastructure context.
            const resource =
              resourceLookup.get(
                incident.resource_id,
              );

            // Resolve semantic presentation.
            const severityStyle =
              getSeverityStyle(
                incident.severity,
              );

            const statusStyle =
              getStatusStyle(
                incident.status,
              );

            const sourceStyle =
              getSourceStyle(
                incident.source,
              );

            const SourceIcon =
              sourceStyle.Icon;

            // Render one genuine backend incident.
            return (
              <Card
                className="group overflow-hidden bg-card/72 py-0"
                key={
                  incident.id
                }
              >
                <CardHeader className="border-b border-border/50 p-4 pb-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={
                            severityStyle.badge
                          }
                          variant="outline"
                        >
                          {
                            severityStyle.label
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

                        <Badge
                          className={
                            sourceStyle.badge
                          }
                          variant="outline"
                        >
                          <SourceIcon className="mr-1.5 size-3" />

                          {
                            sourceStyle.label
                          }
                        </Badge>
                      </div>

                      <CardTitle className="mt-4 text-lg leading-snug">
                        {
                          incident.title
                        }
                      </CardTitle>

                      <CardDescription className="mt-2">
                        {resource ? (
                          <Link
                            className="inline-flex flex-wrap items-center gap-1.5 transition-colors hover:text-primary"
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
                              {" ? "}
                              {
                                resource.region
                              }
                            </span>

                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        ) : (
                          <span className="break-all">
                            {
                              incident.resource_id
                            }
                          </span>
                        )}
                      </CardDescription>
                    </div>

                    <div
                      className={`flex size-11 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110 ${severityStyle.icon}`}
                    >
                      <ShieldAlert className="size-5" />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-4">
                  {/* Genuine incident description. */}
                  <p className="text-sm leading-6 text-muted-foreground">
                    {incident.description ??
                      "No additional incident description is available."}
                  </p>

                  {/* Incident timeline derived from backend timestamps. */}
                  <div className="grid gap-3 rounded-xl border border-border/55 bg-background/20 p-3 sm:grid-cols-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        <Clock3 className="size-3" />

                        Started
                      </div>

                      <p className="mt-1.5 text-xs font-medium">
                        {formatTimestamp(
                          incident.started_at,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Acknowledged
                      </p>

                      <p className="mt-1.5 text-xs font-medium">
                        {incident.acknowledged_at
                          ? formatTimestamp(
                              incident.acknowledged_at,
                            )
                          : "Not acknowledged"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Resolved
                      </p>

                      <p className="mt-1.5 text-xs font-medium">
                        {incident.resolved_at
                          ? formatTimestamp(
                              incident.resolved_at,
                            )
                          : "Unresolved"}
                      </p>
                    </div>
                  </div>

                  {/* Preserve and expand the supported backend workflow. */}
                  {incident.status !==
                    "resolved" && (
                    <div className="flex flex-wrap gap-2 border-t border-border/45 pt-4">
                      {incident.status ===
                        "open" && (
                        <Button
                          className="rounded-xl"
                          disabled={
                            updateIncident.isPending
                          }
                          onClick={() =>
                            void handleStatusChange(
                              incident.id,
                              "acknowledged",
                            )
                          }
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="mr-2 size-3.5" />

                          Acknowledge
                        </Button>
                      )}

                      {(incident.status ===
                        "open" ||
                        incident.status ===
                          "acknowledged") && (
                        <Button
                          className="rounded-xl border-violet-400/20 bg-violet-400/5 text-violet-300 hover:bg-violet-400/10"
                          disabled={
                            updateIncident.isPending
                          }
                          onClick={() =>
                            void handleStatusChange(
                              incident.id,
                              "investigating",
                            )
                          }
                          size="sm"
                          variant="outline"
                        >
                          <CircleDotDashed className="mr-2 size-3.5" />

                          Investigate
                        </Button>
                      )}

                      <Button
                        className="rounded-xl"
                        disabled={
                          updateIncident.isPending
                        }
                        onClick={() =>
                          void handleStatusChange(
                            incident.id,
                            "resolved",
                          )
                        }
                        size="sm"
                      >
                        <CheckCircle2 className="mr-2 size-3.5" />

                        Resolve
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

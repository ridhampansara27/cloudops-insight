// Import React utilities.
import {
  useMemo,
  useState,
} from "react";

// Import operational icons.
import {
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

// Import notifications.
import {
  toast,
} from "sonner";

// Import real incident API.
import {
  useIncidents,
  useUpdateIncidentStatus,
} from "@/features/incidents/api/incidents-api";

// Import resource API for resource names.
import {
  useResources,
} from "@/features/resources/api/resources-api";

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

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

// Import incident severity type for filter options.
import type {
  IncidentSeverity,
} from "@/types/incident";

// Export the incident-management screen.
export function IncidentsPage() {
  // Load incidents from PostgreSQL.
  const incidentsQuery =
    useIncidents();

  // Load resource names for incident display.
  const resourcesQuery =
    useResources({
      // Load all demo resources.
      page: 1,

      // Use backend maximum page size.
      pageSize: 100,
    });

  // Create workflow mutation.
  const updateIncident =
    useUpdateIncidentStatus();

  // Memoize backend incidents so the array reference
  // remains stable between renders.
  const incidents =
    useMemo(
      () =>
        incidentsQuery.data ?? [],
      [
        incidentsQuery.data,
      ],
    );

  // Create resource UUID-to-name lookup.
  const resourceNames =
    new Map(
      (
        resourcesQuery.data
          ?.items ??
        []
      ).map(
        (resource) => [
          // Store resource ID.
          resource.id,

          // Store resource name.
          resource.name,
        ],
      ),
    );

  // Store severity filter.
  const [
    severityFilter,
    setSeverityFilter,
  ] =
    useState("all");

  // Store workflow-status filter.
  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("all");

  // Apply current filters.
  const filteredIncidents =
    useMemo(() => {
      // Return matching incidents.
      return incidents.filter(
        (incident) => {
          // Compare severity.
          const matchesSeverity =
            severityFilter === "all" ||
            incident.severity ===
              severityFilter;

          // Compare status.
          const matchesStatus =
            statusFilter === "all" ||
            incident.status ===
              statusFilter;

          // Require all filters.
          return (
            matchesSeverity &&
            matchesStatus
          );
        },
      );
    }, [
      incidents,
      severityFilter,
      statusFilter,
    ]);

  // Persist an incident status change.
  async function handleStatusChange(
    // Identify incident.
    incidentId: string,

    // Supply new workflow state.
    nextStatus: string,
  ) {
    try {
      // Call FastAPI mutation.
      await updateIncident.mutateAsync({
        // Supply incident ID.
        id:
          incidentId,

        // Supply new status.
        status:
          nextStatus,
      });

      // Confirm backend persistence.
      toast.success(
        "Incident updated.",
      );
    } catch {
      // Display backend failure.
      toast.error(
        "Unable to update incident.",
      );
    }
  }

  // Render incident management.
  return (
    <section className="space-y-6">
      {/* Display page heading. */}
      <div>
        {/* Display section label. */}
        <p className="text-sm font-medium text-primary">
          Operations
        </p>

        {/* Display page title. */}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Incidents
        </h1>

        {/* Explain incident-management functionality. */}
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Investigate infrastructure problems, acknowledge alerts,
          and track incident resolution.
        </p>
      </div>

      {/* Display loading feedback while incidents are requested. */}
      {incidentsQuery.isLoading && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Loading incidents...
          </CardContent>
        </Card>
      )}

      {/* Display backend failure feedback. */}
      {incidentsQuery.isError && (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">
            Unable to load incidents.
          </CardContent>
        </Card>
      )}

      {/* Display incident statistics after loading completes. */}
      {!incidentsQuery.isLoading &&
        !incidentsQuery.isError && (
          <>
            {/* Display incident summary cards. */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Display unresolved incident count. */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>
                    Open incidents
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <p className="text-2xl font-semibold">
                    {
                      incidents.filter(
                        (incident) =>
                          incident.status !==
                          "resolved",
                      ).length
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Display unresolved critical incident count. */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>
                    Critical
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <p className="text-2xl font-semibold">
                    {
                      incidents.filter(
                        (incident) =>
                          incident.severity ===
                            "critical" &&
                          incident.status !==
                            "resolved",
                      ).length
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Display resolved incident count. */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>
                    Resolved
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <p className="text-2xl font-semibold">
                    {
                      incidents.filter(
                        (incident) =>
                          incident.status ===
                          "resolved",
                      ).length
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Display filtering controls. */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Filter incidents by severity. */}
                  <NativeSelect
                    value={
                      severityFilter
                    }
                    onChange={(event) =>
                      setSeverityFilter(
                        event.target.value,
                      )
                    }
                  >
                    {/* Display all severity levels. */}
                    <NativeSelectOption value="all">
                      All severities
                    </NativeSelectOption>

                    {/* Display supported severity options. */}
                    {(
                      [
                        "critical",
                        "high",
                        "medium",
                        "low",
                      ] as IncidentSeverity[]
                    ).map(
                      (severity) => (
                        <NativeSelectOption
                          key={
                            severity
                          }
                          value={
                            severity
                          }
                        >
                          {
                            severity
                          }
                        </NativeSelectOption>
                      ),
                    )}
                  </NativeSelect>

                  {/* Filter incidents by workflow status. */}
                  <NativeSelect
                    value={
                      statusFilter
                    }
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value,
                      )
                    }
                  >
                    {/* Display every workflow state. */}
                    <NativeSelectOption value="all">
                      All statuses
                    </NativeSelectOption>

                    {/* Display open incidents. */}
                    <NativeSelectOption value="open">
                      Open
                    </NativeSelectOption>

                    {/* Display acknowledged incidents. */}
                    <NativeSelectOption value="acknowledged">
                      Acknowledged
                    </NativeSelectOption>

                    {/* Display incidents under investigation. */}
                    <NativeSelectOption value="investigating">
                      Investigating
                    </NativeSelectOption>

                    {/* Display resolved incidents. */}
                    <NativeSelectOption value="resolved">
                      Resolved
                    </NativeSelectOption>
                  </NativeSelect>
                </div>
              </CardContent>
            </Card>

            {/* Display a message when no incidents match the filters. */}
            {filteredIncidents.length ===
              0 && (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="font-medium">
                    {
                      incidents.length ===
                      0
                        ? "No active incidents"
                        : "No incidents match the current filters"
                    }
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {
                      incidents.length ===
                      0
                        ? "No synchronized resources currently meet incident-triggering conditions."
                        : "Adjust the severity or status filters to see other incidents."
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Display filtered backend incidents. */}
            <div className="space-y-4">
              {filteredIncidents.map(
                (incident) => (
                  <Card
                    key={
                      incident.id
                    }
                  >
                    <CardHeader>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          {/* Display incident metadata. */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Display incident severity. */}
                            <Badge
                              variant={
                                incident.severity ===
                                "critical"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {
                                incident.severity
                              }
                            </Badge>

                            {/* Display workflow state. */}
                            <Badge variant="outline">
                              {
                                incident.status
                              }
                            </Badge>

                            {/* Display incident UUID. */}
                            <span className="text-xs text-muted-foreground">
                              {
                                incident.id
                              }
                            </span>
                          </div>

                          {/* Display incident title. */}
                          <CardTitle className="mt-3">
                            {
                              incident.title
                            }
                          </CardTitle>

                          {/* Resolve resource UUID to its visible resource name. */}
                          <CardDescription className="mt-2">
                            {resourceNames.get(
                              incident.resource_id,
                            ) ??
                              incident.resource_id}
                          </CardDescription>
                        </div>

                        {/* Display incident warning icon. */}
                        <ShieldAlert className="size-5 text-muted-foreground" />
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Display incident description. */}
                      <p className="text-sm text-muted-foreground">
                        {
                          incident.description
                        }
                      </p>

                      {/* Display workflow actions. */}
                      <div className="flex flex-wrap gap-2">
                        {/* Allow open incidents to be acknowledged. */}
                        {incident.status ===
                          "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              updateIncident.isPending
                            }
                            onClick={() =>
                              void handleStatusChange(
                                incident.id,
                                "acknowledged",
                              )
                            }
                          >
                            Acknowledge
                          </Button>
                        )}

                        {/* Allow every unresolved incident to be resolved. */}
                        {incident.status !==
                          "resolved" && (
                          <Button
                            size="sm"
                            disabled={
                              updateIncident.isPending
                            }
                            onClick={() =>
                              void handleStatusChange(
                                incident.id,
                                "resolved",
                              )
                            }
                          >
                            {/* Display resolve icon. */}
                            <CheckCircle2 className="mr-2 size-4" />

                            Resolve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          </>
        )}
    </section>
  );
}

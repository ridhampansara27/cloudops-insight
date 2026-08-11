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

// Import mock incidents.
import { mockIncidents } from "@/mocks/incidents";

// Import incident types.
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
} from "@/types/incident";

// Export the incident-management screen.
export function IncidentsPage() {
  // Store incidents locally until backend integration.
  const [incidents, setIncidents] =
    useState<Incident[]>(mockIncidents);

  // Store severity filter.
  const [severityFilter, setSeverityFilter] =
    useState("all");

  // Store workflow-status filter.
  const [statusFilter, setStatusFilter] =
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

  // Update one incident workflow state.
  function updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
  ) {
    // Update local state.
    setIncidents((current) =>
      current.map((incident) =>
        incident.id === incidentId
          ? {
              ...incident,
              status,
              resolvedAt:
                status === "resolved"
                  ? new Date().toISOString()
                  : incident.resolvedAt,
            }
          : incident,
      ),
    );
  }

  // Render incident management.
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          Operations
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Incidents
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Investigate infrastructure problems, acknowledge alerts,
          and track incident resolution.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <NativeSelect
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(
                  event.target.value,
                )
              }
            >
              <NativeSelectOption value="all">
                All severities
              </NativeSelectOption>

              {(
                [
                  "critical",
                  "high",
                  "medium",
                  "low",
                ] as IncidentSeverity[]
              ).map((severity) => (
                <NativeSelectOption
                  key={severity}
                  value={severity}
                >
                  {severity}
                </NativeSelectOption>
              ))}
            </NativeSelect>

            <NativeSelect
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
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
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredIncidents.map(
          (incident) => (
            <Card key={incident.id}>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          incident.severity ===
                          "critical"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {incident.severity}
                      </Badge>

                      <Badge variant="outline">
                        {incident.status}
                      </Badge>

                      <span className="text-xs text-muted-foreground">
                        {incident.id}
                      </span>
                    </div>

                    <CardTitle className="mt-3">
                      {incident.title}
                    </CardTitle>

                    <CardDescription className="mt-2">
                      {incident.resourceName}
                    </CardDescription>
                  </div>

                  <ShieldAlert className="size-5 text-muted-foreground" />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {incident.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {incident.status ===
                    "open" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateIncidentStatus(
                          incident.id,
                          "acknowledged",
                        )
                      }
                    >
                      Acknowledge
                    </Button>
                  )}

                  {incident.status !==
                    "resolved" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        updateIncidentStatus(
                          incident.id,
                          "resolved",
                        )
                      }
                    >
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
    </section>
  );
}
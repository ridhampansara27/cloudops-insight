// Define incident severity.
export type IncidentSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low";

// Define incident workflow state.
export type IncidentStatus =
  | "open"
  | "acknowledged"
  | "investigating"
  | "resolved";

// Define one operational incident.
export interface Incident {
  // Store the incident identifier.
  id: string;

  // Display the incident title.
  title: string;

  // Identify the affected resource.
  resourceName: string;

  // Store the related resource ID.
  resourceId: string;

  // Store incident severity.
  severity: IncidentSeverity;

  // Store workflow state.
  status: IncidentStatus;

  // Explain what triggered the incident.
  description: string;

  // Store incident creation time.
  startedAt: string;

  // Store optional resolution time.
  resolvedAt?: string;

  // Store the current owner.
  assignedTo?: string;
}
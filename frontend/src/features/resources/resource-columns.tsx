// Import the TanStack Table column helper.
import { createColumnHelper } from "@tanstack/react-table";

// Import the sorting icon.
import { ArrowUpDown } from "lucide-react";

// Import React Router's navigation link.
import { Link } from "react-router-dom";

// Import the resource-health badge.
import { ResourceHealthBadge } from "@/components/shared/resource-health-badge";

// Import reusable UI components.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Import the table feature type.
import type { ResourceTableFeatures } from "@/features/resources/resource-table-features";

// Import the cloud-resource model.
import type { CloudResource } from "@/types/resource";

// Create a strongly typed column helper.
const columnHelper =
  createColumnHelper<ResourceTableFeatures, CloudResource>();

// Format monetary values consistently.
function formatCurrency(value: number): string {
  // Create a euro currency formatter.
  return new Intl.NumberFormat("de-DE", {
    // Display the value as currency.
    style: "currency",

    // Use euros throughout the frontend mock data.
    currency: "EUR",
  }).format(value);
}

// Format timestamps for the resource inventory.
function formatTimestamp(value: string): string {
  // Convert the ISO timestamp into a Date object.
  const date = new Date(value);

  // Return a compact German-localized date and time.
  return new Intl.DateTimeFormat("de-DE", {
    // Display the day.
    day: "2-digit",

    // Display the month.
    month: "2-digit",

    // Display the hour.
    hour: "2-digit",

    // Display the minute.
    minute: "2-digit",
  }).format(date);
}

// Export the complete resource-table column configuration.
export const resourceColumns = columnHelper.columns([
  // Resource-name column.
  columnHelper.accessor("name", {
    // Render a sortable header.
    header: ({ column }) => (
      <Button
        // Use a lightweight button style inside the header.
        variant="ghost"

        // Remove unnecessary left spacing.
        className="-ml-3"

        // Toggle between ascending and descending sorting.
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        Resource

        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),

    // Render the resource identity.
    cell: ({ row }) => (
      <div className="min-w-[220px]">
        <Link
          // Navigate to the resource detail screen.
          to={`/cloud/resources/${row.original.id}`}

          // Make the resource name clearly interactive.
          className="font-medium text-foreground hover:text-primary hover:underline"
        >
          {row.original.name}
        </Link>

        <p className="mt-1 max-w-[260px] truncate text-xs text-muted-foreground">
          {row.original.resourceId}
        </p>
      </div>
    ),

    // Use text sorting.
    sortFn: "text",
  }),

  // AWS service column.
  columnHelper.accessor("service", {
    // Display the header.
    header: "Service",

    // Render the service as a badge.
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.service}
      </Badge>
    ),

    // Use text sorting.
    sortFn: "text",
  }),

  // Operational-health column.
  columnHelper.accessor("health", {
    // Display the header.
    header: "Health",

    // Render the custom health badge.
    cell: ({ row }) => (
      <ResourceHealthBadge health={row.original.health} />
    ),

    // Use text sorting.
    sortFn: "text",
  }),

  // Environment column.
  columnHelper.accessor("environment", {
    // Display the header.
    header: "Environment",

    // Capitalize environment names.
    cell: ({ row }) => (
      <span className="capitalize">
        {row.original.environment}
      </span>
    ),

    // Use text sorting.
    sortFn: "text",
  }),

  // AWS region column.
  columnHelper.accessor("region", {
    // Display the header.
    header: "Region",

    // Render the region string.
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm">
        {row.original.region}
      </span>
    ),

    // Use text sorting.
    sortFn: "text",
  }),

  // Resource owner column.
  columnHelper.accessor("owner", {
    // Display the header.
    header: "Owner",

    // Render the owner.
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {row.original.owner}
      </span>
    ),

    // Use text sorting.
    sortFn: "text",
  }),

  // CPU utilization column.
  columnHelper.accessor("cpuUtilization", {
    // Render a sortable header.
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        CPU

        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),

    // Render CPU usage when available.
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {row.original.cpuUtilization === undefined
          ? "—"
          : `${row.original.cpuUtilization.toFixed(1)}%`}
      </span>
    ),

    // Use numeric sorting.
    sortFn: "basic",
  }),

  // Month-to-date cost column.
  columnHelper.accessor("monthToDateCost", {
    // Render a sortable header.
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        MTD Cost

        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),

    // Render formatted cost.
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-medium">
        {formatCurrency(row.original.monthToDateCost)}
      </span>
    ),

    // Use numeric sorting.
    sortFn: "basic",
  }),

  // Forecast-cost column.
  columnHelper.accessor("forecastCost", {
    // Display the header.
    header: "Forecast",

    // Render forecasted cost.
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {formatCurrency(row.original.forecastCost)}
      </span>
    ),

    // Use numeric sorting.
    sortFn: "basic",
  }),

  // Last synchronization column.
  columnHelper.accessor("lastSyncedAt", {
    // Display the header.
    header: "Last synced",

    // Format the timestamp.
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {formatTimestamp(row.original.lastSyncedAt)}
      </span>
    ),

    // Use alphanumeric sorting.
    sortFn: "alphanumeric",
  }),

  // Action column that does not map directly to data.
  columnHelper.display({
    // Give the display column an identifier.
    id: "actions",

    // Keep the header empty.
    header: "",

    // Render the detail navigation button.
    cell: ({ row }) => (
      <Button
        // Render the button as a React Router link through Base UI's render API.
        render={
          <Link
            to={`/cloud/resources/${row.original.id}`}
          />
        }

        // Use a compact outline style.
        variant="outline"

        // Use the small button size.
        size="sm"
      >
        View
      </Button>
    ),
  }),
]);
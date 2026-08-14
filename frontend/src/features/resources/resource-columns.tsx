// Import the TanStack Table column helper.
import {
  createColumnHelper,
} from "@tanstack/react-table";

// Import sorting icon.
import {
  ArrowUpDown,
} from "lucide-react";

// Import React Router navigation.
import {
  Link,
} from "react-router-dom";

// Import resource-health badge.
import {
  ResourceHealthBadge,
} from "@/components/shared/resource-health-badge";

// Import reusable UI components.
import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

// Import shared formatting.
import {
  formatTimestamp,
} from "@/lib/formatters";

// Import resource table feature typing.
import type {
  ResourceTableFeatures,
} from "@/features/resources/resource-table-features";

// Import the real API resource type.
import type {
  ResourceApiResponse,
} from "@/types/api";


// Create a strongly typed column helper.
const columnHelper =
  createColumnHelper<
    ResourceTableFeatures,
    ResourceApiResponse
  >();


// Export the resource columns.
export const resourceColumns =
  columnHelper.columns([
    // Resource identity column.
    columnHelper.accessor(
      "name",
      {
        // Render sortable header.
        header: ({
          column,
        }) => (
          <Button
            variant="ghost"
            className="-ml-3"
            onClick={() =>
              column.toggleSorting(
                column.getIsSorted() ===
                  "asc",
              )
            }
          >
            Resource

            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        ),

        // Render resource identity.
        cell: ({
          row,
        }) => (
          <div className="min-w-[220px]">
            <Link
              to={`/cloud/resources/${row.original.id}`}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {
                row.original.name
              }
            </Link>

            <p className="mt-1 max-w-[280px] truncate text-xs text-muted-foreground">
              {
                row.original
                  .provider_resource_id
              }
            </p>
          </div>
        ),

        // Sort names alphabetically.
        sortFn: "text",
      },
    ),

    // Service column.
    columnHelper.accessor(
      "service",
      {
        // Display service heading.
        header: "Service",

        // Display service badge.
        cell: ({
          row,
        }) => (
          <Badge variant="outline">
            {
              row.original.service
            }
          </Badge>
        ),

        // Sort alphabetically.
        sortFn: "text",
      },
    ),

    // Health column.
    columnHelper.accessor(
      "health_state",
      {
        // Display health heading.
        header: "Health",

        // Display health badge.
        cell: ({
          row,
        }) => (
          <ResourceHealthBadge
            health={
              row.original
                .health_state
            }
          />
        ),

        // Sort alphabetically.
        sortFn: "text",
      },
    ),

    // Cloud state column.
    columnHelper.accessor(
      "cloud_state",
      {
        // Display state heading.
        header: "Cloud state",

        // Display provider state.
        cell: ({
          row,
        }) => (
          <Badge
            variant="secondary"
            className="capitalize"
          >
            {
              row.original
                .cloud_state
            }
          </Badge>
        ),

        // Sort state values.
        sortFn: "text",
      },
    ),

    // Environment column.
    columnHelper.accessor(
      "environment",
      {
        // Display heading.
        header: "Environment",

        // Render environment safely.
        cell: ({
          row,
        }) => (
          <span className="capitalize">
            {row.original
              .environment ??
              "Unassigned"}
          </span>
        ),

        // Sort environment names.
        sortFn: "text",
      },
    ),

    // Region column.
    columnHelper.accessor(
      "region",
      {
        // Display region heading.
        header: "Region",

        // Render AWS region.
        cell: ({
          row,
        }) => (
          <span className="whitespace-nowrap text-sm">
            {
              row.original.region
            }
          </span>
        ),

        // Sort regions.
        sortFn: "text",
      },
    ),

    // Owner column.
    columnHelper.accessor(
      "owner",
      {
        // Display owner heading.
        header: "Owner",

        // Render owner.
        cell: ({
          row,
        }) => (
          <span className="whitespace-nowrap">
            {row.original.owner ??
              "Unassigned"}
          </span>
        ),

        // Sort owners.
        sortFn: "text",
      },
    ),

    // Synchronization timestamp.
    columnHelper.accessor(
      "last_synced_at",
      {
        // Display sync heading.
        header: "Last synced",

        // Render localized timestamp.
        cell: ({
          row,
        }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatTimestamp(
              row.original
                .last_synced_at,
            )}
          </span>
        ),

        // Sort timestamp strings.
        sortFn: "alphanumeric",
      },
    ),

    // Resource navigation action.
    columnHelper.display({
      // Give the column an ID.
      id: "actions",

      // Keep the heading empty.
      header: "",

      // Render the detail button.
      cell: ({
        row,
      }) => (
        <Button
          render={
            <Link
              to={`/cloud/resources/${row.original.id}`}
            />
          }
          variant="outline"
          size="sm"
        >
          View
        </Button>
      ),
    }),
  ]);
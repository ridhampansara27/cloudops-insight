// Import the TanStack Table column helper.
import {
  createColumnHelper,
} from "@tanstack/react-table";

// Import inventory presentation icons.
import {
  ArrowUpDown,
  ArrowUpRight,
  Box,
  Clock3,
  MapPin,
  UserRound,
} from "lucide-react";

// Import React Router resource navigation.
import {
  Link,
} from "react-router-dom";

// Import resource-health presentation.
import {
  ResourceHealthBadge,
} from "@/components/shared/resource-health-badge";

// Import reusable UI.
import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

// Import shared timestamp formatting.
import {
  formatTimestamp,
} from "@/lib/formatters";

// Import table feature typing.
import type {
  ResourceTableFeatures,
} from "@/features/resources/resource-table-features";

// Import the genuine API resource model.
import type {
  ResourceApiResponse,
} from "@/types/api";


// Create a strongly typed resource-column helper.
const columnHelper =
  createColumnHelper<
    ResourceTableFeatures,
    ResourceApiResponse
  >();


// Export the production Resource Explorer columns.
export const resourceColumns =
  columnHelper.columns([
    // ========================================================
    // Resource identity
    // ========================================================
    columnHelper.accessor(
      "name",
      {
        header: ({
          column,
        }) => (
          <Button
            className="-ml-3 h-8 rounded-lg px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            onClick={() =>
              column.toggleSorting(
                column.getIsSorted() ===
                  "asc",
              )
            }
            variant="ghost"
          >
            Resource

            <ArrowUpDown className="ml-2 size-3.5" />
          </Button>
        ),

        cell: ({
          row,
        }) => (
          <div className="flex min-w-[250px] items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/8 text-cyan-300 transition-colors group-hover:border-cyan-400/25 group-hover:bg-cyan-400/12">
              <Box className="size-4" />
            </div>

            <div className="min-w-0">
              <Link
                className="block max-w-[280px] truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                to={`/cloud/resources/${row.original.id}`}
              >
                {
                  row.original.name
                }
              </Link>

              <p className="mt-1 max-w-[300px] truncate font-mono text-[10px] text-muted-foreground">
                {
                  row.original
                    .provider_resource_id
                }
              </p>
            </div>
          </div>
        ),

        sortFn:
          "text",
      },
    ),

    // ========================================================
    // AWS service
    // ========================================================
    columnHelper.accessor(
      "service",
      {
        header:
          "Service",

        cell: ({
          row,
        }) => (
          <Badge
            className="border-sky-400/20 bg-sky-400/8 text-sky-300"
            variant="outline"
          >
            {
              row.original
                .service
            }
          </Badge>
        ),

        sortFn:
          "text",
      },
    ),

    // ========================================================
    // CloudOps health
    // ========================================================
    columnHelper.accessor(
      "health_state",
      {
        header:
          "Health",

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

        sortFn:
          "text",
      },
    ),

    // ========================================================
    // Native provider state
    // ========================================================
    columnHelper.accessor(
      "cloud_state",
      {
        header:
          "Cloud state",

        cell: ({
          row,
        }) => (
          <Badge
            className="border-border/70 bg-muted/35 capitalize text-foreground"
            variant="secondary"
          >
            {
              row.original
                .cloud_state
            }
          </Badge>
        ),

        sortFn:
          "text",
      },
    ),

    // ========================================================
    // Deployment environment
    // ========================================================
    columnHelper.accessor(
      "environment",
      {
        header:
          "Environment",

        cell: ({
          row,
        }) => (
          <span className="inline-flex rounded-md border border-violet-400/15 bg-violet-400/7 px-2 py-1 text-xs capitalize text-violet-200">
            {row.original
              .environment ??
              "Unassigned"}
          </span>
        ),

        sortFn:
          "text",
      },
    ),

    // ========================================================
    // AWS region
    // ========================================================
    columnHelper.accessor(
      "region",
      {
        header:
          "Region",

        cell: ({
          row,
        }) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
            <MapPin className="size-3.5 text-sky-300" />

            {
              row.original.region
            }
          </span>
        ),

        sortFn:
          "text",
      },
    ),

    // ========================================================
    // Resource ownership
    // ========================================================
    columnHelper.accessor(
      "owner",
      {
        header:
          "Owner",

        cell: ({
          row,
        }) => (
          <span className="inline-flex max-w-[180px] items-center gap-1.5 truncate text-xs text-muted-foreground">
            <UserRound className="size-3.5 shrink-0" />

            {row.original.owner ??
              "Unassigned"}
          </span>
        ),

        sortFn:
          "text",
      },
    ),

    // ========================================================
    // Synchronization freshness
    // ========================================================
    columnHelper.accessor(
      "last_synced_at",
      {
        header:
          "Last synced",

        cell: ({
          row,
        }) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground">
            <Clock3 className="size-3.5" />

            {formatTimestamp(
              row.original
                .last_synced_at,
            )}
          </span>
        ),

        sortFn:
          "alphanumeric",
      },
    ),

    // ========================================================
    // Resource investigation action
    // ========================================================
    columnHelper.display({
      id:
        "actions",

      header:
        "",

      cell: ({
        row,
      }) => (
        <Button
          className="rounded-xl border-primary/15 bg-primary/5 text-primary hover:bg-primary/10"
          render={
            <Link
              to={`/cloud/resources/${row.original.id}`}
            />
          }
          size="sm"
          variant="outline"
        >
          Inspect

          <ArrowUpRight className="ml-1.5 size-3.5" />
        </Button>
      ),
    }),
  ]);

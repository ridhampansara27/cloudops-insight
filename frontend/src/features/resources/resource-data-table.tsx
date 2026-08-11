// Import React state management.
import { useState } from "react";

// Import TanStack Table types and APIs.
import {
  // Define the sorting-state type.
  type SortingState,

  // Create the table instance.
  useTable,
} from "@tanstack/react-table";

// Import pagination icons.
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

// Import reusable buttons.
import { Button } from "@/components/ui/button";

// Import the shadcn table primitives.
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Import the resource column configuration.
import { resourceColumns } from "@/features/resources/resource-columns";

// Import the feature configuration.
import { resourceTableFeatures } from "@/features/resources/resource-table-features";

// Import the cloud-resource type.
import type { CloudResource } from "@/types/resource";

// Define the component properties.
interface ResourceDataTableProps {
  // Supply the resources that passed the current filters.
  data: CloudResource[];
}

// Export the resource inventory table.
export function ResourceDataTable({
  data,
}: ResourceDataTableProps) {
  // Store the current table sorting configuration.
  const [sorting, setSorting] =
    useState<SortingState>([]);

  // Create the TanStack Table instance.
  const table = useTable({
    // Enable the features declared for this table.
    features: resourceTableFeatures,

    // Supply the current filtered dataset.
    data,

    // Supply the column definitions.
    columns: resourceColumns,

    // Update React state whenever sorting changes.
    onSortingChange: setSorting,

    // Provide controlled state to the table.
    state: {
      // Supply the current sorting configuration.
      sorting,
    },
  });

  // Render the table and pagination controls.
  return (
    <div className="space-y-4">
      {/* Create a horizontally scrollable table container. */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            {/* Render table headers. */}
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="whitespace-nowrap"
                    >
                      {header.isPlaceholder
                        ? null
                        : (
                          <table.FlexRender
                            header={header}
                          />
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            {/* Render table content. */}
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                // Render one table row per resource.
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    // Use the TanStack row identifier.
                    key={row.id}

                    // Add a subtle hover effect.
                    className="hover:bg-muted/50"
                  >
                    {/* Render every cell defined for the current resource row. */}
                    {row.getAllCells().map((cell) => (
                        <TableCell
                            // Use TanStack Table's unique cell identifier.
                            key={cell.id}

                            // Keep the table vertically compact.
                            className="py-3"
                        >
                            {/* Render the cell using its configured column definition. */}
                            <table.FlexRender
                            cell={cell}
                            />
                        </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                // Render an empty state when filters match nothing.
                <TableRow>
                  <TableCell
                    // Span all resource columns.
                    colSpan={resourceColumns.length}

                    // Provide enough vertical space for the empty state.
                    className="h-40 text-center"
                  >
                    <div>
                      <p className="font-medium">
                        No resources found
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Change your search or filter criteria.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Display pagination information and controls. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Display the visible resource count. */}
        <p className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of{" "}
          {data.length} resources
        </p>

        {/* Display pagination controls. */}
        <div className="flex items-center gap-2">
          {/* Display the current page number. */}
          <span className="mr-2 text-sm text-muted-foreground">
            Page {table.state.pagination.pageIndex + 1} of{" "}
            {Math.max(table.getPageCount(), 1)}
          </span>

          {/* Navigate to the first page. */}
          <Button
            aria-label="Go to first page"
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="size-4" />
          </Button>

          {/* Navigate to the previous page. */}
          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="size-4" />
          </Button>

          {/* Navigate to the next page. */}
          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="size-4" />
          </Button>

          {/* Navigate to the final page. */}
          <Button
            aria-label="Go to last page"
            variant="outline"
            size="icon"
            onClick={() =>
              table.setPageIndex(
                Math.max(table.getPageCount() - 1, 0),
              )
            }
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
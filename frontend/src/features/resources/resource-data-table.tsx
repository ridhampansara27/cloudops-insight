// Import React sorting state.
import {
  useState,
} from "react";

// Import TanStack Table APIs.
import {
  type SortingState,
  useTable,
} from "@tanstack/react-table";

// Import pagination icons.
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

// Import reusable button.
import {
  Button,
} from "@/components/ui/button";

// Import table primitives.
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Import columns.
import {
  resourceColumns,
} from "@/features/resources/resource-columns";

// Import feature configuration.
import {
  resourceTableFeatures,
} from "@/features/resources/resource-table-features";

// Import API resource type.
import type {
  ResourceApiResponse,
} from "@/types/api";


// Define server-pagination properties.
interface ResourceDataTableProps {
  // Supply the current backend page.
  data: ResourceApiResponse[];

  // Supply the current one-based page.
  page: number;

  // Supply page size.
  pageSize: number;

  // Supply total matching resources.
  total: number;

  // Supply total server page count.
  totalPages: number;

  // Allow the parent to change the backend page.
  onPageChange: (
    page: number,
  ) => void;
}


// Export the server-paginated resource table.
export function ResourceDataTable({
  // Receive resources.
  data,

  // Receive current page.
  page,

  // Receive page size.
  pageSize,

  // Receive total rows.
  total,

  // Receive total pages.
  totalPages,

  // Receive page callback.
  onPageChange,
}: ResourceDataTableProps) {
  // Store sorting for the currently loaded backend page.
  const [
    sorting,
    setSorting,
  ] =
    useState<SortingState>(
      [],
    );

  // Create the TanStack table.
  const table =
    useTable({
      // Enable sorting.
      features:
        resourceTableFeatures,

      // Supply current server page.
      data,

      // Supply columns.
      columns:
        resourceColumns,

      // Store sorting state.
      onSortingChange:
        setSorting,

      // Supply controlled state.
      state: {
        // Supply sorting.
        sorting,
      },
    });

  // Determine whether a previous server page exists.
  const canPrevious =
    page > 1;

  // Determine whether another server page exists.
  const canNext =
    page < totalPages;

  // Calculate the first visible row number.
  const firstVisible =
    total === 0
      ? 0
      : (
          page - 1
        ) *
          pageSize +
        1;

  // Calculate the final visible row number.
  const lastVisible =
    Math.min(
      page * pageSize,
      total,
    );

  // Render table.
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table
                .getHeaderGroups()
                .map(
                  (
                    headerGroup,
                  ) => (
                    <TableRow
                      key={
                        headerGroup.id
                      }
                    >
                      {headerGroup.headers.map(
                        (
                          header,
                        ) => (
                          <TableHead
                            key={
                              header.id
                            }
                            className="whitespace-nowrap"
                          >
                            {header.isPlaceholder
                              ? null
                              : (
                                <table.FlexRender
                                  header={
                                    header
                                  }
                                />
                              )}
                          </TableHead>
                        ),
                      )}
                    </TableRow>
                  ),
                )}
            </TableHeader>

            <TableBody>
              {table.getRowModel()
                .rows.length >
              0 ? (
                table
                  .getRowModel()
                  .rows.map(
                    (row) => (
                      <TableRow
                        key={
                          row.id
                        }
                        className="hover:bg-muted/50"
                      >
                        {row
                          .getAllCells()
                          .map(
                            (
                              cell,
                            ) => (
                              <TableCell
                                key={
                                  cell.id
                                }
                                className="py-3"
                              >
                                <table.FlexRender
                                  cell={
                                    cell
                                  }
                                />
                              </TableCell>
                            ),
                          )}
                      </TableRow>
                    ),
                  )
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={
                      resourceColumns.length
                    }
                    className="h-40 text-center"
                  >
                    <p className="font-medium">
                      No resources found
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Change your search or filter criteria.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          {firstVisible}
          –
          {lastVisible} of{" "}
          {total} resources
        </p>

        <div className="flex items-center gap-2">
          <span className="mr-2 text-sm text-muted-foreground">
            Page {page} of{" "}
            {Math.max(
              totalPages,
              1,
            )}
          </span>

          <Button
            aria-label="Go to first page"
            variant="outline"
            size="icon"
            disabled={
              !canPrevious
            }
            onClick={() =>
              onPageChange(
                1,
              )
            }
          >
            <ChevronsLeft className="size-4" />
          </Button>

          <Button
            aria-label="Go to previous page"
            variant="outline"
            size="icon"
            disabled={
              !canPrevious
            }
            onClick={() =>
              onPageChange(
                page - 1,
              )
            }
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Button
            aria-label="Go to next page"
            variant="outline"
            size="icon"
            disabled={
              !canNext
            }
            onClick={() =>
              onPageChange(
                page + 1,
              )
            }
          >
            <ChevronRight className="size-4" />
          </Button>

          <Button
            aria-label="Go to last page"
            variant="outline"
            size="icon"
            disabled={
              !canNext
            }
            onClick={() =>
              onPageChange(
                totalPages,
              )
            }
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
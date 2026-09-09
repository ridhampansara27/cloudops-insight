// Import React sorting state.
import {
  useState,
} from "react";

// Import TanStack Table APIs.
import {
  type SortingState,
  useTable,
} from "@tanstack/react-table";

// Import pagination and empty-inventory icons.
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SearchX,
} from "lucide-react";

// Import reusable UI.
import {
  Button,
} from "@/components/ui/button";

import {
  Card,
} from "@/components/ui/card";

// Import table primitives.
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Import resource columns.
import {
  resourceColumns,
} from "@/features/resources/resource-columns";

// Import TanStack feature configuration.
import {
  resourceTableFeatures,
} from "@/features/resources/resource-table-features";

// Import the genuine API resource type.
import type {
  ResourceApiResponse,
} from "@/types/api";


// Define server-pagination properties.
interface ResourceDataTableProps {
  // Current backend resource page.
  data:
    ResourceApiResponse[];

  // One-based backend page.
  page: number;

  // Backend page size.
  pageSize: number;

  // Total genuine matching resources.
  total: number;

  // Total backend page count.
  totalPages: number;

  // Tell the empty state whether filters are active.
  hasActiveFilters: boolean;

  // Allow the parent page to request another backend page.
  onPageChange: (
    page: number,
  ) => void;
}


// Export the premium server-backed inventory table.
export function ResourceDataTable({
  data,
  page,
  pageSize,
  total,
  totalPages,
  hasActiveFilters,
  onPageChange,
}: ResourceDataTableProps) {
  // Sort only the currently loaded backend page.
  const [
    sorting,
    setSorting,
  ] =
    useState<SortingState>(
      [],
    );

  // Construct the TanStack table.
  const table =
    useTable({
      features:
        resourceTableFeatures,

      data,

      columns:
        resourceColumns,

      onSortingChange:
        setSorting,

      state: {
        sorting,
      },
    });

  // Determine available backend navigation directions.
  const canPrevious =
    page >
    1;

  const canNext =
    page <
    totalPages;

  // Calculate the genuine visible record range.
  const firstVisible =
    total ===
    0
      ? 0
      : (
          page -
          1
        ) *
          pageSize +
        1;

  const lastVisible =
    Math.min(
      page *
        pageSize,
      total,
    );

  // Render the inventory surface.
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden bg-card/72 py-0">
        {/* Table identity strip. */}
        <div className="flex flex-col gap-3 border-b border-border/60 bg-background/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/8 text-cyan-300">
              <Boxes className="size-4" />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Inventory records
              </p>

              <p className="text-xs text-muted-foreground">
                Synchronized AWS resources returned by the current query.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-1 text-xs text-muted-foreground">
            {
              total
            }
            {" "}
            results
          </div>
        </div>

        {/* Keep wide operational tables horizontally scrollable. */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/20">
              {table
                .getHeaderGroups()
                .map(
                  (
                    headerGroup,
                  ) => (
                    <TableRow
                      className="border-border/60 hover:bg-transparent"
                      key={
                        headerGroup.id
                      }
                    >
                      {headerGroup.headers.map(
                        (
                          header,
                        ) => (
                          <TableHead
                            className="h-11 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                            key={
                              header.id
                            }
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
              {table
                .getRowModel()
                .rows
                .length >
              0 ? (
                table
                  .getRowModel()
                  .rows
                  .map(
                    (
                      row,
                    ) => (
                      <TableRow
                        className="group border-border/45 transition-all duration-200 hover:bg-primary/[0.045]"
                        key={
                          row.id
                        }
                      >
                        {row
                          .getAllCells()
                          .map(
                            (
                              cell,
                            ) => (
                              <TableCell
                                className="py-3.5"
                                key={
                                  cell.id
                                }
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
                    className="h-[280px] text-center"
                    colSpan={
                      resourceColumns.length
                    }
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
                        {hasActiveFilters ? (
                          <SearchX className="size-5" />
                        ) : (
                          <Boxes className="size-5" />
                        )}
                      </div>

                      <p className="mt-4 font-semibold">
                        {hasActiveFilters
                          ? "No resources match these filters"
                          : "No synchronized resources"}
                      </p>

                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {hasActiveFilters
                          ? "Change or clear the current search and filter criteria."
                          : "AWS resources will appear after an inventory synchronization completes."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Server-pagination command bar. */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {total === 0 ? (
            <>
              Showing{" "}
              <span className="font-semibold text-foreground">
                0
              </span>
              {" "}
              of{" "}
              <span className="font-semibold text-foreground">
                0
              </span>
              {" "}
              resources
            </>
          ) : (
            <>
              Showing{" "}
              <span className="font-semibold text-foreground">
                {
                  firstVisible
                }
                ?
                {
                  lastVisible
                }
              </span>
              {" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {
                  total
                }
              </span>
              {" "}
              resources
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-muted-foreground">
            Page{" "}
            <span className="font-semibold text-foreground">
              {
                page
              }
            </span>
            {" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {Math.max(
                totalPages,
                1,
              )}
            </span>
          </span>

          <Button
            aria-label="Go to first page"
            className="rounded-xl"
            disabled={
              !canPrevious
            }
            onClick={() =>
              onPageChange(
                1,
              )
            }
            size="icon"
            variant="outline"
          >
            <ChevronsLeft className="size-4" />
          </Button>

          <Button
            aria-label="Go to previous page"
            className="rounded-xl"
            disabled={
              !canPrevious
            }
            onClick={() =>
              onPageChange(
                page -
                  1,
              )
            }
            size="icon"
            variant="outline"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Button
            aria-label="Go to next page"
            className="rounded-xl"
            disabled={
              !canNext
            }
            onClick={() =>
              onPageChange(
                page +
                  1,
              )
            }
            size="icon"
            variant="outline"
          >
            <ChevronRight className="size-4" />
          </Button>

          <Button
            aria-label="Go to last page"
            className="rounded-xl"
            disabled={
              !canNext
            }
            onClick={() =>
              onPageChange(
                totalPages,
              )
            }
            size="icon"
            variant="outline"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

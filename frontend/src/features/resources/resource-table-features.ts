// Import the optional TanStack Table features required by the resource table.
import {
  // Create the paginated row model.
  createPaginatedRowModel,

  // Create the sorted row model.
  createSortedRowModel,

  // Enable client-side pagination.
  rowPaginationFeature,

  // Enable client-side sorting.
  rowSortingFeature,

  // Provide alphanumeric sorting.
  sortFn_alphanumeric,

  // Provide basic numeric sorting.
  sortFn_basic,

  // Provide normal text sorting.
  sortFn_text,

  // Combine the required features into one table definition.
  tableFeatures,
} from "@tanstack/react-table";

// Define exactly which optional features this table uses.
export const resourceTableFeatures = tableFeatures({
  // Enable pagination APIs.
  rowPaginationFeature,

  // Enable sorting APIs.
  rowSortingFeature,

  // Create the pagination row model.
  paginatedRowModel: createPaginatedRowModel(),

  // Create the sorting row model.
  sortedRowModel: createSortedRowModel(),

  // Register the sorting functions used by our columns.
  sortFns: {
    // Use alphanumeric sorting for mixed string identifiers.
    alphanumeric: sortFn_alphanumeric,

    // Use basic comparison for numeric values.
    basic: sortFn_basic,

    // Use text sorting for resource names and strings.
    text: sortFn_text,
  },
});

// Export the feature type so column definitions remain fully typed.
export type ResourceTableFeatures =
  typeof resourceTableFeatures;
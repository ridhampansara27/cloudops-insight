// Import only sorting-related TanStack Table features.
import {
  // Create the sorted row model.
  createSortedRowModel,

  // Enable sorting APIs.
  rowSortingFeature,

  // Provide alphanumeric sorting.
  sortFn_alphanumeric,

  // Provide basic numeric sorting.
  sortFn_basic,

  // Provide normal text sorting.
  sortFn_text,

  // Combine the selected table features.
  tableFeatures,
} from "@tanstack/react-table";


// Define exactly which features this server-paginated table uses.
export const resourceTableFeatures =
  tableFeatures({
    // Enable client-side sorting for the currently loaded backend page.
    rowSortingFeature,

    // Create the sorted row model.
    sortedRowModel:
      createSortedRowModel(),

    // Register sorting functions.
    sortFns: {
      // Support alphanumeric values.
      alphanumeric:
        sortFn_alphanumeric,

      // Support numeric values.
      basic:
        sortFn_basic,

      // Support text values.
      text:
        sortFn_text,
    },
  });


// Export the feature type used by the column helper.
export type ResourceTableFeatures =
  typeof resourceTableFeatures;
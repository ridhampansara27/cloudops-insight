// Import skeleton placeholder.
import { Skeleton } from "@/components/ui/skeleton";

// Export a generic page-loading layout.
export function PageLoadingState() {
  // Render a dashboard-shaped loading placeholder.
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />

        <Skeleton className="h-8 w-72 max-w-full" />

        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-32 rounded-xl"
          />
        ))}
      </div>

      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
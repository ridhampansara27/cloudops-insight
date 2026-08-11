// Import error icon.
import { TriangleAlert } from "lucide-react";

// Import reusable button.
import { Button } from "@/components/ui/button";

// Define error-state properties.
interface PageErrorStateProps {
  // Allow a custom title.
  title?: string;

  // Allow a custom explanation.
  description?: string;

  // Allow retry behavior.
  onRetry?: () => void;
}

// Export reusable error state.
export function PageErrorState({
  title = "Unable to load data",
  description =
    "CloudOps Insight could not retrieve the requested information.",
  onRetry,
}: PageErrorStateProps) {
  // Render the centered error panel.
  return (
    <div className="flex min-h-80 items-center justify-center rounded-xl border bg-card p-8">
      <div className="max-w-md text-center">
        <TriangleAlert className="mx-auto size-8 text-destructive" />

        <h2 className="mt-4 text-lg font-semibold">
          {title}
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          {description}
        </p>

        {onRetry && (
          <Button
            className="mt-5"
            onClick={onRetry}
          >
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
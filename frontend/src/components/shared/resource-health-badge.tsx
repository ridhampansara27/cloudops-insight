// Import the reusable badge component.
import { Badge } from "@/components/ui/badge";

// Import the class-name helper.
import { cn } from "@/lib/utils";

// Import the resource-health type.
import type { ResourceHealth } from "@/types/resource";

// Define the component properties.
interface ResourceHealthBadgeProps {
  // Supply the resource health state.
  health: ResourceHealth;
}

// Define CSS styles for every health state.
const healthStyles: Record<ResourceHealth, string> = {
  healthy:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",

  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",

  critical:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",

  unknown:
    "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
};

// Export the reusable resource-health badge.
export function ResourceHealthBadge({
  health,
}: ResourceHealthBadgeProps) {
  // Render the normalized status label.
  return (
    <Badge
      className={cn(
        "capitalize",
        healthStyles[health],
      )}
      variant="outline"
    >
      {health}
    </Badge>
  );
}
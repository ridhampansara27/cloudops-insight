// Import icons for metric categories and trend direction.
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  HeartPulse,
  Lightbulb,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

// Import card primitives.
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import the class-name utility.
import { cn } from "@/lib/utils";

// Import the metric type.
import type { DashboardMetric } from "@/types/dashboard";

// Map every metric category to an icon.
const metricIcons = {
  resources: Boxes,
  health: HeartPulse,
  incidents: ShieldAlert,
  cost: CircleDollarSign,
  forecast: TrendingUp,
  savings: Lightbulb,
};

// Define the component properties.
interface MetricCardProps {
  // Supply the dashboard metric to display.
  metric: DashboardMetric;
}

// Export one reusable dashboard KPI card.
export function MetricCard({ metric }: MetricCardProps) {
  // Select the icon that belongs to the metric category.
  const Icon = metricIcons[metric.category];

  // Select the appropriate trend icon.
  const TrendIcon =
    metric.trend === "down" ? ArrowDownRight : ArrowUpRight;

  // Determine whether the trend is operationally positive.
  const isPositive =
    metric.category === "incidents"
      ? metric.trend === "down"
      : metric.trend === "up";

  // Render the metric card.
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {metric.label}
        </CardTitle>

        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">
          {metric.value}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
          <span
            className={cn(
              "inline-flex items-center font-medium",
              isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
            )}
          >
            <TrendIcon className="mr-1 size-3.5" />
            {metric.change}%
          </span>

          <span className="text-muted-foreground">
            {metric.comparisonLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
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

// Import reusable card primitives.
import {
  Card,
  CardContent,
} from "@/components/ui/card";

// Import class-name composition.
import {
  cn,
} from "@/lib/utils";

// Import the dashboard presentation model.
import type {
  DashboardMetric,
} from "@/types/dashboard";


// Map every metric category to an icon.
const metricIcons = {
  resources: Boxes,
  health: HeartPulse,
  incidents: ShieldAlert,
  cost: CircleDollarSign,
  forecast: TrendingUp,
  savings: Lightbulb,
};


// Define dimensional styling for each operational domain.
const metricStyles = {
  resources: {
    icon:
      "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    glow:
      "from-cyan-400/18 via-cyan-400/4 to-transparent",
    accent:
      "bg-cyan-400",
  },

  health: {
    icon:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    glow:
      "from-emerald-400/16 via-emerald-400/4 to-transparent",
    accent:
      "bg-emerald-400",
  },

  incidents: {
    icon:
      "border-rose-400/20 bg-rose-400/10 text-rose-300",
    glow:
      "from-rose-400/16 via-rose-400/4 to-transparent",
    accent:
      "bg-rose-400",
  },

  cost: {
    icon:
      "border-sky-400/20 bg-sky-400/10 text-sky-300",
    glow:
      "from-sky-400/16 via-sky-400/4 to-transparent",
    accent:
      "bg-sky-400",
  },

  forecast: {
    icon:
      "border-violet-400/20 bg-violet-400/10 text-violet-300",
    glow:
      "from-violet-400/16 via-violet-400/4 to-transparent",
    accent:
      "bg-violet-400",
  },

  savings: {
    icon:
      "border-amber-400/20 bg-amber-400/10 text-amber-300",
    glow:
      "from-amber-400/16 via-amber-400/4 to-transparent",
    accent:
      "bg-amber-400",
  },
};


// Define component properties.
interface MetricCardProps {
  // Supply the genuine dashboard metric.
  metric:
    DashboardMetric;
}


// Export one reusable command-center KPI.
export function MetricCard({
  metric,
}: MetricCardProps) {
  // Critical-resource count belongs to the broader health
  // domain, but it needs explicit critical visual semantics.
  const isCriticalMetric =
    metric.id ===
    "critical-resources";

  // Use a warning-oriented icon for critical infrastructure.
  const Icon =
    isCriticalMetric
      ? ShieldAlert
      : metricIcons[
          metric.category
        ];

  // Give critical infrastructure its own rose treatment instead
  // of inheriting the healthy emerald health-category styling.
  const style =
    isCriticalMetric
      ? {
          icon:
            "border-rose-400/20 bg-rose-400/10 text-rose-300",
          glow:
            "from-rose-400/18 via-rose-400/4 to-transparent",
          accent:
            "bg-rose-400",
        }
      : metricStyles[
          metric.category
        ];

  // Select the directional trend icon.
  const TrendIcon =
    metric.trend ===
    "down"
      ? ArrowDownRight
      : ArrowUpRight;

  // Historical comparison exists only for non-neutral metrics.
  const hasComparison =
    metric.trend !==
    "neutral";

  // Determine whether movement is operationally positive.
  const isPositive =
    metric.category ===
    "incidents"
      ? metric.trend ===
        "down"
      : metric.trend ===
        "up";

  // Render a dimensional KPI tile.
  return (
    <Card className="group relative min-h-[166px] overflow-hidden border-border/70 bg-card/72 py-0">
      {/* Add a subtle domain-specific glow. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70 transition-opacity duration-300 group-hover:opacity-100",
          style.glow,
        )}
      />

      {/* Add a thin visual signal along the top edge. */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-px opacity-70",
          style.accent,
        )}
      />

      <CardContent className="relative flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-4">
          <p className="max-w-[70%] text-sm font-medium leading-snug text-muted-foreground">
            {
              metric.label
            }
          </p>

          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-inner transition-transform duration-300 group-hover:scale-110",
              style.icon,
            )}
          >
            <Icon className="size-[18px]" />
          </div>
        </div>

        <div className="mt-7">
          <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
            {
              metric.value
            }
          </p>

          <div className="mt-2 flex min-h-5 flex-wrap items-center gap-1.5 text-xs">
            {hasComparison ? (
              <>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-1.5 py-0.5 font-semibold",
                    isPositive
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "bg-rose-400/10 text-rose-300",
                  )}
                >
                  <TrendIcon className="mr-1 size-3.5" />

                  {
                    metric.change
                  }
                  %
                </span>

                <span className="text-muted-foreground">
                  {
                    metric.comparisonLabel
                  }
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">
                {
                  metric.comparisonLabel
                }
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Import health visualization icon.
import {
  Activity,
} from "lucide-react";

// Import reusable card primitives.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";


// Define resource-health component properties.
interface ResourceHealthSummaryProps {
  // Total discovered resources.
  total: number;

  // Healthy resources.
  healthy: number;

  // Warning resources.
  warning: number;

  // Critical resources.
  critical: number;
}


// Export the real resource-health command visualization.
export function ResourceHealthSummary({
  total,
  healthy,
  warning,
  critical,
}: ResourceHealthSummaryProps) {
  // Calculate resources that currently remain unclassified.
  const unknown =
    Math.max(
      total -
        healthy -
        warning -
        critical,
      0,
    );

  // Calculate percentage boundaries for the health ring.
  const healthyEnd =
    total === 0
      ? 0
      : (
          healthy /
          total
        ) *
        100;

  const warningEnd =
    total === 0
      ? 0
      : (
          (
            healthy +
            warning
          ) /
          total
        ) *
        100;

  const criticalEnd =
    total === 0
      ? 0
      : (
          (
            healthy +
            warning +
            critical
          ) /
          total
        ) *
        100;

  // Count resources carrying an explicit health classification.
  const classified =
    healthy +
    warning +
    critical;

  // Calculate classification coverage from genuine inventory values.
  const coverage =
    total === 0
      ? 0
      : Math.round(
          (
            classified /
            total
          ) *
            100,
        );

  // Build a ring directly from actual health counts.
  const ringBackground =
    total === 0
      ? "conic-gradient(rgba(100,116,139,0.18) 0% 100%)"
      : `conic-gradient(
          #10b981 0% ${healthyEnd}%,
          #f59e0b ${healthyEnd}% ${warningEnd}%,
          #f43f5e ${warningEnd}% ${criticalEnd}%,
          #64748b ${criticalEnd}% 100%
        )`;

  // Define each health dimension.
  const healthItems = [
    {
      label:
        "Healthy",
      value:
        healthy,
      dot:
        "bg-emerald-400",
      text:
        "text-emerald-300",
    },
    {
      label:
        "Warning",
      value:
        warning,
      dot:
        "bg-amber-400",
      text:
        "text-amber-300",
    },
    {
      label:
        "Critical",
      value:
        critical,
      dot:
        "bg-rose-400",
      text:
        "text-rose-300",
    },
    {
      label:
        "Unknown",
      value:
        unknown,
      dot:
        "bg-slate-400",
      text:
        "text-slate-300",
    },
  ];

  // Render the health command card.
  return (
    <Card className="overflow-hidden bg-card/72">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-emerald-300" />

              Resource health
            </CardTitle>

            <CardDescription className="mt-1">
              Operational state across synchronized AWS inventory.
            </CardDescription>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
            {
              coverage
            }
            % classified
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-7 pt-2 md:grid-cols-[190px_1fr] md:items-center">
        {/* Render an actual-data health distribution ring. */}
        <div className="relative mx-auto size-[176px]">
          <div
            className={
              total === 0
                ? "absolute inset-0 rounded-full shadow-[0_0_42px_-24px_rgba(56,189,248,0.45)]"
                : "absolute inset-0 rounded-full shadow-[0_0_48px_-20px_rgba(16,185,129,0.65)]"
            }
            style={{
              background:
                ringBackground,
            }}
          />

          <div className="absolute inset-[17px] flex flex-col items-center justify-center rounded-full border border-border/60 bg-card shadow-inner">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Resources
            </span>

            <span className="mt-1 text-4xl font-semibold tracking-[-0.05em]">
              {
                total
              }
            </span>

            <span className="mt-1 text-[11px] text-muted-foreground">
              synchronized
            </span>
          </div>
        </div>

        {/* Show exact values beside the visual distribution. */}
        <div className="grid grid-cols-2 gap-3">
          {healthItems.map(
            (
              item,
            ) => (
              <div
                key={
                  item.label
                }
                className="group rounded-xl border border-border/60 bg-background/25 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-accent/30"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full shadow-[0_0_10px_currentColor] ${item.dot}`}
                  />

                  <span className="text-xs text-muted-foreground">
                    {
                      item.label
                    }
                  </span>
                </div>

                <p
                  className={`mt-3 text-2xl font-semibold tracking-tight ${item.text}`}
                >
                  {
                    item.value
                  }
                </p>
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}

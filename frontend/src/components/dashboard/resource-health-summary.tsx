// Import reusable card components.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";


// Define resource-health component properties.
interface ResourceHealthSummaryProps {
  // Store total discovered resources.
  total: number;

  // Store healthy resources.
  healthy: number;

  // Store warning resources.
  warning: number;

  // Store critical resources.
  critical: number;
}


// Export the real resource-health summary.
export function ResourceHealthSummary({
  // Receive total resources.
  total,

  // Receive healthy resources.
  healthy,

  // Receive warning resources.
  warning,

  // Receive critical resources.
  critical,
}: ResourceHealthSummaryProps) {
  // Calculate resources that do not yet have a recognized health state.
  const unknown = Math.max(
    total -
      healthy -
      warning -
      critical,
    0,
  );

  // Define every health category.
  const healthItems = [
    {
      // Display healthy resources.
      label: "Healthy",

      // Store healthy count.
      value: healthy,

      // Use green for healthy infrastructure.
      colorClass: "bg-emerald-500",
    },
    {
      // Display warning resources.
      label: "Warning",

      // Store warning count.
      value: warning,

      // Use amber for warnings.
      colorClass: "bg-amber-500",
    },
    {
      // Display critical resources.
      label: "Critical",

      // Store critical count.
      value: critical,

      // Use red for critical infrastructure.
      colorClass: "bg-rose-500",
    },
    {
      // Display unknown health.
      label: "Unknown",

      // Store unknown count.
      value: unknown,

      // Use neutral styling.
      colorClass: "bg-slate-400",
    },
  ];

  // Render the health summary.
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Resource health
        </CardTitle>

        <CardDescription>
          Operational health across discovered AWS resources.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {healthItems.map(
            (item) => {
              // Calculate this status' percentage of the inventory.
              const width =
                total === 0
                  ? 0
                  : (
                      item.value /
                      total
                    ) *
                    100;

              // Render one health section.
              return (
                <div
                  key={
                    item.label
                  }
                  className={
                    item.colorClass
                  }
                  style={{
                    width: `${width}%`,
                  }}
                />
              );
            },
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {healthItems.map(
            (item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2.5 rounded-full ${item.colorClass}`}
                  />

                  <span className="text-sm text-muted-foreground">
                    {item.label}
                  </span>
                </div>

                <span className="text-sm font-semibold">
                  {item.value}
                </span>
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
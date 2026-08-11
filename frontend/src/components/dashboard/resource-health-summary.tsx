// Import the dashboard card components.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import the resource dataset.
import { mockResources } from "@/mocks/resources";

// Export the resource-health summary component.
export function ResourceHealthSummary() {
  // Count healthy resources.
  const healthy = mockResources.filter(
    (resource) => resource.health === "healthy",
  ).length;

  // Count warning resources.
  const warning = mockResources.filter(
    (resource) => resource.health === "warning",
  ).length;

  // Count critical resources.
  const critical = mockResources.filter(
    (resource) => resource.health === "critical",
  ).length;

  // Count unknown resources.
  const unknown = mockResources.filter(
    (resource) => resource.health === "unknown",
  ).length;

  // Calculate the total number of resources.
  const total = mockResources.length;

  // Define each health category and visual style.
  const healthItems = [
    {
      label: "Healthy",
      value: healthy,
      colorClass: "bg-emerald-500",
    },
    {
      label: "Warning",
      value: warning,
      colorClass: "bg-amber-500",
    },
    {
      label: "Critical",
      value: critical,
      colorClass: "bg-rose-500",
    },
    {
      label: "Unknown",
      value: unknown,
      colorClass: "bg-slate-400",
    },
  ];

  // Render the health summary.
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource health</CardTitle>

        <CardDescription>
          Operational health across discovered AWS resources.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {healthItems.map((item) => {
            // Convert resource count into a percentage width.
            const width =
              total === 0
                ? 0
                : (item.value / total) * 100;

            // Render one section of the health distribution bar.
            return (
              <div
                className={item.colorClass}
                key={item.label}
                style={{
                  width: `${width}%`,
                }}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {healthItems.map((item) => (
            <div
              className="flex items-center justify-between rounded-lg border p-3"
              key={item.label}
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
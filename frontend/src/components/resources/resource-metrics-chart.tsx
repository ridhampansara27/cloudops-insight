// Import ECharts option typing.
import type {
  EChartsOption,
} from "echarts";

// Import React ECharts wrapper.
import ReactECharts from "echarts-for-react";

// Import card components.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import metric API type.
import type {
  MetricSeriesApiResponse,
} from "@/types/api";


// Define component properties.
interface ResourceMetricsChartProps {
  // Supply stored CloudWatch metric series.
  series:
    MetricSeriesApiResponse[];
}


// Render real CloudWatch monitoring charts.
export function ResourceMetricsChart({
  series,
}: ResourceMetricsChartProps) {
  // Render an empty state when CloudWatch has no recent points.
  if (
    series.length ===
    0
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            Performance metrics
          </CardTitle>

          <CardDescription>
            CloudWatch monitoring data.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            No recent CloudWatch metric samples are available.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render one chart per CloudWatch metric.
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {series.map(
        (metric) => {
          // Build ECharts source.
          const source =
            metric.points.map(
              (point) => ({
                // Display localized timestamp.
                time:
                  new Date(
                    point.timestamp,
                  ).toLocaleTimeString(
                    "de-DE",
                    {
                      hour:
                        "2-digit",
                      minute:
                        "2-digit",
                    },
                  ),

                // Store metric value.
                value:
                  point.value,
              }),
            );

          // Build chart configuration.
          const option:
            EChartsOption = {
              tooltip: {
                trigger:
                  "axis",
                confine:
                  true,
              },

              grid: {
                left:
                  12,
                right:
                  16,
                top:
                  20,
                bottom:
                  24,
                containLabel:
                  true,
              },

              dataset: {
                source,
              },

              xAxis: {
                type:
                  "category",
                boundaryGap:
                  false,
              },

              yAxis: {
                type:
                  "value",
                scale:
                  true,
              },

              series: [
                {
                  name:
                    metric.metric_name,
                  type:
                    "line",
                  smooth:
                    true,
                  showSymbol:
                    false,
                  encode: {
                    x:
                      "time",
                    y:
                      "value",
                  },
                },
              ],
            };

          // Render one metric card.
          return (
            <Card
              key={`${metric.namespace}-${metric.metric_name}`}
            >
              <CardHeader>
                <CardTitle>
                  {
                    metric.metric_name
                  }
                </CardTitle>

                <CardDescription>
                  {
                    metric.namespace
                  }{" "}
                  ·{" "}
                  {
                    metric.statistic
                  }
                  {metric.unit
                    ? ` · ${metric.unit}`
                    : ""}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ReactECharts
                  option={
                    option
                  }
                  notMerge
                  lazyUpdate
                  style={{
                    height:
                      280,
                    width:
                      "100%",
                  }}
                />
              </CardContent>
            </Card>
          );
        },
      )}
    </div>
  );
}
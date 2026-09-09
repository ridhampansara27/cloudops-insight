// Import ECharts option typing.
import type {
  EChartsOption,
} from "echarts";

// Import React ECharts wrapper.
import ReactECharts from "echarts-for-react";

// Import monitoring icons.
import {
  Activity,
  ChartNoAxesCombined,
} from "lucide-react";

// Import reusable card surfaces.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import genuine CloudWatch API series.
import type {
  MetricSeriesApiResponse,
} from "@/types/api";


// Define component properties.
interface ResourceMetricsChartProps {
  // Supply genuine stored CloudWatch metric series.
  series:
    MetricSeriesApiResponse[];
}


// Format metric values while preserving useful precision.
function formatMetricValue(
  value: number,
  unit: string | null,
): string {
  // Use greater precision for small non-zero CloudWatch values.
  const absoluteValue =
    Math.abs(
      value,
    );

  const maximumFractionDigits =
    absoluteValue >= 100
      ? 1
      : absoluteValue >= 1
        ? 2
        : 4;

  const formatted =
    new Intl.NumberFormat(
      "de-DE",
      {
        maximumFractionDigits,
      },
    ).format(
      value,
    );

  // Append the real CloudWatch unit only when supplied.
  return unit
    ? `${formatted} ${unit}`
    : formatted;
}


// Export the real CloudWatch monitoring visualization.
export function ResourceMetricsChart({
  series,
}: ResourceMetricsChartProps) {
  // Render a truthful empty state when synchronization returned no series.
  if (
    series.length ===
    0
  ) {
    return (
      <Card className="bg-card/72">
        <CardContent className="flex min-h-[300px] flex-col items-center justify-center text-center">
          <div className="flex size-13 items-center justify-center rounded-2xl border border-sky-400/15 bg-sky-400/8 text-sky-300">
            <Activity className="size-5" />
          </div>

          <p className="mt-4 font-semibold">
            No recent CloudWatch samples
          </p>

          <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
            No CloudWatch metric samples are available for this resource
            in the current 24-hour monitoring window.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render one command-center chart per genuine CloudWatch series.
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {series.map(
        (
          metric,
        ) => {
          // Extract actual numeric samples.
          const values =
            metric.points.map(
              (
                point,
              ) =>
                point.value,
            );

          // Derive factual descriptive statistics from the returned points.
          const latestValue =
            values[
              values.length -
              1
            ];

          const minimumValue =
            Math.min(
              ...values,
            );

          const maximumValue =
            Math.max(
              ...values,
            );

          // Build chart source from genuine chronological points.
          const source =
            metric.points.map(
              (
                point,
              ) => ({
                // Keep localized chart time labels.
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

                // Preserve original API numeric value.
                value:
                  point.value,
              }),
            );

          // Build dark command-center ECharts configuration.
          const option:
            EChartsOption = {
              // Remove default animation excess while retaining a smooth entrance.
              animationDuration:
                450,

              tooltip: {
                trigger:
                  "axis",

                confine:
                  true,

                backgroundColor:
                  "rgba(8, 15, 29, 0.96)",

                borderColor:
                  "rgba(56, 189, 248, 0.22)",

                borderWidth:
                  1,

                textStyle: {
                  color:
                    "#e2e8f0",

                  fontSize:
                    12,
                },

                valueFormatter: (
                  value,
                ) =>
                  formatMetricValue(
                    Number(
                      value,
                    ),
                    metric.unit,
                  ),
              },

              grid: {
                left:
                  16,

                right:
                  20,

                top:
                  18,

                bottom:
                  22,

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

                axisLine: {
                  lineStyle: {
                    color:
                      "rgba(148, 163, 184, 0.18)",
                  },
                },

                axisTick: {
                  show:
                    false,
                },

                axisLabel: {
                  color:
                    "#64748b",

                  fontSize:
                    10,

                  hideOverlap:
                    true,
                },
              },

              yAxis: {
                type:
                  "value",

                scale:
                  true,

                axisLine: {
                  show:
                    false,
                },

                axisTick: {
                  show:
                    false,
                },

                axisLabel: {
                  color:
                    "#64748b",

                  fontSize:
                    10,
                },

                splitLine: {
                  lineStyle: {
                    color:
                      "rgba(148, 163, 184, 0.09)",

                    type:
                      "dashed",
                  },
                },
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

                  symbol:
                    "circle",

                  lineStyle: {
                    width:
                      2,

                    color:
                      "#38bdf8",
                  },

                  itemStyle: {
                    color:
                      "#38bdf8",
                  },

                  areaStyle: {
                    color:
                      "rgba(56, 189, 248, 0.09)",
                  },

                  emphasis: {
                    focus:
                      "series",
                  },

                  encode: {
                    x:
                      "time",

                    y:
                      "value",
                  },
                },
              ],
            };

          // Render one real CloudWatch monitoring card.
          return (
            <Card
              className="group overflow-hidden bg-card/72 py-0"
              key={`${metric.namespace}-${metric.metric_name}-${metric.statistic}`}
            >
              <CardHeader className="border-b border-border/50 p-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ChartNoAxesCombined className="size-4 shrink-0 text-sky-300" />

                      <CardTitle className="truncate">
                        {
                          metric.metric_name
                        }
                      </CardTitle>
                    </div>

                    <CardDescription className="mt-1 truncate">
                      {
                        metric.namespace
                      }
                      {" ? "}
                      {
                        metric.statistic
                      }
                      {metric.unit
                        ? ` ? ${metric.unit}`
                        : ""}
                    </CardDescription>
                  </div>

                  <span className="shrink-0 rounded-lg border border-sky-400/15 bg-sky-400/7 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-300">
                    CloudWatch
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                {/* Show factual derived statistics above each chart. */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-border/55 bg-background/20 p-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Latest
                    </p>

                    <p className="mt-1 truncate text-sm font-semibold text-sky-300">
                      {formatMetricValue(
                        latestValue,
                        metric.unit,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/55 bg-background/20 p-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Minimum
                    </p>

                    <p className="mt-1 truncate text-sm font-semibold">
                      {formatMetricValue(
                        minimumValue,
                        metric.unit,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/55 bg-background/20 p-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Maximum
                    </p>

                    <p className="mt-1 truncate text-sm font-semibold">
                      {formatMetricValue(
                        maximumValue,
                        metric.unit,
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/55 bg-background/20 p-2.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Samples
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {
                        metric.points.length
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-border/45 bg-background/15 p-1">
                  <ReactECharts
                    lazyUpdate
                    notMerge
                    option={
                      option
                    }
                    style={{
                      height:
                        285,

                      width:
                        "100%",
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        },
      )}
    </div>
  );
}

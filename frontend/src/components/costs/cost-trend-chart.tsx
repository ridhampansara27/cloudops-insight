// Import responsive React hooks.
import {
  useEffect,
  useState,
} from "react";

// Import ECharts option typing.
import type {
  EChartsOption,
} from "echarts";

// Import React ECharts wrapper.
import ReactECharts from "echarts-for-react";

// Import FinOps visualization icons.
import {
  ChartNoAxesCombined,
  CircleDollarSign,
} from "lucide-react";

// Import reusable cards.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import precise micro-cost-safe formatting.
import {
  formatChartCurrency,
} from "@/lib/formatters";

// Import genuine API response type.
import type {
  DailyCostApiResponse,
} from "@/types/api";


// Define chart properties.
interface CostTrendChartProps {
  // Supply actual daily AWS costs.
  points:
    DailyCostApiResponse[];

  // Supply backend billing currency.
  currency: string;
}


// Export the genuine daily cost trajectory.
export function CostTrendChart({
  points,
  currency,
}: CostTrendChartProps) {
  // Store responsive chart state.
  const [
    isMobile,
    setIsMobile,
  ] =
    useState(false);

  // Synchronize chart density with browser width.
  useEffect(() => {
    // Create narrow-screen media query.
    const mediaQuery =
      window.matchMedia(
        "(max-width: 640px)",
      );

    // Store current media-query state.
    const updateMobileState =
      () => {
        setIsMobile(
          mediaQuery.matches,
        );
      };

    // Initialize state.
    updateMobileState();

    // Watch future viewport changes.
    mediaQuery.addEventListener(
      "change",
      updateMobileState,
    );

    // Remove the listener on unmount.
    return () => {
      mediaQuery.removeEventListener(
        "change",
        updateMobileState,
      );
    };
  }, []);

  // Convert real API data into ECharts records.
  const chartSource =
    points.map(
      (
        point,
      ) => ({
        // Display compact billing date.
        date:
          new Intl.DateTimeFormat(
            "en-GB",
            {
              day:
                "2-digit",

              month:
                "short",
            },
          ).format(
            new Date(
              point.date,
            ),
          ),

        // Preserve real daily cost.
        Cost:
          point.amount,
      }),
    );

  // Build dark command-center chart configuration.
  const option:
    EChartsOption = {
      // Use restrained animation.
      animationDuration:
        450,

      // Configure axis tooltip.
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

        // Preserve precise billing values inside the tooltip.
        valueFormatter: (
          value,
        ) =>
          formatChartCurrency(
            Number(
              value,
            ),
            currency,
          ),
      },

      // Configure plot dimensions.
      grid: {
        left:
          isMobile
            ? 10
            : 18,

        right:
          isMobile
            ? 10
            : 22,

        top:
          18,

        bottom:
          isMobile
            ? 28
            : 34,

        containLabel:
          true,
      },

      // Supply genuine backend billing data.
      dataset: {
        source:
          chartSource,
      },

      // Configure date axis.
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
            isMobile
              ? 9
              : 10,

          hideOverlap:
            true,

          interval:
            isMobile
              ? 1
              : 0,

          margin:
            10,
        },
      },

      // Configure monetary axis.
      yAxis: {
        type:
          "value",

        scale:
          true,

        splitNumber:
          isMobile
            ? 4
            : 5,

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
            isMobile
              ? 9
              : 10,

          formatter: (
            value,
          ) =>
            formatChartCurrency(
              Number(
                value,
              ),
              currency,
            ),
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

      // Render the genuine daily-cost series.
      series: [
        {
          name:
            "Daily cost",

          type:
            "line",

          smooth:
            true,

          clip:
            true,

          showSymbol:
            !isMobile,

          symbol:
            "circle",

          symbolSize:
            6,

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
              "date",

            y:
              "Cost",
          },
        },
      ],
    };

  // Render the Cost Explorer trajectory card.
  return (
    <Card className="overflow-hidden bg-card/72 py-0">
      <CardHeader className="border-b border-border/50 p-4 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ChartNoAxesCombined className="size-4 text-sky-300" />

              Daily cost trajectory
            </CardTitle>

            <CardDescription className="mt-1">
              Actual daily AWS billing records synchronized into PostgreSQL.
            </CardDescription>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-1 text-xs text-muted-foreground">
            {
              points.length
            }
            {" "}
            daily records
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {points.length ===
        0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-sky-400/15 bg-sky-400/8 text-sky-300">
              <CircleDollarSign className="size-5" />
            </div>

            <p className="mt-4 font-semibold">
              No daily billing records
            </p>

            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              The daily AWS cost trajectory will appear after Cost Explorer
              synchronization provides billing records.
            </p>
          </div>
        ) : (
          <div className="min-w-0 overflow-hidden rounded-xl border border-border/45 bg-background/15 p-1">
            <ReactECharts
              lazyUpdate
              notMerge
              option={
                option
              }
              style={{
                height:
                  isMobile
                    ? 300
                    : 370,

                width:
                  "100%",
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

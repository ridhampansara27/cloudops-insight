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

// Import reusable cards.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import real API response type.
import type {
  DailyCostApiResponse,
} from "@/types/api";


// Define component properties.
interface CostTrendChartProps {
  // Supply actual daily costs from FastAPI.
  points: DailyCostApiResponse[];

  // Supply billing currency.
  currency: string;
}


// Export API-driven cost chart.
export function CostTrendChart({
  // Receive real billing points.
  points,

  // Receive backend currency.
  currency,
}: CostTrendChartProps) {
  // Store mobile layout state.
  const [
    isMobile,
    setIsMobile,
  ] =
    useState(false);

  // Synchronize chart layout with browser width.
  useEffect(() => {
    // Create narrow-screen media query.
    const mediaQuery =
      window.matchMedia(
        "(max-width: 640px)",
      );

    // Synchronize React state.
    const updateMobileState =
      () => {
        // Store whether mobile layout applies.
        setIsMobile(
          mediaQuery.matches,
        );
      };

    // Run immediately.
    updateMobileState();

    // Listen for future changes.
    mediaQuery.addEventListener(
      "change",
      updateMobileState,
    );

    // Remove listener after unmount.
    return () => {
      mediaQuery.removeEventListener(
        "change",
        updateMobileState,
      );
    };
  }, []);

  // Convert API data into ECharts dataset records.
  const chartSource =
    points.map(
      (point) => ({
        // Format billing date.
        date: new Intl.DateTimeFormat(
          "en-GB",
          {
            // Display day.
            day: "2-digit",

            // Display abbreviated month.
            month: "short",
          },
        ).format(
          new Date(
            point.date,
          ),
        ),

        // Store real daily cost.
        Cost: point.amount,
      }),
    );

  // Configure the chart.
  const option: EChartsOption =
    {
      // Use compact animation.
      animationDuration:
        300,

      // Configure hover tooltip.
      tooltip: {
        // Show data for the current date.
        trigger: "axis",

        // Keep tooltip inside chart.
        confine: true,
      },

      // Configure chart area.
      grid: {
        // Reserve y-axis space.
        left: isMobile
          ? 12
          : 20,

        // Reserve right spacing.
        right: isMobile
          ? 10
          : 20,

        // Reserve top spacing.
        top: 20,

        // Reserve date-label spacing.
        bottom: isMobile
          ? 28
          : 38,

        // Include labels in layout calculations.
        containLabel: true,
      },

      // Supply real backend records.
      dataset: {
        // Use normalized records.
        source:
          chartSource,
      },

      // Configure billing date axis.
      xAxis: {
        // Treat dates as categories.
        type: "category",

        // Align values with boundaries.
        boundaryGap: false,

        // Configure date labels.
        axisLabel: {
          // Reduce mobile label density.
          interval: isMobile
            ? 1
            : 0,

          // Avoid visible overlap.
          hideOverlap: true,

          // Use responsive text size.
          fontSize: isMobile
            ? 9
            : 11,

          // Add spacing.
          margin: 10,
        },

        // Hide unnecessary ticks.
        axisTick: {
          // Do not draw category ticks.
          show: false,
        },
      },

      // Configure cost axis.
      yAxis: {
        // Use numerical values.
        type: "value",

        // Keep automatic scale.
        scale: true,

        // Use fewer mobile grid lines.
        splitNumber: isMobile
          ? 4
          : 5,

        // Format values using the currency code.
        axisLabel: {
          // Display compact billing values.
          formatter: `${currency} {value}`,

          // Use smaller mobile labels.
          fontSize: isMobile
            ? 9
            : 11,
        },
      },

      // Define real daily-cost series.
      series: [
        {
          // Name the series.
          name: "Daily cost",

          // Draw as line chart.
          type: "line",

          // Smooth daily movement.
          smooth: true,

          // Keep line inside chart.
          clip: true,

          // Display point markers.
          showSymbol: true,

          // Use responsive marker size.
          symbolSize: isMobile
            ? 5
            : 7,

          // Add subtle filled area.
          areaStyle: {
            // Keep fill unobtrusive.
            opacity: isMobile
              ? 0.12
              : 0.18,
          },

          // Map dataset fields.
          encode: {
            // Map horizontal values.
            x: "date",

            // Map monetary values.
            y: "Cost",
          },
        },
      ],
    };

  // Render real billing chart.
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Daily cost trend
        </CardTitle>

        <CardDescription>
          Actual daily spending recorded in PostgreSQL.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {points.length ===
        0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No daily billing data is available.
          </div>
        ) : (
          <div className="min-w-0 overflow-hidden">
            <ReactECharts
              option={
                option
              }
              notMerge
              lazyUpdate
              style={{
                // Use responsive chart height.
                height:
                  isMobile
                    ? 290
                    : 360,

                // Fill card width.
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
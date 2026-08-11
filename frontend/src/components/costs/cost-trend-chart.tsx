// Import React hooks used to detect the current screen size.
import {
  useEffect,
  useState,
} from "react";

// Import Apache ECharts' strongly typed option definition.
import type { EChartsOption } from "echarts";

// Import the React wrapper around Apache ECharts.
import ReactECharts from "echarts-for-react";

// Import reusable card components.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import the cost trend mock dataset.
import { costTrendPoints } from "@/mocks/costs";

// Export the responsive cloud-cost trend chart.
export function CostTrendChart() {
  // Store whether the current browser viewport should use the mobile chart layout.
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen widths whenever the component mounts.
  useEffect(() => {
    // Create a browser media query matching Tailwind's small-screen breakpoint.
    const mediaQuery = window.matchMedia(
      "(max-width: 640px)",
    );

    // Create a function that updates React state from the media query.
    const updateMobileState = () => {
      // Store whether the media query currently matches.
      setIsMobile(mediaQuery.matches);
    };

    // Run the check immediately when the component mounts.
    updateMobileState();

    // Listen for viewport-size changes.
    mediaQuery.addEventListener(
      "change",
      updateMobileState,
    );

    // Remove the listener when the component unmounts.
    return () => {
      // Prevent unused event listeners from remaining in memory.
      mediaQuery.removeEventListener(
        "change",
        updateMobileState,
      );
    };
  }, []);

  // Convert the application data into an ECharts-compatible dataset.
  const chartSource = costTrendPoints.map(
    (point) => ({
      // Format the billing date into a short readable form.
      date: new Intl.DateTimeFormat(
        "en-GB",
        {
          // Display the day using two digits.
          day: "2-digit",

          // Display a short month name such as Aug.
          month: "short",
        },
      ).format(new Date(point.date)),

      // Store actual current-period spending.
      Current:
        point.currentCost > 0
          ? point.currentCost
          : null,

      // Store previous-period spending.
      Previous: point.previousCost,

      // Store forecast values only where they exist.
      Forecast:
        point.forecastCost ?? null,
    }),
  );

  // Build a chart configuration that changes according to screen size.
  const option: EChartsOption = {
    // Keep chart transitions relatively fast.
    animationDuration: 300,

    // Configure the interactive hover tooltip.
    tooltip: {
      // Display all series belonging to the selected date.
      trigger: "axis",

      // Prevent the tooltip from overflowing outside the chart container.
      confine: true,
    },

    // Configure the chart legend.
    legend: {
      // Allow the legend to scroll when the available width becomes too small.
      type: "scroll",

      // Display legend items horizontally.
      orient: "horizontal",

      // Explicitly position the legend at the top of the chart.
      top: 0,

      // Center the legend horizontally.
      left: "center",

      // Use smaller legend icons on mobile.
      itemWidth: isMobile
        ? 12
        : 18,

      // Use smaller legend icon heights on mobile.
      itemHeight: isMobile
        ? 7
        : 10,

      // Reduce spacing between legend items on narrow screens.
      itemGap: isMobile
        ? 8
        : 18,

      // Configure legend text size.
      textStyle: {
        // Use smaller text on mobile.
        fontSize: isMobile
          ? 10
          : 12,
      },
    },

    // Configure the drawable chart area.
    grid: {
      // Leave enough room for the y-axis labels.
      left: isMobile
        ? 12
        : 20,

      // Reduce unnecessary right spacing on mobile.
      right: isMobile
        ? 10
        : 20,

      // Reserve dedicated space for the legend.
      top: isMobile
        ? 55
        : 60,

      // Reserve space for x-axis date labels.
      bottom: isMobile
        ? 28
        : 38,

      // Automatically account for labels when calculating the graph area.
      containLabel: true,
    },

    // Supply one shared dataset to all series.
    dataset: {
      // Use the normalized billing records.
      source: chartSource,
    },

    // Configure the horizontal date axis.
    xAxis: {
      // Treat each billing date as a category.
      type: "category",

      // Keep chart data aligned with the left and right boundaries.
      boundaryGap: false,

      // Configure date labels.
      axisLabel: {
        // On mobile, display approximately every second label.
        interval: isMobile
          ? 1
          : 0,

        // Automatically hide labels that still overlap.
        hideOverlap: true,

        // Use smaller date text on mobile.
        fontSize: isMobile
          ? 9
          : 11,

        // Keep labels horizontal.
        rotate: 0,

        // Add a little distance between the axis and labels.
        margin: 10,
      },

      // Reduce visual noise from axis ticks.
      axisTick: {
        // Hide category tick marks.
        show: false,
      },
    },

    // Configure the vertical monetary axis.
    yAxis: {
      // Use a numeric axis.
      type: "value",

      // Reduce the number of horizontal grid levels.
      splitNumber: isMobile
        ? 4
        : 5,

      // Start the axis from a sensible automatically calculated value.
      scale: true,

      // Configure monetary labels.
      axisLabel: {
        // Use smaller values on mobile.
        fontSize: isMobile
          ? 9
          : 11,

        // Format every axis value as euros.
        formatter: "€{value}",
      },
    },

    // Define the three cost-series visualizations.
    series: [
      {
        // Identify actual current-period spending.
        name: "Current",

        // Render current spending as a line.
        type: "line",

        // Smooth changes between daily values.
        smooth: true,

        // Prevent the series from visually extending outside the chart.
        clip: true,

        // Display point markers.
        showSymbol: true,

        // Use smaller point markers on mobile.
        symbolSize: isMobile
          ? 5
          : 7,

        // Create a subtle area underneath the current-period line.
        areaStyle: {
          // Reduce the visual weight of the filled area.
          opacity: isMobile
            ? 0.12
            : 0.18,
        },

        // Map the shared dataset fields.
        encode: {
          // Use date on the horizontal axis.
          x: "date",

          // Use actual cost on the vertical axis.
          y: "Current",
        },
      },

      {
        // Identify the historical comparison series.
        name: "Previous",

        // Render it as a line.
        type: "line",

        // Smooth the historical trend.
        smooth: true,

        // Prevent visual overflow.
        clip: true,

        // Hide individual data-point markers to keep the chart clean.
        showSymbol: false,

        // Map dataset values.
        encode: {
          // Use billing dates.
          x: "date",

          // Use previous-period costs.
          y: "Previous",
        },
      },

      {
        // Identify future projected spending.
        name: "Forecast",

        // Render forecast as another line.
        type: "line",

        // Smooth the projected trend.
        smooth: true,

        // Prevent visual overflow.
        clip: true,

        // Display forecast data points.
        showSymbol: true,

        // Keep forecast symbols compact on mobile.
        symbolSize: isMobile
          ? 5
          : 7,

        // Visually distinguish forecast data from actual spending.
        lineStyle: {
          // Render the forecast using a dashed line.
          type: "dashed",
        },

        // Map dataset values.
        encode: {
          // Use billing dates.
          x: "date",

          // Use future forecast values.
          y: "Forecast",
        },
      },
    ],
  };

  // Render the complete cost trend visualization.
  return (
    <Card>
      {/* Display the chart heading separately from the visualization. */}
      <CardHeader>
        {/* Display the chart title. */}
        <CardTitle>
          Daily cost trend
        </CardTitle>

        {/* Explain the three cost series. */}
        <CardDescription>
          Current spend compared with the previous period and projected
          future spend.
        </CardDescription>
      </CardHeader>

      {/* Render the chart body. */}
      <CardContent>
        {/* Prevent the chart container from overflowing its card. */}
        <div className="min-w-0 overflow-hidden">
          <ReactECharts
            // Supply the responsive chart configuration.
            option={option}

            // Replace previous options instead of merging incompatible layout settings.
            notMerge

            // Delay unnecessary updates while React is rendering.
            lazyUpdate

            // Adapt the chart height to the available screen size.
            style={{
              // Use less vertical space on phones.
              height: isMobile
                ? 290
                : 360,

              // Always consume the complete available card width.
              width: "100%",
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
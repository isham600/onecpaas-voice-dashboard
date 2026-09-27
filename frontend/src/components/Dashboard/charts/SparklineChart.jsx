import React, { lazy, Suspense, useMemo } from "react";

const Chart = lazy(() => import("react-apexcharts"));

const colorMap = {
  blue: ["#3B82F6", "#818CF8"],
  green: ["#22C55E", "#4ADE80"],
  purple: ["#A855F7", "#C084FC"],
  orange: ["#F97316", "#FB923C"],
  red: ["#EF4444", "#F87171"],
  teal: ["#14B8A6", "#2DD4BF"],
};

const SparklineChart = ({
  data = [],
  color = "blue",
  height = 40,
  showTooltip = true,
  type = "area",
}) => {
  const [primaryColor, secondaryColor] = colorMap[color] || colorMap.blue;

  const options = useMemo(
    () => ({
      chart: {
        type: type,
        sparkline: { enabled: true },
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 800,
        },
      },
      stroke: {
        curve: "smooth",
        width: 2,
        colors: [primaryColor],
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.05,
          stops: [0, 100],
          colorStops: [
            { offset: 0, color: primaryColor, opacity: 0.4 },
            { offset: 100, color: secondaryColor, opacity: 0.05 },
          ],
        },
      },
      colors: [primaryColor],
      tooltip: {
        enabled: showTooltip,
        fixed: { enabled: false },
        x: { show: false },
        y: {
          formatter: (val) => val?.toLocaleString() || "0",
        },
        marker: { show: false },
        theme: "light",
      },
    }),
    [primaryColor, secondaryColor, showTooltip, type]
  );

  const series = useMemo(
    () => [
      {
        name: "Value",
        data: data.length > 0 ? data : [0, 0, 0, 0, 0],
      },
    ],
    [data]
  );

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-xs"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div
          className="animate-pulse bg-gray-100 rounded"
          style={{ height }}
        />
      }
    >
      <Chart options={options} series={series} type={type} height={height} />
    </Suspense>
  );
};

export default SparklineChart;

import React, { lazy, Suspense, useMemo } from "react";

const Chart = lazy(() => import("react-apexcharts"));

const CreditUsageChart = ({
  data = [],
  categories = [],
  height = 280,
  showLegend = true,
}) => {
  const options = useMemo(
    () => ({
      chart: {
        type: "area",
        height: height,
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150,
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350,
          },
        },
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "Mulish, sans-serif",
      },
      stroke: {
        curve: "smooth",
        width: 3,
      },
      colors: ["#3B82F6", "#22C55E", "#F97316"],
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 95, 100],
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        type: "category",
        categories: categories,
        labels: {
          style: {
            fontSize: "11px",
            colors: "#9CA3AF",
          },
          rotate: 0,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          formatter: (val) => {
            if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
            if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
            return Math.floor(val);
          },
          style: {
            fontSize: "11px",
            colors: "#9CA3AF",
          },
        },
      },
      grid: {
        borderColor: "#F3F4F6",
        strokeDashArray: 4,
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
      },
      legend: {
        show: showLegend,
        position: "top",
        horizontalAlign: "right",
        markers: { radius: 4 },
        fontSize: "12px",
        fontWeight: 500,
      },
      tooltip: {
        x: {
          format: "dd MMM",
        },
        y: {
          formatter: (val) => `${val?.toLocaleString() || 0} credits`,
        },
        theme: "light",
      },
    }),
    [categories, height, showLegend]
  );

  const series = useMemo(() => data, [data]);

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400"
        style={{ height }}
      >
        No usage data available
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div
          className="animate-pulse bg-gray-100 rounded-xl"
          style={{ height }}
        />
      }
    >
      <Chart options={options} series={series} type="area" height={height} />
    </Suspense>
  );
};

export default CreditUsageChart;

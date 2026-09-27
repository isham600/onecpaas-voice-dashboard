import React, { lazy, Suspense, useMemo } from "react";

const Chart = lazy(() => import("react-apexcharts"));

const ChannelComparisonChart = ({
  data = [],
  height = 250,
  showLegend = false,
}) => {
  const options = useMemo(
    () => ({
      chart: {
        type: "bar",
        height: height,
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150,
          },
        },
        toolbar: { show: false },
        fontFamily: "Mulish, sans-serif",
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: "55%",
          distributed: true,
          dataLabels: {
            position: "top",
          },
        },
      },
      colors: data.map((item) => item.color || "#3B82F6"),
      dataLabels: {
        enabled: true,
        formatter: (val) => {
          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
          if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
          return val;
        },
        offsetY: -20,
        style: {
          fontSize: "11px",
          fontWeight: 600,
          colors: ["#374151"],
        },
      },
      legend: {
        show: showLegend,
        position: "bottom",
        markers: { radius: 4 },
      },
      xaxis: {
        categories: data.map((item) => item.name || ""),
        labels: {
          style: {
            fontSize: "12px",
            fontWeight: 500,
            colors: "#6B7280",
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          formatter: (val) => {
            if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
            if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
            return val;
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
      tooltip: {
        enabled: true,
        y: {
          formatter: (val) => `${val?.toLocaleString() || 0} messages`,
        },
        theme: "light",
      },
    }),
    [data, height, showLegend]
  );

  const series = useMemo(
    () => [
      {
        name: "Messages",
        data: data.map((item) => item.value || 0),
      },
    ],
    [data]
  );

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400"
        style={{ height }}
      >
        No channel data available
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
      <Chart options={options} series={series} type="bar" height={height} />
    </Suspense>
  );
};

export default ChannelComparisonChart;

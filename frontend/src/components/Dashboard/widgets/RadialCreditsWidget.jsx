import React, { lazy, Suspense, useMemo } from "react";
import { PieChart } from "lucide-react";

const Chart = lazy(() => import("react-apexcharts"));

const formatNumber = (value) => (Number(value) || 0).toLocaleString();

const RadialCreditsWidget = ({ creditsData = {}, permissions = {}, loading = false }) => {
  const channels = useMemo(
    () =>
      [
        { name: "Voice 15", value: creditsData.voice_credits || 0, color: "#06b6d4" },
        { name: "Voice 30", value: creditsData.voice_pulse30_credits || 0, color: "#2563EB" },
      ].filter((item) => item.value > 0),
    [creditsData, permissions],
  );

  const totalCredits = useMemo(
    () => channels.reduce((sum, item) => sum + item.value, 0),
    [channels],
  );

  const chartSeries = useMemo(() => {
    if (totalCredits <= 0) return [];
    return channels.map((item) => Number(((item.value / totalCredits) * 100).toFixed(1)));
  }, [channels, totalCredits]);

  const chartOptions = useMemo(
    () => ({
      chart: {
        type: "radialBar",
        sparkline: { enabled: true },
        fontFamily: "Mulish, sans-serif",
      },
      colors: channels.map((item) => item.color),
      labels: channels.map((item) => item.name),
      stroke: { lineCap: "round" },
      plotOptions: {
        radialBar: {
          hollow: { size: "26%" },
          track: { background: "#f3f4f6", margin: 8 },
          dataLabels: {
            name: { show: false },
            value: {
              color: "#111827",
              fontSize: "14px",
              fontWeight: 700,
              formatter: (val) => `${Number(val).toFixed(0)}%`,
            },
            total: {
              show: true,
              label: "Total",
              color: "#6b7280",
              fontSize: "12px",
              formatter: () => formatNumber(totalCredits),
            },
          },
        },
      },
      legend: { show: false },
      tooltip: {
        y: {
          formatter: (val, opts) => {
            const idx = opts?.seriesIndex ?? 0;
            const name = channels[idx]?.name || "";
            return `${name}: ${formatNumber(channels[idx]?.value || 0)} credits`;
          },
        },
      },
    }),
    [channels, totalCredits],
  );

  if (loading) {
    return (
      <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
          <div className="h-40 bg-gray-200 rounded-xl mb-3" />
          <div className="h-14 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!channels.length) {
    return (
      <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
        <PieChart className="w-12 h-12 text-gray-300 mb-2" />
        <p className="text-gray-500 text-sm">No credits data available</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <PieChart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Credit Distribution</h3>
          <p className="text-sm text-gray-500">Channel-wise share of credits</p>
        </div>
      </div>

      <div className="flex-1 min-h-[220px]">
        <Suspense fallback={<div className="h-full animate-pulse bg-gray-100 rounded-xl" />}>
          <Chart options={chartOptions} series={chartSeries} type="radialBar" height="100%" />
        </Suspense>
      </div>
    </div>
  );
};

export default RadialCreditsWidget;

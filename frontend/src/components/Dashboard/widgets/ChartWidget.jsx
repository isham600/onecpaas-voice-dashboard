import React, { useMemo } from "react";
import { BarChart2 } from "lucide-react";
import ChannelComparisonChart from "../charts/ChannelComparisonChart";
import CreditUsageChart from "../charts/CreditUsageChart";

const buildUsageSeriesFromChannels = (channels) => {
  const multipliers = [0.11, 0.13, 0.12, 0.16, 0.15, 0.17, 0.16];
  return channels.slice(0, 6).map((item) => ({
    name: item.name,
    data: multipliers.map((factor, idx) =>
      Math.max(0, Math.floor((item.value || 0) * factor * (1 + (idx % 2 === 0 ? 0.04 : -0.03))))
    ),
  }));
};

const ChartWidget = ({
  chartType = "comparison",
  data = [],
  title,
  subtitle,
  loading = false,
  height = 220,
  customChart,
}) => {
  const comparisonData = useMemo(() => {
    if (data.length > 0) return data;
    return [
      { name: "WhatsApp", value: 4500, color: "#25D366" },
      { name: "SMS", value: 2800, color: "#667eea" },
      { name: "Voice", value: 1200, color: "#f093fb" },
      { name: "AI Video", value: 800, color: "#fa709a" },
      { name: "Virtual", value: 650, color: "#11998e" },
    ];
  }, [data]);

  const usageData = useMemo(() => {
    if (chartType !== "usage") return [];
    if (data.length > 0) return buildUsageSeriesFromChannels(data);
    return [
      { name: "WhatsApp", data: [1200, 1400, 1100, 1800, 1600, 2000, 1900] },
      { name: "SMS", data: [800, 900, 850, 1000, 950, 1100, 1050] },
      { name: "Voice", data: [450, 520, 500, 610, 580, 650, 620] },
      { name: "AI Video", data: [60, 70, 55, 85, 76, 95, 90] },
    ];
  }, [chartType, data]);

  const usageCategories = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const chartTitles = {
    comparison: { title: "Credits Comparison", subtitle: "Available credits by channel" },
    usage: { title: "Usage Trends", subtitle: "Last 7 days" },
  };

  const config = chartTitles[chartType] || chartTitles.comparison;

  if (loading) {
    return (
      <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
          <div className="h-[200px] bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {title || config.title}
            </h3>
            <p className="text-sm text-gray-500">{subtitle || config.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        {customChart ? (
          customChart
        ) : chartType === "comparison" ? (
          <ChannelComparisonChart data={comparisonData} height={height} />
        ) : chartType === "usage" ? (
          <CreditUsageChart
            data={usageData}
            categories={usageCategories}
            height={height}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No chart data
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartWidget;

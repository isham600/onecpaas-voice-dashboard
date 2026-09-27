import React, { useState, useEffect, useMemo, Suspense } from "react";
import { motion } from "framer-motion";
import { Spin, Button, Alert, Skeleton } from "antd";
import dayjs from "dayjs";
import "./DualAxisLineChart.css";

import ManageBroadcastOverview from "../OverviewComponent/ManageBroadcastOverview";
import DatePickerComponent from "../DatePickerComponent/DatePickerComponent";
import { fetchChartdata } from "../../services/api";

// Lazy load the Chart component
const Chart = React.lazy(() => import("react-apexcharts"));

// Skeleton loader component (Ant Design style)
const ChartSkeleton = () => (
  <div className="h-64 p-4 border border-gray-100 rounded-lg">
    <Skeleton active paragraph={{ rows: 6 }} />
  </div>
);

// Custom loading spinner (Ant Design)
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <Spin size="large" tip="Loading Chart..." />
  </div>
);

const DualAxisLineChart = ({ user }) => {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [chartData, setChartData] = useState({ categories: [], counts: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [applyClicked, setApplyClicked] = useState(true);

  useEffect(() => {
    if (user?.username && applyClicked) {
      const fetchData = async () => {
        if (!user?.username) {
          setError("No username available");
          return;
        }

        try {
          setLoading(true);
          setError(null);
          const response = await fetchChartdata({
            params: {
              start_date: dayjs(startDate).format("YYYY-MM-DD"),
              end_date: dayjs(endDate).format("YYYY-MM-DD"),
              username: user.username,
            },
          });

          const data = response.data;
          const categories = Object.keys(data).filter(
            (key) => key !== "Total Count",
          );
          const counts = categories.map((date) => data[date]);
          const totalCount =
            data["Total Count"] ||
            counts.reduce((sum, count) => sum + count, 0);

          setChartData({ categories, counts, totalCount });
        } catch {
          setError("Failed to fetch data. Please try again later.");
        } finally {
          setLoading(false);
          setApplyClicked(false);
        }
      };

      fetchData();
    }
  }, [user, startDate, endDate, applyClicked]);

  const handleApplyClick = () => {
    setApplyClicked(true);
  };

  const totalCount = useMemo(
    () => chartData.totalCount || 0,
    [chartData.totalCount],
  );
  const averageCount = useMemo(
    () => Math.round(totalCount / (chartData.categories.length || 1)) || 0,
    [totalCount, chartData.categories.length],
  );

  const overviewData = {
    totalCount,
    averageCount,
  };

  const options = useMemo(
    () => ({
      chart: {
        id: "dual-axis-line-chart",
        height: 350,
        type: "line",
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
        zoom: {
          enabled: true,
          type: "x",
          autoScaleYaxis: true,
        },
        toolbar: {
          autoSelected: "zoom",
        },
      },
      dataLabels: {
        enabled: false,
      },
      colors: ["#3B82F6"],
      stroke: {
        width: 3,
        curve: "smooth",
      },
      xaxis: {
        categories: chartData.categories,
        tickAmount: 6,
        title: {
          text: "Date",
        },
        labels: {
          rotate: -45,
          rotateAlways: true,
          maxHeight: 60,
          hideOverlappingLabels: true,
          style: {
            fontSize: "10px",
          },
        },
      },
      yaxis: {
        title: {
          text: "Count",
        },
      },
      title: {
        text: "Sent/Received Messages Statistics",
        align: "left",
        style: {
          fontSize: "20px",
        },
      },
      tooltip: {
        x: {
          format: "dd MMM yyyy",
        },
      },
      legend: {
        horizontalAlign: "left",
        offsetX: 40,
      },
    }),
    [chartData.categories],
  );

  const series = useMemo(
    () => [
      {
        name: "Count",
        data: chartData.counts,
      },
    ],
    [chartData.counts],
  );

  return (
    <motion.div
      className="chart-container bg-white rounded-xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-white px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-black py-6">
          Date Range Filter
        </h1>
        <div className="overview-container w-full md:w-8/12 lg:w-6/12 gap-6 flex flex-col md:flex-row items-center">
          <DatePickerComponent
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />

          <Button
            type="primary"
            size="large"
            className="ml-4 bg-indigo-600 hover:bg-indigo-700 border-indigo-600"
            onClick={handleApplyClick}
            disabled={loading}
          >
            Apply
          </Button>
        </div>
      </div>

      {error && (
        <div className="px-4 sm:px-6 lg:px-8 mt-4">
          <Alert message={error} type="error" showIcon />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div>
          <ManageBroadcastOverview data={overviewData} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div className="p-0 md:p-10">
          <Suspense fallback={<ChartSkeleton />}>
            {loading ? (
              <LoadingSpinner />
            ) : chartData.categories.length > 0 ? (
              <Chart
                options={options}
                series={series}
                type="line"
                height={450}
                width="100%"
              />
            ) : (
              <p className="text-center text-gray-600 mt-4">
                No data available for the selected filters.
              </p>
            )}
          </Suspense>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DualAxisLineChart;

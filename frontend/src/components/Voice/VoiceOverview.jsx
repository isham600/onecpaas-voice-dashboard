import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import Chart from "react-apexcharts";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { Skeleton } from "antd";

import handleApiError from "../../utils/errorHandler";

const VoiceOverview = ({ user }) => {
  const { requestId } = useParams();
  const location = useLocation();
  const { row } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [barSeries, setBarSeries] = useState([]);
  const [pieSeries, setPieSeries] = useState([]);
  const [updatedStats, setUpdatedStats] = useState([]);
  const navigate = useNavigate();

  const statsTemplate = [
    { label: "ANSWERED", value: 0, icon: "▶️" },
    { label: "NO ANSWER", value: 0, icon: "📋" },
    { label: "FAILED", value: 0, icon: "❌" },
    { label: "BUSY", value: 0, icon: "👁️" },
    { label: "Submitted", value: 0, icon: "📤" },
    { label: "Pending", value: 0, icon: "⏳" },
    { label: "DTMF", value: 0, icon: "🔊" },
    { label: "No of Campaigns", value: 0, icon: "📊" },
  ];

  const fetchBroadcastStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/voice-status-req?username=${user?.username}&requestid=${requestId}`,
      );

      const data = response?.data?.data || [];

      const updatedStats = statsTemplate.map((stat) => {
        const apiStat = data.find((item) => {
          const status = item?.status?.toString().toLowerCase();

          switch (stat.label) {
            case "Sending":
              return status?.toString().toLowerCase().startsWith("59");
            case "Delivered":
              return status === "delivered";
            case "ANSWERED":
              return status === "answered";
            case "NO ANSWER":
              return status === "no answer";
            case "FAILED":
              return status === "failed";
            case "Failed":
              return status === "failed" || status === "Failed";
            case "Sent":
              return status === "sent";
            case "Invalid":
              return status === "Invalid";
            case "NA":
              return status === "1";
            case "Blocked":
              return status === "Blocked";
            case "BUSY":
              return status === "busy";
            case "DTMF":
              return status === "dtmf";
            case "No of Campaigns":
              return status === "no of campaigns";
            case "Submitted":
              return status?.includes("submitted");
            case "Pending":
              return status?.startsWith("pp");
            default:
              return false;
          }
        });

        return {
          ...stat,
          value: apiStat ? apiStat.count : 0,
        };
      });

      setUpdatedStats(updatedStats);

      const barChartData = [
        {
          name: "Values",
          data: updatedStats.map((stat) => stat.value),
        },
      ];

      const pieChartData = updatedStats.map((stat) => stat.value);

      setBarSeries(barChartData);
      setPieSeries(pieChartData);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const barColors = {
    ANSWERED: "#FFD700",
    "NO ANSWER": "#00FF00",
    FAILED: "#FF0000",
    BUSY: "#0000FF",
    Submitted: "#FF4500",
    Pending: "#FFA500",
    DTMF: "#800080",
    "No of Campaigns": "#008080",
  };

  useEffect(() => {
    fetchBroadcastStatus();
  }, []);

  const barOptions = {
    chart: {
      type: "bar",
      height: 350,
      toolbar: {
        show: true,
      },
    },
    plotOptions: {
      bar: {
        columnWidth: "20%",
        distributed: true,
      },
    },
    colors: updatedStats.map((stat) => barColors[stat.label] || "#CCCCCC"),
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    xaxis: {
      categories: updatedStats.map((stat) => stat.label),
      labels: { show: false },
    },
    legend: {
      position: "top",
      horizontalAlign: "center",
    },
  };

  const pieOptions = {
    chart: { type: "donut" },
    labels: updatedStats.map((stat) => stat.label),
    colors: updatedStats.map((stat) => barColors[stat.label] || "#CCCCCC"),
    legend: { position: "bottom" },
  };

  // Custom Skeleton Card for stats
  const SkeletonStatCard = () => (
    <div
      className="bg-gray-100 rounded-lg shadow-md flex flex-col items-center justify-center p-4"
      style={{ height: 100 }}
    >
      <Skeleton.Avatar active size="small" className="mb-2" />
      <Skeleton.Input active size="small" style={{ width: 60 }} />
    </div>
  );

  // Custom Skeleton for charts
  const SkeletonChart = ({ height = 350 }) => (
    <div
      className="bg-gray-50 rounded-lg flex items-center justify-center"
      style={{ height, width: "100%" }}
    >
      <Skeleton active paragraph={{ rows: 8 }} style={{ width: "90%" }} />
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-white p-6 shadow-md rounded-xl">
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="bg-white text-indigo-600 h-9 w-9 rounded-full hover:bg-indigo-100 transition duration-300 flex items-center justify-center"
            aria-label="Go back"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>

          <h1 className="text-2xl md:text-3xl font-bold text-indigo-800 text-center">
            Broadcast Analytics
          </h1>

          <div className=" text-white">Invisible</div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl my-5 text-center">
        <h2 className="text-xl font-bold text-gray-800">
          Campaign:{" "}
          <span className="text-indigo-600">{row?.campaignName || "N/A"}</span>
        </h2>
        <p className="text-gray-600 text-lg mt-2">
          Request ID: <span className="font-semibold">{requestId}</span>
        </p>
      </div>

      <div className="flex gap-4 flex-col w-full p-4">
        <h1 className="text-2xl font-bold text-black">Overview</h1>

        <div className="overview-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {loading
            ? [...Array(8)].map((_, index) => <SkeletonStatCard key={index} />)
            : updatedStats.map((stat, index) => (
                <div
                  key={index}
                  className="overview-item flex flex-col items-center justify-center bg-gray-100 p-2 rounded-lg shadow-md"
                >
                  <div className="overview-value text-xl md:text-2xl font-bold text-indigo-600 mb-1">
                    {stat.value}
                  </div>
                  <div className="overview-icon text-lg md:text-xl">
                    {stat.icon}
                  </div>
                  <div className="overview-label text-sm md:text-md text-gray-700 text-center">
                    {stat.label}
                  </div>
                </div>
              ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center p-4">
        <div className="w-[70%]">
          {loading ? (
            <SkeletonChart height={350} />
          ) : barSeries.length > 0 ? (
            <Chart
              options={barOptions}
              series={barSeries}
              type="bar"
              height={350}
            />
          ) : (
            <p className="text-center text-gray-500">
              No data available for chart.
            </p>
          )}
        </div>

        <div className="w-[30%]">
          {loading ? (
            <SkeletonChart height={350} />
          ) : pieSeries.length > 0 ? (
            <Chart
              options={pieOptions}
              series={pieSeries}
              type="donut"
              height={350}
            />
          ) : (
            <p className="text-center text-gray-500">
              No data available for chart.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceOverview;

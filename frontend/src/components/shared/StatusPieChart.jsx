import Chart from "react-apexcharts";

/**
 * Start Point: StatusPieChart component
 * Description: Renders a pie chart to display status counts
 */

const StatusPieChart = ({ data }) => {
  // Filter out statuses with 0 counts
  const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
    if (value > 0) {
      acc[key] = value;
    }
    return acc;
  }, {});

  const chartOptions = {
    chart: {
      type: "pie",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
      },
    },
    labels: Object.keys(filteredData),
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 200,
          },
          legend: {
            position: "bottom",
          },
        },
      },
      // ... (keep other breakpoints)
    ],
    title: {
      text: "Message Status Distribution",
      align: "center",
      style: {
        fontSize: "13px",
        fontWeight: "600",
        color: "#6b7280",
      },
    },
    legend: {
      position: "right",
      markers: {
        width: 12,
        height: 12,
      },
    },
    // Add colors for different statuses
    colors: [
      "#008FFB", // Sent
      "#00E396", // Delivered
      "#FF4560", // Failed
      "#FEB019", // Pending
      "#775DD0", // Blocked
      "#00D9E9", // Read
      "#FF66C3", // Sending
    ],
  };

  const chartSeries = Object.values(filteredData);

  return (
    <div id="chart">
      <Chart
        options={chartOptions}
        series={chartSeries}
        type="pie"
        width="220"
      />
    </div>
  );
};

export default StatusPieChart;

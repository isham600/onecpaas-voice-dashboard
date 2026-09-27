import Chart from "react-apexcharts";

/**
 * Start Point: StatusPieChart component
 * Description: Renders a pie chart to display status counts
 */

const StatusPieChart = ({ data }) => {
  /**
   * Logic: Define chart options and series data
   */
  const chartOptions = {
    chart: {
      type: "pie",
      // Add animation to make the chart more engaging
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
      },
    },
    labels: Object.keys(data),
    responsive: [
      {
        breakpoint: 480, // Mobile breakpoint
        options: {
          chart: {
            width: 200,
          },
          legend: {
            position: "bottom",
          },
        },
      },
      {
        breakpoint: 768, // Tablet breakpoint
        options: {
          chart: {
            width: 300,
          },
          legend: {
            position: "bottom",
          },
        },
      },
      {
        breakpoint: 1024, // Laptop breakpoint
        options: {
          chart: {
            width: 400,
          },
          legend: {
            position: "right",
          },
        },
      },
    ],
    // Add a title to the chart
    title: {
      text: "Status Counts",
      align: "center",
      style: {
        fontSize: "18px",
        fontWeight: "bold",
        color: "#333",
      },
    },
    // Customize the legend
    legend: {
      position: "right",
      markers: {
        width: 12,
        height: 12,
      },
    },
  };

  const chartSeries = Object.values(data);

  /**
   * End Point: Render the chart component
   */
  return (
    <div
      id="chart"
      className="flex justify-center mb-4"
      // Add Tailwind classes for styling and responsiveness
    >
      <Chart
        options={chartOptions}
        series={chartSeries}
        type="pie"
        width="280"
        className="w-full md:w-1/2 lg:w-1/3 xl:w-1/4"
      />
    </div>
  );
};

export default StatusPieChart;

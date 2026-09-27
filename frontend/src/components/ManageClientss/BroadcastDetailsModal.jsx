import { useState, useMemo } from "react";
import PropTypes from "prop-types";
import StatusPieChart from "./StatusPieChart.jsx";

const BroadcastDetailsModal = ({
  open,
  handleClose,
  requestId,
  username,
  name = "Sample Broadcast",
  date = "2023-10-01",
  time = "12:00 PM",
  broadcastData = [
    {
      id: 1,
      template_id: "Template 1",
      receiver: "+1234567890",
      status: "Delivered",
      media1: "Image1.jpg",
      media2: "Video1.mp4",
      media3: "",
    },
    {
      id: 2,
      template_id: "Template 2",
      receiver: "+0987654321",
      status: "Pending",
      media1: "Image2.jpg",
      media2: "",
      media3: "Audio1.mp3",
    },
    {
      id: 3,
      template_id: "Template 3",
      receiver: "+1122334455",
      status: "Failed",
      media5: "Document1.pdf",
    },
  ],
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [orderBy, setOrderBy] = useState("");
  const [order, setOrder] = useState("asc");

  const sortedBroadcasts = useMemo(() => {
    let sorted = Array.isArray(broadcastData) ? [...broadcastData] : [];
    if (orderBy) {
      sorted.sort((a, b) => {
        if (a[orderBy] < b[orderBy]) return order === "asc" ? -1 : 1;
        else if (a[orderBy] > b[orderBy]) return order === "asc" ? 1 : -1;
        else return 0;
      });
    }
    return sorted;
  }, [broadcastData, orderBy, order]);

  const paginatedBroadcasts = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedBroadcasts.slice(start, start + rowsPerPage);
  }, [sortedBroadcasts, page, rowsPerPage]);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDownloadCSV = () => {
    const headers = [
      "ID",
      "Broadcast Name",
      "Date",
      "Time",
      "Template",
      "Receiver",
      "Status",
      "Media1",
      "Media2",
      "Media3",
      "Media4",
      "Media5",
      "Media6",
      "Media7",
    ];
    const csvContent = [
      headers.join(","),
      ...sortedBroadcasts.map((item) =>
        [
          item.id,
          name,
          date,
          time,
          item.template_id,
          item.receiver,
          item.status,
          item.media1,
          item.media2,
          item.media3,
          item.media4,
          item.media5,
          item.media6,
          item.media7,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `broadcast_details_${Date.now()}.csv`;
    link.click();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl shadow-lg overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Broadcast Details</h2>
          <div className="flex space-x-2">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded"
              onClick={handleDownloadCSV}
            >
              Download CSV
            </button>
            <button className="text-xl text-gray-600" onClick={handleClose}>
              ✖️
            </button>
          </div>
        </div>

        <div className="mb-4">
          <StatusPieChart data={{ delivered: 10, pending: 5, failed: 2 }} />
        </div>

        {paginatedBroadcasts.length === 0 ? (
          <div className="text-center">No Broadcasts</div>
        ) : (
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-800 text-white">
                {[
                  "ID",
                  "Template",
                  "Receiver",
                  "Status",
                  "Media1",
                  "Media2",
                  "Media3",
                ].map((header) => (
                  <th key={header} className="py-2 px-4">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedBroadcasts.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="py-2 px-4">{item.id}</td>
                  <td className="py-2 px-4">{item.template_id}</td>
                  <td className="py-2 px-4">{item.receiver}</td>
                  <td className="py-2 px-4">{item.status}</td>
                  <td className="py-2 px-4">{item.media1}</td>
                  <td className="py-2 px-4">{item.media2}</td>
                  <td className="py-2 px-4">{item.media3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => handleChangePage(null, page - 1)}
            disabled={page === 0}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Previous
          </button>
          <button
            onClick={() => handleChangePage(null, page + 1)}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

BroadcastDetailsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  requestId: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  name: PropTypes.string,
  date: PropTypes.string,
  time: PropTypes.string,
  broadcastData: PropTypes.array.isRequired,
};

export default BroadcastDetailsModal;

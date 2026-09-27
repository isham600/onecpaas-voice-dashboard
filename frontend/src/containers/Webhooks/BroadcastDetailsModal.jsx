import { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import axios from "axios";

import {
  Modal,
  Table,
  Button,
  Input,
  Typography,
  Space,
  Spin,
  Tooltip,
  message,
  Tag,
  Pagination,
} from "antd";

import {
  CloseOutlined,
  DownloadOutlined,
  SearchOutlined,
  EyeOutlined,
} from "@ant-design/icons";

import handleApiError from "../../utils/errorHandler.js";

const { Title, Text } = Typography;
const { Search } = Input;

// Main component function
const BroadcastDetailsModal = ({
  broadcastChart,
  masterReseller,
  open,
  handleClose,
  requestId,
  username,
  name,
  listStatus,
  webhookUrl,
}) => {
  const [webhookLogs, setWebhookLogs] = useState([]); // State to store webhook logs
  const [loading, setLoading] = useState(false); // State to handle loading state
  const [error, setError] = useState(null); // State to handle errors
  const [orderBy, setOrderBy] = useState(""); // State for sorting column
  const [order, setOrder] = useState("asc"); // State for sorting order
  const [statusCounts, setStatusCounts] = useState({});
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedMasterReseller, setSelectedMasterReseller] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [csvLoading, setCsvLoading] = useState(false); // State for CSV download

  // Response viewer states
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [selectedLogItem, setSelectedLogItem] = useState(null);

  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ["5", "10", "25"],
  });

  const fetchWebhookLogs = async () => {
    try {
      setLoading(true);

      // API URL for webhook logs
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/webhook-logs`;

      // Request payload
      const payload = {
        action: "read",
        username: username,
        webhook_url: webhookUrl,
      };

      // API Call
      const response = await axios.post(apiUrl, payload);
      const data = response.data;

      if (data.status === 1) {
        setWebhookLogs(data.data || []); // Update webhook logs data
        setTotalCount(data.data.length || 0); // Update total count for pagination
        setPagination((prev) => ({
          ...prev,
          total: data.data.length || 0,
        }));
        message.success(data.message || "Webhook logs fetched successfully");
      } else {
        setWebhookLogs([]); // Clear webhook logs data if no results
        setTotalCount(0);
        setPagination((prev) => ({
          ...prev,
          total: 0,
        }));
        message.error("No webhook logs found.");
      }
    } catch (error) {
      handleApiError(error);
      setError("Failed to fetch webhook logs. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger API Call
  useEffect(() => {
    if (open && username && webhookUrl) {
      fetchWebhookLogs();
    }
  }, [open, username, webhookUrl]);

  // Pagination Handlers
  const handleTableChange = (page, pageSize) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  // Filter webhook logs based on search query
  const filteredWebhookLogs = useMemo(() => {
    if (!webhookLogs || webhookLogs.length === 0) return [];

    return webhookLogs
      .filter((item) => {
        const searchText = searchQuery.toLowerCase();

        return Object.values(item).some((field) => {
          if (field === null || field === undefined) return false;
          return String(field).toLowerCase().includes(searchText);
        });
      })
      .sort((a, b) => {
        // If no specific sorting is applied, default to sorting by ID in descending order
        if (!orderBy) {
          return b.id - a.id; // Descending order by ID (highest first)
        }

        // Sort based on orderBy and order
        const aValue = a[orderBy];
        const bValue = b[orderBy];

        if (order === "asc") {
          return aValue < bValue ? -1 : 1;
        } else {
          return aValue > bValue ? -1 : 1;
        }
      });
  }, [webhookLogs, searchQuery, orderBy, order]);

  // Get paginated data
  const paginatedData = filteredWebhookLogs.slice(
    (pagination.current - 1) * pagination.pageSize,
    pagination.current * pagination.pageSize
  );

  const handleRowClick = (item) => {
    if (
      (item.status.toString() === "1" || item.status === 1) &&
      masterReseller === 1
    ) {
      setIsStatusModalOpen(true);
      setSelectedMasterReseller(item.response);
    }
  };

  // Handle viewing response details
  const handleViewResponse = (item) => {
    setSelectedLogItem(item);
    setResponseModalOpen(true);
  };

  // Handle CSV download
  const handleDownloadCSV = () => {
    // Validate required parameters
    if (!username) {
      message.error("Username is required.");
      return;
    }

    try {
      setCsvLoading(true);
      // Construct API URL with encoded parameters
      const apiUrl = `${import.meta.env.VITE_SERVICE_URL}/csvdownload/webhooklogs?username=${encodeURIComponent(
        username
      )}&webhook_url=${encodeURIComponent(webhookUrl || "")}`;

      // Open download in a new tab
      window.open(apiUrl, "_blank");
      setTimeout(() => setCsvLoading(false), 1000); // Reset loading state after a second
    } catch (error) {
      console.error("Error opening CSV:", error);
      message.error("Failed to open CSV.");
      setCsvLoading(false);
    }
  };

  // Format JSON response for display
  const formatResponse = (response) => {
    if (!response) return "No response data";

    try {
      // If it's already a string representation of JSON, parse it
      const parsed =
        typeof response === "string" ? JSON.parse(response) : response;
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // If not valid JSON, return as is
      return String(response);
    }
  };

  // Component for response modal
  const ResponseViewerModal = () => {
    return (
      <Modal
        title="Response Data"
        open={responseModalOpen}
        onCancel={() => setResponseModalOpen(false)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setResponseModalOpen(false)}
          >
            Close
          </Button>,
        ]}
        width={800}
      >
        {selectedLogItem && (
          <pre
            style={{
              backgroundColor: "#f5f5f5",
              padding: "16px",
              borderRadius: "6px",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "14px",
              fontFamily: "monospace",
              maxHeight: "400px",
            }}
          >
            {formatResponse(selectedLogItem.response)}
          </pre>
        )}
      </Modal>
    );
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: true,
    },
    {
      title: "Webhook URL",
      dataIndex: "webhook_url",
      key: "webhook_url",
      render: (url) => (
        <Tooltip title={url}>
          <span>
            {url && url.length > 30 ? url.substring(0, 30) + "..." : url}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === 1 ? "success" : "error"}>
          {status === 1 ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
    },
    {
      title: "Request ID",
      dataIndex: "request_id",
      key: "request_id",
      render: (text, record) => (
        <span
          onClick={() => handleRowClick(record)}
          style={{
            cursor:
              record.status === 1 && masterReseller === 1
                ? "pointer"
                : "default",
            color:
              record.status === 1 && masterReseller === 1
                ? "#1890ff"
                : "inherit",
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: "Status Sent",
      dataIndex: "status_sent",
      key: "status_sent",
      render: (text) => text || "N/A",
    },
    {
      title: "Keyword",
      dataIndex: "keyword",
      key: "keyword",
      render: (text) => text || "N/A",
    },
    {
      title: "Response",
      key: "response",
      render: (_, record) => (
        <Tooltip title="View Response Details">
          <Button
            icon={<EyeOutlined />}
            size="small"
            type="primary"
            onClick={() => handleViewResponse(record)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <Modal
        title="Webhook Logs"
        open={open}
        onCancel={handleClose}
        footer={null}
        width="90vw"
        style={{ maxWidth: "1200px" }}
        destroyOnClose
      >
        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <Search
              placeholder="Search webhook logs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />

            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadCSV}
              loading={csvLoading}
            >
              {csvLoading ? "Downloading..." : "Download CSV"}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Spin size="large" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <>
            <Table
              columns={columns}
              dataSource={paginatedData}
              loading={loading}
              pagination={false}
              rowKey="id"
              className="custom-broadcast-table"
              scroll={{ x: "max-content" }}
              locale={{
                emptyText: "No webhook logs found",
              }}
            />

            {filteredWebhookLogs.length > 0 && (
              <div className="flex justify-end mt-4">
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={filteredWebhookLogs.length}
                  onChange={handleTableChange}
                  showSizeChanger
                  pageSizeOptions={pagination.pageSizeOptions}
                  onShowSizeChange={(current, size) => {
                    setPagination((prev) => ({
                      ...prev,
                      current: 1,
                      pageSize: size,
                    }));
                  }}
                  showTotal={(total, range) =>
                    `${range[0]}-${range[1]} of ${total} items`
                  }
                />
              </div>
            )}
          </>
        )}
      </Modal>

      {/* Response Viewer Modal */}
      <ResponseViewerModal />

      {/* Custom Styling - Same as other components */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-broadcast-table .ant-table-thead > tr > th {
          background: #1890ff;
          color: white;
          font-weight: 600;
        }
        .custom-broadcast-table .ant-table-tbody > tr:nth-child(odd) {
          background-color: #f0f7ff;
        }
        .custom-broadcast-table .ant-table-tbody > tr:nth-child(even) {
          background-color: #ffffff;
        }
        .custom-broadcast-table .ant-table-row:hover {
          background: #e6f7ff !important;
        }
        .custom-broadcast-table .ant-table-cell {
          padding: 12px 16px;
        }
        .ant-pagination-item-active {
          border-color: #1890ff;
        }
        .ant-pagination-item-active a {
          color: #1890ff;
        }
      `}} />
    </>
  );
};

// Prop types for type checking
BroadcastDetailsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  requestId: PropTypes.string,
  username: PropTypes.string.isRequired,
  name: PropTypes.string,
  listStatus: PropTypes.string,
  broadcastChart: PropTypes.number,
  masterReseller: PropTypes.number,
  webhookUrl: PropTypes.string,
};

export default BroadcastDetailsModal;

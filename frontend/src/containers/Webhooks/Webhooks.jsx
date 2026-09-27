import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Input,
  Button,
  Select,
  Row,
  Col,
  Typography,
  Tag,
  Pagination,
  Empty,
  Tooltip,
  Modal,
  Spin,
  message,
  Popconfirm,
} from "antd";
import {
  ArrowLeftOutlined,
  SearchOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";

import BasicModal from "../../components/Modal/BasicModal";
import BroadcastDetailsModal from "./BroadcastDetailsModal";

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
  danger: "#ef4444",
};

function Webhook({ user, broadcastChart, masterReseller }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [webhooksData, setWebhooksData] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("newest");
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [webhookDetailsModalOpen, setWebhookDetailsModalOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);

  const navigate = useNavigate();

  // Modal handlers
  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleOpenResponseModal = (response) => {
    setSelectedResponse(response);
    setResponseModalOpen(true);
  };

  const handleOpenWebhookDetailsModal = (webhook) => {
    setSelectedWebhook(webhook);
    setWebhookDetailsModalOpen(true);
  };

  const handleBroadcastClick = (webhook) => {
    const broadcastData = {
      request_id: webhook.request_id || webhook.id.toString(),
      senderid: webhook.keyword || "Unnamed",
      dat: webhook.date,
      url: webhook.webhook_url,
      response: webhook.response,
      created_date: webhook.created_date,
      updated_date: webhook.updated_date,
      status: webhook.status,
      estimated_time: webhook.time,
    };

    setSelectedBroadcast(broadcastData);
    setBroadcastModalOpen(true);
  };

  const handleAddWebhook = (newData) => {
    setWebhooksData((prev) => [
      ...prev,
      {
        ...newData,
        webhook_url: newData.url,
        response: newData.status,
        date: newData.created_date,
        time: newData.updated_date,
      },
    ]);
    handleCloseModal();
  };

  const handleDelete = async (id) => {
    try {
      setWebhooksData((prevData) => prevData.filter((row) => row.id !== id));
      message.success("Webhook deleted successfully");
    } catch (error) {
      message.error("Failed to delete webhook");
    }
  };

  // Fetch webhooks data
  const fetchWebhooksData = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/getwebhook?username=${user?.username}`,
      );
      const data = await response.json();

      if (data.status === 1) {
        const formattedData = data.data.map((item) => ({
          id: item.id,
          webhook_url: item.url,
          status: item.status,
          date: item.created_date.split(" ")[0],
          time: item.created_date.split(" ")[1],
          request_id: item.sender_id || "N/A",
          response: JSON.stringify({ status: item.status, value: item.value }),
          keyword: item.username || "N/A",
          value: item.value,
        }));

        setWebhooksData(formattedData);
        setTotalRecords(formattedData.length || 0);
        message.success("Webhooks fetched successfully");
      } else {
        message.error(data.message || "Failed to fetch webhooks");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      message.error("An unexpected error occurred while fetching webhooks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.username) {
      fetchWebhooksData();
    }
  }, [user?.username]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = webhooksData.filter((item) =>
      Object.values(item).some(
        (value) =>
          value &&
          value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );

    filtered = filtered.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return filter === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [webhooksData, searchTerm, filter]);

  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, page, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handlePageChange = (newPage, newPageSize) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  const goToFirstPage = () => setPage(1);
  const goToLastPage = () => setPage(totalPages);

  // Truncate text
  const truncateText = (text, maxLength = 40) => {
    if (!text) return "";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  // Table columns
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      render: (id) => (
        <Text strong className="font-mono text-sm">
          #{id}
        </Text>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <LinkOutlined className="text-xs opacity-80" />
          <span>Webhook URL</span>
        </div>
      ),
      dataIndex: "webhook_url",
      key: "webhook_url",
      ellipsis: true,
      render: (url) => (
        <Tooltip title={url}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline"
            style={{ color: THEME.primary }}
          >
            {truncateText(url, 50)}
          </a>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      align: "center",
      render: (status) => (
        <Tag
          icon={
            status === 1 ? <CheckCircleOutlined /> : <CloseCircleOutlined />
          }
          color={status === 1 ? "success" : "error"}
          style={{
            fontWeight: 600,
            fontSize: 12,
            padding: "4px 12px",
            borderRadius: "6px",
          }}
        >
          {status === 1 ? "Enabled" : "Disabled"}
        </Tag>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <span>Date & Time</span>
        </div>
      ),
      key: "datetime",
      width: 180,
      render: (_, record) => (
        <div className="flex flex-col">
          <Text className="text-sm font-medium text-gray-800">
            {record.date}
          </Text>
          <Text className="text-xs text-gray-500">{record.time}</Text>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <div className="flex items-center justify-center gap-2">
          <Tooltip title="View Broadcast Details">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleBroadcastClick(record)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: THEME.gradient }}
            >
              <EyeOutlined style={{ color: "white", fontSize: 14 }} />
            </motion.button>
          </Tooltip>

          <Tooltip title="View Webhook Details">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleOpenWebhookDetailsModal(record)}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
              style={{
                borderColor: THEME.primary,
                background: "rgba(37,99,235,0.06)",
              }}
            >
              <EditOutlined
                style={{ color: THEME.primaryDark, fontSize: 14 }}
              />
            </motion.button>
          </Tooltip>

          <Popconfirm
            title="Delete webhook"
            description="Are you sure you want to delete this webhook?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{
              style: { background: THEME.danger, borderColor: THEME.danger },
            }}
          >
            <Tooltip title="Delete">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                <DeleteOutlined style={{ color: THEME.danger, fontSize: 14 }} />
              </motion.button>
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="-m-4 min-h-screen" style={{ background: "#F8F9FB" }}>

      {/* ── STICKY HEADER ── */}
      <div className="sticky top-0 z-40 px-4 pt-4 pb-3" style={{ background: "#F8F9FB" }}>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="rounded-2xl border border-gray-100 px-6 py-5 flex items-center justify-between gap-4 flex-wrap"
            style={{
              background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
              boxShadow: "0 1px 8px rgba(37,99,235,0.06)",
            }}
          >
            {/* Left */}
            <div className="flex items-center gap-4">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                className="h-9 w-9 rounded-lg border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center"
              />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: THEME.gradient, boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}
              >
                <ApiOutlined style={{ color: "#fff", fontSize: 20 }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">Webhook Logs</h1>
                <p className="text-xs text-gray-400 mt-0.5">Manage and monitor your webhooks</p>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenModal}
                className="h-9 px-4 rounded-lg font-semibold"
                style={{ background: THEME.gradient, border: "none", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
              >
                Add Webhook
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 p-4"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={14}>
              <Search
                placeholder="Search webhooks..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                allowClear
                prefix={<SearchOutlined style={{ color: THEME.primary }} />}
                size="large"
                className="webhook-search"
              />
            </Col>
            <Col xs={24} sm={12} md={10}>
              <Select
                value={filter}
                onChange={(value) => setFilter(value)}
                className="w-full"
                size="large"
                getPopupContainer={(trigger) => trigger.parentNode}
              >
                <Option value="newest">Newest First</Option>
                <Option value="oldest">Oldest First</Option>
              </Select>
            </Col>
          </Row>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Spin size="large" />
              <Text className="mt-4 text-sm text-gray-500">
                Loading webhooks...
              </Text>
            </div>
          ) : filteredData.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Text className="text-gray-500 block mb-2">
                    {searchTerm
                      ? "No webhooks match your search"
                      : "No webhooks available"}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {!searchTerm &&
                      "Click 'Add Webhook' to create your first webhook"}
                  </Text>
                </div>
              }
              className="py-20"
            />
          ) : (
            <>
              <Table
                columns={columns}
                dataSource={paginatedData}
                rowKey="id"
                pagination={false}
                className="webhook-table"
                scroll={{ x: 1000 }}
                size="middle"
              />

              {/* Pagination */}
              <div
                className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4"
                style={{ borderTop: "1px solid rgba(37,99,235,0.1)" }}
              >
                <div className="text-xs text-gray-500">
                  Showing {(page - 1) * pageSize + 1} to{" "}
                  {Math.min(page * pageSize, filteredData.length)} of{" "}
                  {filteredData.length} entries
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goToFirstPage}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                    style={{
                      background:
                        page === 1 ? "#f3f4f6" : "rgba(37,99,235,0.1)",
                      color: page === 1 ? "#9ca3af" : THEME.primaryDark,
                    }}
                  >
                    <DoubleLeftOutlined style={{ fontSize: 10 }} />
                    First
                  </motion.button>

                  <Pagination
                    current={page}
                    pageSize={pageSize}
                    total={filteredData.length}
                    onChange={handlePageChange}
                    showSizeChanger
                    pageSizeOptions={["5", "10", "25", "50"]}
                    size="small"
                    showQuickJumper={filteredData.length > 50}
                  />

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goToLastPage}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                    style={{
                      background:
                        page === totalPages ? "#f3f4f6" : "rgba(37,99,235,0.1)",
                      color:
                        page === totalPages ? "#9ca3af" : THEME.primaryDark,
                    }}
                  >
                    Last
                    <DoubleRightOutlined style={{ fontSize: 10 }} />
                  </motion.button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Add Webhook Modal */}
      {isModalOpen && (
        <BasicModal
          isOpen={isModalOpen}
          webhooksData={webhooksData}
          closeModal={handleCloseModal}
          handleSubmit={handleAddWebhook}
          user={user}
        />
      )}

      {/* Response Modal */}
      <Modal
        title="Response Details"
        open={responseModalOpen}
        onCancel={() => setResponseModalOpen(false)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setResponseModalOpen(false)}
            style={{ background: THEME.gradient, border: "none" }}
          >
            Close
          </Button>,
        ]}
        width={700}
      >
        <pre
          className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96"
          style={{
            fontFamily: "monospace",
            fontSize: "13px",
            lineHeight: "1.6",
          }}
        >
          {selectedResponse
            ? (() => {
                try {
                  return JSON.stringify(JSON.parse(selectedResponse), null, 2);
                } catch {
                  return selectedResponse;
                }
              })()
            : "No response data"}
        </pre>
      </Modal>

      {/* Webhook Details Modal */}
      <Modal
        title="Webhook Details"
        open={webhookDetailsModalOpen}
        onCancel={() => setWebhookDetailsModalOpen(false)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setWebhookDetailsModalOpen(false)}
            style={{ background: THEME.gradient, border: "none" }}
          >
            Close
          </Button>,
        ]}
        width={700}
      >
        {selectedWebhook && (
          <div className="space-y-3">
            {Object.entries(selectedWebhook).map(([key, value]) => (
              <div
                key={key}
                className="flex border-b border-gray-100 pb-3 last:border-0"
              >
                <div className="w-1/3">
                  <Text
                    strong
                    className="text-sm text-gray-600 uppercase tracking-wide"
                  >
                    {key.replace(/_/g, " ")}
                  </Text>
                </div>
                <div className="w-2/3">
                  <Text className="text-sm text-gray-800">
                    {value !== null && typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Broadcast Details Modal */}
      <BroadcastDetailsModal
        open={broadcastModalOpen}
        handleClose={() => setBroadcastModalOpen(false)}
        username={user?.username}
        webhookUrl={selectedBroadcast?.url}
        masterReseller={masterReseller}
        broadcastChart={broadcastChart}
      />

      <style dangerouslySetInnerHTML={{__html: `
        /* Search Input */
        .webhook-search .ant-input-affix-wrapper {
          border-radius: 10px;
          border-color: rgba(3, 207, 101, 0.3);
        }

        .webhook-search .ant-input-affix-wrapper:hover,
        .webhook-search .ant-input-affix-wrapper:focus,
        .webhook-search .ant-input-affix-wrapper-focused {
          border-color: #2563EB;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1);
        }

        /* Select */
        .ant-select:not(.ant-select-disabled):hover .ant-select-selector {
          border-color: #2563EB !important;
        }

        .ant-select-focused .ant-select-selector {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1) !important;
        }

        /* Table */
        .webhook-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #374151;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid rgba(3, 207, 101, 0.2) !important;
        }

        .webhook-table .ant-table-tbody > tr:hover > td {
          background: rgba(3, 207, 101, 0.04) !important;
        }

        .webhook-table .ant-table-cell-fix-right {
          background: #fff !important;
        }

        .webhook-table .ant-table-tbody > tr:hover .ant-table-cell-fix-right {
          background: rgba(3, 207, 101, 0.04) !important;
        }

        /* Pagination */
        .ant-pagination-item-active {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
          border-color: #2563EB !important;
        }

        .ant-pagination-item-active a {
          color: white !important;
        }

        .ant-pagination-item:hover {
          border-color: #2563EB !important;
        }

        .ant-pagination-item:hover a {
          color: #2563EB !important;
        }

        /* Popconfirm */
        .ant-popconfirm-buttons .ant-btn-primary {
          background: ${THEME.danger} !important;
          border-color: ${THEME.danger} !important;
        }

        /* Spin */
        .ant-spin-dot-item {
          background-color: #2563EB;
        }
      `}} />
    </div>
  );
}

export default Webhook;

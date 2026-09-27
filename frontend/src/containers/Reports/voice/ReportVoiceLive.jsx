import { useState, useMemo, useEffect } from "react";
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
  message,
  Spin,
  Badge,
} from "antd";
import {
  ArrowLeftOutlined,
  SearchOutlined,
  DownloadOutlined,
  EyeOutlined,
  CalendarOutlined,
  PhoneOutlined,
  UserOutlined,
  FileTextOutlined,
  SoundOutlined,
  BarChartOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  LinkOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import DatePickerComponent from "../../../components/DatePickerComponent/DatePickerComponent.jsx";
import VoiceDetailsModal from "../../../components/Voice/VoiceDetailModal.jsx";

import handleApiError from "../../../utils/errorHandler.js";
import { voiceDataApi } from "../../../services/api.js";

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

// Theme colors - matching BroadcastHistory
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
  live: "#ef4444",
  liveLight: "rgba(239, 68, 68, 0.1)",
};

const ReportVoiceLive = ({ user }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("newest");
  const [broadcastData, setBroadcastData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const parseDateTimeFromDte = (dateTimeString) => {
    const [dateString, timeString] = dateTimeString.split(" ");
    const [year, month, day] = dateString.split("-");
    const [hour, minute, second] = timeString.split(":");

    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second),
    );
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  const fetchBroadcastData = async () => {
    setLoading(true);
    try {
      const payload = { action: "read", username: user?.username };
      const response = await voiceDataApi(payload);

      const data = response.data.reverse().map((item) => {
        const { date, time } = parseDateTimeFromDte(item.dte || "");
        return {
          campaignName: item.campaign_name || "N/A",
          userName: item.username || "N/A",
          date,
          time,
          requestId: item.requestid || "N/A",
          callerId: item.user_callerid || "N/A",
          credits: item.deduction * item.contacts,
          content: item.content,
          reportingCode: item.sms,
        };
      });
      setBroadcastData(data);
    } catch (error) {
      handleApiError(error);
      message.error("Failed to fetch live reports");
    } finally {
      setLoading(false);
    }
  };

  const handleView = (row) => {
    setSelectedRow(row);
    setIsDataModalOpen(true);
  };

  const handleDownloadCSV = () => {
    const headers = [
      "Campaign Name",
      "User Name",
      "Date",
      "Time",
      "Request ID",
      "Caller ID",
      "Credits",
      "Content",
      "Reporting Code",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredData.map((row) =>
        [
          `"${row.campaignName}"`,
          `"${row.userName}"`,
          `"${row.date}"`,
          `"${row.time}"`,
          `"${row.requestId}"`,
          `"${row.callerId}"`,
          row.credits,
          `"${row.content}"`,
          `"${row.reportingCode}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `voice_live_report_${Date.now()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success("CSV downloaded successfully");
    }
  };

  const filteredData = useMemo(() => {
    let filtered = broadcastData.filter((item) =>
      Object.values(item).some(
        (value) =>
          value &&
          value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );

    if (filter === "newest") {
      filtered = filtered.sort(
        (a, b) =>
          new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`),
      );
    } else {
      filtered = filtered.sort(
        (a, b) =>
          new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`),
      );
    }

    return filtered;
  }, [broadcastData, searchTerm, filter]);

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

  useEffect(() => {
    fetchBroadcastData();

    // Auto-refresh every 30 seconds for live data
    const intervalId = setInterval(() => {
      fetchBroadcastData();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const columns = [
    {
      title: (
        <div className="flex items-center gap-1.5">
          <FileTextOutlined className="text-xs opacity-80" />
          <span>Campaign Name</span>
        </div>
      ),
      dataIndex: "campaignName",
      key: "campaignName",
      width: 180,
      ellipsis: true,
      render: (name) => (
        <Text strong className="text-sm text-gray-800">
          {name}
        </Text>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <UserOutlined className="text-xs opacity-80" />
          <span>User Name</span>
        </div>
      ),
      dataIndex: "userName",
      key: "userName",
      width: 140,
      ellipsis: true,
      render: (name) => <Text className="text-sm text-gray-700">{name}</Text>,
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <CalendarOutlined className="text-xs opacity-80" />
          <span>Date</span>
        </div>
      ),
      dataIndex: "date",
      key: "date",
      width: 120,
      render: (date) => <Text className="text-sm text-gray-700">{date}</Text>,
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
      width: 110,
      render: (time) => <Text className="text-sm text-gray-700">{time}</Text>,
    },
    {
      title: "Request ID",
      dataIndex: "requestId",
      key: "requestId",
      width: 140,
      ellipsis: true,
      render: (id) => (
        <Tooltip title={id}>
          <Text className="text-xs font-mono text-gray-600">
            {id.length > 12 ? `${id.slice(0, 12)}...` : id}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <PhoneOutlined className="text-xs opacity-80" />
          <span>Caller ID</span>
        </div>
      ),
      dataIndex: "callerId",
      key: "callerId",
      width: 130,
      render: (id) => (
        <Text className="text-sm font-mono text-gray-700">{id}</Text>
      ),
    },
    {
      title: "Credits",
      dataIndex: "credits",
      key: "credits",
      width: 100,
      align: "center",
      render: (credits) => (
        <Tag
          style={{
            background: "rgba(37,99,235,0.1)",
            border: "none",
            color: THEME.primaryDark,
            fontWeight: 600,
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: "6px",
          }}
        >
          {credits}
        </Tag>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <LinkOutlined className="text-xs opacity-80" />
          <span>Content</span>
        </div>
      ),
      dataIndex: "content",
      key: "content",
      width: 200,
      ellipsis: true,
      render: (content) => (
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm hover:underline"
          style={{ color: THEME.primary }}
        >
          {content.length > 30 ? `${content.slice(0, 30)}...` : content}
        </a>
      ),
    },
    {
      title: "Reporting Code",
      dataIndex: "reportingCode",
      key: "reportingCode",
      width: 130,
      align: "center",
      render: (code) => (
        <Tag
          color={code === "104" ? "success" : "processing"}
          style={{
            fontWeight: 600,
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: "6px",
          }}
        >
          {code}
        </Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <Tooltip title="View Details">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleView(record)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: THEME.gradient }}
          >
            <EyeOutlined style={{ color: "white", fontSize: 14 }} />
          </motion.button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="-m-4 min-h-screen" style={{ background: "#F8F9FB" }}>
      <div className="sticky top-0 z-40 pb-4" style={{ background: "#F8F9FB" }}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            className="rounded-2xl border border-gray-100 px-6 py-5 flex items-center justify-between gap-4 flex-wrap"
            style={{
              background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
              boxShadow: "0 1px 8px rgba(37,99,235,0.06)",
            }}
          >
            <div className="flex items-center gap-4">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/dashboard/management/reports")}
                className="h-9 w-9 rounded-lg border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center"
              />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: THEME.gradient,
                  boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
                }}
              >
                <SoundOutlined style={{ color: "#fff", fontSize: 20 }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                  Live Voice Reports
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Auto-refreshes every 30 seconds
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <div className="px-4 pb-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          {/* Date Range Filter Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl p-5 mb-6 border border-gray-100"
            style={{ background: THEME.gradientLight }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: THEME.gradient }}
              >
                <CalendarOutlined style={{ color: "white", fontSize: 16 }} />
              </div>
              <div>
                <Text strong style={{ color: "#1f2937", fontSize: 14 }}>
                  Date Range Filter
                </Text>
                <p className="text-xs text-gray-500">
                  Filter live reports by date range
                </p>
              </div>
            </div>

            <DatePickerComponent
              onStartDateChange={() => {}}
              onEndDateChange={() => {}}
            />
          </motion.div>

          {/* Reports Table Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
          >
            {/* Table Header with Controls */}
            <div
              className="px-6 py-5"
              style={{
                background: THEME.gradientLight,
                borderBottom: "1px solid rgba(37,99,235,0.1)",
              }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{
                      background: THEME.gradient,
                      boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                    }}
                  >
                    <BarChartOutlined
                      style={{ color: "white", fontSize: 20 }}
                    />
                  </motion.div>
                  <div>
                    <Title
                      level={5}
                      style={{ marginBottom: 0, color: "#1f2937" }}
                    >
                      Live Campaign Data
                    </Title>
                    <Text className="text-xs text-gray-500">
                      {filteredData.length} total records
                    </Text>
                  </div>
                </div>

                <Row gutter={12} className="w-full lg:w-auto">
                  <Col xs={24} sm={12} lg={10}>
                    <Search
                      placeholder="Search live reports..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                      }}
                      allowClear
                      prefix={
                        <SearchOutlined style={{ color: THEME.primary }} />
                      }
                      className="voice-live-search"
                    />
                  </Col>

                  <Col xs={12} sm={6} lg={5}>
                    <Select
                      value={filter}
                      onChange={(value) => setFilter(value)}
                      className="w-full"
                      size="large"
                      getPopupContainer={(trigger) => trigger.parentNode}
                    >
                      <Option value="newest">Newest</Option>
                      <Option value="oldest">Oldest</Option>
                    </Select>
                  </Col>

                  <Col xs={12} sm={6} lg={6}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleDownloadCSV}
                        className="w-full h-10 rounded-xl font-medium"
                        style={{
                          background: THEME.gradient,
                          border: "none",
                        }}
                      >
                        Export CSV
                      </Button>
                    </motion.div>
                  </Col>
                </Row>
              </div>
            </div>

            {/* Table */}
            <div className="p-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Spin size="large" />
                  <Text className="mt-4 text-sm text-gray-500">
                    Loading live reports...
                  </Text>
                </div>
              ) : filteredData.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span className="text-gray-500">
                      {searchTerm
                        ? "No reports match your search"
                        : "No live reports available"}
                    </span>
                  }
                  className="py-12"
                />
              ) : (
                <>
                  <Table
                    columns={columns}
                    dataSource={paginatedData}
                    rowKey="requestId"
                    loading={loading}
                    pagination={false}
                    className="voice-live-table"
                    scroll={{ x: 1400 }}
                    size="middle"
                  />

                  {/* Pagination */}
                  <div
                    className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4"
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
                        pageSizeOptions={["5", "10", "20", "50"]}
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
                            page === totalPages
                              ? "#f3f4f6"
                              : "rgba(37,99,235,0.1)",
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
            </div>
          </motion.div>
        </div>

        {/* Voice Details Modal */}
        <VoiceDetailsModal
          open={isDataModalOpen}
          handleClose={() => setIsDataModalOpen(false)}
          requestId={selectedRow ? selectedRow.requestId : ""}
          username={user ? user?.username : ""}
          name={selectedRow ? selectedRow.campaignName : ""}
          date={selectedRow ? selectedRow.date : ""}
          time={selectedRow ? selectedRow.time : ""}
        />

        <style jsx global>{`
          /* Search Input */
          .voice-live-search .ant-input-affix-wrapper {
            border-radius: 10px;
            border-color: rgba(3, 207, 101, 0.3);
            height: 40px;
          }

          .voice-live-search .ant-input-affix-wrapper:hover,
          .voice-live-search .ant-input-affix-wrapper:focus,
          .voice-live-search .ant-input-affix-wrapper-focused {
            border-color: #2563eb;
            box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1);
          }

          /* Select Dropdown */
          .ant-select-selector {
            border-radius: 10px !important;
            border-color: rgba(3, 207, 101, 0.3) !important;
            height: 40px !important;
          }

          .ant-select:not(.ant-select-disabled):hover .ant-select-selector {
            border-color: #2563eb !important;
          }

          .ant-select-focused:not(.ant-select-disabled).ant-select:not(
              .ant-select-customize-input
            )
            .ant-select-selector {
            border-color: #2563eb !important;
            box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1) !important;
          }

          .ant-select-item-option-selected:not(
            .ant-select-item-option-disabled
          ) {
            background-color: rgba(3, 207, 101, 0.1) !important;
            color: #1d4ed8 !important;
          }

          .ant-select-item-option-active:not(.ant-select-item-option-disabled) {
            background-color: rgba(3, 207, 101, 0.05) !important;
          }

          /* Table Container */
          .voice-live-table {
            border-radius: 12px;
            overflow: hidden;
          }

          /* Table Header */
          .voice-live-table .ant-table-thead > tr > th {
            background: #f8fafc !important;
            color: #374151;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid rgba(3, 207, 101, 0.2) !important;
            padding: 14px 16px;
          }

          .voice-live-table .ant-table-thead > tr > th::before {
            display: none !important;
          }

          /* Table Rows */
          .voice-live-table .ant-table-tbody > tr > td {
            padding: 14px 16px;
            border-bottom: 1px solid #f1f5f9;
            transition: all 0.2s ease;
          }

          .voice-live-table .ant-table-tbody > tr:hover > td {
            background: rgba(3, 207, 101, 0.04) !important;
          }

          .voice-live-table .ant-table-tbody > tr:last-child > td {
            border-bottom: none;
          }

          /* Fixed Column */
          .voice-live-table .ant-table-cell-fix-right {
            background: #fff !important;
          }

          .voice-live-table
            .ant-table-tbody
            > tr:hover
            .ant-table-cell-fix-right {
            background: rgba(3, 207, 101, 0.04) !important;
          }

          /* Pagination */
          .ant-pagination-item {
            border-radius: 8px !important;
            border-color: #e5e7eb !important;
          }

          .ant-pagination-item-active {
            background: linear-gradient(
              135deg,
              #2563eb 0%,
              #1d4ed8 100%
            ) !important;
            border-color: #2563eb !important;
          }

          .ant-pagination-item-active a {
            color: white !important;
          }

          .ant-pagination-item:hover {
            border-color: #2563eb !important;
          }

          .ant-pagination-item:hover a {
            color: #2563eb !important;
          }

          .ant-pagination-prev .ant-pagination-item-link,
          .ant-pagination-next .ant-pagination-item-link {
            border-radius: 8px !important;
          }

          .ant-pagination-prev:hover .ant-pagination-item-link,
          .ant-pagination-next:hover .ant-pagination-item-link {
            color: #2563eb !important;
            border-color: #2563eb !important;
          }

          /* Loading Spin */
          .ant-spin-dot-item {
            background-color: #2563eb;
          }

          /* Tags */
          .voice-live-table .ant-tag {
            border-radius: 6px;
            margin: 0;
          }

          /* Live Badge Animation */
          @keyframes pulse {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }

          /* Responsive */
          @media (max-width: 768px) {
            .voice-live-search .ant-input-affix-wrapper,
            .ant-select-selector {
              height: 36px !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ReportVoiceLive;

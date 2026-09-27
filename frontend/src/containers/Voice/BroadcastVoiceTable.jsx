import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Table,
  Tooltip,
  message,
  Typography,
  Pagination,
  Spin,
  Empty,
  Tag,
} from "antd";
import {
  EyeOutlined,
  BarChartOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  NumberOutlined,
  FileTextOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  DollarOutlined,
  LinkOutlined,
  CodeOutlined,
  DownloadOutlined,
  SyncOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import VoiceDetailsModal from "../../components/Voice/VoiceDetailModal";
import Modal from "../../components/Modal";
import NewBroadcastVoice from "./NewBroadcastVoice";
import DTMFModal from "../../components/Voice/DTMFModal";

import handleApiError from "../../utils/errorHandler";
import { pauseVoiceCampaign, getVoiceSummary } from "../../services/api";

const { Text, Title } = Typography;

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const BroadcastVoiceTable = ({
  user,
  startDate,
  endDate,
  searchText,
  refreshTrigger,
  onRequestDetailsExport,
  pulse30 = false,
}) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [broadcastData, setBroadcastData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isDtmfModalOpen, setIsDtmfModalOpen] = useState(false);
  const [callbackAudioData, setCallbackAudioData] = useState([]);
  const [pausingId, setPausingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ["5", "10", "20", "50", "100"],
  });

  const [sorter, setSorter] = useState({
    field: "id",
    order: "descend",
  });

  const parseDateTimeFromDte = (dateTimeString) => {
    if (!dateTimeString) return { date: "N/A", time: "N/A" };

    // dte/created_at is a real UTC timestamp (the server's clock is UTC) —
    // this used to build a Date from the raw Y/M/D/H/M/S components with no
    // timezone info, which the JS Date constructor always treats as the
    // BROWSER's local time, then render with no explicit timezone either.
    // Parse-as-local + render-as-local always cancel out mathematically, so
    // this just echoed the raw UTC string back unchanged — every campaign
    // showed its raw UTC submission time labeled with no indication it
    // wasn't already IST. A campaign actually submitted at 11:30 AM IST
    // showed as "06:00 AM". Parse it AS UTC, render it explicitly as IST —
    // now it matches the team's own wall clock, regardless of which
    // timezone a viewer's browser happens to be set to.
    const date = new Date(dateTimeString.replace(" ", "T") + "Z");
    return {
      date: date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }),
    };
  };

  const fetchBroadcastData = async () => {
    setLoading(true);
    try {
      const startDateFormatted = startDate
        ? dayjs(startDate).format("YYYY-MM-DD")
        : "2024-01-01";
      const endDateFormatted = endDate
        ? dayjs(endDate).format("YYYY-MM-DD")
        : dayjs().format("YYYY-MM-DD");

      // username comes from the JWT server-side, not a query param.
      // sort/order: username-less report always sorted by dte desc — the
      // legacy endpoint never actually honored per-column sort either.
      const response = await getVoiceSummary({
        from_date: startDateFormatted,
        to_date: endDateFormatted,
        page: pagination.current,
        limit: pagination.pageSize,
        sort: "dte",
        order: "desc",
        pulse30: pulse30 ? 1 : 0,
      });

      const data = response.data.data.map((item) => {
        const { date, time } = parseDateTimeFromDte(item.dte || "");
        return {
          id: item.id,
          campaignName: item.campaign_name || "N/A",
          date,
          time,
          requestId: item.requestid || "N/A",
          callerId: item.user_callerid || "N/A",
          credits: item.deduction * item.contacts,
          deduction: Number(item.deduction) || 0,
          content: item.content,
          callbackAudio: item.callback_audio,
          reportingCode: item.sms,
          status: item.status || "Pending",
          dte: item.dte,
        };
      });

      setBroadcastData(data);
      setPagination((prev) => ({
        ...prev,
        total: response.data.meta?.total || 0,
      }));
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDtmfClick = (callbackAudio) => {
    try {
      const parsedAudio = JSON.parse(callbackAudio);
      setCallbackAudioData(parsedAudio);
      setIsDtmfModalOpen(true);
    } catch (error) {
      message.error("Error parsing DTMF data");
    }
  };

  const handleView = (row) => {
    setSelectedRow(row);
    setIsDataModalOpen(true);
  };

  const handleDownloadCsv = async (row) => {
    setDownloadingId(row.id);
    try {
      await onRequestDetailsExport?.(row.requestId);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePause = async (row) => {
    setPausingId(row.id);
    try {
      await pauseVoiceCampaign(row.requestId);
      message.success("Campaign paused — no further calls or retries will fire.");
      fetchBroadcastData();
    } catch (error) {
      handleApiError(error);
    } finally {
      setPausingId(null);
    }
  };

  const filteredData = useMemo(() => {
    let filtered = broadcastData.filter((item) =>
      Object.values(item).some(
        (value) =>
          value &&
          value
            .toString()
            .toLowerCase()
            .includes((searchText || "").toLowerCase()),
      ),
    );

    return filtered;
  }, [broadcastData, searchText]);

  useEffect(() => {
    if (user?.username && startDate && endDate) {
      fetchBroadcastData();
    }
  }, [
    user?.username,
    startDate,
    endDate,
    pagination.current,
    pagination.pageSize,
    sorter.field,
    sorter.order,
    searchText,
    refreshTrigger,
    pulse30,
  ]);

  const handleTableChange = (page, pageSize, sorterObj) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));

    if (sorterObj?.field && sorterObj?.order) {
      setSorter({
        field: sorterObj.field,
        order: sorterObj.order,
      });
    }
  };

  const goToFirstPage = () => {
    handleTableChange(1, pagination.pageSize);
  };

  const goToLastPage = () => {
    const lastPage = Math.ceil(pagination.total / pagination.pageSize);
    handleTableChange(lastPage, pagination.pageSize);
  };

  const closeModal = () => setIsModalOpen(false);
  const closeDTMFModal = () => setIsDtmfModalOpen(false);

  const columns = [
    {
      title: (
        <div className="flex items-center gap-1.5">
          <NumberOutlined className="text-xs opacity-80" />
          <span>ID</span>
        </div>
      ),
      dataIndex: "id",
      key: "id",
      width: 70,
      sorter: true,
      render: (id) => (
        <span className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
          #{id}
        </span>
      ),
    },
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
      sorter: true,
      render: (name) => (
        <div className="font-medium text-gray-800 truncate" title={name}>
          {name || "—"}
        </div>
      ),
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
      width: 110,
      sorter: true,
      render: (date) => (
        <span className="text-sm font-medium text-gray-700">{date}</span>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <ClockCircleOutlined className="text-xs opacity-80" />
          <span>Time</span>
        </div>
      ),
      dataIndex: "time",
      key: "time",
      width: 90,
      sorter: true,
      render: (time) => <span className="text-xs text-gray-500">{time}</span>,
    },
    {
      title: "Request ID",
      dataIndex: "requestId",
      key: "requestId",
      width: 120,
      ellipsis: true,
      render: (id) => (
        <Tooltip title={id}>
          <span className="font-mono text-xs text-gray-500 truncate block">
            {id ? `${id.slice(0, 8)}...` : "—"}
          </span>
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
      width: 120,
      render: (id) => (
        <Tag
          style={{
            background: "rgba(37,99,235,0.1)",
            border: "none",
            color: THEME.primaryDark,
            fontWeight: 500,
          }}
        >
          {id || "—"}
        </Tag>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <DollarOutlined className="text-xs opacity-80" />
          <span>Credits</span>
        </div>
      ),
      dataIndex: "credits",
      key: "credits",
      width: 90,
      align: "center",
      sorter: true,
      render: (credits) => (
        <Tag
          style={{
            background: "rgba(37,99,235,0.15)",
            border: "1px solid rgba(37,99,235,0.3)",
            color: THEME.primary,
            fontWeight: 600,
          }}
        >
          {credits?.toLocaleString() || 0}
        </Tag>
      ),
    },
    {
      title: "Credit Per Call",
      dataIndex: "deduction",
      key: "deduction",
      width: 110,
      align: "center",
      render: (deduction) => (
        <span className="text-gray-700 font-semibold">{deduction || 0}</span>
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
      width: 140,
      ellipsis: true,
      render: (content) => (
        <a
          href={content}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium hover:underline truncate block"
          style={{ color: THEME.primary }}
        >
          {content?.split("/").pop() || "N/A"}
        </a>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <CheckCircleOutlined className="text-xs opacity-80" />
          <span>Status</span>
        </div>
      ),
      dataIndex: "status",
      key: "status",
      width: 170,
      align: "center",
      render: (status) => {
        const isCompleted = status?.toLowerCase() === "completed";
        return (
          <Tag
            icon={isCompleted ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
            style={{
              background: isCompleted ? "rgba(22,163,74,0.1)" : "rgba(245,158,11,0.1)",
              border: "none",
              color: isCompleted ? "#16a34a" : "#f59e0b",
              fontWeight: 600,
            }}
          >
            {status || "Pending"}
          </Tag>
        );
      },
    },
    {
      title: "DTMF",
      key: "dtmf",
      width: 70,
      align: "center",
      render: (_, record) =>
        record.callbackAudio ? (
          <Tooltip title="View DTMF Data">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDtmfClick(record.callbackAudio)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{
                background: "rgba(6,182,212,0.1)",
                border: "1px solid rgba(6,182,212,0.3)",
              }}
            >
              <SoundOutlined style={{ color: "#06b6d4", fontSize: 14 }} />
            </motion.button>
          </Tooltip>
        ) : (
          <Text type="secondary" className="text-xs">
            N/A
          </Text>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 170,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <div className="flex items-center justify-center gap-1">
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
          <Tooltip title="Download CSV">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDownloadCsv(record)}
              disabled={downloadingId === record.id}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-50"
              style={{
                borderColor: "#059669",
                background: "rgba(5,150,105,0.06)",
              }}
            >
              {downloadingId === record.id ? (
                <SyncOutlined spin style={{ color: "#059669", fontSize: 14 }} />
              ) : (
                <DownloadOutlined style={{ color: "#059669", fontSize: 14 }} />
              )}
            </motion.button>
          </Tooltip>
          <Tooltip
            title={
              record.status === "Completed"
                ? "Campaign already completed"
                : "Pause — stops all pending calls and retries"
            }
          >
            <motion.button
              whileHover={record.status === "Completed" ? {} : { scale: 1.1 }}
              whileTap={record.status === "Completed" ? {} : { scale: 0.95 }}
              onClick={() => handlePause(record)}
              disabled={record.status === "Completed" || pausingId === record.id}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-40"
              style={{
                borderColor: THEME.primary,
                background: "rgba(37,99,235,0.06)",
              }}
            >
              {pausingId === record.id ? (
                <SyncOutlined spin style={{ color: THEME.primaryDark, fontSize: 14 }} />
              ) : (
                <PauseCircleOutlined
                  style={{ color: THEME.primaryDark, fontSize: 14 }}
                />
              )}
            </motion.button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
    >
      {/* Header Section */}
      <div
        className="px-6 py-5"
        style={{
          background: THEME.gradientLight,
          borderBottom: "1px solid rgba(37,99,235,0.1)",
        }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: THEME.gradient,
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
          >
            <SoundOutlined style={{ color: "white", fontSize: 20 }} />
          </motion.div>
          <div>
            <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>
              {pulse30 ? "Voice 30 Broadcast History" : "Voice 15 Broadcast History"}
            </Title>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-gray-500">
                {pagination.total.toLocaleString()} total records
              </span>
              {filteredData.length !== broadcastData.length && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(37,99,235,0.15)",
                    color: THEME.primaryDark,
                  }}
                >
                  {filteredData.length} filtered
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Spin size="large" />
            <p className="mt-4 text-sm text-gray-500">
              Loading voice broadcasts...
            </p>
          </div>
        ) : filteredData.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-gray-500">
                {searchText
                  ? "No broadcasts match your search"
                  : "No voice broadcasts found for this period"}
              </span>
            }
            className="py-12"
          />
        ) : (
          <>
            <Table
              columns={columns}
              dataSource={filteredData}
              loading={loading}
              pagination={false}
              rowKey="id"
              className="voice-broadcast-table"
              scroll={{ x: 1200 }}
              size="middle"
              onChange={(paginationObj, filters, sorterObj) => {
                if (sorterObj?.field && sorterObj?.order) {
                  setSorter({
                    field: sorterObj.field,
                    order: sorterObj.order,
                  });
                }
              }}
            />

            {/* Pagination */}
            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4"
              style={{ borderTop: "1px solid rgba(37,99,235,0.1)" }}
            >
              <div className="text-xs text-gray-500">
                Showing {(pagination.current - 1) * pagination.pageSize + 1} to{" "}
                {Math.min(
                  pagination.current * pagination.pageSize,
                  pagination.total,
                )}{" "}
                of {pagination.total} entries
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToFirstPage}
                  disabled={pagination.current === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                  style={{
                    background:
                      pagination.current === 1
                        ? "#f3f4f6"
                        : "rgba(37,99,235,0.1)",
                    color:
                      pagination.current === 1 ? "#9ca3af" : THEME.primaryDark,
                  }}
                >
                  <DoubleLeftOutlined style={{ fontSize: 10 }} />
                  First
                </motion.button>

                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  onChange={handleTableChange}
                  showSizeChanger
                  pageSizeOptions={pagination.pageSizeOptions}
                  size="small"
                  showQuickJumper={pagination.total > 100}
                  onShowSizeChange={(current, size) => {
                    setPagination((prev) => ({
                      ...prev,
                      current: 1,
                      pageSize: size,
                    }));
                  }}
                />

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToLastPage}
                  disabled={
                    pagination.current ===
                    Math.ceil(pagination.total / pagination.pageSize)
                  }
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                  style={{
                    background:
                      pagination.current ===
                      Math.ceil(pagination.total / pagination.pageSize)
                        ? "#f3f4f6"
                        : "rgba(37,99,235,0.1)",
                    color:
                      pagination.current ===
                      Math.ceil(pagination.total / pagination.pageSize)
                        ? "#9ca3af"
                        : THEME.primaryDark,
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

      {isModalOpen && (
        <Modal isModalOpen={isModalOpen} closeModal={closeModal} height="80vh">
          <NewBroadcastVoice
            closeModal={closeModal}
            user={user?.username}
            reFetchData={fetchBroadcastData}
          />
        </Modal>
      )}

      {isDtmfModalOpen && (
        <Modal
          isModalOpen={isDtmfModalOpen}
          closeModal={closeDTMFModal}
          height="50%"
          width="40%"
        >
          <DTMFModal data={callbackAudioData} />
        </Modal>
      )}

      <VoiceDetailsModal
        open={isDataModalOpen}
        onCancel={() => setIsDataModalOpen(false)}
        requestId={selectedRow ? selectedRow.requestId : ""}
        username={user ? user?.username : ""}
        name={selectedRow ? selectedRow.campaignName : ""}
        date={selectedRow ? selectedRow.date : ""}
        time={selectedRow ? selectedRow.time : ""}
        onRequestExport={onRequestDetailsExport}
      />

      {/* Custom Styling */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* Table Container */
        .voice-broadcast-table {
          border-radius: 12px;
          overflow: hidden;
        }

        /* Header Styling */
        .voice-broadcast-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #374151;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid rgba(3, 207, 101, 0.2) !important;
          padding: 14px 16px;
        }

        .voice-broadcast-table .ant-table-thead > tr > th::before {
          display: none !important;
        }

        /* Sorter Styling */
        .voice-broadcast-table .ant-table-column-sorter {
          color: #9ca3af;
        }

        .voice-broadcast-table .ant-table-column-sorter-up.active,
        .voice-broadcast-table .ant-table-column-sorter-down.active {
          color: #2563EB;
        }

        .voice-broadcast-table .ant-table-column-sort {
          background: rgba(3, 207, 101, 0.05) !important;
        }

        /* Row Styling */
        .voice-broadcast-table .ant-table-tbody > tr > td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          transition: all 0.2s ease;
        }

        .voice-broadcast-table .ant-table-tbody > tr:hover > td {
          background: rgba(3, 207, 101, 0.04) !important;
        }

        .voice-broadcast-table .ant-table-tbody > tr:last-child > td {
          border-bottom: none;
        }

        /* Fixed Column Styling */
        .voice-broadcast-table .ant-table-cell-fix-right {
          background: #fff !important;
        }

        .voice-broadcast-table
          .ant-table-tbody
          > tr:hover
          .ant-table-cell-fix-right {
          background: rgba(3, 207, 101, 0.04) !important;
        }

        /* Pagination Styling */
        .ant-pagination-item {
          border-radius: 8px !important;
          border-color: #e5e7eb !important;
        }

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

        .ant-pagination-prev .ant-pagination-item-link,
        .ant-pagination-next .ant-pagination-item-link {
          border-radius: 8px !important;
        }

        .ant-pagination-prev:hover .ant-pagination-item-link,
        .ant-pagination-next:hover .ant-pagination-item-link {
          color: #2563EB !important;
          border-color: #2563EB !important;
        }

        .ant-select-selector {
          border-radius: 8px !important;
        }

        /* Tag Styling */
        .voice-broadcast-table .ant-tag {
          border-radius: 6px;
          padding: 2px 8px;
        }

        /* Spin Styling */
        .ant-spin-dot-item {
          background-color: #2563EB !important;
        }

        /* Select Focus */
        .ant-select:not(.ant-select-disabled):hover .ant-select-selector {
          border-color: #2563EB !important;
        }

        .ant-select-focused:not(.ant-select-disabled) .ant-select-selector {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1) !important;
        }
      `,
        }}
      />
    </motion.div>
  );
};

export default BroadcastVoiceTable;

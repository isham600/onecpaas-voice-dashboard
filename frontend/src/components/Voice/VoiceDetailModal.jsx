import { useEffect, useState, useMemo, useRef } from "react";
import {
  Modal,
  Table,
  Input,
  Spin,
  Typography,
  message,
  Tooltip,
  Tag,
  Select,
  Skeleton,
  Button,
  Popover,
} from "antd";
import {
  CloseOutlined,
  SearchOutlined,
  DownloadOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  NumberOutlined,
  UserOutlined,
  CheckCircleOutlined,
  PictureOutlined,
  FilterOutlined,
  SendOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
  TeamOutlined,
  SoundOutlined,
  PhoneOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import StatusPieChart from "../shared/StatusPieChart";
import FlowViewerModal from "./FlowViewerModal";
import handleApiError from "../../utils/errorHandler";
import {
  getVoiceCampaignDetails,
  getVoiceCampaignStatusCounts,
} from "../../services/api";

const { Title } = Typography;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(29,78,216,0.03) 100%)",
};

// Known status styles — anything not listed falls back to gray
const STATUS_STYLE = {
  answered: {
    color: "#16a34a",
    bg: "#16a34a15",
    icon: <CheckCircleOutlined />,
    order: 1,
  },
  sent: { color: "#2563EB", bg: "#2563EB15", icon: <SendOutlined />, order: 2 },
  submitted: {
    color: "#2563EB",
    bg: "#2563EB15",
    icon: <SendOutlined />,
    order: 3,
  },
  busy: {
    color: "#f59e0b",
    bg: "#f59e0b15",
    icon: <ClockCircleOutlined />,
    order: 4,
  },
  "no answer": {
    color: "#6b7280",
    bg: "#6b728015",
    icon: <CloseCircleOutlined />,
    order: 5,
  },
  pause: {
    color: "#f59e0b",
    bg: "#f59e0b15",
    icon: <PauseCircleOutlined />,
    order: 6,
  },
  failed: {
    color: "#ef4444",
    bg: "#ef444415",
    icon: <CloseCircleOutlined />,
    order: 7,
  },
  fail: {
    color: "#ef4444",
    bg: "#ef444415",
    icon: <CloseCircleOutlined />,
    order: 7,
  },
};

const getStatusStyle = (status) =>
  STATUS_STYLE[status?.toLowerCase()] ?? {
    color: "#6b7280",
    bg: "#6b728015",
    icon: null,
    order: 99,
  };

// ── Stat chip shown in the analytics strip ────────────────────────────────────
const StatChip = ({ label, value, color, bg, icon, loading }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
    style={{ background: bg, border: `1px solid ${color}20`, minWidth: 110 }}
  >
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}20` }}
    >
      <span style={{ color, fontSize: 13 }}>{icon}</span>
    </div>
    <div>
      {loading ? (
        <Skeleton.Input active size="small" style={{ width: 50, height: 16 }} />
      ) : (
        <p className="text-base font-bold leading-tight" style={{ color }}>
          {Number(value || 0).toLocaleString()}
        </p>
      )}
      <p
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: `${color}99` }}
      >
        {label}
      </p>
    </div>
  </motion.div>
);

const VoiceDetailsModal = ({
  open,
  onCancel,
  requestId,
  username,
  name,
  onRequestExport,
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [statusCounts, setStatusCounts] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [flowOpen, setFlowOpen] = useState(false);
  const [webhookDetail, setWebhookDetail] = useState(null); // row shown in the payload/response modal

  const fetchBroadcastDetails = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter) params.status = statusFilter;

      const response = await getVoiceCampaignDetails(requestId, params);
      const { data: rows, meta } = response.data;
      setData(rows || []);
      setTotalCount(meta?.total || 0);
    } catch (error) {
      handleApiError(error);
      setData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchBroadcastStatus = async () => {
    setStatsLoading(true);
    try {
      const response = await getVoiceCampaignStatusCounts(requestId);
      const responseData = response?.data?.data || [];
      const counts = responseData.reduce((acc, item) => {
        const status = item?.status?.toLowerCase();
        if (status) acc[status] = (acc[status] || 0) + item.count;
        return acc;
      }, {});
      setStatusCounts(counts);
    } catch (error) {
      handleApiError(error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (open && requestId) {
      fetchBroadcastStatus();
    }
  }, [open, requestId]);

  useEffect(() => {
    if (open && requestId) fetchBroadcastDetails();
  }, [open, currentPage, pageSize, searchQuery, statusFilter, requestId]);

  const handleTableChange = (pagination) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  // Only render media columns that have at least one value on this page
  const visibleMediaCols = useMemo(() => {
    const active = new Set();
    data.forEach((row) => {
      for (let i = 1; i <= 8; i++) {
        if (row[`media${i}`]) active.add(i);
      }
    });
    return [...active].sort((a, b) => a - b);
  }, [data]);

  // DTMF columns only appear for IVR campaigns (rows carry dtmf_* fields)
  const hasDtmfData = useMemo(
    () => data.some((row) => row.dtmf_pressed || row.dtmf_disposition || row.collected_input || row.webhook_success != null),
    [data],
  );

  // One shared player for the "click a pressed key to hear its reply" chips
  const audioRef = useRef(null);
  const [playingKey, setPlayingKey] = useState(null);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingKey(null);
  };

  const togglePressAudio = (key, url) => {
    if (playingKey === key) {
      stopAudio();
      return;
    }
    stopAudio();
    const player = new Audio(url);
    player.onended = () => setPlayingKey(null);
    player.onerror = () => {
      setPlayingKey(null);
      message.error("Could not play this audio");
    };
    audioRef.current = player;
    setPlayingKey(key);
    player.play().catch(() => stopAudio());
  };

  // Stop playback when the modal closes or the page changes
  useEffect(() => {
    if (!open) stopAudio();
    return stopAudio;
  }, [open, currentPage]);

  const handleDownloadCSV = async () => {
    try {
      await onRequestExport?.(requestId);
    } catch (error) {
      console.error("Error queuing CSV export:", error);
      message.error("Failed to queue CSV export. Please try again.");
    }
  };

  const columns = [
    {
      title: (
        <span className="flex items-center gap-1">
          <NumberOutlined className="text-xs" />
          ID
        </span>
      ),
      dataIndex: "id",
      key: "id",
      width: 75,
      fixed: "left",
      render: (id) => (
        <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
          #{id}
        </span>
      ),
    },
    {
      title: (
        <span className="flex items-center gap-1">
          <CalendarOutlined className="text-xs" />
          Date
        </span>
      ),
      dataIndex: "dat",
      key: "dat",
      width: 100,
      // Date/Time = when this row was CREATED (campaign submission / queue
      // time) — always, for every row, regardless of status. Deliberately
      // NEVER overridden with answered_at/dialed_at: mixing the two made
      // Date/Time show the real call time for ANSWERED rows (identical to
      // the separate "Answered At" column — confusing, looked like a data
      // glitch) but the creation time for everything else. "Answered At" is
      // the only column that shows when a call was actually answered.
      render: (date) => <span className="text-sm text-gray-700">{date || "—"}</span>,
    },
    {
      title: (
        <span className="flex items-center gap-1">
          <ClockCircleOutlined className="text-xs" />
          Time
        </span>
      ),
      dataIndex: "tim",
      key: "tim",
      width: 90,
      render: (time) => <span className="text-sm text-gray-500">{time || "—"}</span>,
    },
    {
      title: (
        <span className="flex items-center gap-1">
          <UserOutlined className="text-xs" />
          Receiver
        </span>
      ),
      dataIndex: "receiver",
      key: "receiver",
      width: 140,
      fixed: "left",
      render: (text) => (
        <span className="font-semibold text-sm" style={{ color: THEME.primary }}>
          {text}
        </span>
      ),
    },
    {
      title: (
        <span className="flex items-center gap-1">
          <CheckCircleOutlined className="text-xs" />
          Status
        </span>
      ),
      dataIndex: "status",
      key: "status",
      width: 120,
      fixed: "left",
      render: (text) => {
        const { color, bg } = getStatusStyle(text);
        return (
          <Tag
            style={{
              background: bg,
              border: "none",
              color,
              fontWeight: 600,
              fontSize: 11,
              borderRadius: 6,
            }}
          >
            {text || "N/A"}
          </Tag>
        );
      },
    },
    {
      title: (
        <span className="flex items-center gap-1">
          <ClockCircleOutlined className="text-xs" />
          Answered At
        </span>
      ),
      dataIndex: "answered_at",
      key: "answered_at",
      width: 160,
      render: (answeredAt) => (
        <span className="text-sm text-gray-700">
          {answeredAt
            // Force UTC — see comment on the Date column above.
            ? `${new Date(answeredAt).toLocaleDateString("en-CA", { timeZone: "UTC" })} ${new Date(answeredAt).toLocaleTimeString("en-GB", { timeZone: "UTC" })}`
            : "—"}
        </span>
      ),
    },
    {
      title: (
        <span className="flex items-center gap-1">
          <ClockCircleOutlined className="text-xs" />
          Duration
        </span>
      ),
      dataIndex: "call_duration",
      key: "call_duration",
      width: 90,
      // Previously only ever shown inside a tooltip on the "Call Result"
      // (DTMF) column, which itself shows nothing but "—" for any call
      // without a DTMF disposition — the vast majority of calls. That hid
      // duration for almost every row. Now a plain, always-visible column.
      render: (duration) => (
        <span className="text-sm text-gray-700">
          {duration != null ? `${duration}s` : "—"}
        </span>
      ),
    },
    ...(hasDtmfData
      ? [
          {
            title: (
              <span className="flex items-center gap-1">
                <NumberOutlined className="text-xs" />
                Keys Pressed
              </span>
            ),
            dataIndex: "dtmf_pressed",
            key: "dtmf_pressed",
            width: 160,
            render: (digits, row) => {
              if (!digits) {
                return (
                  <span className="text-xs text-gray-400">No key pressed</span>
                );
              }
              // dtmf_presses carries the audio each press triggered; fall
              // back to plain chips when it's absent (older results)
              const presses =
                row.dtmf_presses ||
                digits.split("").map((d) => ({ digit: d, audio: null }));

              const ATTEMPT_LABELS = {
                answered: { text: "Answered", color: "#059669" },
                no_answer: { text: "No answer", color: "#6B7280" },
                busy: { text: "Busy", color: "#EA580C" },
                cancelled: { text: "Caller hung up", color: "#6B7280" },
              };

              const BILLING_LABELS = {
                charged: { text: "Credit charged", color: "#EA580C" },
                refunded: { text: "Refunded (no answer)", color: "#059669" },
                insufficient: { text: "Insufficient credit", color: "#DC2626" },
              };

              const attemptsContent = (attempts) => (
                <div className="space-y-1" style={{ minWidth: 200 }}>
                  {attempts.map((a, j) => {
                    const st =
                      a.status === "insufficient_credit"
                        ? { text: "Insufficient credit", color: "#DC2626" }
                        : ATTEMPT_LABELS[a.status] || {
                            text: a.status,
                            color: "#6B7280",
                          };
                    return (
                      <div
                        key={j}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <span className="font-mono">{a.number}</span>
                        <span style={{ color: st.color, fontWeight: 600 }}>
                          {st.text}
                        </span>
                      </div>
                    );
                  })}
                  {row.forward_billing && BILLING_LABELS[row.forward_billing] && (
                    <div className="text-xs pt-1 border-t mt-1" style={{ color: BILLING_LABELS[row.forward_billing].color, fontWeight: 600 }}>
                      {BILLING_LABELS[row.forward_billing].text}
                    </div>
                  )}
                </div>
              );

              return (
                <span className="flex items-center gap-1 flex-wrap">
                  {presses.map((press, i) => {
                    const chipKey = `${row.id}-${i}`;
                    const playable = !!press.audio;
                    const isPlaying = playingKey === chipKey;
                    const tooltip =
                      press.type === "transfer"
                        ? "Call was forwarded"
                        : press.type === "recorded"
                          ? "Key saved, call ended (no audio)"
                          : playable
                            ? isPlaying
                              ? "Stop"
                              : "Click to hear the reply audio"
                            : null;

                    const chip = (
                      <span
                        className={`inline-flex items-center justify-center gap-0.5 rounded-md font-bold ${playable ? "cursor-pointer" : ""}`}
                        style={{
                          background: isPlaying
                            ? THEME.primary
                            : "rgba(37,99,235,0.1)",
                          color: isPlaying ? "white" : THEME.primary,
                          minWidth: 24,
                          height: 24,
                          fontSize: 13,
                          padding: "0 5px",
                        }}
                        onClick={
                          playable
                            ? () => togglePressAudio(chipKey, press.audio)
                            : undefined
                        }
                      >
                        {press.digit}
                        {playable &&
                          (isPlaying ? (
                            <PauseCircleOutlined style={{ fontSize: 11 }} />
                          ) : (
                            <SoundOutlined style={{ fontSize: 11 }} />
                          ))}
                      </span>
                    );

                    // Transfers get an extra "forwarded" step in the journey;
                    // clicking it shows the numbers tried and their outcomes.
                    const forwardChip =
                      press.type === "transfer" ? (
                        <>
                          <span className="text-gray-400 text-xs">→</span>
                          <Popover
                            trigger="click"
                            title="Forwarding attempts"
                            content={
                              press.attempts && press.attempts.length > 0 ? (
                                attemptsContent(press.attempts)
                              ) : (
                                <span className="text-xs text-gray-400">
                                  No details recorded
                                </span>
                              )
                            }
                          >
                            <span
                              className="inline-flex items-center gap-1 rounded-md font-semibold cursor-pointer"
                              style={{
                                background: "rgba(37,99,235,0.1)",
                                color: THEME.primary,
                                height: 24,
                                fontSize: 11,
                                padding: "0 7px",
                              }}
                            >
                              <PhoneOutlined style={{ fontSize: 11 }} />
                              Forwarded
                            </span>
                          </Popover>
                        </>
                      ) : null;

                    return (
                      <span key={chipKey} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-gray-400 text-xs">→</span>
                        )}
                        {tooltip ? (
                          <Tooltip title={tooltip}>{chip}</Tooltip>
                        ) : (
                          chip
                        )}
                        {forwardChip}
                      </span>
                    );
                  })}
                </span>
              );
            },
          },
          {
            title: (
              <span className="flex items-center gap-1">
                <NumberOutlined className="text-xs" />
                Entered Input
              </span>
            ),
            dataIndex: "collected_input",
            key: "collected_input",
            width: 140,
            render: (val) =>
              val ? (
                <span
                  className="font-mono font-semibold"
                  style={{ color: THEME.primary }}
                >
                  {val}
                </span>
              ) : (
                <span className="text-xs text-gray-300">—</span>
              ),
          },
          {
            title: <span className="flex items-center gap-1">Webhook</span>,
            dataIndex: "webhook_success",
            key: "webhook_success",
            width: 110,
            render: (v, row) => {
              if (v === null || v === undefined) return <span className="text-xs text-gray-300">—</span>;
              const sent = !!Number(v);
              return (
                <Tag
                  color={sent ? "green" : "red"}
                  style={{ cursor: "pointer" }}
                  onClick={() => setWebhookDetail(row)}
                >
                  {sent ? "Sent" : "Failed"}
                </Tag>
              );
            },
          },
          {
            title: (
              <span className="flex items-center gap-1">
                <CheckCircleOutlined className="text-xs" />
                Call Result
              </span>
            ),
            dataIndex: "dtmf_disposition",
            key: "dtmf_disposition",
            width: 140,
            render: (d, row) => {
              const RESULT_LABELS = {
                completed: { text: "Completed", color: "#059669", bg: "rgba(5,150,105,0.1)" },
                hangup_early: { text: "Hung up midway", color: "#EA580C", bg: "rgba(234,88,12,0.1)" },
                no_input: { text: "No response", color: "#6B7280", bg: "rgba(107,114,128,0.1)" },
                transferred: { text: "Call forwarded", color: "#2563EB", bg: "rgba(37,99,235,0.1)" },
                transfer_failed: { text: "Forward failed", color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
              };
              if (!d) return <span className="text-xs text-gray-300">—</span>;
              const label = RESULT_LABELS[d] || {
                text: "Error",
                color: "#DC2626",
                bg: "rgba(220,38,38,0.1)",
              };

              const tag = (clickable) => (
                <Tag
                  style={{
                    background: label.bg,
                    border: "none",
                    color: label.color,
                    fontWeight: 600,
                    fontSize: 11,
                    borderRadius: 6,
                    cursor: clickable ? "pointer" : "default",
                  }}
                >
                  {label.text}
                </Tag>
              );

              // Forwarded calls: click shows every number tried + outcome
              const attempts = (row.dtmf_presses || [])
                .filter((p) => p.attempts && p.attempts.length > 0)
                .flatMap((p) => p.attempts);

              if (attempts.length > 0) {
                const ATTEMPT_LABELS = {
                  answered: { text: "Answered", color: "#059669" },
                  no_answer: { text: "No answer", color: "#6B7280" },
                  busy: { text: "Busy", color: "#EA580C" },
                  cancelled: { text: "Caller hung up", color: "#6B7280" },
                };
                return (
                  <Popover
                    trigger="click"
                    title="Forwarding attempts"
                    content={
                      <div className="space-y-1" style={{ minWidth: 200 }}>
                        {attempts.map((a, i) => {
                          const st = ATTEMPT_LABELS[a.status] || {
                            text: a.status,
                            color: "#6B7280",
                          };
                          return (
                            <div
                              key={i}
                              className="flex items-center justify-between gap-4 text-sm"
                            >
                              <span className="font-mono">{a.number}</span>
                              <span
                                style={{ color: st.color, fontWeight: 600 }}
                              >
                                {st.text}
                              </span>
                            </div>
                          );
                        })}
                        {row.call_duration != null && (
                          <div className="text-xs text-gray-400 pt-1 border-t mt-1">
                            Call lasted {row.call_duration} seconds
                          </div>
                        )}
                      </div>
                    }
                  >
                    {tag(true)}
                  </Popover>
                );
              }

              return (
                <Tooltip
                  title={
                    row.call_duration != null
                      ? `Call lasted ${row.call_duration} seconds`
                      : undefined
                  }
                >
                  {tag(false)}
                </Tooltip>
              );
            },
          },
        ]
      : []),
    ...(data.some((r) => Number(r.retry_count) > 0)
      ? [
          {
            title: (
              <span className="flex items-center gap-1">
                <ReloadOutlined className="text-xs" />
                Retries
              </span>
            ),
            dataIndex: "retry_count",
            key: "retry_count",
            width: 90,
            render: (n) =>
              Number(n) > 0 ? (
                <Tag
                  style={{
                    background: "rgba(234,88,12,0.1)",
                    border: "none",
                    color: "#EA580C",
                    fontWeight: 600,
                    fontSize: 11,
                    borderRadius: 6,
                  }}
                >
                  {n}× retried
                </Tag>
              ) : (
                <span className="text-xs text-gray-300">—</span>
              ),
          },
        ]
      : []),
    ...visibleMediaCols.map((i) => ({
      title: (
        <span className="flex items-center gap-0.5 text-gray-400">
          <PictureOutlined className="text-[10px]" />
          <span className="text-[10px]">M{i}</span>
        </span>
      ),
      dataIndex: `media${i}`,
      key: `media${i}`,
      width: 90,
      ellipsis: true,
      render: (media) =>
        media ? (
          <Tooltip title={media}>
            <span className="text-xs text-gray-500 truncate block">
              {media.slice(0, 12)}…
            </span>
          </Tooltip>
        ) : (
          <span className="text-xs text-gray-200">—</span>
        ),
    })),
  ];

  return (
    <>
      <Modal
        title={null}
        open={open}
        onCancel={onCancel}
        footer={null}
        width="95%"
        style={{ top: 16 }}
        closeIcon={
          <div className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <CloseOutlined style={{ fontSize: 14, color: "#6b7280" }} />
          </div>
        }
        className="voice-details-modal"
      >
        {/* ── Header ── */}
        <div
          className="px-6 py-4 -mx-6 -mt-5"
          style={{
            background: THEME.gradientLight,
            borderBottom: "1px solid rgba(37,99,235,0.1)",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: THEME.gradient,
                  boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                }}
              >
                <SoundOutlined style={{ color: "white", fontSize: 18 }} />
              </motion.div>
              <div>
                <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>
                  {name || "Broadcast Details"}
                </Title>
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="font-mono text-gray-400">#{requestId}</span>
                  {totalCount > 0 && (
                    <span className="ml-2 font-medium text-gray-600">
                      • <TeamOutlined className="mr-0.5" />
                      {totalCount.toLocaleString()} recipients
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Search phone number..."
                prefix={<SearchOutlined style={{ color: THEME.primary }} />}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: 210,
                  borderRadius: 10,
                  borderColor: "rgba(37,99,235,0.25)",
                  height: 36,
                }}
              />
              <Select
                allowClear
                placeholder="Filter status"
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setCurrentPage(1);
                }}
                style={{ width: 150, height: 36 }}
                suffixIcon={<FilterOutlined style={{ color: THEME.primary }} />}
                options={Object.keys(STATUS_STYLE).map((s) => ({
                  value: s,
                  label: s.charAt(0).toUpperCase() + s.slice(1),
                }))}
              />
              <Button
                icon={<SoundOutlined />}
                onClick={() => setFlowOpen(true)}
                style={{ borderColor: THEME.primary, color: THEME.primary, height: 36 }}
              >
                View DTMF Menu
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadCSV}
                style={{ background: THEME.gradient, borderColor: THEME.primary, height: 36 }}
              >
                Download CSV
              </Button>
            </div>
          </div>
        </div>

        <FlowViewerModal
          open={flowOpen}
          onClose={() => setFlowOpen(false)}
          requestId={requestId}
          campaignName={name}
        />

        <Modal
          open={!!webhookDetail}
          onCancel={() => setWebhookDetail(null)}
          footer={null}
          title={
            <span>
              Webhook {webhookDetail && Number(webhookDetail.webhook_success) ? <Tag color="green">Sent</Tag> : <Tag color="red">Failed</Tag>}
              {webhookDetail?.webhook_http_code != null && (
                <span className="text-xs text-gray-400 ml-2">HTTP {webhookDetail.webhook_http_code}</span>
              )}
            </span>
          }
          width={640}
          zIndex={1200}
        >
          <div className="space-y-3">
            <div>
              <Text className="text-xs font-medium uppercase tracking-wide text-gray-500 block mb-1">Payload sent</Text>
              <pre
                className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto"
                style={{ maxHeight: 220, whiteSpace: "pre-wrap", wordBreak: "break-all" }}
              >
                {webhookDetail?.webhook_payload || "—"}
              </pre>
            </div>
            <div>
              <Text className="text-xs font-medium uppercase tracking-wide text-gray-500 block mb-1">Response received</Text>
              <pre
                className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto"
                style={{ maxHeight: 220, whiteSpace: "pre-wrap", wordBreak: "break-all" }}
              >
                {webhookDetail?.webhook_response || "—"}
              </pre>
            </div>
          </div>
        </Modal>

        {/* ── Analytics strip ── */}
        <div
          className="px-6 py-4"
          style={{
            borderBottom: "1px solid rgba(37,99,235,0.07)",
            background: "#f8faff",
          }}
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            <div className="flex flex-wrap gap-2 flex-1">
              <StatChip
                label="Total"
                value={Object.values(statusCounts).reduce((s, v) => s + v, 0)}
                color="#374151"
                bg="#37415112"
                icon={<TeamOutlined />}
                loading={statsLoading}
              />
              {Object.entries(statusCounts)
                .filter(([, v]) => v > 0)
                .sort(([a], [b]) => {
                  const oa = getStatusStyle(a).order ?? 99;
                  const ob = getStatusStyle(b).order ?? 99;
                  return oa !== ob ? oa - ob : a.localeCompare(b);
                })
                .map(([label, value]) => {
                  const { color, bg, icon } = getStatusStyle(label);
                  return (
                    <StatChip
                      key={label}
                      label={label}
                      value={value}
                      color={color}
                      bg={bg}
                      icon={icon}
                      loading={statsLoading}
                    />
                  );
                })}
            </div>
            <div className="flex-shrink-0">
              {statsLoading ? (
                <Skeleton.Avatar active size={120} shape="circle" />
              ) : (
                <StatusPieChart data={statusCounts} />
              )}
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="px-0 pt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-14">
              <Spin size="large" />
              <p className="mt-3 text-sm text-gray-400">Loading recipients…</p>
            </div>
          ) : (
            <Table
              className="voice-details-table"
              columns={columns}
              dataSource={data.map((item, i) => ({ ...item, key: item.id ?? i }))}
              rowKey="id"
              pagination={{
                current: currentPage,
                pageSize,
                total: totalCount,
                showSizeChanger: true,
                pageSizeOptions: ["10", "25", "50", "100"],
                showTotal: (total, range) => (
                  <span className="text-xs text-gray-400">
                    {range[0]}–{range[1]} of {total.toLocaleString()}
                  </span>
                ),
              }}
              onChange={handleTableChange}
              scroll={{ x: "max-content" }}
              size="small"
            />
          )}
        </div>
      </Modal>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .voice-details-modal .ant-modal-content {
          border-radius: 20px;
          overflow: hidden;
          padding: 0;
        }
        .voice-details-modal .ant-modal-body {
          padding: 20px 24px 24px;
        }
        .voice-details-modal .ant-modal-close {
          top: 14px;
          right: 14px;
        }
        .voice-details-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #6b7280;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid rgba(37,99,235,0.12) !important;
          padding: 10px 12px;
        }
        .voice-details-table .ant-table-thead > tr > th::before {
          display: none !important;
        }
        .voice-details-table .ant-table-tbody > tr > td {
          padding: 10px 12px;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.15s;
        }
        .voice-details-table .ant-table-tbody > tr:hover > td {
          background: rgba(37,99,235,0.03) !important;
        }
        .voice-details-table .ant-table-tbody > tr:last-child > td {
          border-bottom: none;
        }
        .voice-details-table .ant-pagination {
          padding: 12px 0 4px;
        }
        .voice-details-table .ant-pagination-item {
          border-radius: 8px !important;
          border-color: #e5e7eb !important;
        }
        .voice-details-table .ant-pagination-item-active {
          background: ${THEME.gradient} !important;
          border-color: ${THEME.primary} !important;
        }
        .voice-details-table .ant-pagination-item-active a { color: white !important; }
        .voice-details-table .ant-pagination-item:hover { border-color: ${THEME.primary} !important; }
        .voice-details-table .ant-pagination-item:hover a { color: ${THEME.primary} !important; }
        .voice-details-modal .ant-input:hover,
        .voice-details-modal .ant-input:focus {
          border-color: ${THEME.primary} !important;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.1) !important;
        }
        .voice-details-table .ant-tag { border-radius: 6px; padding: 1px 8px; }
        .voice-details-table .ant-table-fixed-left .ant-table-cell { background: #fff; }
      `,
        }}
      />
    </>
  );
};

export default VoiceDetailsModal;

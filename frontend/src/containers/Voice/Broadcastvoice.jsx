import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, DatePicker, Input, message, Tooltip } from "antd";
import {
  ArrowLeftOutlined,
  ExportOutlined,
  ReloadOutlined,
  SearchOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import debounce from "lodash.debounce";

import BroadcastVoiceTable from "./BroadcastVoiceTable.jsx";
import ExportReportsDrawer from "./ExportReportsDrawer.jsx";
import handleApiError from "../../utils/errorHandler.js";
import { requestVoiceSummaryExport, requestVoiceDetailsExport } from "../../services/api.js";

const { RangePicker } = DatePicker;

// Theme colors — matches the GSM report pattern
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  headerBg: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
};

const BroadcastVoice = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPulse30 = searchParams.get("pulse30") === "1";

  const [dateRange, setDateRange] = useState(() => [
    dayjs().subtract(7, "day"),
    dayjs(),
  ]);
  const [searchText, setSearchText] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportDrawerOpen, setExportDrawerOpen] = useState(false);
  const exportDrawerRef = useRef(null);

  const startDate = dateRange[0]?.format("YYYY-MM-DD");
  const endDate = dateRange[1]?.format("YYYY-MM-DD");

  const handleSearchChange = debounce((value) => {
    setSearchText(value);
  }, 500);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    message.success("Data refreshed successfully");
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Queues a full report export (date range) — shown/tracked in the drawer.
  const handleSummaryExport = async () => {
    try {
      await requestVoiceSummaryExport({ from_date: startDate, to_date: endDate, pulse30: isPulse30 ? 1 : 0 });
      message.success("Export queued");
      exportDrawerRef.current?.refresh();
    } catch (error) {
      handleApiError(error);
    }
  };

  // Queues a single campaign's recipient CSV — used by the per-row Download
  // button and the details modal, opening the shared drawer to track it.
  const handleDetailsExport = async (requestId) => {
    try {
      await requestVoiceDetailsExport(requestId, {});
      message.success("Export queued");
      setExportDrawerOpen(true);
      exportDrawerRef.current?.refresh();
    } catch (error) {
      handleApiError(error);
    }
  };

  useEffect(() => {
    const handler = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener("broadcastSuccess", handler);
    return () => {
      window.removeEventListener("broadcastSuccess", handler);
    };
  }, []);

  return (
    <div className="-m-4 min-h-screen" style={{ background: "#F8F9FB" }}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 pb-4" style={{ background: "#F8F9FB" }}>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="rounded-2xl border border-gray-100 px-6 py-5 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: THEME.headerBg, boxShadow: "0 1px 8px rgba(37,99,235,0.06)" }}
          >
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
                <SoundOutlined style={{ color: "#fff", fontSize: 20 }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                  {isPulse30 ? "Voice 30 Campaign Report" : "Voice 15 Campaign Report"}
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  View and manage your voice broadcasts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <RangePicker
                value={dateRange}
                onChange={(dates) => dates && setDateRange(dates)}
                format="YYYY-MM-DD"
                allowClear={false}
                presets={[
                  { label: "Today", value: [dayjs(), dayjs()] },
                  { label: "Last 7 days", value: [dayjs().subtract(7, "day"), dayjs()] },
                  { label: "Last 30 days", value: [dayjs().subtract(30, "day"), dayjs()] },
                  { label: "Last 90 days", value: [dayjs().subtract(90, "day"), dayjs()] },
                ]}
                className="h-9 rounded-lg bg-white"
                style={{ borderColor: "#e5e7eb", minWidth: 240 }}
              />
              <Input
                placeholder="Search campaign name or ID..."
                prefix={<SearchOutlined style={{ color: THEME.primary }} />}
                onChange={(e) => handleSearchChange(e.target.value)}
                allowClear
                className="h-9 rounded-lg"
                style={{ width: 220 }}
              />
              <Tooltip title="View & download campaign exports">
                <Button
                  icon={<ExportOutlined />}
                  onClick={() => setExportDrawerOpen(true)}
                  className="h-9 rounded-lg border-gray-200 text-gray-600 hover:text-indigo-600"
                >
                  Export
                </Button>
              </Tooltip>
              <Tooltip title="Refresh">
                <Button
                  icon={<ReloadOutlined spin={isRefreshing} />}
                  onClick={handleRefresh}
                  loading={isRefreshing}
                  className="h-9 w-9 rounded-lg border-gray-200 text-gray-500 hover:text-indigo-600"
                />
              </Tooltip>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Table */}
      <div className="px-4 pb-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <BroadcastVoiceTable
            user={user}
            startDate={startDate}
            endDate={endDate}
            searchText={searchText}
            refreshTrigger={refreshTrigger}
            onRequestDetailsExport={handleDetailsExport}
            pulse30={isPulse30}
          />
        </motion.div>
      </div>

      <ExportReportsDrawer
        ref={exportDrawerRef}
        open={exportDrawerOpen}
        onClose={() => setExportDrawerOpen(false)}
        onNewExport={handleSummaryExport}
        newExportLabel="Export Summary"
      />
    </div>
  );
};

export default BroadcastVoice;

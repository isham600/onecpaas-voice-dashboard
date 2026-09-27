import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, DatePicker, message, Tooltip } from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  ReloadOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";

import OverviewComponent from "./OverviewComponent.jsx";
import NewBroadcastVoice from "./NewBroadcastVoice.jsx";
import Modal from "../../components/Modal";
import VoiceCreditsCard from "../../components/Voice/VoiceCreditsCard.jsx";

const { RangePicker } = DatePicker;

// Theme colors — matches the GSM Dashboard pattern
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
};

const VoiceDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPulse30 = searchParams.get("pulse30") === "1";

  const [dateRange, setDateRange] = useState(() => [
    dayjs().subtract(7, "day"),
    dayjs(),
  ]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const startDate = dateRange[0]?.format("YYYY-MM-DD");
  const endDate = dateRange[1]?.format("YYYY-MM-DD");

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    message.success("Dashboard refreshed");
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleBroadcastSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const handler = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener("broadcastSuccess", handler);
    window.addEventListener("refreshCredits", handler);
    return () => {
      window.removeEventListener("broadcastSuccess", handler);
      window.removeEventListener("refreshCredits", handler);
    };
  }, []);

  return (
    <div className="-m-4 min-h-screen" style={{ background: "#F8F9FB" }}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 pb-4" style={{ background: "#F8F9FB" }}>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="rounded-2xl border border-gray-100 px-6 py-5 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: THEME.gradientLight, boxShadow: "0 1px 8px rgba(37,99,235,0.06)" }}
          >
            <div className="flex items-center gap-4">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/dashboard")}
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
                  {isPulse30 ? "Voice 30 Dashboard" : "Voice 15 Dashboard"}
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Manage your voice broadcasts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openModal}
                className="h-9 rounded-lg font-medium flex items-center justify-center gap-2"
                style={{
                  background: THEME.gradient,
                  border: "none",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                }}
              >
                {isPulse30 ? "New Voice 30 Broadcast" : "New Voice 15 Broadcast"}
              </Button>
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

      {/* Overview Statistics + Credits — credits sized like other modules, not full width */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-100 p-5 lg:col-span-3"
            style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
          >
            <OverviewComponent user={user} startDate={startDate} endDate={endDate} pulse30={isPulse30} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2"
          >
            <VoiceCreditsCard user={user} refreshCredits={refreshTrigger} pulse30={isPulse30} />
          </motion.div>
        </div>
      </div>

      {/* New Broadcast Modal */}
      {isModalOpen && (
        <Modal
          isModalOpen={isModalOpen}
          closeModal={closeModal}
          height="80vh"
          className="voice-broadcast-modal"
        >
          <NewBroadcastVoice
            closeModal={closeModal}
            user={user?.username}
            onBroadcastSuccess={handleBroadcastSuccess}
            pulse30={isPulse30}
          />
        </Modal>
      )}
    </div>
  );
};

export default VoiceDashboard;

// ReportChannel.jsx — Theme-only update matching dashboard green theme
import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Typography, Skeleton, Tooltip } from "antd";
import {
  ArrowLeftOutlined,
  MessageOutlined,
  PhoneOutlined,
  WhatsAppOutlined,
  SendOutlined,
  CommentOutlined,
  InstagramOutlined,
  WechatOutlined,
  RightOutlined,
} from "@ant-design/icons";

import { motion } from "framer-motion";
import { ArrowLeft, Radio } from "lucide-react";
import handleApiError from "../../../utils/errorHandler.js";
import { getProfileMe } from "../../../services/api";

const { Title, Text } = Typography;

// ─── Channel color styles ───
const channelColorMap = {
  "#25d366": {
    bg: "from-emerald-500 to-green-600",
    light: "rgba(37, 211, 102, 0.06)",
    border: "rgba(37, 211, 102, 0.12)",
    accent: "#25d366",
    glow: "rgba(37, 211, 102, 0.1)",
  },
  "#e4405f": {
    bg: "from-pink-500 to-rose-600",
    light: "rgba(228, 64, 95, 0.06)",
    border: "rgba(228, 64, 95, 0.12)",
    accent: "#e4405f",
    glow: "rgba(228, 64, 95, 0.1)",
  },
  "#0088cc": {
    bg: "from-sky-500 to-blue-600",
    light: "rgba(0, 136, 204, 0.06)",
    border: "rgba(0, 136, 204, 0.12)",
    accent: "#0088cc",
    glow: "rgba(0, 136, 204, 0.1)",
  },
  "#4285f4": {
    bg: "from-blue-500 to-indigo-600",
    light: "rgba(66, 133, 244, 0.06)",
    border: "rgba(66, 133, 244, 0.12)",
    accent: "#4285f4",
    glow: "rgba(66, 133, 244, 0.1)",
  },
  "#ff6b6b": {
    bg: "from-red-400 to-red-600",
    light: "rgba(255, 107, 107, 0.06)",
    border: "rgba(255, 107, 107, 0.12)",
    accent: "#ff6b6b",
    glow: "rgba(255, 107, 107, 0.1)",
  },
  "#52c41a": {
    bg: "from-green-500 to-emerald-600",
    light: "rgba(82, 196, 26, 0.06)",
    border: "rgba(82, 196, 26, 0.12)",
    accent: "#52c41a",
    glow: "rgba(82, 196, 26, 0.1)",
  },
  "#722ed1": {
    bg: "from-purple-500 to-violet-600",
    light: "rgba(114, 46, 209, 0.06)",
    border: "rgba(114, 46, 209, 0.12)",
    accent: "#722ed1",
    glow: "rgba(114, 46, 209, 0.1)",
  },
  "#fa8c16": {
    bg: "from-orange-500 to-amber-600",
    light: "rgba(250, 140, 22, 0.06)",
    border: "rgba(250, 140, 22, 0.12)",
    accent: "#fa8c16",
    glow: "rgba(250, 140, 22, 0.1)",
  },
};

const getChannelStyle = (color) =>
  channelColorMap[color] || {
    bg: "from-gray-500 to-gray-600",
    light: "rgba(107,114,128,0.06)",
    border: "rgba(107,114,128,0.12)",
    accent: color,
    glow: "rgba(107,114,128,0.1)",
  };

// ─── Channel Card ───
const ChannelCard = ({ icon, title, onClick, color = "#1890ff", index }) => {
  const style = getChannelStyle(color);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative p-5 rounded-2xl cursor-pointer border transition-all duration-300 group overflow-hidden bg-white hover:shadow-lg text-center"
      style={{ borderColor: style.border }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-[2.5px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ backgroundColor: style.accent }}
      />

      {/* Decorative glow */}
      <div
        className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${style.glow}, transparent 70%)`,
        }}
      />

      {/* Background wash */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${style.light}, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center gap-3">
        {/* Icon */}
        <div
          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${style.bg} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}
        >
          {React.cloneElement(icon, {
            style: { fontSize: 26, color: "white" },
          })}
        </div>

        {/* Title */}
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
      </div>

      {/* Hover action */}
      <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: style.light }}
        >
          <RightOutlined style={{ fontSize: 10, color: style.accent }} />
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main Component ───
const ReportChannel = ({ user, selectedClient, clientType, onBack }) => {
  const navigate = useNavigate();

  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await getProfileMe();
        const perms = response?.data?.data?.permissions || {};
        setPermissions(perms);
      } catch (error) {
        handleApiError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const handleNavigate = useCallback(
    (path) => () => {
      navigate(path, {
        state: { selectedClient, clientType },
      });
    },
    [navigate, selectedClient, clientType],
  );

  const channels = useMemo(
    () => [
      {
        key: "voice_credits",
        icon: <PhoneOutlined />,
        title: "Voice",
        onClick: handleNavigate("/dashboard/management/reports/voice"),
        color: "#ff6b6b",
      },
    ],
    [handleNavigate],
  );

  const filteredChannels = useMemo(() => {
    if (!permissions) return [];
    return channels.filter((channel) => {
      const permKey =
        channel.key === "bulk_whatsapp" ? "bulk_whatsapp" : channel.key;
      return permissions[permKey] && permissions[permKey] > 0;
    });
  }, [permissions, channels]);

  return (
    <div className="min-h-screen relative">
      {/* ─── Background ─── */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 25%, #e2e8f0 50%, #f8fafc 75%, #f1f5f9 100%)",
        }}
      />
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(37,99,235,0.1), transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(37,99,235,0.08), transparent 70%)",
          }}
        />
      </div>

      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm"
      >
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Back */}
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>

            {/* Title */}
            <div className="flex items-center gap-3 flex-1 justify-center">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md hidden sm:flex"
                style={{
                  background:
                    "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                }}
              >
                <Radio className="w-4 h-4 text-white" />
              </div>
              <div className="text-center">
                <h1 className="text-lg font-bold text-gray-900">
                  Channel Reports
                </h1>
                <p className="text-xs text-gray-500">
                  Viewing reports for{" "}
                  <span className="font-semibold" style={{ color: "#2563EB" }}>
                    {selectedClient}
                  </span>
                </p>
              </div>
            </div>

            {/* Spacer for balance */}
            <div className="w-10 flex-shrink-0" />
          </div>
        </div>
      </motion.div>

      {/* ─── Content ─── */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg shadow-gray-200/30 p-6"
        >
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(8)].map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse bg-gray-100 rounded-2xl h-32"
                />
              ))}
            </div>
          ) : filteredChannels.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredChannels.map((channel, index) => (
                <ChannelCard
                  key={channel.key}
                  icon={channel.icon}
                  title={channel.title}
                  onClick={channel.onClick}
                  color={channel.color}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageOutlined style={{ fontSize: 28, color: "#9CA3AF" }} />
              </div>
              <p className="text-gray-600 font-semibold text-sm">
                No channels available
              </p>
              <p className="text-gray-400 text-xs mt-1">
                No channels available for your permissions
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default React.memo(ReportChannel);

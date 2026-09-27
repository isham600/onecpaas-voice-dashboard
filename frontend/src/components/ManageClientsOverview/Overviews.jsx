import { useState, useEffect, useContext } from "react";
import { Skeleton, Typography, Tooltip, Progress } from "antd";
import {
  TeamOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  UserOutlined,
  AppstoreOutlined,
  PhoneOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import VoiceIcon from "/assets/images/svg/voice-recognition.svg";

import ClientsBoard from "../ManageClientss/ClientsBoard";
import { getProfileMe } from "../../services/api";
import { AppContext } from "../../utils/Context";
import handleApiError from "../../utils/errorHandler";
import displayChannelName from "../../utils/channelNames";

const { Title, Text } = Typography;

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

// Animated counter component
const CountUpNumber = ({ value, duration = 1000 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0 || value === undefined) {
      setDisplayValue(0);
      return;
    }

    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOut * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
};

// Client Stat Card Component
const ClientStatCard = ({ stat, index, totalUsers }) => {
  const percentage = totalUsers > 0 ? (stat.value / totalUsers) * 100 : 0;

  const getIconColor = (label) => {
    switch (label) {
      case "Total Users":
        return THEME.primary;
      case "Total Reseller":
        return "#8b5cf6";
      case "Total Clients":
        return "#06b6d4";
      case "Enable Users":
        return "#10b981";
      case "Disable Users":
        return "#ef4444";
      default:
        return THEME.primary;
    }
  };

  const color = getIconColor(stat.label);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.08,
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={{ y: -2, scale: 1.01 }}
      className="relative overflow-hidden"
    >
      <div
        className="h-[120px] rounded-xl p-4 transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, ${color}08 0%, white 100%)`,
          border: `1px solid ${color}20`,
          boxShadow: `0 2px 8px ${color}08`,
        }}
      >
        {/* Decorative gradient orb */}
        <div
          className="absolute -right-6 -top-6 w-16 h-16 rounded-full opacity-30 blur-xl"
          style={{ background: color }}
        />

        <div className="relative z-10 h-full flex flex-col items-center justify-center">
          {/* Icon */}
          <motion.div
            whileHover={{ rotate: 5, scale: 1.1 }}
            className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
            style={{ background: `${color}15` }}
          >
            <span style={{ color, fontSize: 20 }}>{stat.icon}</span>
          </motion.div>

          {/* Value */}
          <span className="text-2xl font-bold" style={{ color }}>
            <CountUpNumber value={stat.value} />
          </span>

          {/* Label */}
          <span className="text-[11px] font-medium text-gray-600 text-center mt-1">
            {stat.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// Service Stat Card Component
const ServiceStatCard = ({ stat, index }) => {
  const getServiceColor = (label) => {
    if (label.toLowerCase().includes("whatsapp")) return "#25D366";
    if (label.toLowerCase().includes("telegram")) return "#0088cc";
    if (label.toLowerCase().includes("instagram")) return "#E4405F";
    if (label.toLowerCase().includes("rcs")) return "#4285F4";
    if (label.toLowerCase().includes("voice")) return "#f59e0b";
    if (label.toLowerCase().includes("sms")) return "#8b5cf6";
    if (label.toLowerCase().includes("virtual")) return "#06b6d4";
    return THEME.primary;
  };

  const color = getServiceColor(stat.label);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.06,
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="relative overflow-hidden cursor-pointer group"
    >
      <Tooltip title={`${stat.label}: ${stat.value} credits`} placement="top">
        <div
          className="h-[130px] rounded-xl p-4 transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${color}08 0%, white 100%)`,
            border: `1px solid ${color}20`,
            boxShadow: `0 2px 8px ${color}08`,
          }}
        >
          {/* Decorative gradient orb */}
          <div
            className="absolute -right-6 -top-6 w-16 h-16 rounded-full opacity-30 blur-xl transition-opacity group-hover:opacity-50"
            style={{ background: color }}
          />

          <div className="relative z-10 h-full flex flex-col items-center justify-center">
            {/* Icon */}
            <motion.div
              whileHover={{ rotate: 5, scale: 1.1 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-2"
              style={{ background: `${color}15` }}
            >
              <img
                src={stat.icon}
                alt={`${stat.label} Icon`}
                className="w-7 h-7"
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}
              />
            </motion.div>

            {/* Value */}
            <span className="text-xl font-bold" style={{ color }}>
              <CountUpNumber value={stat.value} />
            </span>

            {/* Label */}
            <span className="text-[10px] font-semibold text-gray-600 text-center mt-1 uppercase tracking-wide">
              {stat.label}
            </span>
          </div>
        </div>
      </Tooltip>
    </motion.div>
  );
};

// Loading Skeleton Component
const StatCardSkeleton = ({ index }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: index * 0.05 }}
    className="h-[120px] rounded-xl p-4 bg-white border border-gray-100"
    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
  >
    <div className="h-full flex flex-col items-center justify-center">
      <Skeleton.Avatar active size={40} shape="square" className="mb-2" />
      <Skeleton.Input
        active
        size="small"
        style={{ width: 60, height: 24, marginBottom: 4 }}
      />
      <Skeleton.Input active size="small" style={{ width: 80, height: 14 }} />
    </div>
  </motion.div>
);

// Section Header Component
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-3 mb-6"
  >
    <motion.div
      whileHover={{ scale: 1.05, rotate: 5 }}
      className="w-10 h-10 rounded-xl flex items-center justify-center"
      style={{
        background: THEME.gradient,
        boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
      }}
    >
      <Icon style={{ color: "white", fontSize: 18 }} />
    </motion.div>
    <div>
      <Title level={4} style={{ marginBottom: 0, color: "#1f2937" }}>
        {title}
      </Title>
      {subtitle && <Text className="text-xs text-gray-500">{subtitle}</Text>}
    </div>
  </motion.div>
);

const Overviews = ({
  user,
  setUser,
  broadcastData,
  setBroadcastData,
  loading,
  serverTotals = {},
  page,
  pageSize,
  search,
  onPageChange,
  onPageSizeChange,
  onSearch,
  onFilter,
}) => {
  const [stats, setStats] = useState([]);
  const [status, setStatus] = useState();
  const { reload, setReload } = useContext(AppContext);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);

  // Use server-provided totals for accurate counts across all pages
  const totalClients = [
    {
      label: "Total Users",
      value: serverTotals.total ?? 0,
      icon: <TeamOutlined />,
    },
    {
      label: "Total Reseller",
      value: serverTotals.totalReseller ?? 0,
      icon: <UserOutlined />,
    },
    {
      label: "Total Clients",
      value: serverTotals.totalClient ?? 0,
      icon: <UserOutlined />,
    },
    {
      label: "Enable Users",
      value: serverTotals.totalActive ?? 0,
      icon: <UserAddOutlined />,
    },
    {
      label: "Disable Users",
      value: serverTotals.totalInactive ?? 0,
      icon: <UserDeleteOutlined />,
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      if (!user) return;

      try {
        // Fetch all data from profile/me (cached, single request)
        const profileResponse = await getProfileMe();
        const profileData = profileResponse.data.data || {};
        const statusData = profileData.permissions || {};
        const channelsData = profileData.channels || [];
        const creditsData = profileData.credits || {};
        setStatus(statusData);

        if (creditsData && statusData) {
          const updatedStats = [
            {
              label: "Voice",
              value: creditsData?.voice_credits,
              icon: VoiceIcon,
              status: statusData?.voice_credits || 0,
              backend: "voice_credits",
            },
            {
              label: "Voice 30",
              value: creditsData?.voice_pulse30_credits,
              icon: VoiceIcon,
              status: statusData?.voice_pulse30 || 0,
              backend: "voice_pulse30_credits",
            },
          ].map((stat) => {
            const matchingChannel = channelsData.find(
              (channel) => channel.back_end_name === stat.backend,
            );

            return matchingChannel
              ? { ...stat, label: displayChannelName(matchingChannel.front_end_name) }
              : stat;
          });
          setStats(updatedStats);
        }
      } catch (error) {
        handleApiError(error);
        setError(error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user, reload]);

  const filteredStats = stats.filter((stat) => stat.status !== 0);

  return (
    <div className="space-y-5">
      {/* Client Overview Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 p-5"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
      >
        <div className="mb-5">
          <SectionHeader
            icon={TeamOutlined}
            title="Client Overview"
            subtitle="Summary of all users and clients"
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-600 mb-4 p-3 rounded-lg bg-red-50 border border-red-200"
          >
            Error: {error.message}
          </motion.div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {loadingData
            ? [...Array(5)].map((_, index) => (
                <StatCardSkeleton key={index} index={index} />
              ))
            : totalClients.map((stat, index) =>
                stat ? (
                  <ClientStatCard
                    key={index}
                    stat={stat}
                    index={index}
                    totalUsers={serverTotals.total || 0}
                  />
                ) : null,
              )}
        </div>
      </motion.div>

      {/* Service Overview Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 p-5"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
      >
        <div className="mb-5">
          <SectionHeader
            icon={AppstoreOutlined}
            title="Service Overview"
            subtitle="Credits and service availability"
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-600 mb-4 p-3 rounded-lg bg-red-50 border border-red-200"
          >
            Error: {error.message}
          </motion.div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {loadingData
            ? [...Array(9)].map((_, index) => (
                <StatCardSkeleton key={index} index={index} />
              ))
            : filteredStats.map((stat, index) => (
                <ServiceStatCard key={index} stat={stat} index={index} />
              ))}
        </div>

        {/* No services message */}
        {!loadingData && filteredStats.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(156,163,175,0.1)" }}
            >
              <AppstoreOutlined style={{ fontSize: 28, color: "#9ca3af" }} />
            </div>
            <Text className="text-gray-500">No services available</Text>
          </motion.div>
        )}
      </motion.div>

      {/* Clients Board Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <ClientsBoard
          user={user}
          setUser={setUser}
          broadcastData={broadcastData}
          setBroadcastData={setBroadcastData}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={serverTotals.total ?? 0}
          searchTerm={search}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          onSearch={onSearch}
          onFilter={onFilter}
        />
      </motion.div>

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Skeleton animations */
        .ant-skeleton-content .ant-skeleton-title,
        .ant-skeleton-content .ant-skeleton-paragraph > li {
          background: linear-gradient(
            90deg,
            rgba(3, 207, 101, 0.06) 25%,
            rgba(3, 207, 101, 0.15) 50%,
            rgba(3, 207, 101, 0.06) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .ant-skeleton-avatar {
          background: linear-gradient(
            90deg,
            rgba(3, 207, 101, 0.06) 25%,
            rgba(3, 207, 101, 0.15) 50%,
            rgba(3, 207, 101, 0.06) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        /* Tooltip styling */
        .ant-tooltip-inner {
          border-radius: 8px;
          background: #1f2937;
          font-size: 12px;
        }

        .ant-tooltip-arrow::before {
          background: #1f2937;
        }
      `}} />
    </div>
  );
};

export default Overviews;

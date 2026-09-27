import { useState, useEffect } from "react";
import { Typography, Skeleton, Tooltip, Progress } from "antd";
import {
  CheckCircleOutlined,
  PhoneOutlined,
  CloseCircleOutlined,
  SendOutlined,
  ClockCircleOutlined,
  NumberOutlined,
  BarChartOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import handleApiError from "../../utils/errorHandler";
import { getVoiceStatusCounts } from "../../services/api";

const { Title } = Typography;

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
const CountUpNumber = ({ value, duration = 1200 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
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

// Status card component
const StatusCard = ({ stat, index, totalCalls }) => {
  const percentage = totalCalls > 0 ? (stat.value / totalCalls) * 100 : 0;
  const Icon = stat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.05,
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="relative overflow-hidden"
    >
      <Tooltip title={stat.description} placement="top">
        <div
          className="h-[140px] rounded-xl p-4 cursor-pointer transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${stat.color}08 0%, white 100%)`,
            border: `1px solid ${stat.color}20`,
            boxShadow: `0 2px 8px ${stat.color}08`,
          }}
        >
          {/* Decorative gradient orb */}
          <div
            className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-30 blur-xl"
            style={{ background: stat.color }}
          />

          <div className="relative z-10 h-full flex flex-col">
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <motion.div
                whileHover={{ rotate: 5, scale: 1.1 }}
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: `${stat.color}15` }}
              >
                <Icon style={{ fontSize: 18, color: stat.color }} />
              </motion.div>

              <div
                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: `${stat.color}12`,
                  color: stat.color,
                }}
              >
                {percentage.toFixed(1)}%
              </div>
            </div>

            {/* Value */}
            <div className="flex-1">
              <span
                className="text-2xl font-bold block"
                style={{ color: stat.color }}
              >
                <CountUpNumber value={stat.value} />
              </span>
              <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                {stat.label}
              </span>
            </div>

            {/* Description */}
            <p className="text-[10px] text-gray-500 mt-1 truncate">
              {stat.description}
            </p>

            {/* Progress bar */}
            {percentage > 0 && (
              <Progress
                percent={percentage}
                showInfo={false}
                strokeColor={{
                  "0%": stat.color,
                  "100%": `${stat.color}99`,
                }}
                trailColor={`${stat.color}10`}
                size="small"
                strokeWidth={4}
                style={{ marginTop: 6 }}
              />
            )}
          </div>
        </div>
      </Tooltip>
    </motion.div>
  );
};

// Loading skeleton component
const StatusCardSkeleton = ({ index }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: index * 0.05 }}
    className="h-[140px] rounded-xl p-4 bg-white border border-gray-100"
    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
  >
    <div className="flex items-center justify-between mb-3">
      <Skeleton.Avatar active size={40} shape="square" />
      <Skeleton.Button active size="small" style={{ width: 40, height: 18 }} />
    </div>
    <Skeleton.Input
      active
      size="small"
      style={{ width: 80, height: 28, marginBottom: 6 }}
    />
    <Skeleton.Input active size="small" style={{ width: 60, height: 14 }} />
    <Skeleton.Input
      active
      size="small"
      style={{ width: "100%", height: 4, marginTop: 12 }}
    />
  </motion.div>
);

const OverviewComponent = ({ user, startDate, endDate, unOfficial, pulse30 = false }) => {
  const [stats, setStats] = useState([
    {
      label: "ANSWERED",
      value: 0,
      icon: CheckCircleOutlined,
      color: THEME.primary,
      description: "Successfully answered calls",
    },
    {
      label: "NO ANSWER",
      value: 0,
      icon: StopOutlined,
      unOfficial: true,
      color: "#f59e0b",
      description: "Unanswered call attempts",
    },
    {
      label: "FAILED",
      value: 0,
      icon: CloseCircleOutlined,
      unOfficial: true,
      color: "#ef4444",
      description: "Failed call connections",
    },
    {
      label: "BUSY",
      value: 0,
      icon: PhoneOutlined,
      color: "#8b5cf6",
      description: "Line busy signals",
    },
    {
      label: "SUBMITTED",
      value: 0,
      icon: SendOutlined,
      color: "#3b82f6",
      description: "Calls submitted for processing",
    },
    {
      label: "PENDING",
      value: 0,
      icon: ClockCircleOutlined,
      color: "#f97316",
      description: "Calls waiting in queue",
    },
    {
      label: "DTMF",
      value: 0,
      icon: NumberOutlined,
      color: "#06b6d4",
      description: "Touch-tone interactions",
    },
  ]);

  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await getVoiceStatusCounts({
        from_date: startDate || "2024-01-01",
        to_date: endDate || "2025-01-30",
        pulse30: pulse30 ? 1 : 0,
      });

      const data = response.data?.data || [];

      const totals = data.reduce((acc, { status, count }) => {
        const key = status.toString().trim().toLowerCase();
        acc[key] = (acc[key] || 0) + Number(count);
        return acc;
      }, {});

      const updatedStats = stats.map((stat) => {
        const key = stat.label.toLowerCase();
        return {
          ...stat,
          value: totals[key] || 0,
        };
      });

      setStats(updatedStats);
    } catch (err) {
      handleApiError(err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    loadData();
  }, [user, startDate, endDate, pulse30]);

  const filteredStats = stats.filter((stat) => !unOfficial || stat.unOfficial);
  const totalCalls = filteredStats.reduce((sum, stat) => sum + stat.value, 0);

  return (
    <div className="space-y-6 mb-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: THEME.gradient,
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
          >
            <BarChartOutlined style={{ color: "white", fontSize: 18 }} />
          </motion.div>
          <div>
            <Title level={4} style={{ marginBottom: 0, color: "#1f2937" }}>
              Call Overview
            </Title>
            <p className="text-xs text-gray-500">
              Real-time voice broadcast statistics
            </p>
          </div>
        </div>

        {/* Total summary badge */}
        {!loading && totalCalls > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background: THEME.gradientLight }}
          >
            <span className="text-xs font-medium text-gray-600">
              Total Calls:
            </span>
            <span
              className="text-lg font-bold"
              style={{ color: THEME.primary }}
            >
              <CountUpNumber value={totalCalls} />
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: filteredStats.length }).map((_, index) => (
              <StatusCardSkeleton key={index} index={index} />
            ))
          : filteredStats.map((stat, index) => (
              <StatusCard
                key={stat.label}
                stat={stat}
                index={index}
                totalCalls={totalCalls}
              />
            ))}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        /* Progress Bar Styling */
        .ant-progress-inner {
          border-radius: 4px !important;
        }

        .ant-progress-bg {
          border-radius: 4px !important;
        }

        /* Skeleton Styling */
        .ant-skeleton-element .ant-skeleton-avatar-square {
          border-radius: 10px;
        }

        .ant-skeleton-element .ant-skeleton-input {
          border-radius: 6px;
        }
      `}} />
    </div>
  );
};

export default OverviewComponent;

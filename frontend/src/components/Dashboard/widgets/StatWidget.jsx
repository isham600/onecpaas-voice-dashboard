import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CreditCardOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { TrendingUp, TrendingDown, Wallet, Send, CheckCircle, Zap } from "lucide-react";
import BaseWidget from "./BaseWidget";

// Animated counter component
const AnimatedCounter = ({ value, duration = 1.2, suffix = "" }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof value !== "number" || isNaN(value)) {
      setDisplayValue(0);
      return;
    }

    let startTime;
    const startValue = 0;
    const endValue = value;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(startValue + (endValue - startValue) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <span>
      {formatNumber(displayValue)}
      {suffix}
    </span>
  );
};

// Modern stat card with icon
const StatCard = ({ stat, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.4, type: "spring" }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="relative overflow-hidden rounded-2xl p-4 cursor-pointer group"
      style={{
        background: stat.gradient,
      }}
    >
      {/* Decorative circles */}
      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/5" />

      {/* Icon */}
      <div className="relative z-10 mb-3">
        <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          {stat.icon}
        </div>
      </div>

      {/* Value */}
      <div className="relative z-10">
        <div className="text-3xl font-bold text-white mb-1">
          <AnimatedCounter value={stat.value} suffix={stat.suffix || ""} />
        </div>
        <div className="text-white/80 text-sm font-medium">{stat.label}</div>
      </div>

      {/* Change indicator */}
      {stat.change !== undefined && (
        <div className="absolute top-4 right-4 z-10">
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              stat.change >= 0
                ? "bg-white/20 text-white"
                : "bg-red-500/20 text-red-200"
            }`}
          >
            {stat.change >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {stat.change >= 0 ? "+" : ""}
            {stat.change}%
          </div>
        </div>
      )}
    </motion.div>
  );
};

const StatWidget = ({
  creditsData = {},
  broadcastStats = {},
  loading = false,
}) => {
  const stats = useMemo(() => {
    const totalCredits =
      (creditsData.voice_credits || 0) +
      (creditsData.voice_pulse30_credits || 0);

    return [
      {
        label: "Total Credits",
        value: totalCredits,
        change: 12,
        icon: <Wallet className="w-5 h-5 text-white" />,
        gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
      },
      {
        label: "Messages Sent",
        value: broadcastStats.sent || 0,
        change: broadcastStats.sentChange || 8,
        icon: <Send className="w-5 h-5 text-white" />,
        gradient: "linear-gradient(135deg, #4338CA 0%, #3B82F6 100%)",
      },
      {
        label: "Delivery Rate",
        value: broadcastStats.deliveryRate || 98,
        suffix: "%",
        change: broadcastStats.deliveryChange || 2,
        icon: <CheckCircle className="w-5 h-5 text-white" />,
        gradient: "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)",
      },
      {
        label: "Active Channels",
        value: broadcastStats.activeChannels || 6,
        icon: <Zap className="w-5 h-5 text-white" />,
        gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
      },
    ];
  }, [creditsData, broadcastStats]);

  if (loading) {
    return (
      <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Overview</h3>
          <p className="text-sm text-gray-500">Your performance at a glance</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <StatCard key={stat.label} stat={stat} index={index} />
        ))}
      </div>
    </div>
  );
};

export default StatWidget;

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ToolOutlined,
  ThunderboltOutlined,
  MessageOutlined,
  FileTextOutlined,
  SafetyOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { Wrench, Zap, Shield, FileCode } from "lucide-react";
import { Progress, Tooltip } from "antd";

const UtilityItem = ({ item, index }) => {
  const iconMap = {
    otp: <SafetyOutlined style={{ fontSize: 16, color: "#2563EB" }} />,
    transactional: <FileTextOutlined style={{ fontSize: 16, color: "#06b6d4" }} />,
    alert: <ThunderboltOutlined style={{ fontSize: 16, color: "#f59e0b" }} />,
    notification: <MessageOutlined style={{ fontSize: 16, color: "#8b5cf6" }} />,
  };

  const bgMap = {
    otp: { backgroundColor: "rgba(79, 70, 229, 0.1)" },
    transactional: { backgroundColor: "rgba(6, 182, 212, 0.1)" },
    alert: { backgroundColor: "rgba(245, 158, 11, 0.1)" },
    notification: { backgroundColor: "rgba(139, 92, 246, 0.1)" },
  };

  const percentage = item.limit > 0 ? (item.used / item.limit) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="p-3 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={bgMap[item.type] || bgMap.notification}
        >
          {iconMap[item.type] || iconMap.notification}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
          <p className="text-xs text-gray-500">{item.description}</p>
        </div>
        <Tooltip title={`${item.used.toLocaleString()} / ${item.limit.toLocaleString()}`}>
          <span className="text-xs font-semibold" style={{ color: "#2563EB" }}>
            {percentage.toFixed(0)}%
          </span>
        </Tooltip>
      </div>
      <Progress
        percent={percentage}
        showInfo={false}
        strokeColor={{
          "0%": "#2563EB",
          "100%": "#1D4ED8",
        }}
        trailColor="rgba(79, 70, 229, 0.1)"
        size="small"
      />
    </motion.div>
  );
};

const UtilityWidget = ({ utilities = [], loading = false, credits = {} }) => {
  const displayUtilities = useMemo(() => {
    if (utilities.length > 0) return utilities.slice(0, 4);

    // Default sample data
    return [
      {
        id: 1,
        type: "otp",
        name: "OTP Messages",
        description: "Authentication & verification",
        used: credits.otpUsed || 2450,
        limit: credits.otpLimit || 5000,
      },
      {
        id: 2,
        type: "transactional",
        name: "Transactional",
        description: "Order updates & receipts",
        used: credits.transactionalUsed || 8200,
        limit: credits.transactionalLimit || 10000,
      },
      {
        id: 3,
        type: "alert",
        name: "Alert Messages",
        description: "Critical notifications",
        used: credits.alertUsed || 350,
        limit: credits.alertLimit || 1000,
      },
      {
        id: 4,
        type: "notification",
        name: "Service Updates",
        description: "System notifications",
        used: credits.notificationUsed || 1200,
        limit: credits.notificationLimit || 3000,
      },
    ];
  }, [utilities, credits]);

  const totalUsed = displayUtilities.reduce((sum, item) => sum + item.used, 0);
  const totalLimit = displayUtilities.reduce((sum, item) => sum + item.limit, 0);

  if (loading) {
    return (
      <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-gray-100">
                <div className="flex gap-3 mb-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded" />
              </div>
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
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}
          >
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Utility</h3>
            <p className="text-sm text-gray-500">Message usage</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold" style={{ color: "#2563EB" }}>
            {totalUsed.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">of {totalLimit.toLocaleString()}</p>
        </div>
      </div>

      {/* Utility List */}
      <div className="space-y-2">
        {displayUtilities.map((item, index) => (
          <UtilityItem key={item.id || index} item={item} index={index} />
        ))}
      </div>
    </div>
  );
};

export default UtilityWidget;

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SendOutlined,
  BellOutlined,
} from "@ant-design/icons";
import { Activity, Clock, Bell } from "lucide-react";

const ActivityItem = ({ activity, index }) => {
  const typeConfig = {
    broadcast: {
      icon: <SendOutlined style={{ fontSize: 14, color: "#2563EB" }} />,
      bgStyle: { backgroundColor: "rgba(3, 207, 101, 0.1)" },
      text: "",
    },
    success: {
      icon: <CheckCircleOutlined style={{ fontSize: 14, color: "#4338CA" }} />,
      bgStyle: { backgroundColor: "rgba(2, 184, 88, 0.1)" },
      text: "",
    },
    pending: {
      icon: <ClockCircleOutlined style={{ fontSize: 14 }} />,
      bg: "bg-amber-100",
      text: "text-amber-600",
    },
    notification: {
      icon: <BellOutlined style={{ fontSize: 14, color: "#06b6d4" }} />,
      bgStyle: { backgroundColor: "rgba(6, 182, 212, 0.1)" },
      text: "",
    },
  };

  const config = typeConfig[activity.type] || typeConfig.notification;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
    >
      {/* Icon */}
      <div
        className={`w-9 h-9 rounded-lg ${config.bg || ""} ${config.text || ""} flex items-center justify-center flex-shrink-0`}
        style={config.bgStyle || {}}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate transition-colors" style={{ "--hover-color": "#2563EB" }}>
          {activity.title}
        </p>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {activity.description}
        </p>
      </div>

      {/* Time */}
      <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
        <Clock className="w-3 h-3" />
        {activity.time}
      </div>
    </motion.div>
  );
};

const ActivityWidget = ({ activities = [], loading = false }) => {
  const displayActivities = useMemo(() => {
    if (activities.length > 0) return activities.slice(0, 4);

    return [
      {
        id: 1,
        type: "broadcast",
        title: "Broadcast Completed",
        description: "Summer Sale campaign sent to 1,250 contacts",
        time: "2m",
      },
      {
        id: 2,
        type: "success",
        title: "Template Approved",
        description: "Marketing template is now active",
        time: "15m",
      },
      {
        id: 3,
        type: "pending",
        title: "Scheduled Campaign",
        description: "SMS campaign set for 10:00 AM tomorrow",
        time: "1h",
      },
      {
        id: 4,
        type: "notification",
        title: "New Messages",
        description: "5 unread messages in Team Inbox",
        time: "2h",
      },
    ];
  }, [activities]);

  if (loading) {
    return (
      <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-36 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-9 h-9 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
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
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Activity</h3>
            <p className="text-sm text-gray-500">Recent updates</p>
          </div>
        </div>
        <button className="text-xs font-medium" style={{ color: "#2563EB" }}>
          View all
        </button>
      </div>

      {/* Activity List */}
      <div className="space-y-1 -mx-2">
        {displayActivities.map((activity, index) => (
          <ActivityItem key={activity.id || index} activity={activity} index={index} />
        ))}
      </div>
    </div>
  );
};

export default ActivityWidget;

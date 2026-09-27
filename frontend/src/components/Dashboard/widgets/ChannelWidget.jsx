import React from "react";
import { motion } from "framer-motion";
import {
  MessageOutlined,
  RightOutlined,
  CloudUploadOutlined,
  TeamOutlined,
  ToolOutlined,
  CustomerServiceOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import { Radio } from "lucide-react";

const formatCompactNumber = (value) => {
  const num = Number(value) || 0;

  if (Math.abs(num) >= 1000000) {
    const formatted = (num / 1000000).toFixed(
      Math.abs(num) >= 10000000 ? 0 : 1,
    );
    return `${formatted.replace(/\.0$/, "")}M`;
  }

  if (Math.abs(num) >= 1000) {
    const formatted = (num / 1000).toFixed(Math.abs(num) >= 100000 ? 0 : 1);
    return `${formatted.replace(/\.0$/, "")}K`;
  }

  return num.toLocaleString();
};

const ChannelCard = ({ channel, onClick, index }) => {
  // Channel-specific gradients and colors
  const channelStyles = {
    "#25D366": {
      bg: "from-emerald-500 to-green-600",
      light: "bg-emerald-50",
      text: "text-emerald-600",
    },
    "#1890FF": {
      bg: "from-blue-500 to-indigo-600",
      light: "bg-blue-50",
      text: "text-blue-600",
    },
    "#722ED1": {
      bg: "from-purple-500 to-violet-600",
      light: "bg-purple-50",
      text: "text-purple-600",
    },
    "#FF4D4F": {
      bg: "from-red-500 to-rose-600",
      light: "bg-red-50",
      text: "text-red-600",
    },
    "#13C2C2": {
      bg: "from-cyan-500 to-teal-600",
      light: "bg-cyan-50",
      text: "text-cyan-600",
    },
    "#52C41A": {
      bg: "from-lime-500 to-green-600",
      light: "bg-lime-50",
      text: "text-lime-600",
    },
    "#7C3AED": {
      bg: "from-violet-600 to-purple-700",
      light: "bg-violet-50",
      text: "text-violet-600",
    },
    "#F97316": {
      bg: "from-orange-500 to-amber-600",
      light: "bg-orange-50",
      text: "text-orange-600",
    },
  };

  const style = channelStyles[channel.color] || channelStyles["#1890FF"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative p-6 rounded-xl cursor-pointer
        bg-white border-2 border-gray-100
        hover:border-gray-200 hover:shadow-lg
        transition-all duration-300
        group
      `}
    >
      <div className="flex items-center gap-3">
        {/* Icon with gradient background */}
        <div
          className={`w-16 h-16 rounded-xl bg-gradient-to-br ${style.bg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
        >
          {React.cloneElement(channel.icon, {
            style: { fontSize: 26, color: "white" },
          })}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 
            className="font-semibold text-gray-900 text-sm leading-snug break-words whitespace-normal max-h-12 line-clamp-2"
            title={channel.title}
          >
            {channel.title}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-2xl font-bold ${style.text}`}>
              {formatCompactNumber(channel.credits)}
            </span>
            <span className="text-xs text-gray-400">credits</span>
          </div>
        </div>

        {/* Arrow */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <RightOutlined className="text-gray-400" />
        </div>
      </div>

      {/* Credit status indicator */}
      <div
        className="absolute top-2 right-2"
        title={
          channel.credits > 0 ? "Credits available" : "No credits remaining"
        }
      >
        <div
          className={`w-2 h-2 rounded-full ${
            channel.credits > 0
              ? "bg-green-500 animate-pulse"
              : "bg-red-400"
          }`}
        />
      </div>
    </motion.div>
  );
};

const UtilityCard = ({ item, index, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 + index * 0.06, duration: 0.3 }}
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="relative p-5 rounded-xl cursor-pointer bg-white border-2 border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 group"
  >
    <div className="flex items-center gap-3">
      <div
        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.bg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
      >
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 
          className="font-semibold text-gray-900 text-sm leading-snug break-words whitespace-normal line-clamp-2"
          title={item.title}
        >
          {item.title}
        </h4>
        <p className="text-xs text-gray-500 line-clamp-1 mt-1">
          {item.description}
        </p>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <RightOutlined className="text-gray-400" />
      </div>
    </div>
  </motion.div>
);

const ChannelWidget = ({
  channels = [],
  onChannelClick,
  onUtilityClick,
  loading = false,
  userRole = null,
  permissions = null,
}) => {
  const utilityItems = [
    {
      key: "file-hosting",
      title: "File Hosting",
      description: "Store and manage campaign assets",
      bg: "from-cyan-500 to-teal-600",
      icon: <CloudUploadOutlined style={{ fontSize: 24, color: "#ffffff" }} />,
      permissionKey: "file_manager",
    },
    {
      key: "manage-client",
      title: "Manage Client",
      description: "Handle accounts and permissions",
      bg: "from-amber-500 to-orange-600",
      icon: <TeamOutlined style={{ fontSize: 24, color: "#ffffff" }} />,
      permissionKey: "manage_clients",
    },
    {
      key: "voice-api",
      title: "Voice API",
      description: "Share programmatic access with your clients",
      bg: "from-violet-500 to-purple-600",
      icon: <ApiOutlined style={{ fontSize: 24, color: "#ffffff" }} />,
      permissionKey: null,
    },
    {
      key: "support",
      title: "Support",
      description: "Manage customer support tickets",
      bg: "from-blue-500 to-indigo-600",
      icon: (
        <CustomerServiceOutlined style={{ fontSize: 24, color: "#ffffff" }} />
      ),
      permissionKey: null,
      customVisible: (currentPermissions) =>
        currentPermissions?.admin_support === 1 ||
        currentPermissions?.reseller_support === 1,
    },
  ].filter((item) => {
    if (item.customVisible && permissions !== null) {
      return item.customVisible(permissions);
    }
    if (item.permissionKey && permissions !== null) {
      return permissions[item.permissionKey] === 1;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-6 bg-gray-200 rounded w-36 mt-6 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={`utility-${i}`}
                className="h-20 bg-gray-200 rounded-xl"
              />
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
            style={{
              background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
            }}
          >
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Channels</h3>
            <p className="text-sm text-gray-500">Select a channel to manage</p>
          </div>
        </div>
        <span
          className="text-xs font-medium px-3 py-1 rounded-full"
          style={{ background: "rgba(37,99,235,0.1)", color: "#1D4ED8" }}
        >
          {channels.length} active
        </span>
      </div>

      {/* Channels Grid */}
      {channels.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {channels.map((channel, index) => (
            <ChannelCard
              key={channel.key}
              channel={channel}
              index={index}
              onClick={() => onChannelClick?.(channel)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <MessageOutlined style={{ fontSize: 28, color: "#9CA3AF" }} />
          </div>
          <p className="text-gray-600 font-medium">No channels available</p>
          <p className="text-gray-400 text-sm mt-1">
            Contact your admin to enable channels
          </p>
        </div>
      )}

      {utilityItems.length > 0 && (
        <>
          {/* Utility Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                }}
              >
                <ToolOutlined style={{ fontSize: 18, color: "#ffffff" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Utility</h3>
                <p className="text-sm text-gray-500">Tools to manage operations</p>
              </div>
            </div>
          </div>

          {/* Utility Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {utilityItems.map((item, index) => (
              <UtilityCard
                key={item.key}
                item={item}
                index={index}
                onClick={() => onUtilityClick?.(item)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ChannelWidget;

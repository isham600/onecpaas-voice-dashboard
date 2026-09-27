import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HardDrive } from "lucide-react";
import { RightOutlined, CloudUploadOutlined } from "@ant-design/icons";
import { getStorageOverview } from "../../../services/api";

const StorageWidget = ({ loading = false, onNavigate }) => {
  const [storage, setStorage] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let active = true;
    getStorageOverview()
      .then((res) => {
        if (active && res?.data?.success) setStorage(res.data.data);
      })
      .catch(() => {
        // Storage overview is optional on the dashboard; fail silently
      })
      .finally(() => {
        if (active) setFetching(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading || fetching) {
    return (
      <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-28 mb-4" />
          <div className="h-10 bg-gray-200 rounded-xl mb-3" />
          <div className="h-3 bg-gray-200 rounded-full mb-3" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
      </div>
    );
  }

  if (!storage) {
    return (
      <div
        className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onNavigate?.("/dashboard/file-hosting")}
      >
        <CloudUploadOutlined style={{ fontSize: 32, color: "#9CA3AF" }} />
        <p className="text-gray-600 font-medium text-sm mt-3">File Hosting</p>
        <p className="text-gray-400 text-xs mt-1">Open file manager</p>
      </div>
    );
  }

  const pct = storage.storage?.usage_percent ?? 0;
  const isWarning = pct > 80;

  return (
    <div
      className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => onNavigate?.("/dashboard/file-hosting")}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
            }}
          >
            <HardDrive className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Storage</h3>
            <p className="text-sm text-gray-500">File hosting usage</p>
          </div>
        </div>
        <RightOutlined className="text-gray-300 group-hover:text-gray-500 transition-colors text-xs" />
      </div>

      {/* Usage */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-2xl font-bold text-gray-900">
              {storage.storage?.used_label}
            </span>
            <span className="text-sm text-gray-400 ml-1.5">
              of {storage.storage?.limit_label}
            </span>
          </div>
          <span
            className="text-sm font-bold"
            style={{ color: isWarning ? "#ef4444" : "#2563EB" }}
          >
            {pct.toFixed(1)}%
          </span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(pct, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: isWarning
                ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                : "linear-gradient(90deg, #2563EB, #1D4ED8)",
            }}
          />
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <span>
            {storage.total_files}{" "}
            {storage.total_files === 1 ? "file" : "files"} stored
          </span>
          <span>{storage.storage?.remaining_label} remaining</span>
        </div>
      </div>
    </div>
  );
};

export default StorageWidget;

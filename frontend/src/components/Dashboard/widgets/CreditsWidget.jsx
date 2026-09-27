import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOutlined } from "@ant-design/icons";
import { CreditCard, ChevronLeft, ChevronRight } from "lucide-react";

const CreditsWidget = ({ creditsData = {}, permissions = {}, loading = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const channels = [
    {
      name: "Voice 15",
      icon: <PhoneOutlined style={{ fontSize: 20, color: "white" }} />,
      value: creditsData.voice_credits || 0,
      gradient: "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)",
    },
    {
      name: "Voice 30",
      icon: <PhoneOutlined style={{ fontSize: 20, color: "white" }} />,
      value: creditsData.voice_pulse30_credits || 0,
      gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
    },
  ].filter((ch) => ch.value > 0);

  useEffect(() => {
    if (channels.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % channels.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [channels.length, isHovered]);

  const currentChannel = channels[currentIndex] || channels[0];

  if (loading) {
    return (
      <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-24 mb-4" />
          <div className="h-40 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
        <CreditCard className="w-12 h-12 text-gray-300 mb-2" />
        <p className="text-gray-500 text-sm">No credits available</p>
      </div>
    );
  }

  return (
    <div
      className="h-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}
          >
            <CreditCard className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-gray-900">Credits</h3>
        </div>
        {channels.length > 1 && (
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + channels.length) % channels.length)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % channels.length)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full rounded-xl p-4 flex items-center gap-3 min-h-[132px]"
            style={{ background: currentChannel?.gradient }}
          >
            <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
              {currentChannel?.icon}
            </div>
            <div className="min-w-0">
              <p className="text-white/85 text-base">{currentChannel?.name}</p>
              <p className="text-white text-[34px] leading-tight font-bold">
                {(currentChannel?.value || 0).toLocaleString()}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {channels.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {channels.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className="h-2 rounded-full transition-all"
              style={{
                backgroundColor: i === currentIndex ? "#2563EB" : "#d1d5db",
                width: i === currentIndex ? "0.9rem" : "0.45rem",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CreditsWidget;

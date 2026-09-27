import React from "react";
import { motion } from "framer-motion";
import WidgetSkeleton from "../common/WidgetSkeleton";

const BaseWidget = ({
  title,
  subtitle,
  icon: Icon,
  iconColor = "from-blue-500 to-blue-600",
  children,
  className = "",
  draggable = false,
  loading = false,
  skeletonType = "default",
  headerAction,
  noPadding = false,
}) => {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.003 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`
        relative
        bg-white/85
        backdrop-blur-xl
        border border-white/30
        rounded-2xl
        shadow-widget
        hover:shadow-widget-hover
        transition-all
        duration-300
        overflow-hidden
        h-full
        ${className}
      `}
    >
      {/* Gradient border effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Inner glow highlight */}
      <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />

      {/* Content */}
      <div className={`relative z-10 h-full flex flex-col ${noPadding ? "" : "p-5"}`}>
        {/* Header */}
        {(title || Icon) && (
          <div
            className={`flex items-center justify-between mb-4 ${
              draggable ? "widget-drag-handle cursor-move" : ""
            } ${noPadding ? "px-5 pt-5" : ""}`}
          >
            <div className="flex items-center space-x-3">
              {Icon && (
                <div
                  className={`w-10 h-10 bg-gradient-to-br ${iconColor} rounded-xl flex items-center justify-center shadow-lg`}
                >
                  {React.isValidElement(Icon) ? (
                    React.cloneElement(Icon, {
                      style: { fontSize: 20, color: "white" },
                    })
                  ) : (
                    <Icon style={{ fontSize: 20, color: "white" }} />
                  )}
                </div>
              )}
              {(title || subtitle) && (
                <div>
                  {title && (
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                  )}
                  {subtitle && (
                    <p className="text-sm text-gray-500">{subtitle}</p>
                  )}
                </div>
              )}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        )}

        {/* Body */}
        <div className={`flex-1 ${noPadding ? "px-5 pb-5" : ""}`}>
          {loading ? <WidgetSkeleton type={skeletonType} /> : children}
        </div>
      </div>
    </motion.div>
  );
};

export default BaseWidget;

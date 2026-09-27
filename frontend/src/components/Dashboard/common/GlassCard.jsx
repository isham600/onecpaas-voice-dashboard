import React, { useState } from "react";
import { motion } from "framer-motion";

const GlassCard = ({
  children,
  className = "",
  hover = true,
  glow = false,
  gradient = true,
  padding = "p-5",
  onClick,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.005 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`
        relative
        bg-white/80
        backdrop-blur-xl
        border border-white/20
        rounded-2xl
        shadow-lg
        hover:shadow-xl
        transition-all
        duration-300
        overflow-hidden
        ${hover ? "hover:border-white/40 hover:bg-white/90" : ""}
        ${isHovered && glow ? "shadow-2xl shadow-blue-500/10" : ""}
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        background:
          hover && isHovered
            ? "linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)"
            : "linear-gradient(145deg, rgba(255,255,255,0.85) 0%, rgba(248,250,252,0.75) 100%)",
      }}
      {...props}
    >
      {/* Gradient border effect on hover */}
      {gradient && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}

      {/* Inner glow highlight */}
      <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />

      {/* Content */}
      <div className={`relative z-10 h-full ${padding}`}>{children}</div>
    </motion.div>
  );
};

export default GlassCard;

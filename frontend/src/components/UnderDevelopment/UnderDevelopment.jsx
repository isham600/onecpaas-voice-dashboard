// src/components/UnderDevelopment/UnderDevelopment.jsx
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  RocketOutlined,
  HomeOutlined,
  ToolOutlined,
  CodeOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
};

// Floating particles animation
const FloatingParticle = ({ delay, duration, x, y, size }) => (
  <motion.div
    className="absolute rounded-full opacity-20"
    style={{
      background: THEME.gradient,
      width: size,
      height: size,
      left: x,
      top: y,
    }}
    animate={{
      y: [0, -30, 0],
      x: [0, 15, 0],
      scale: [1, 1.2, 1],
      opacity: [0.2, 0.4, 0.2],
    }}
    transition={{
      duration: duration,
      delay: delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Animated gear/cog component
const AnimatedGear = ({ size, delay, reverse }) => (
  <motion.div
    animate={{ rotate: reverse ? -360 : 360 }}
    transition={{
      duration: 8,
      delay: delay,
      repeat: Infinity,
      ease: "linear",
    }}
    style={{ width: size, height: size }}
    className="text-emerald-500/30"
  >
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z" />
    </svg>
  </motion.div>
);

// Progress bar animation
const ProgressBar = () => (
  <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
    <motion.div
      className="h-full rounded-full"
      style={{ background: THEME.gradient }}
      initial={{ width: "0%" }}
      animate={{ width: "70%" }}
      transition={{
        duration: 2,
        delay: 0.5,
        ease: "easeOut",
      }}
    />
  </div>
);

// Feature card component
const FeatureCard = ({ icon, title, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ scale: 1.05, y: -5 }}
    className="flex flex-col items-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow"
  >
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
      style={{ background: `${THEME.primary}15` }}
    >
      {icon}
    </div>
    <span className="text-sm font-medium text-gray-700">{title}</span>
  </motion.div>
);

const UnderDevelopment = () => {
  const particles = [
    { delay: 0, duration: 4, x: "10%", y: "20%", size: 60 },
    { delay: 1, duration: 5, x: "80%", y: "15%", size: 40 },
    { delay: 2, duration: 4.5, x: "70%", y: "70%", size: 50 },
    { delay: 0.5, duration: 5.5, x: "20%", y: "75%", size: 35 },
    { delay: 1.5, duration: 4, x: "85%", y: "45%", size: 45 },
    { delay: 2.5, duration: 5, x: "5%", y: "50%", size: 55 },
  ];

  const features = [
    {
      icon: <CodeOutlined style={{ fontSize: 24, color: THEME.primary }} />,
      title: "Clean Code",
    },
    {
      icon: <ThunderboltOutlined style={{ fontSize: 24, color: THEME.primary }} />,
      title: "Fast Performance",
    },
    {
      icon: <ToolOutlined style={{ fontSize: 24, color: THEME.primary }} />,
      title: "New Features",
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100">
      {/* Background particles */}
      {particles.map((particle, index) => (
        <FloatingParticle key={index} {...particle} />
      ))}

      {/* Animated gears in background */}
      <div className="absolute top-10 right-10 opacity-50">
        <AnimatedGear size={80} delay={0} reverse={false} />
      </div>
      <div className="absolute bottom-20 left-10 opacity-50">
        <AnimatedGear size={60} delay={0.5} reverse={true} />
      </div>
      <div className="absolute top-1/3 left-20 opacity-30">
        <AnimatedGear size={40} delay={1} reverse={false} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Animated rocket icon */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <motion.div
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative"
          >
            {/* Glow effect */}
            <div
              className="absolute inset-0 blur-2xl opacity-40 rounded-full"
              style={{ background: THEME.gradient }}
            />
            <div
              className="relative w-28 h-28 rounded-full flex items-center justify-center"
              style={{ background: THEME.gradient }}
            >
              <RocketOutlined
                style={{ fontSize: 56, color: "white" }}
                className="transform -rotate-45"
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 text-center"
        >
          Page Under{" "}
          <span
            style={{
              background: THEME.gradient,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Development
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg md:text-xl text-gray-600 mb-6 text-center max-w-md"
        >
          We're working hard to bring you this page. Stay tuned!
        </motion.p>

        {/* Progress indicator */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center gap-2 mb-8"
        >
          <span className="text-sm text-gray-500 font-medium">
            Building something amazing...
          </span>
          <ProgressBar />
          <span className="text-xs text-gray-400">70% Complete</span>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-3 gap-4 mb-10 max-w-md"
        >
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} delay={0.6 + index * 0.1} />
          ))}
        </motion.div>

        {/* Back button */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Link to="/">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(3, 207, 101, 0.3)" }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center h-12 w-12 text-white font-semibold rounded-xl shadow-lg transition-all"
              style={{ background: THEME.gradient }}
            >
              <HomeOutlined style={{ fontSize: 18 }} />
            </motion.button>
          </Link>
        </motion.div>

        {/* Decorative bottom wave */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden">
          <svg
            viewBox="0 0 1440 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full"
          >
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2, delay: 0.5 }}
              d="M0 120L60 105C120 90 240 60 360 52.5C480 45 600 60 720 67.5C840 75 960 75 1080 67.5C1200 60 1320 45 1380 37.5L1440 30V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill={`${THEME.primary}15`}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default UnderDevelopment;

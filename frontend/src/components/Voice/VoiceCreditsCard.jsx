import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Skeleton, Tooltip, Progress } from "antd";
import {
  InfoCircleOutlined,
  ArrowUpOutlined,
  WalletOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Phone, TrendingUp } from "lucide-react";
import { getProfileMe } from "../../services/api";

// Theme colors - matching SMS/WhatsApp/GSM standardized blue
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight: "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.04) 100%)",
};

const CountUpNumber = ({ value, duration = 1500 }) => {
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
      // Round (not floor) to 2dp — Voice 30's half-credit refunds mean this
      // can be a fractional balance like 10.5, which Math.floor would round
      // all the way down to 10.
      setDisplayValue(Math.round(easeOut * value * 100) / 100);
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>;
};

const CreditTypeCard = ({ type, credits, total, icon: Icon, color, delay = 0 }) => {
  const percentage = total > 0 ? Math.min((credits / total) * 100, 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="relative overflow-hidden rounded-xl p-4"
      style={{
        background: `linear-gradient(135deg, ${color}08 0%, ${color}03 100%)`,
        border: `1px solid ${color}20`,
      }}
    >
      <div
        className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-20"
        style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${color}15` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {type}
            </span>
          </div>
          <Tooltip title={`${percentage.toFixed(1)}% of allocation`}>
            <div
              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: `${color}15`, color }}
            >
              {percentage.toFixed(0)}%
            </div>
          </Tooltip>
        </div>

        <div className="mb-2">
          <span className="text-2xl font-bold text-gray-900">
            <CountUpNumber value={credits} />
          </span>
          <span className="text-xs text-gray-400 ml-1">credits</span>
        </div>

        <Progress
          percent={percentage}
          showInfo={false}
          strokeColor={{ "0%": color, "100%": `${color}99` }}
          trailColor={`${color}10`}
          size="small"
          strokeWidth={6}
          style={{ marginBottom: 0 }}
        />
      </div>
    </motion.div>
  );
};

const VoiceCreditsCard = ({ user, refreshCredits, pulse30 = false }) => {
  const [voiceCredits, setVoiceCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const creditField = pulse30 ? "voice_pulse30_credits" : "voice_credits";
  const label = pulse30 ? "Voice 30" : "Voice 15";

  const fetchCreditsData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setIsRefreshing(!showLoader);

    try {
      const response = await getProfileMe();
      const credits = response?.data?.data?.credits;

      if (credits) {
        setVoiceCredits(credits[creditField] || 0);
        setError(null);
      } else {
        setError("Failed to load credits");
      }
    } catch (err) {
      setError("Failed to fetch credits");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.username) fetchCreditsData();
  }, [user, refreshCredits, creditField]);

  const handleRefresh = () => fetchCreditsData(false);

  const maxCredits = useMemo(
    () => Math.max(voiceCredits * 1.5, 10000),
    [voiceCredits],
  );

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-red-100"
      >
        <div className="flex items-center gap-3 text-red-500">
          <InfoCircleOutlined />
          <span className="text-sm">{error}</span>
          <button
            onClick={handleRefresh}
            className="ml-auto text-xs font-medium text-red-500 hover:text-red-600"
          >
            Retry
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
      style={{ boxShadow: "0 4px 20px rgba(37, 99, 235, 0.08), 0 1px 3px rgba(0,0,0,0.05)" }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          background: THEME.gradientLight,
          borderBottom: "1px solid rgba(37,99,235,0.1)",
        }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: THEME.gradient, boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
          >
            <WalletOutlined style={{ fontSize: 20, color: "white" }} />
          </motion.div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{label} Credits</h3>
            <p className="text-xs text-gray-500">Available balance</p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: "rgba(37,99,235,0.1)" }}
        >
          <ReloadOutlined style={{ color: THEME.primary, fontSize: 14 }} spin={isRefreshing} />
        </motion.button>
      </div>

      {/* Content */}
      <div className="p-5">
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton.Avatar active size={48} shape="square" />
              <div className="flex-1">
                <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 8 }} />
                <Skeleton.Input active size="large" style={{ width: 150 }} />
              </div>
            </div>
            <Skeleton.Button active style={{ width: "100%", height: 100 }} />
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-5 py-4 rounded-xl relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #f8fdfb 0%, #f0fdf4 100%)" }}
            >
              <div
                className="absolute -left-6 -top-6 w-16 h-16 rounded-full"
                style={{ background: "rgba(37,99,235,0.1)" }}
              />
              <div
                className="absolute -right-4 -bottom-4 w-12 h-12 rounded-full"
                style={{ background: "rgba(37,99,235,0.08)" }}
              />

              <div className="relative z-10">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Total Available
                </p>
                <div className="flex items-center justify-center gap-2">
                  <motion.span
                    className="text-4xl font-bold"
                    style={{ color: THEME.primaryDark }}
                  >
                    <CountUpNumber value={voiceCredits} />
                  </motion.span>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                    style={{ background: "rgba(37,99,235,0.15)", color: THEME.primary }}
                  >
                    <TrendingUp className="w-3 h-3" />
                    Active
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <CreditTypeCard
              type={label}
              credits={voiceCredits}
              total={maxCredits}
              icon={Phone}
              color={THEME.primary}
              delay={0.3}
            />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 pt-4 flex items-center justify-between text-xs"
              style={{ borderTop: "1px dashed rgba(37,99,235,0.2)" }}
            >
              <div className="flex items-center gap-1.5 text-gray-500">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: THEME.primary }}
                />
                <span>Real-time balance</span>
              </div>
              <Tooltip title="Buy more credits">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{ background: THEME.gradient, color: "white" }}
                >
                  <ArrowUpOutlined style={{ fontSize: 10 }} />
                  Top Up
                </motion.button>
              </Tooltip>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default VoiceCreditsCard;

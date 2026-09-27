import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Layout, Typography, Button, Skeleton, Tooltip, message } from "antd";

import {
  WhatsAppOutlined,
  MessageOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
  SunOutlined,
  MoonOutlined,
  CloudOutlined,
  CustomerServiceOutlined,
  MobileOutlined,
} from "@ant-design/icons";

import { motion } from "framer-motion";
import { AppContext } from "../../utils/Context";
import { fbUserData, metaAction, getProfileMe } from "../../services/api";
import handleApiError from "../../utils/errorHandler";

// Dashboard Components
import BentoGrid from "../../components/Dashboard/BentoGrid";
import BentoCell from "../../components/Dashboard/BentoGrid/BentoCell";
import GlassCard from "../../components/Dashboard/common/GlassCard";
import {
  StatWidget,
  ChannelWidget,
  CreditsWidget,
  RadialCreditsWidget,
  ActivityWidget,
  ChartWidget,
  ApiConfigWidget,
  StorageWidget,
} from "../../components/Dashboard/widgets";

import Navbar from "../../components/Navbar/DashboardNavbar.jsx";

const { Content } = Layout;
const { Text } = Typography;

// Modern Greeting Component with Fresh Design
const ModernGreeting = ({ userData }) => {
  const [time, setTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [greetingIcon, setGreetingIcon] = useState(null);
  const [greetingColor, setGreetingColor] = useState("#f59e0b");

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = time.getHours();
    if (hour < 12) {
      setGreeting("Good morning");
      setGreetingIcon(
        <CloudOutlined style={{ fontSize: 28, color: "#f59e0b" }} />,
      );
      setGreetingColor("#f59e0b");
    } else if (hour < 17) {
      setGreeting("Good afternoon");
      setGreetingIcon(
        <SunOutlined style={{ fontSize: 28, color: "#f97316" }} />,
      );
      setGreetingColor("#f97316");
    } else {
      setGreeting("Good evening");
      setGreetingIcon(
        <MoonOutlined style={{ fontSize: 28, color: "#3B82F6" }} />,
      );
      setGreetingColor("#3B82F6");
    }
  }, [time]);

  const getDayName = () => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[time.getDay()];
  };

  const getMonthName = () => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return months[time.getMonth()];
  };

  return (
    <div className="relative overflow-hidden">
      {/* Decorative Background Elements - Green Theme */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#2563EB]/20 to-[#3B82F6]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#2563EB]/15 to-emerald-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left Section - Greeting */}
        <div className="flex items-center space-x-4">
          {/* Avatar with Green Gradient Ring */}
          <motion.div
            initial={{ scale: 0.9, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="relative"
          >
            <div
              className="w-16 h-16 rounded-2xl p-[3px] shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, #2563EB 0%, #4338CA 50%, #3B82F6 100%)",
              }}
            >
              <div className="w-full h-full bg-white rounded-[13px] flex items-center justify-center">
                {greetingIcon}
              </div>
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #4338CA 100%)",
              }}
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </motion.div>

          {/* Text Content */}
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl lg:text-3xl font-bold text-gray-900"
            >
              {greeting},{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #4338CA 100%)",
                }}
              >
                {userData?.username}
              </span>
              !
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-500 mt-1"
            >
              Your Activity at a Glance
            </motion.p>
          </div>
        </div>

        {/* Right Section - Date & Time */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3"
        >
          {/* Date Card - Green Theme */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 shadow-sm">
            <div
              className="flex flex-col items-center px-3 py-1 rounded-lg text-white"
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
              }}
            >
              <span className="text-xs font-medium uppercase">
                {getMonthName()}
              </span>
              <span className="text-lg font-bold leading-tight">
                {time.getDate()}
              </span>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">
                {getDayName()}
              </p>
              <p className="text-xs text-gray-500">{time.getFullYear()}</p>
            </div>
          </div>

          {/* Time Badge - Green Theme */}
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl border"
            style={{
              background:
                "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(29,78,216,0.08) 100%)",
              borderColor: "rgba(37,99,235,0.2)",
            }}
          >
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: "#2563EB" }}
            />
            <span
              className="font-mono text-sm font-semibold"
              style={{ color: "#1D4ED8" }}
            >
              {time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(null);
  const [admin, setAdmin] = useState(true);
  const { user, updateUser } = React.useContext(AppContext);

  const [accountType, setAccountType] = useState(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [userStatus, setUserStatus] = useState(null);
  const [hasToastShown, setHasToastShown] = useState(false);
  const [userHealthData, setUserHealthData] = useState(null);
  const [metaLogin, setMetaLogin] = useState(1);

  const [creditsData, setCreditsData] = useState({
    email_credits: 0,
    sms_credits: 0,
    gsm_credits: 0,
    voice_credits: 0,
    voice_pulse30_credits: 0,
    ai_videos_credits: 0,
    whatsapp_credits: 0,
    rcs_credits: 0,
    numbers_credits: 0,
    whatsapp_utility_credits: 0,
    whatsapp_marketing_credits: 0,
    bulk_whatsapp_credits: 0,
    international_bulk_whatsapp_credits: 0,
    action_button_credits: 0,
    branded_whatsapp_credits: 0,
    unbranded_whatsapp_credits: 0,
  });

  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const isRestrictedRole = userRole === "agent" || userRole === "supervisor";
  const isDataLoading = loading || roleLoading;

  // Configure message global settings
  message.config({
    top: 70,
    duration: 3,
    maxCount: 3,
  });

  // Fetch user role
  const fetchUserRole = async () => {
    if (!user?.username) {
      setRoleLoading(false);
      return;
    }

    if (user.role) {
      setUserRole(user.role);
      setRoleLoading(false);
      return;
    }

    try {
      const response = await getProfileMe();

      if (response.data?.data?.user?.role) {
        const role = response.data.data.user.role;
        setUserRole(role);
        updateUser({ ...user, role });
      } else {
        setUserRole(null);
      }
    } catch {
      setUserRole(null);
    } finally {
      setRoleLoading(false);
    }
  };

  // Get user status
  const getUserStatus = async () => {
    const payload = { username: user?.username };

    try {
      const response = await fbUserData(payload);
      return response.data;
    } catch {
      return null;
    }
  };

  // Handle user status
  const handleUserStatus = async () => {
    const statusData = await getUserStatus();

    if (!statusData) {
      return;
    }

    const { message: metaMessage, meta_status } = statusData;
    setUserStatus(meta_status);

    if (!hasToastShown) {
      switch (meta_status) {
        case "incomplete":
        case "pending":
          message.info(metaMessage);
          setHasToastShown(true);
          break;
        case "complete":
          setUserHealthData(statusData.data);
          break;
        default:
          message.error("Unknown account status. Please contact support.");
      }
    }
  };

  // Facebook login flow
  const facebookLogin = () => {
    const facebookLoginUrl = `https://www.facebook.com/login.php?skip_api_login=1&api_key=1078110802886723&kid_directed_site=0&app_id=1078110802886723&signed_next=1&next=https%3A%2F%2Fwww.facebook.com%2Fv19.0%2Fdialog%2Foauth%3Fapp_id%3D1078110802886723%26cbt%3D1735130660681%26channel_url%3Dhttps%253A%252F%252Fstaticxx.facebook.com%252Fx%252Fconnect%252Fxd_arbiter%252F%253Fversion%253D46%2523cb%253Df42a29839f5a50060%2526domain%253Dwabsp.nuke.co.in%2526is_canvas%253Dfalse%2526origin%253Dhttps%25253A%25252F%25252Fwabsp.nuke.co.in%25252Ff50261b2d5aab03aa%2526relation%253Dopener%26client_id%3D1078110802886723%26config_id%3D3912498678997189%26display%3Dpopup%26domain%3Dwabsp.nuke.co.in%26e2e%3D%257B%257D%26extras%3D%257B%2522feature%2522%253A%2522whatsapp_embedded_signup%2522%252C%2522sessionInfoVersion%2522%253A2%252C%2522version%2522%253A2%252C%2522setup%2522%253A%257B%257D%257D%26fallback_redirect_uri%3Dhttps%253A%252F%252Fwabsp.nuke.co.in%252Fwithout-bsp%252Findex.php%26locale%3Den_US%26logger_id%3Df63246e489f2ea4f0%26origin%3D1%26override_default_response_type%3Dtrue%26redirect_uri%3Dhttps%253A%252F%252Fstaticxx.facebook.com%252Fx%252Fconnect%252Fxd_arbiter%252F%253Fversion%253D46%2523cb%253Dfc53217c28e748512%2526domain%253Dwabsp.nuke.co.in%2526is_canvas%253Dfalse%2526origin%253Dhttps%25253A%25252F%25252Fwabsp.nuke.co.in%25252Ff50261b2d5aab03aa%2526relation%253Dopener%2526frame%253Df24001707e47f0d04%26response_type%3Dcode%26sdk%3Djoey%26version%3Dv19.0%26ret%3Dlogin%26fbapp_pres%3D0%26tp%3Dunspecified&cancel_url=https%3A%2F%2Fstaticxx.facebook.com%2Fx%2Fconnect%2Fxd_arbiter%2F%3Fversion%3D46%23cb%3Dfc53217c28e748512%26domain%3Dwabsp.nuke.co.in%26is_canvas%3Dfalse%26origin%3Dhttps%253A%252F%252Fwabsp.nuke.co.in%252Ff50261b2d5aab03aa%26relation%3Dopener%26frame%3Df24001707e47f0d04%26error%3Daccess_denied%26error_code%3D200%26error_description%3DPermissions%2Berror%26error_reason%3Duser_denied&display=popup&locale=hi_IN&pl_dbl=0&config_id=3912498678997189`;

    const width = 500;
    const height = 600;
    const left = (window.outerWidth - width) / 2 + window.screenX;
    const top = (window.outerHeight - height) / 2 + window.screenY;

    const popup = window.open(
      facebookLoginUrl,
      "_blank",
      `width=${width},height=${height},top=${top},left=${left}`,
    );

    const interval = setInterval(() => {
      try {
        if (popup.location.href?.includes("code=")) {
          const params = new URLSearchParams(
            new URL(popup.location.href).search,
          );
          const authCode = params.get("code");
          popup.close();
          clearInterval(interval);
          facebookMetaAction(authCode);
        }
      } catch {
        // Handle cross-origin errors
      }
    }, 1000);
  };

  const facebookMetaAction = async (authCode) => {
    const payload = {
      username: user?.username,
      authCode,
      is_success: true,
    };

    try {
      const response = await metaAction(payload);
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  };

  // Fetch all profile data (permissions, credits, account type) from single API
  const fetchProfileData = useCallback(async () => {
    if (!user?.username) return;

    try {
      const response = await getProfileMe();
      const data = response?.data?.data;

      if (data?.permissions) {
        setPermissions(data.permissions);
        setMetaLogin(data.permissions.metalogin ?? 1);
        updateUser({ ...user, permissions: data.permissions });
      }

      if (data?.credits) {
        const c = data.credits;
        setCreditsData({
          email_credits: c.email_credits || 0,
          sms_credits: c.sms_credits || 0,
          gsm_credits: c.gsm_credits || 0,
          gsm_sim_credit: c.gsm_sim_credit || 0,
          voice_credits: c.voice_credits || 0,
          voice_pulse30_credits: c.voice_pulse30_credits || 0,
          whatsapp_credits: c.whatsapp_credits || 0,
          rcs_credits: c.rcs_credits || 0,
          numbers_credits: 0,
          whatsapp_utility_credits: c.whatsapp_utility_credits || 0,
          whatsapp_marketing_credits: c.whatsapp_marketing_credits || 0,
          bulk_whatsapp_credits: c.bulk_whatsapp_credits || 0,
          international_bulk_whatsapp_credits: c.international_bulk_whatsapp_credits || 0,
          action_button_credits: c.action_button_credits || 0,
          branded_whatsapp_credits: c.branded_whatsapp_credits || 0,
          unbranded_whatsapp_credits: c.unbranded_whatsapp_credits || 0,
          unofficial_whatsapp_credits: c.unofficial_whatsapp_credits || 0,
          ai_videos_credits: c.ai_videos_credits || 0,
        });
      }

      if (data?.account) {
        setAccountType(data.account.account_type || "unknown");
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
      setAccountLoading(false);
    }
  }, [user?.username]);

  // Initial data fetch
  useEffect(() => {
    const btnData = localStorage.getItem("adminUserButton");
    setAdmin(btnData);

    handleUserStatus();
    fetchProfileData();
    fetchUserRole();

    setTimeout(() => setLoading(false), 1000);
  }, [user?.username]);

  // Navigation handler
  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
    },
    [navigate],
  );

  // Admin switch handler
  const handleAdminClick = useCallback(() => {
    localStorage.setItem("adminUserButton", 0);
    const admin = localStorage.getItem("adminUser");
    if (admin) updateUser(JSON.parse(admin));
    message.info("Switched to Admin Panel");
  }, [updateUser]);

  // Build channel cards data
  const channelCards = useMemo(() => {
    const baseChannels = [
      {
        key: "voice_credits",
        icon: <PhoneOutlined />,
        title: "Voice 15",
        onClick: () => handleNavigate("/dashboard/voice/broadcast"),
        color: "#722ED1",
        credits: creditsData.voice_credits || 0,
      },
      {
        key: "voice_pulse30",
        icon: <PhoneOutlined />,
        title: "Voice 30",
        onClick: () => handleNavigate("/dashboard/voice/broadcast?pulse30=1"),
        color: "#9333EA",
        credits: creditsData.voice_pulse30_credits || 0,
      },
    ];

    return baseChannels;
  }, [handleNavigate, creditsData]);

  // Filter channels based on permissions
  const filteredChannels = useMemo(() => {
    if (!permissions) return [];

    return channelCards.filter((channel) => permissions[channel.key] > 0);
  }, [permissions, channelCards]);

  // Channel comparison data for chart
  const channelComparisonData = useMemo(() => {
    return filteredChannels.map((ch) => ({
      name: ch.title,
      value: ch.credits,
      color: ch.color,
    }));
  }, [filteredChannels]);

  // Handle channel click
  const handleChannelClick = useCallback((channel) => {
    channel.onClick?.();
  }, []);

  // Handle utility click
  const handleUtilityClick = useCallback(
    (utility) => {
      const utilityRoutes = {
        "file-hosting": "/dashboard/file-hosting",
        "manage-client": "/dashboard/management/clients",
        "voice-api": "/dashboard/api",
        support: "/dashboard/clientSupport",
      };

      const path = utilityRoutes[utility?.key];
      if (path) handleNavigate(path);
    },
    [handleNavigate],
  );

  return (
    <Layout style={{ minHeight: "100vh" }} className="relative">
      {/* Fresh Background Gradient */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 25%, #e2e8f0 50%, #f8fafc 75%, #f1f5f9 100%)",
        }}
      />
      {/* Decorative Background Shapes - Green Theme */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(29,78,216,0.1) 100%)",
          }}
        />
        <div
          className="absolute top-1/3 right-0 w-80 h-80 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(37,99,235,0.12) 0%, rgba(2,184,88,0.08) 100%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(29,78,216,0.15) 0%, rgba(37,99,235,0.1) 100%)",
          }}
        />
      </div>

      <Navbar user={user} setUser={updateUser} />

      <Content className="p-4 lg:p-6 relative z-10">
        <div className="max-w-[1400px] mx-auto">
          {/* Greeting Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6 p-6 bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50 shadow-lg shadow-gray-200/50">
              {isDataLoading ? (
                <Skeleton active paragraph={{ rows: 2 }} />
              ) : (
                <>
                  <ModernGreeting userData={user} />

                  {admin == 1 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4 pt-4 border-t border-gray-100"
                    >
                      <Button
                        type="primary"
                        danger
                        onClick={handleAdminClick}
                        className="flex items-center gap-2"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        End Impersonation
                      </Button>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* Bento Grid Dashboard */}
          <BentoGrid>
            {/* Channels Widget */}
            <BentoCell size="hero">
              <ChannelWidget
                channels={filteredChannels}
                onChannelClick={handleChannelClick}
                onUtilityClick={handleUtilityClick}
                loading={isDataLoading}
                userRole={userRole}
                permissions={permissions}
              />
            </BentoCell>
            {/* <BentoCell size="wide">
              <ChannelWidget
                channels={filteredChannels}
                onChannelClick={handleChannelClick}
                loading={isDataLoading}
              />
              
            </BentoCell> */}

            {/* Credits Widget - 1x1 */}
            <BentoCell size="standard">
              <CreditsWidget
                creditsData={creditsData}
                permissions={permissions}
                loading={isDataLoading}
              />
            </BentoCell>

            {/* Radial Credit Chart Widget - 1x1 */}
            <BentoCell size="standard">
              <RadialCreditsWidget
                creditsData={creditsData}
                permissions={permissions}
                loading={isDataLoading}
              />
            </BentoCell>

            {permissions?.file_manager === 1 && (
              <BentoCell size="standard">
                <StorageWidget
                  loading={isDataLoading}
                  onNavigate={handleNavigate}
                />
              </BentoCell>
            )}

            {/* API Configuration Widget - 2x1 */}
            <BentoCell size="wide">
              <ApiConfigWidget loading={isDataLoading} />
            </BentoCell>
          </BentoGrid>
        </div>
      </Content>

      <motion.div
        animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "rgba(99,102,241,0.35)",
          zIndex: 999,
          pointerEvents: "none",
        }}
      />

      <Tooltip title="Support" placement="left">
        <motion.button
          type="button"
          onClick={() => navigate("/dashboard/support")}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 18,
            delay: 0.3,
          }}
          whileHover={{
            scale: 1.12,
            boxShadow: "0 8px 32px rgba(99,102,241,0.7)",
          }}
          whileTap={{ scale: 0.93 }}
          style={{
            position: "fixed",
            bottom: 32,
            right: 32,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(99,102,241,0.5)",
            zIndex: 1000,
          }}
        >
          <CustomerServiceOutlined style={{ fontSize: 24, color: "#ffffff" }} />
        </motion.button>
      </Tooltip>
    </Layout>
  );
};

export default React.memo(Dashboard);

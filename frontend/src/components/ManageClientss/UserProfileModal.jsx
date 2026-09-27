import { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import {
  Input,
  Button,
  Checkbox,
  Typography,
  Tag,
  Divider,
  message,
  Avatar,
  Tabs,
  DatePicker,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  LockOutlined,
  SaveOutlined,
  CloseOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  WifiOutlined,
  CheckCircleOutlined,
  EditOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import Modal from "../Modal/index";
import ChangePasswordModal from "../ChangePasswordModal";

import {
  clientGetById,
  clientUpdate,
  clientUpdatePermissions,
  clientGetPermissions,
  clientUpdateExpiry,
  getProfileMe,
} from "../../services/api";

import { AppContext } from "../../utils/Context";
import handleApiError from "../../utils/errorHandler";
import CallFallback from "../../containers/Profile/YourIntegration/CallFallback/index";
import VoiceRouteTab from "./VoiceRouteTab";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

// Section Header Component
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-4">
    <motion.div
      whileHover={{ scale: 1.05, rotate: 5 }}
      className="w-9 h-9 rounded-lg flex items-center justify-center"
      style={{
        background: THEME.gradient,
        boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
      }}
    >
      <Icon style={{ color: "white", fontSize: 16 }} />
    </motion.div>
    <div>
      <Text strong style={{ color: "#1f2937", fontSize: 14 }}>
        {title}
      </Text>
      {subtitle && (
        <Text className="text-xs text-gray-500 block">{subtitle}</Text>
      )}
    </div>
  </div>
);

// Info Card Component
const InfoCard = ({ icon: Icon, label, value, color = THEME.primary }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-3 p-3 rounded-xl"
    style={{
      background: `${color}08`,
      border: `1px solid ${color}20`,
    }}
  >
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ background: `${color}15` }}
    >
      <Icon style={{ color, fontSize: 14 }} />
    </div>
    <div className="flex-1 min-w-0">
      <Text className="text-xs text-gray-500 block">{label}</Text>
      <Text
        strong
        className="text-sm truncate block"
        style={{ color: "#1f2937" }}
      >
        {value || "N/A"}
      </Text>
    </div>
  </motion.div>
);


const UserProfileModal = ({
  open,
  handleClose,
  client_username,
  firstName: initialFirstName,
  lastName: initialLastName,
  clientEmail: initialClientEmail,
  clientMobileNo,
  user_type,
  country,
  id,
}) => {
  const [firstName, setFirstName] = useState(initialFirstName || "");
  const [lastName, setLastName] = useState(initialLastName || "");
  const [email, setEmail] = useState(initialClientEmail || "");
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [sendServices, setSendServices] = useState({
    Whatsapp_marketing: 0,
    whatsapp_utility: 0,
    branded_whatsapp: 0,
    unbranded_whatsapp: 0,
    broadcast_masterreseller: 0,
    broadcast_masterreseller_csv: 0,
    sms_credits: 0,
    open_sms_template: 0,
    can_create_smpp_gateway: 0,
    sms_admin: 0,
    voice_credits: 0,
    voice_pulse30: 0,
    voice_partial_refund: 0,
    voice_call_fallback_notify: 0,
    voice_routes: 0,
    rcs_credits: 0,
    gsm_credits: 0,
    Credit_SIM_line: 0,
    Credit_SIM_GSM: 0,
    gsmcredituser: 1,
    ai_videos_credits: 0,
    unofficial_whatsapp_add_button: 0,
    can_create_reseller: 0,
    reseller_setting: 0,
    your_integration: 0,
    manage_clients: 0,
    invoice: 0,
    invoice_create: 0,
    billing: 0,
    url_shortener: 0,
    file_manager: 0,
    google_integration: 0,
    can_access_report: 0,
  });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState({});
  const [accountExpiry, setAccountExpiry] = useState(null);
  const [quickInfo, setQuickInfo] = useState({
    lastVisit: "Loading...",
    registration: "Loading...",
    lastIpAddress: "Loading...",
  });

  const { user, reload, setReload } = useContext(AppContext);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date)) return "N/A";
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  useEffect(() => {
    if (open) {
      fetchQuickInfo();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setFirstName(initialFirstName || "");
      setLastName(initialLastName || "");
      setEmail(initialClientEmail || "");
      fetchQuickInfo();
    }
  }, [open, initialFirstName, initialLastName, initialClientEmail]);

  const fetchQuickInfo = async () => {
    try {
      const [clientResponse, permissionsResponse] = await Promise.all([
        clientGetById(id),
        clientGetPermissions(id),
      ]);

      const data = clientResponse?.data?.data || {};
      setQuickInfo({
        lastVisit: data.last_login?.last_login_at || "N/A",
        registration: data.created_at || "N/A",
        lastIpAddress: data.last_login?.ip_address || "N/A",
      });

      // Set account expiry
      if (data.expiry) {
        setAccountExpiry(dayjs(data.expiry));
      }

    } catch (error) {
      handleApiError(error);
    }
  };

  const handleSaveProfile = async () => {
    if (
      firstName === initialFirstName &&
      lastName === initialLastName &&
      email === initialClientEmail
    ) {
      message.info("No changes to save.");
      return;
    }

    setLoadingProfile(true);
    try {
      await clientUpdate(id, {
        first_name: firstName,
        last_name: lastName,
        client_email: email,
      });
      message.success("Profile updated successfully!");
      setReload((prev) => !prev);
      handleClose();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    const statusData = async () => {
      try {
        const statusResponse = await getProfileMe();
        const statusData = statusResponse?.data?.data?.permissions || {};
        setUserPermissions(statusData);
      } catch (error) {
        handleApiError(error);
      }
    };
    statusData();
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await clientGetById(id);
        const perms = response?.data?.data?.permissions || {};
        setSendServices({
          Whatsapp_marketing: perms.Whatsapp_marketing || 0,
          whatsapp_utility: perms.whatsapp_utility || 0,
          bulk_whatsapp: perms.bulk_whatsapp || 0,
          international_bulk_whatsapp: perms.international_bulk_whatsapp || 0,
          action_button: perms.action_button || 0,
          branded_whatsapp: perms.branded_whatsapp || 0,
          unbranded_whatsapp: perms.unbranded_whatsapp || 0,
          broadcast_masterreseller: perms.broadcast_masterreseller || 0,
          broadcast_masterreseller_csv: perms.broadcast_masterreseller_csv || 0,
          sms_credits: perms.sms_credits || 0,
          open_sms_template: perms.open_sms_template || 0,
          can_create_smpp_gateway: perms.can_create_smpp_gateway || 0,
          sms_admin: perms.sms_admin || 0,
          voice_credits: perms.voice_credits || 0,
          voice_pulse30: perms.voice_pulse30 || 0,
          voice_partial_refund: perms.voice_partial_refund || 0,
          voice_call_fallback_notify: perms.voice_call_fallback_notify || 0,
          voice_routes: perms.voice_routes || 0,
          rcs_credits: perms.rcs_credits || 0,
          gsm_credits: perms.gsm_credits || 0,
          Credit_SIM_line: perms.Credit_SIM_line || 0,
          Credit_SIM_GSM: perms.Credit_SIM_GSM || 0,
          gsmcredituser: perms.gsmcredituser ?? 1,
          ai_videos_credits: perms.ai_videos_credits || 0,
          unofficial_whatsapp_add_button: perms.unofficial_whatsapp_add_button || 0,
          can_create_reseller: perms.can_create_reseller || 0,
          reseller_setting: perms.reseller_setting || 0,
          your_integration: perms.your_integration || 0,
          manage_clients: perms.manage_clients || 0,
          invoice: perms.invoice || 0,
          invoice_create: perms.invoice_create || 0,
          billing: perms.billing || 0,
          url_shortener: perms.url_shortener || 0,
          file_manager: perms.file_manager || 0,
          google_integration: perms.google_integration || 0,
          can_access_report: perms.can_access_report || 0,
        });
      } catch (error) {
        message.error("Failed to fetch permissions.");
      }
    };

    if (open) {
      fetchServices();
    }
  }, [open, id]);

  const handleServiceChange = (key) => {
    setSendServices((prev) => {
      const newVal = prev[key] === 1 ? 0 : 1;
      const updated = { ...prev, [key]: newVal };
      if (key === "sms_credits" && newVal === 0) {
        updated.open_sms_template = 0;
        updated.can_create_smpp_gateway = 0;
        updated.sms_admin = 0;
      }
      if ((key === "Whatsapp_marketing" || key === "whatsapp_utility") && newVal === 0) {
        const otherWa = key === "Whatsapp_marketing" ? prev.whatsapp_utility : prev.Whatsapp_marketing;
        if (!otherWa) {
          updated.broadcast_masterreseller = 0;
          updated.broadcast_masterreseller_csv = 0;
        }
      }
      return updated;
    });
  };

  const handleSaveServices = async () => {
    setLoadingServices(true);
    try {
      await clientUpdatePermissions(id, sendServices);
      message.success("Permissions updated successfully");
      setTimeout(() => handleClose(), 1000);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleSaveExpiry = async () => {
    setLoadingExpiry(true);
    try {
      const expiryValue = accountExpiry
        ? accountExpiry.format("YYYY-MM-DD")
        : null;
      await clientUpdateExpiry(id, expiryValue);
      message.success(
        expiryValue
          ? "Account expiry updated successfully"
          : "Account expiry removed successfully",
      );
      setReload((prev) => !prev);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoadingExpiry(false);
    }
  };

  if (!open) return null;

  const p = userPermissions;

  return (
    <>
      <Modal isModalOpen={open} closeModal={handleClose}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 py-5 mb-6"
          style={{
            background: THEME.gradientLight,
            borderBottom: `1px solid rgba(37,99,235,0.2)`,
            margin: "-24px -24px 24px -24px",
          }}
        >
          <div className="flex items-center gap-4">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <Avatar
                  size={64}
                  icon={<UserOutlined />}
                  style={{
                    background: THEME.gradient,
                    boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                  }}
                />
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      user_type === "reseller" ? "#8b5cf6" : "#06b6d4",
                    border: "2px solid white",
                  }}
                >
                  <CheckCircleOutlined
                    style={{ fontSize: 10, color: "white" }}
                  />
                </div>
              </motion.div>
              <div>
                <Title level={4} style={{ marginBottom: 0, color: "#1f2937" }}>
                  User Profile
                </Title>
                <div className="flex items-center gap-2 mt-1">
                  <Text className="text-sm text-gray-500">
                    @{client_username}
                  </Text>
                  <Tag
                    style={{
                      borderRadius: 6,
                      background:
                        user_type === "reseller"
                          ? "rgba(139,92,246,0.1)"
                          : "rgba(6,182,212,0.1)",
                      border: "none",
                      color: user_type === "reseller" ? "#8b5cf6" : "#06b6d4",
                      fontSize: 10,
                      textTransform: "capitalize",
                    }}
                  >
                    {user_type}
                  </Tag>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar px-2 pb-6">
          <Tabs
            defaultActiveKey="profile"
            className="user-profile-tabs"
            items={undefined}
          >
            <TabPane tab="Profile" key="profile">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Profile Image Placeholder */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: THEME.gradientLight,
                      border: "1px solid rgba(37,99,235,0.15)",
                    }}
                  >
                    <div className="h-48 flex flex-col items-center justify-center">
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-3"
                        style={{ background: "rgba(37,99,235,0.15)" }}
                      >
                        <UserOutlined
                          style={{ fontSize: 32, color: THEME.primary }}
                        />
                      </div>
                      <Text className="text-gray-500 text-sm">
                        No Image Available
                      </Text>
                    </div>
                  </motion.div>

                  {/* Quick Info */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-xl p-4"
                    style={{
                      background: "white",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                  >
                    <SectionHeader
                      icon={ClockCircleOutlined}
                      title="Quick Info"
                      subtitle="Activity information"
                    />

                    <div className="space-y-3">
                      <InfoCard
                        icon={ClockCircleOutlined}
                        label="Last Visit"
                        value={formatDate(quickInfo.lastVisit)}
                        color={THEME.primary}
                      />
                      <InfoCard
                        icon={CalendarOutlined}
                        label="Registration Date"
                        value={formatDate(quickInfo.registration)}
                        color="#8b5cf6"
                      />
                      <InfoCard
                        icon={WifiOutlined}
                        label="Last IP Address"
                        value={quickInfo.lastIpAddress}
                        color="#06b6d4"
                      />
                    </div>
                  </motion.div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Profile Form */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="rounded-xl p-4"
                    style={{
                      background: "white",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                  >
                    <SectionHeader
                      icon={EditOutlined}
                      title="Profile Information"
                      subtitle="Edit user details"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Text className="text-xs text-gray-500 font-medium block mb-1.5">
                          First Name
                        </Text>
                        <Input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First Name"
                          disabled={loadingProfile}
                          prefix={
                            <UserOutlined
                              style={{ color: "#9ca3af", fontSize: 12 }}
                            />
                          }
                          className="h-10 rounded-lg"
                          style={{ borderColor: "rgba(37,99,235,0.3)" }}
                        />
                      </div>
                      <div>
                        <Text className="text-xs text-gray-500 font-medium block mb-1.5">
                          Last Name
                        </Text>
                        <Input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last Name"
                          disabled={loadingProfile}
                          prefix={
                            <UserOutlined
                              style={{ color: "#9ca3af", fontSize: 12 }}
                            />
                          }
                          className="h-10 rounded-lg"
                          style={{ borderColor: "rgba(37,99,235,0.3)" }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Text className="text-xs text-gray-500 font-medium block mb-1.5">
                          Location
                        </Text>
                        <Input
                          value={country || ""}
                          readOnly
                          prefix={
                            <GlobalOutlined
                              style={{ color: "#9ca3af", fontSize: 12 }}
                            />
                          }
                          className="h-10 rounded-lg bg-gray-50"
                          style={{ borderColor: "#e5e7eb" }}
                        />
                      </div>
                      <div>
                        <Text className="text-xs text-gray-500 font-medium block mb-1.5">
                          User Type
                        </Text>
                        <Input
                          value={user_type || ""}
                          readOnly
                          prefix={
                            <UserOutlined
                              style={{ color: "#9ca3af", fontSize: 12 }}
                            />
                          }
                          className="h-10 rounded-lg bg-gray-50"
                          style={{ borderColor: "#e5e7eb" }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <Text className="text-xs text-gray-500 font-medium block mb-1.5">
                          Email ID
                        </Text>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email"
                          disabled={loadingProfile}
                          prefix={
                            <MailOutlined
                              style={{ color: "#9ca3af", fontSize: 12 }}
                            />
                          }
                          className="h-10 rounded-lg"
                          style={{ borderColor: "rgba(37,99,235,0.3)" }}
                        />
                      </div>
                      <div>
                        <Text className="text-xs text-gray-500 font-medium block mb-1.5">
                          Phone
                        </Text>
                        <Input
                          value={clientMobileNo || ""}
                          readOnly
                          prefix={
                            <PhoneOutlined
                              style={{ color: "#9ca3af", fontSize: 12 }}
                            />
                          }
                          className="h-10 rounded-lg bg-gray-50"
                          style={{ borderColor: "#e5e7eb" }}
                        />
                      </div>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="mt-4"
                    >
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSaveProfile}
                        loading={loadingProfile}
                        className="h-10 px-6 rounded-xl font-medium"
                        style={{
                          background: THEME.gradient,
                          border: "none",
                          boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                        }}
                      >
                        {loadingProfile ? "Saving..." : "Save Profile"}
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </TabPane>

            <TabPane tab="Change Password" key="password">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-5"
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <SectionHeader
                  icon={LockOutlined}
                  title="Change Password"
                  subtitle="Update the client password"
                />
                <Text className="text-sm text-gray-600 block mb-4">
                  This will change the password for{" "}
                  <strong>@{client_username}</strong>.
                </Text>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    danger
                    icon={<LockOutlined />}
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="h-10 px-6 rounded-xl font-medium"
                  >
                    Open Change Password
                  </Button>
                </motion.div>
              </motion.div>
            </TabPane>

            <TabPane tab="Manage Permission" key="permissions">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4"
                style={{ background: "white", border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
              >
                <SectionHeader icon={SettingOutlined} title="Manage Permissions" subtitle="Manage service access" />

                {/* Channels */}
                <Text strong className="text-sm block mb-3" style={{ color: THEME.primaryDark }}>Channels</Text>

                {/* Voice */}
                {(p.voice_credits === 1 || sendServices.voice_credits === 1) && (
                  <div className="mb-3 rounded-lg border border-indigo-50 p-3" style={{ background: "rgba(37,99,235,0.02)" }}>
                    <Text strong className="text-sm text-gray-700 block mb-2">Voice</Text>
                    <motion.div whileHover={{ x: 2 }} className="pl-1">
                      <Checkbox checked={sendServices.voice_credits === 1} onChange={() => handleServiceChange("voice_credits")} className="permission-checkbox">
                        <Text className="text-sm text-gray-700">Voice 15</Text>
                      </Checkbox>
                    </motion.div>
                    {(p.voice_pulse30 === 1 || sendServices.voice_pulse30 === 1) && (
                      <motion.div whileHover={{ x: 2 }} className="pl-1">
                        <Checkbox checked={sendServices.voice_pulse30 === 1} onChange={() => handleServiceChange("voice_pulse30")} className="permission-checkbox">
                          <Text className="text-sm text-gray-700">Voice 30</Text>
                        </Checkbox>
                      </motion.div>
                    )}
                    {/* Refund Unheard Call Time: DB-managed only, always on by
                        default — intentionally no UI toggle here. */}
                    {(p.voice_call_fallback_notify === 1 || sendServices.voice_call_fallback_notify === 1) && (
                      <motion.div whileHover={{ x: 2 }} className="pl-1">
                        <Checkbox checked={sendServices.voice_call_fallback_notify === 1} onChange={() => handleServiceChange("voice_call_fallback_notify")} className="permission-checkbox">
                          <Text className="text-sm text-gray-700">Call Fallback Notify (WhatsApp/SMS)</Text>
                        </Checkbox>
                      </motion.div>
                    )}
                    {(p.voice_routes === 1 || sendServices.voice_routes === 1) && (
                      <motion.div whileHover={{ x: 2 }} className="pl-1">
                        <Checkbox checked={sendServices.voice_routes === 1} onChange={() => handleServiceChange("voice_routes")} className="permission-checkbox">
                          <Text className="text-sm text-gray-700">Voice Routes (choose sending provider)</Text>
                        </Checkbox>
                      </motion.div>
                    )}
                  </div>
                )}


                {/* Reseller Permissions - only for reseller accounts */}
                {user_type === "reseller" && (
                  <>
                    <Divider style={{ borderColor: "rgba(37,99,235,0.2)", margin: "12px 0" }} />
                    <Text strong className="text-sm block mb-3" style={{ color: THEME.primaryDark }}>Reseller Permissions</Text>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                      {p.can_create_reseller === 1 && (
                        <motion.div whileHover={{ x: 2 }}>
                          <Checkbox checked={sendServices.can_create_reseller === 1} onChange={() => handleServiceChange("can_create_reseller")} className="permission-checkbox">
                            <Text className="text-sm text-gray-700">Can Create Reseller</Text>
                          </Checkbox>
                        </motion.div>
                      )}
                      {p.reseller_setting === 1 && (
                        <motion.div whileHover={{ x: 2 }}>
                          <Checkbox checked={sendServices.reseller_setting === 1} onChange={() => handleServiceChange("reseller_setting")} className="permission-checkbox">
                            <Text className="text-sm text-gray-700">Reseller Setting</Text>
                          </Checkbox>
                        </motion.div>
                      )}
                      {p.your_integration === 1 && (
                        <motion.div whileHover={{ x: 2 }}>
                          <Checkbox checked={sendServices.your_integration === 1} onChange={() => handleServiceChange("your_integration")} className="permission-checkbox">
                            <Text className="text-sm text-gray-700">Reseller Integration</Text>
                          </Checkbox>
                        </motion.div>
                      )}
                      {p.manage_clients === 1 && (
                        <motion.div whileHover={{ x: 2 }}>
                          <Checkbox checked={sendServices.manage_clients === 1} onChange={() => handleServiceChange("manage_clients")} className="permission-checkbox">
                            <Text className="text-sm text-gray-700">Manage Clients</Text>
                          </Checkbox>
                        </motion.div>
                      )}
                    </div>
                  </>
                )}

                {/* Utility */}
                {p.file_manager === 1 && (
                  <>
                    <Divider style={{ borderColor: "rgba(37,99,235,0.2)", margin: "12px 0" }} />
                    <Text strong className="text-sm block mb-3" style={{ color: THEME.primaryDark }}>Utility</Text>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                      <motion.div whileHover={{ x: 2 }}>
                        <Checkbox checked={sendServices.file_manager === 1} onChange={() => handleServiceChange("file_manager")} className="permission-checkbox">
                          <Text className="text-sm text-gray-700">File Hosting</Text>
                        </Checkbox>
                      </motion.div>
                    </div>
                  </>
                )}

                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="mt-4">
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSaveServices}
                    loading={loadingServices}
                    className="h-10 px-6 rounded-xl font-medium"
                    style={{ background: THEME.gradient, border: "none", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}
                  >
                    {loadingServices ? "Saving..." : "Save Permissions"}
                  </Button>
                </motion.div>
              </motion.div>
            </TabPane>

            {p.voice_routes === 1 && (
              <TabPane tab="Voice Route" key="voiceroute">
                <VoiceRouteTab clientId={id} clientUsername={client_username} />
              </TabPane>
            )}

            {p.voice_call_fallback_notify === 1 && (
              <TabPane tab="Call Fallback API" key="callfallback">
                <CallFallback clientId={id} clientUsername={client_username} />
              </TabPane>
            )}

            <TabPane tab="Account Validity" key="validity">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-5"
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <SectionHeader
                  icon={CalendarOutlined}
                  title="Account Expiry"
                  subtitle="Set account expiration date"
                />

                <div className="mb-4" style={{ paddingBottom: "280px" }}>
                  <Text className="text-sm text-gray-600 block mb-3">
                    Set an expiration date for this account. Leave empty for no
                    expiration.
                  </Text>

                  <div className="flex items-center gap-3">
                    <DatePicker
                      value={accountExpiry}
                      onChange={(date) => setAccountExpiry(date)}
                      placeholder="Select expiry date"
                      format="YYYY-MM-DD"
                      className="flex-1 h-10 rounded-lg"
                      style={{ borderColor: "rgba(37,99,235,0.3)" }}
                      suffixIcon={
                        <CalendarOutlined style={{ color: THEME.primary }} />
                      }
                      disabledDate={(current) =>
                        current && current < dayjs().add(1, 'month').startOf("day")
                      }
                      defaultPickerValue={dayjs().add(1, 'month')}
                      getPopupContainer={(trigger) => trigger.parentNode}
                    />

                    {accountExpiry && (
                      <Button
                        danger
                        onClick={() => setAccountExpiry(null)}
                        className="h-10 rounded-lg"
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  {accountExpiry && (
                    <div
                      className="mt-3 p-3 rounded-lg"
                      style={{ background: "rgba(37,99,235,0.08)" }}
                    >
                      <Text className="text-xs text-gray-600">
                        Account will expire on:{" "}
                        <strong>{accountExpiry.format("MMMM D, YYYY")}</strong>
                      </Text>
                    </div>
                  )}
                </div>

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSaveExpiry}
                    loading={loadingExpiry}
                    className="h-10 px-6 rounded-xl font-medium"
                    style={{
                      background: THEME.gradient,
                      border: "none",
                      boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                    }}
                  >
                    {loadingExpiry ? "Saving..." : "Save Expiry"}
                  </Button>
                </motion.div>
              </motion.div>
            </TabPane>
          </Tabs>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-end mt-6 pt-4"
            style={{ borderTop: "1px solid rgba(37,99,235,0.1)" }}
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                icon={<CloseOutlined />}
                onClick={handleClose}
                className="h-10 px-6 rounded-xl font-medium"
                style={{
                  borderColor: "#d1d5db",
                  color: "#6b7280",
                }}
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
          </div>
      </Modal>

      <ChangePasswordModal
        open={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        username={client_username}
        clientId={id}
        onSuccess={() => {
          message.success("Password updated successfully");
        }}
        title="Change Password"
      />

      {/* Custom Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* Input styling */
        .ant-input:hover,
        .ant-input:focus,
        .ant-input-focused {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1) !important;
        }

        .ant-input-affix-wrapper:hover,
        .ant-input-affix-wrapper:focus,
        .ant-input-affix-wrapper-focused {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1) !important;
        }

        /* Checkbox styling */
        .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #2563EB !important;
          border-color: #2563EB !important;
        }

        .ant-checkbox:hover .ant-checkbox-inner {
          border-color: #2563EB !important;
        }

        .ant-checkbox-wrapper:hover .ant-checkbox-inner {
          border-color: #2563EB !important;
        }

        /* Button styling */
        .ant-btn-primary:hover {
          box-shadow: 0 4px 12px rgba(3, 207, 101, 0.35) !important;
        }

        .ant-btn-dangerous {
          border-color: #ef4444 !important;
          color: #ef4444 !important;
        }

        .ant-btn-dangerous:hover {
          background: rgba(239, 68, 68, 0.1) !important;
          border-color: #ef4444 !important;
          color: #ef4444 !important;
        }

        /* Divider */
        .ant-divider {
          border-color: rgba(3, 207, 101, 0.1);
        }

        /* Scrollbar hide */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Avatar */
        .ant-avatar {
          transition: all 0.3s ease;
        }

        /* Loading spin */
        .ant-spin-dot-item {
          background-color: #2563EB !important;
        }
      `,
        }}
      />
    </>
  );
};

UserProfileModal.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  clientMobileNo: PropTypes.string,
  clientEmail: PropTypes.string,
  user_type: PropTypes.string,
  country: PropTypes.string,
  client_username: PropTypes.string.isRequired,
};

export default UserProfileModal;

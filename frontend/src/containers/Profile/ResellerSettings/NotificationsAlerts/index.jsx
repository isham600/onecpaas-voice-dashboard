import { useState } from "react";
import {
  Typography,
  Divider,
  Switch,
  Input,
  Button,
  Space,
  Row,
  Col,
  Alert,
  message,
} from "antd";
import {
  MailOutlined,
  MessageOutlined,
  BellOutlined,
  NotificationOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

const { Title, Text, Paragraph } = Typography;

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

// Toggle row component for consistent styling
const ToggleRow = ({ label, description, checked, onChange, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.3 }}
    className="flex items-center justify-between p-3 rounded-xl transition-all hover:shadow-sm"
    style={{
      background: checked ? THEME.gradientLight : "white",
      border: `1px solid ${checked ? "rgba(37,99,235,0.2)" : "#f3f4f6"}`,
    }}
  >
    <div className="flex-1 min-w-0 mr-3">
      <Text
        className="block text-sm font-medium"
        style={{ color: checked ? THEME.primaryDark : "#374151" }}
      >
        {label}
      </Text>
      {description && (
        <Text className="text-xs text-gray-400 block mt-0.5">
          {description}
        </Text>
      )}
    </div>
    <Switch
      checked={checked}
      onChange={onChange}
      style={{
        background: checked ? THEME.primary : undefined,
      }}
    />
  </motion.div>
);

const NotificationsAlerts = () => {
  const [emailAlerts, setEmailAlerts] = useState({
    lowCredits: false,
    campaignStatus: false,
    supportTickets: false,
    emailAddress: "",
  });

  const [smsAlerts, setSmsAlerts] = useState({
    lowCredits: false,
    campaignStatus: false,
    supportTickets: false,
    phoneNumber: "",
  });

  const [announcements, setAnnouncements] = useState({
    newFeatures: true,
    maintenance: true,
    updates: true,
  });

  const handleEmailToggle = (key, value) => {
    setEmailAlerts((prev) => ({ ...prev, [key]: value }));
  };

  const handleSmsToggle = (key, value) => {
    setSmsAlerts((prev) => ({ ...prev, [key]: value }));
  };

  const handleAnnouncementToggle = (key, value) => {
    setAnnouncements((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    message.success("Notification settings saved successfully!");
  };

  return (
    <div>
      <Row gutter={[24, 24]}>
        {/* Email and SMS Alerts */}
        <Col xs={24} lg={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl border border-gray-100 h-full overflow-hidden"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
          >
            {/* Card Header */}
            <div
              className="px-6 py-4"
              style={{
                background: THEME.gradientLight,
                borderBottom: "1px solid rgba(37,99,235,0.1)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: THEME.gradient,
                    boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                  }}
                >
                  <MailOutlined style={{ color: "white", fontSize: 16 }} />
                </motion.div>
                <div>
                  <Text
                    strong
                    className="block text-sm"
                    style={{ color: "#1f2937" }}
                  >
                    Email & SMS Alerts
                  </Text>
                  <Text className="text-xs text-gray-400">
                    Configure notification channels
                  </Text>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6">
              <Paragraph className="text-gray-500 text-sm mb-6">
                Set up notifications for low credits, campaign status, and
                support ticket updates.
              </Paragraph>

              {/* Email Alerts Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ background: "rgba(37,99,235,0.1)" }}
                  >
                    <MailOutlined
                      style={{ color: THEME.primary, fontSize: 14 }}
                    />
                  </div>
                  <Title
                    level={5}
                    style={{ marginBottom: 0, color: "#1f2937", fontSize: 14 }}
                  >
                    Email Alerts
                  </Title>
                </div>

                <div className="space-y-2">
                  <ToggleRow
                    label="Low Credits Alert"
                    checked={emailAlerts.lowCredits}
                    onChange={(checked) =>
                      handleEmailToggle("lowCredits", checked)
                    }
                    delay={0.05}
                  />
                  <ToggleRow
                    label="Campaign Status Updates"
                    checked={emailAlerts.campaignStatus}
                    onChange={(checked) =>
                      handleEmailToggle("campaignStatus", checked)
                    }
                    delay={0.1}
                  />
                  <ToggleRow
                    label="Support Ticket Updates"
                    checked={emailAlerts.supportTickets}
                    onChange={(checked) =>
                      handleEmailToggle("supportTickets", checked)
                    }
                    delay={0.15}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-3"
                  >
                    <Text className="text-xs font-medium uppercase tracking-wide text-gray-500 block mb-2">
                      Email Address
                    </Text>
                    <Input
                      placeholder="Enter email address"
                      prefix={<MailOutlined style={{ color: THEME.primary }} />}
                      value={emailAlerts.emailAddress}
                      onChange={(e) =>
                        handleEmailToggle("emailAddress", e.target.value)
                      }
                      className="h-10 rounded-lg"
                      style={{ borderColor: "rgba(3, 207, 101, 0.3)" }}
                    />
                  </motion.div>
                </div>
              </div>

              <Divider
                style={{
                  margin: "20px 0",
                  borderColor: "rgba(37,99,235,0.08)",
                }}
              />

              {/* SMS Alerts Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ background: "rgba(37,99,235,0.1)" }}
                  >
                    <MessageOutlined
                      style={{ color: THEME.primaryDark, fontSize: 14 }}
                    />
                  </div>
                  <Title
                    level={5}
                    style={{ marginBottom: 0, color: "#1f2937", fontSize: 14 }}
                  >
                    SMS Alerts
                  </Title>
                </div>

                <div className="space-y-2">
                  <ToggleRow
                    label="Low Credits Alert"
                    checked={smsAlerts.lowCredits}
                    onChange={(checked) =>
                      handleSmsToggle("lowCredits", checked)
                    }
                    delay={0.25}
                  />
                  <ToggleRow
                    label="Campaign Status Updates"
                    checked={smsAlerts.campaignStatus}
                    onChange={(checked) =>
                      handleSmsToggle("campaignStatus", checked)
                    }
                    delay={0.3}
                  />
                  <ToggleRow
                    label="Support Ticket Updates"
                    checked={smsAlerts.supportTickets}
                    onChange={(checked) =>
                      handleSmsToggle("supportTickets", checked)
                    }
                    delay={0.35}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-3"
                  >
                    <Text className="text-xs font-medium uppercase tracking-wide text-gray-500 block mb-2">
                      Phone Number
                    </Text>
                    <Input
                      placeholder="Enter phone number"
                      prefix={
                        <MessageOutlined style={{ color: THEME.primary }} />
                      }
                      value={smsAlerts.phoneNumber}
                      onChange={(e) =>
                        handleSmsToggle("phoneNumber", e.target.value)
                      }
                      className="h-10 rounded-lg"
                      style={{ borderColor: "rgba(3, 207, 101, 0.3)" }}
                    />
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </Col>

        {/* System Announcements */}
        <Col xs={24} lg={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-100 h-full overflow-hidden"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
          >
            {/* Card Header */}
            <div
              className="px-6 py-4"
              style={{
                background: THEME.gradientLight,
                borderBottom: "1px solid rgba(37,99,235,0.1)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: THEME.gradient,
                    boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                  }}
                >
                  <BellOutlined style={{ color: "white", fontSize: 16 }} />
                </motion.div>
                <div>
                  <Text
                    strong
                    className="block text-sm"
                    style={{ color: "#1f2937" }}
                  >
                    System Announcements
                  </Text>
                  <Text className="text-xs text-gray-400">
                    Manage announcement preferences
                  </Text>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6">
              <Paragraph className="text-gray-500 text-sm mb-6">
                Announce new features, maintenance schedules, and important
                updates.
              </Paragraph>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ background: "rgba(37,99,235,0.1)" }}
                  >
                    <NotificationOutlined
                      style={{ color: THEME.primary, fontSize: 14 }}
                    />
                  </div>
                  <Title
                    level={5}
                    style={{ marginBottom: 0, color: "#1f2937", fontSize: 14 }}
                  >
                    Announcement Preferences
                  </Title>
                </div>

                <div className="space-y-2">
                  <ToggleRow
                    label="New Features"
                    description="Get notified about new feature releases"
                    checked={announcements.newFeatures}
                    onChange={(checked) =>
                      handleAnnouncementToggle("newFeatures", checked)
                    }
                    delay={0.15}
                  />
                  <ToggleRow
                    label="Maintenance Schedules"
                    description="Receive updates about system maintenance"
                    checked={announcements.maintenance}
                    onChange={(checked) =>
                      handleAnnouncementToggle("maintenance", checked)
                    }
                    delay={0.2}
                  />
                  <ToggleRow
                    label="Important Updates"
                    description="Stay informed about critical updates"
                    checked={announcements.updates}
                    onChange={(checked) =>
                      handleAnnouncementToggle("updates", checked)
                    }
                    delay={0.25}
                  />
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Alert
                  message={
                    <span
                      className="font-semibold"
                      style={{ color: THEME.primaryDark }}
                    >
                      Stay Updated
                    </span>
                  }
                  description={
                    <span className="text-gray-600 text-xs">
                      Enable announcements to stay informed about the latest
                      features and important updates to improve your experience.
                    </span>
                  }
                  type="info"
                  showIcon
                  icon={<InfoCircleOutlined style={{ color: THEME.primary }} />}
                  className="rounded-xl"
                  style={{
                    background: THEME.gradientLight,
                    border: "1px solid rgba(37,99,235,0.15)",
                    marginTop: 16,
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        </Col>
      </Row>

      {/* Save Button Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="mt-6 rounded-2xl p-5 border border-gray-100 flex items-center justify-between"
        style={{
          background: THEME.gradientLight,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(37,99,235,0.15)" }}
          >
            <CheckCircleOutlined
              style={{ color: THEME.primary, fontSize: 14 }}
            />
          </div>
          <div>
            <Text
              className="block text-sm font-medium"
              style={{ color: "#1f2937" }}
            >
              Save your preferences
            </Text>
            <Text className="text-xs text-gray-400">
              Apply notification settings across your account
            </Text>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={handleSaveSettings}
            className="h-11 px-8 rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
            style={{
              background: THEME.gradient,
              border: "none",
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Save Settings
          </Button>
        </motion.div>
      </motion.div>

      {/* Component Theme Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Switch green theme */
        .ant-switch-checked {
          background: #2563EB !important;
        }

        .ant-switch-checked:hover:not(.ant-switch-disabled) {
          background: #1D4ED8 !important;
        }

        .ant-switch:hover:not(.ant-switch-disabled) {
          background: rgba(0, 0, 0, 0.35);
        }

        /* Input focus states */
        .ant-input:focus,
        .ant-input-focused,
        .ant-input:hover,
        .ant-input-affix-wrapper:focus,
        .ant-input-affix-wrapper-focused,
        .ant-input-affix-wrapper:hover {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1) !important;
        }

        /* Divider */
        .ant-divider {
          border-color: rgba(3, 207, 101, 0.08) !important;
        }

        /* Alert */
        .ant-alert-info {
          border-radius: 12px !important;
        }

        /* Message toast */
        .ant-message-notice-content {
          border-radius: 12px !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
        }

        .ant-message-success .anticon {
          color: #2563EB !important;
        }
      `}} />
    </div>
  );
};

export default NotificationsAlerts;

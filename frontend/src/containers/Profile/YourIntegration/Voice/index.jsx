import { useState } from "react";
import {
  Input,
  Button,
  Row,
  Col,
  Form,
  Typography,
  Alert,
  message,
} from "antd";
import {
  PhoneOutlined,
  ApiOutlined,
  SafetyOutlined,
  UserOutlined,
  LockOutlined,
  SoundOutlined,
  SaveOutlined,
  EditOutlined,
  CloseOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";

const { Title, Text } = Typography;

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

// API guide steps
const apiGuideSteps = [
  {
    icon: <ApiOutlined />,
    title: "API Endpoint",
    description: "Base URL for your voice service API",
  },
  {
    icon: <SafetyOutlined />,
    title: "Authentication",
    description: "API key or token for authentication",
  },
  {
    icon: <UserOutlined />,
    title: "Username",
    description: "Your API account username",
  },
  {
    icon: <LockOutlined />,
    title: "Password",
    description: "Secure password for API access",
  },
];

// SIP guide steps
const sipGuideSteps = [
  {
    icon: <FileTextOutlined />,
    title: "Report Statuses",
    description: "Call statuses to track and report",
  },
  {
    icon: <SoundOutlined />,
    title: "SIP Username",
    description: "SIP account username for calling",
  },
  {
    icon: <LockOutlined />,
    title: "SIP Password",
    description: "Password for SIP authentication",
  },
];

// Important notes
const importantNotes = [
  "SIP (Session Initiation Protocol) is used for voice communications",
  "Ensure your voice provider supports both API and SIP integration",
  "Test calling functionality in a development environment first",
  "Report statuses help track call outcomes and billing",
  "Keep all credentials secure and use strong passwords",
];

const Voice = () => {
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({
    api_endpoint: "",
    api_authentication: "",
    username: "",
    password: "",
    report_statuses: "",
    sip_username: "",
    sip_password: "",
  });
  const [isEditable, setIsEditable] = useState(false);
  const [loading, setLoading] = useState(false);

  // Configure message
  message.config({
    top: 100,
    duration: 3,
    maxCount: 3,
  });

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      message.success("Voice configuration saved successfully!");
      setIsEditable(false);
    } catch (error) {
      message.error("Failed to save voice configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: THEME.gradient,
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
          >
            <PhoneOutlined style={{ color: "white", fontSize: 20 }} />
          </motion.div>
          <div>
            <Title level={4} style={{ marginBottom: 0, color: "#1f2937" }}>
              Voice Integration
            </Title>
            <p className="text-xs text-gray-500">
              Configure your voice calling and SIP settings
            </p>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type={isEditable ? "default" : "primary"}
            icon={isEditable ? <CloseOutlined /> : <EditOutlined />}
            onClick={() => setIsEditable(!isEditable)}
            className="h-10 px-5 rounded-xl font-medium"
            style={
              isEditable
                ? { borderColor: "#ef4444", color: "#ef4444" }
                : {
                    background: THEME.gradient,
                    border: "none",
                    boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                  }
            }
          >
            {isEditable ? "Cancel Edit" : "Edit Configuration"}
          </Button>
        </motion.div>
      </motion.div>

      {/* Info Alert */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Alert
          message={
            <span
              className="font-semibold"
              style={{ color: THEME.primaryDark }}
            >
              Voice API Configuration
            </span>
          }
          description={
            <span className="text-gray-600 text-xs">
              Configure your voice calling service API and SIP settings for
              telephony integration
            </span>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined style={{ color: THEME.primary }} />}
          className="mb-6 rounded-xl"
          style={{
            background: THEME.gradientLight,
            border: "1px solid rgba(37,99,235,0.15)",
          }}
        />
      </motion.div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={formData}
      >
        {/* API Configuration Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-gray-100 p-6 mb-6"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2.5 mb-5">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: THEME.gradient }}
            >
              <ApiOutlined style={{ color: "white", fontSize: 16 }} />
            </motion.div>
            <div>
              <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>
                API Configuration
              </Title>
              <p className="text-xs text-gray-500">
                Voice service API connection details
              </p>
            </div>
          </div>

          <Row gutter={[24, 16]}>
            <Col xs={24} lg={12}>
              <Form.Item
                label={
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    API Endpoint
                  </span>
                }
                name="api_endpoint"
                rules={[
                  {
                    required: true,
                    message: "Please enter API endpoint",
                  },
                  { type: "url", message: "Please enter a valid URL" },
                ]}
                extra={
                  <span className="text-xs text-gray-400">
                    Base URL for your voice service API
                  </span>
                }
              >
                <Input
                  value={formData.api_endpoint}
                  onChange={(e) => handleChange("api_endpoint", e.target.value)}
                  disabled={!isEditable}
                  placeholder="https://api.voiceprovider.com/v1"
                  prefix={<ApiOutlined style={{ color: THEME.primary }} />}
                  size="large"
                  className="rounded-lg"
                  style={{ borderColor: "rgba(3, 207, 101, 0.3)" }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} lg={12}>
              <Form.Item
                label={
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    API Authentication
                  </span>
                }
                name="api_authentication"
                rules={[
                  {
                    required: true,
                    message: "Please enter API authentication key",
                  },
                ]}
                extra={
                  <span className="text-xs text-gray-400">
                    Token or key for API authentication
                  </span>
                }
              >
                <Input.Password
                  value={formData.api_authentication}
                  onChange={(e) =>
                    handleChange("api_authentication", e.target.value)
                  }
                  disabled={!isEditable}
                  placeholder="Enter API authentication token/key"
                  prefix={<SafetyOutlined style={{ color: THEME.primary }} />}
                  iconRender={(visible) =>
                    visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                  }
                  size="large"
                  className="rounded-lg"
                  style={{ borderColor: "rgba(3, 207, 101, 0.3)" }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 16]}>
            <Col xs={24} lg={12}>
              <Form.Item
                label={
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    Username
                  </span>
                }
                name="username"
                rules={[
                  { required: true, message: "Please enter username" },
                  {
                    min: 3,
                    message: "Username must be at least 3 characters",
                  },
                ]}
                extra={
                  <span className="text-xs text-gray-400">
                    Your API account username
                  </span>
                }
              >
                <Input
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  disabled={!isEditable}
                  placeholder="Enter API username"
                  prefix={<UserOutlined style={{ color: THEME.primary }} />}
                  size="large"
                  className="rounded-lg"
                  style={{ borderColor: "rgba(3, 207, 101, 0.3)" }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} lg={12}>
              <Form.Item
                label={
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    Password
                  </span>
                }
                name="password"
                rules={[
                  { required: true, message: "Please enter password" },
                  {
                    min: 6,
                    message: "Password must be at least 6 characters",
                  },
                ]}
                extra={
                  <span className="text-xs text-gray-400">
                    Secure password for API access
                  </span>
                }
              >
                <Input.Password
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  disabled={!isEditable}
                  placeholder="Enter API password"
                  prefix={<LockOutlined style={{ color: THEME.primary }} />}
                  iconRender={(visible) =>
                    visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                  }
                  size="large"
                  className="rounded-lg"
                  style={{ borderColor: "rgba(3, 207, 101, 0.3)" }}
                />
              </Form.Item>
            </Col>
          </Row>
        </motion.div>

        {/* SIP Configuration Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-100 p-6 mb-6"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2.5 mb-5">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: THEME.gradient }}
            >
              <SoundOutlined style={{ color: "white", fontSize: 16 }} />
            </motion.div>
            <div>
              <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>
                SIP Configuration
              </Title>
              <p className="text-xs text-gray-500">
                Session Initiation Protocol settings
              </p>
            </div>
          </div>

          <Row gutter={[24, 16]}>
            <Col xs={24} lg={8}>
              <Form.Item
                label={
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    Report Statuses
                  </span>
                }
                name="report_statuses"
                rules={[
                  {
                    required: true,
                    message: "Please enter report statuses",
                  },
                ]}
                extra={
                  <span className="text-xs text-gray-400">
                    Comma-separated list of call statuses to report
                  </span>
                }
              >
                <Input
                  value={formData.report_statuses}
                  onChange={(e) =>
                    handleChange("report_statuses", e.target.value)
                  }
                  disabled={!isEditable}
                  placeholder="answered,busy,failed,timeout"
                  prefix={<FileTextOutlined style={{ color: THEME.primary }} />}
                  size="large"
                  className="rounded-lg"
                  style={{ borderColor: "rgba(3, 207, 101, 0.3)" }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} lg={8}>
              <Form.Item
                label={
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    SIP Username
                  </span>
                }
                name="sip_username"
                rules={[
                  {
                    required: true,
                    message: "Please enter SIP username",
                  },
                ]}
                extra={
                  <span className="text-xs text-gray-400">
                    SIP account username for calling
                  </span>
                }
              >
                <Input
                  value={formData.sip_username}
                  onChange={(e) => handleChange("sip_username", e.target.value)}
                  disabled={!isEditable}
                  placeholder="Enter SIP username"
                  prefix={<UserOutlined style={{ color: THEME.primary }} />}
                  size="large"
                  className="rounded-lg"
                  style={{ borderColor: "rgba(3, 207, 101, 0.3)" }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} lg={8}>
              <Form.Item
                label={
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    SIP Password
                  </span>
                }
                name="sip_password"
                rules={[
                  {
                    required: true,
                    message: "Please enter SIP password",
                  },
                  {
                    min: 6,
                    message: "SIP password must be at least 6 characters",
                  },
                ]}
                extra={
                  <span className="text-xs text-gray-400">
                    Password for SIP authentication
                  </span>
                }
              >
                <Input.Password
                  value={formData.sip_password}
                  onChange={(e) => handleChange("sip_password", e.target.value)}
                  disabled={!isEditable}
                  placeholder="Enter SIP password"
                  prefix={<LockOutlined style={{ color: THEME.primary }} />}
                  iconRender={(visible) =>
                    visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                  }
                  size="large"
                  className="rounded-lg"
                  style={{ borderColor: "rgba(3, 207, 101, 0.3)" }}
                />
              </Form.Item>
            </Col>
          </Row>
        </motion.div>

        {/* Submit Button */}
        <AnimatePresence>
          {isEditable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-6"
            >
              <div
                className="rounded-2xl p-5 flex items-center justify-between border border-gray-100"
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
                    <SaveOutlined
                      style={{ color: THEME.primary, fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <Text
                      className="block text-sm font-medium"
                      style={{ color: "#1f2937" }}
                    >
                      Save your configuration
                    </Text>
                    <Text className="text-xs text-gray-400">
                      Apply voice integration settings
                    </Text>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      htmlType="submit"
                      loading={loading}
                      size="large"
                      className="h-11 px-6 rounded-xl font-medium"
                      style={{
                        background: THEME.gradient,
                        border: "none",
                        boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                      }}
                    >
                      Save Configuration
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      icon={<CloseOutlined />}
                      onClick={() => setIsEditable(false)}
                      size="large"
                      className="h-11 px-6 rounded-xl font-medium"
                      style={{
                        borderColor: "#e5e7eb",
                        color: "#6b7280",
                      }}
                    >
                      Cancel
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Form>

      {/* Configuration Guide Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-gray-100 p-6 mb-6"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-2.5 mb-5">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: THEME.gradient }}
          >
            <BookOutlined style={{ color: "white", fontSize: 16 }} />
          </motion.div>
          <div>
            <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>
              Configuration Guide
            </Title>
            <p className="text-xs text-gray-500">
              Reference for each configuration field
            </p>
          </div>
        </div>

        {/* API Settings Guide */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "rgba(37,99,235,0.1)" }}
            >
              <ApiOutlined style={{ color: THEME.primary, fontSize: 12 }} />
            </div>
            <Text
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: THEME.primaryDark }}
            >
              API Settings
            </Text>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {apiGuideSteps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.3 + index * 0.05,
                  duration: 0.4,
                }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="rounded-xl p-4 cursor-pointer transition-all"
                style={{
                  background: THEME.gradientLight,
                  border: "1px solid rgba(37,99,235,0.12)",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.04)",
                }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <motion.div
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: THEME.gradient }}
                  >
                    <span style={{ color: "white", fontSize: 12 }}>
                      {step.icon}
                    </span>
                  </motion.div>
                  <Text
                    strong
                    className="text-xs"
                    style={{ color: THEME.primaryDark }}
                  >
                    {step.title}
                  </Text>
                </div>
                <Text className="text-[11px] leading-relaxed text-gray-500">
                  {step.description}
                </Text>
              </motion.div>
            ))}
          </div>
        </div>

        {/* SIP Settings Guide */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "rgba(37,99,235,0.1)" }}
            >
              <SoundOutlined style={{ color: THEME.primary, fontSize: 12 }} />
            </div>
            <Text
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: THEME.primaryDark }}
            >
              SIP Settings
            </Text>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sipGuideSteps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.45 + index * 0.05,
                  duration: 0.4,
                }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="rounded-xl p-4 cursor-pointer transition-all"
                style={{
                  background: THEME.gradientLight,
                  border: "1px solid rgba(37,99,235,0.12)",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.04)",
                }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <motion.div
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: THEME.gradient }}
                  >
                    <span style={{ color: "white", fontSize: 12 }}>
                      {step.icon}
                    </span>
                  </motion.div>
                  <Text
                    strong
                    className="text-xs"
                    style={{ color: THEME.primaryDark }}
                  >
                    {step.title}
                  </Text>
                </div>
                <Text className="text-[11px] leading-relaxed text-gray-500">
                  {step.description}
                </Text>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Important Notes Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl p-6 border border-gray-100"
        style={{
          background: THEME.gradientLight,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: THEME.gradient }}
          >
            <SafetyOutlined style={{ color: "white", fontSize: 16 }} />
          </motion.div>
          <div>
            <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>
              Important Notes
            </Title>
            <p className="text-xs text-gray-500">
              Key information for your voice integration
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {importantNotes.map((note, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="flex items-start gap-2.5 p-3 rounded-xl bg-white"
              style={{
                border: "1px solid rgba(37,99,235,0.08)",
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "rgba(37,99,235,0.15)" }}
              >
                <span
                  className="text-[10px] font-bold"
                  style={{ color: THEME.primaryDark }}
                >
                  {index + 1}
                </span>
              </div>
              <Text className="text-sm text-gray-600">{note}</Text>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Component Theme Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Form labels */
        .ant-form-item-label > label {
          color: #6b7280 !important;
          font-size: 12px !important;
          font-weight: 500 !important;
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

        /* Password input */
        .ant-input-password:hover,
        .ant-input-password:focus-within {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1) !important;
        }

        .ant-input-password .ant-input-suffix .anticon {
          color: #9ca3af !important;
        }

        .ant-input-password .ant-input-suffix .anticon:hover {
          color: #2563EB !important;
        }

        /* Form item extra text */
        .ant-form-item-extra {
          font-size: 11px !important;
          color: #9ca3af !important;
          margin-top: 4px !important;
        }

        /* Form validation */
        .ant-form-item-explain-error {
          font-size: 11px !important;
          margin-top: 4px !important;
        }

        /* Disabled state */
        .ant-input-disabled,
        .ant-input-affix-wrapper-disabled {
          background: #fafafa !important;
          opacity: 0.7 !important;
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

export default Voice;

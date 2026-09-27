import { useEffect, useState } from "react";
import axios from "axios";
import {
  Input,
  Button,
  Row,
  Col,
  Form,
  Typography,
  message,
  Popconfirm,
  Alert,
} from "antd";
import {
  CreditCardOutlined,
  KeyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SaveOutlined,
  DeleteOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  SafetyOutlined,
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

const baseURL = import.meta.env.VITE_BASE_URL;

// Configuration notes
const configNotes = [
  "Merchant Key: Your unique PayU merchant identifier",
  "Salt Key: Secret key for transaction validation",
  "Payment URL: PayU payment gateway endpoint",
  "Keep your credentials secure and never share them publicly",
];

const PaymentIntegration = ({ username }) => {
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({
    merchant_key: "",
    merchant_salt: "",
    payment_url: "",
    status: "active",
  });

  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Configure message
  message.config({
    top: 100,
    duration: 3,
    maxCount: 3,
  });

  useEffect(() => {
    const fetchGatewayConfig = async () => {
      try {
        const res = await axios.get(`${baseURL}/api/addfunds/auth/${username}`);
        if (res.data.status === 1) {
          const configData = {
            merchant_key: res.data.config.merchant_key || "",
            merchant_salt: res.data.config.salt_key || "",
            payment_url: res.data.config.payment_url || "",
            status: res.data.config.status,
          };

          setFormData(configData);
          form.setFieldsValue(configData);
          setIsEditing(true);
        }
      } catch {
        // no config exists yet; user can create one
      }
    };

    if (username) fetchGatewayConfig();
  }, [username]);

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (
        !values.merchant_key ||
        !values.merchant_salt ||
        !values.payment_url
      ) {
        message.error("Please fill in all fields.");
        return;
      }

      if (isEditing) {
        await axios.put(`${baseURL}/api/addfunds/auth/${username}`, {
          gateway_name: "PayU",
          merchant_key: values.merchant_key,
          salt_key: values.merchant_salt,
          payment_url: values.payment_url,
          status: values.status || "active",
        });
        message.success("Configuration updated successfully.");
      } else {
        await axios.post(`${baseURL}/api/addfunds/auth/add-credentials`, {
          username,
          gateway_name: "PayU",
          merchant_key: values.merchant_key,
          salt_key: values.merchant_salt,
          payment_url: values.payment_url,
          status: values.status || "active",
        });
        message.success("Configuration created successfully.");
        setIsEditing(true);
      }
    } catch {
      message.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${baseURL}/api/addfunds/auth/${username}`);
      message.success("Configuration deleted.");
      setFormData({
        merchant_key: "",
        merchant_salt: "",
        payment_url: "",
        status: "active",
      });
      form.resetFields();
      setIsEditing(false);
    } catch {
      message.error("Failed to delete configuration.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-6"
      >
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: THEME.gradient,
            boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
          }}
        >
          <CreditCardOutlined style={{ color: "white", fontSize: 20 }} />
        </motion.div>
        <div>
          <Title level={4} style={{ marginBottom: 0, color: "#1f2937" }}>
            Payment Gateway Integration
          </Title>
          <p className="text-xs text-gray-500">
            Configure your PayU merchant credentials
          </p>
        </div>
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
              PayU Payment Gateway
            </span>
          }
          description={
            <span className="text-gray-600 text-xs">
              Configure your PayU merchant credentials to enable payment
              processing
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

      {/* Form Section */}
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
            <KeyOutlined style={{ color: "white", fontSize: 16 }} />
          </motion.div>
          <div>
            <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>
              Merchant Credentials
            </Title>
            <p className="text-xs text-gray-500">Enter your PayU API details</p>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={formData}
        >
          <Row gutter={[24, 16]}>
            {/* Merchant Key */}
            <Col xs={24} lg={12}>
              <Form.Item
                label={
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    Merchant Key
                  </span>
                }
                name="merchant_key"
                rules={[
                  {
                    required: true,
                    message: "Please enter merchant key",
                  },
                  {
                    min: 10,
                    message: "Merchant key must be at least 10 characters",
                  },
                ]}
                extra={
                  <span className="text-xs text-gray-400">
                    Your unique PayU merchant identifier
                  </span>
                }
              >
                <Input
                  value={formData.merchant_key}
                  onChange={(e) => handleChange("merchant_key", e.target.value)}
                  placeholder="Enter your PayU merchant key"
                  prefix={<KeyOutlined style={{ color: THEME.primary }} />}
                  size="large"
                  className="rounded-lg"
                  style={{ borderColor: "rgba(3, 207, 101, 0.3)" }}
                />
              </Form.Item>
            </Col>

            {/* Salt Key */}
            <Col xs={24} lg={12}>
              <Form.Item
                label={
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    Salt Key
                  </span>
                }
                name="merchant_salt"
                rules={[
                  { required: true, message: "Please enter salt key" },
                  {
                    min: 10,
                    message: "Salt key must be at least 10 characters",
                  },
                ]}
                extra={
                  <span className="text-xs text-gray-400">
                    Secret key for transaction validation
                  </span>
                }
              >
                <Input.Password
                  value={formData.merchant_salt}
                  onChange={(e) =>
                    handleChange("merchant_salt", e.target.value)
                  }
                  placeholder="Enter your PayU salt key"
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

            {/* Payment URL */}
            <Col xs={24}>
              <Form.Item
                label={
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    Payment URL
                  </span>
                }
                name="payment_url"
                rules={[
                  {
                    required: true,
                    message: "Please enter payment URL",
                  },
                  {
                    type: "url",
                    message: "Please enter a valid URL",
                  },
                ]}
                extra={
                  <span className="text-xs text-gray-400">
                    PayU payment gateway endpoint URL
                  </span>
                }
              >
                <Input
                  value={formData.payment_url}
                  onChange={(e) => handleChange("payment_url", e.target.value)}
                  placeholder="https://secure.payu.in/_payment"
                  prefix={<LinkOutlined style={{ color: THEME.primary }} />}
                  size="large"
                  className="rounded-lg"
                  style={{ borderColor: "rgba(3, 207, 101, 0.3)" }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Action Buttons */}
          <div
            className="pt-5 mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{
              borderTop: "1px solid rgba(37,99,235,0.1)",
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(37,99,235,0.15)" }}
              >
                <SaveOutlined style={{ color: THEME.primary, fontSize: 14 }} />
              </div>
              <div>
                <Text
                  className="block text-sm font-medium"
                  style={{ color: "#1f2937" }}
                >
                  {isEditing
                    ? "Update your configuration"
                    : "Save your configuration"}
                </Text>
                <Text className="text-xs text-gray-400">
                  {isEditing
                    ? "Modify existing payment settings"
                    : "Create new payment integration"}
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
                  {loading
                    ? "Saving..."
                    : isEditing
                      ? "Update Configuration"
                      : "Save Configuration"}
                </Button>
              </motion.div>

              <AnimatePresence>
                {isEditing && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Popconfirm
                      title={
                        <span
                          className="font-semibold"
                          style={{ color: "#1f2937" }}
                        >
                          Delete Configuration
                        </span>
                      }
                      description="Are you sure you want to delete this payment configuration?"
                      onConfirm={handleDelete}
                      okText="Yes, Delete"
                      cancelText="Cancel"
                      okType="danger"
                      okButtonProps={{
                        className: "rounded-lg",
                      }}
                      cancelButtonProps={{
                        className: "rounded-lg",
                      }}
                    >
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          size="large"
                          className="h-11 px-6 rounded-xl font-medium"
                        >
                          Delete
                        </Button>
                      </motion.div>
                    </Popconfirm>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Form>
      </motion.div>

      {/* Configuration Notes Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
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
            <InfoCircleOutlined style={{ color: "white", fontSize: 16 }} />
          </motion.div>
          <div>
            <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>
              Configuration Notes
            </Title>
            <p className="text-xs text-gray-500">
              Important information about your payment setup
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {configNotes.map((note, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
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

        /* Popconfirm styling */
        .ant-popconfirm .ant-popover-inner {
          border-radius: 12px !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
        }

        .ant-popconfirm .ant-popover-message-icon .anticon {
          color: #ef4444 !important;
        }

        .ant-popconfirm .ant-btn-primary.ant-btn-dangerous {
          border-radius: 8px !important;
        }

        .ant-popconfirm .ant-btn-default {
          border-radius: 8px !important;
        }

        /* Message toast */
        .ant-message-notice-content {
          border-radius: 12px !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
        }

        .ant-message-success .anticon {
          color: #2563EB !important;
        }

        /* Danger button hover */
        .ant-btn-dangerous:hover {
          border-color: #ef4444 !important;
          color: #ef4444 !important;
        }
      `}} />
    </div>
  );
};

export default PaymentIntegration;

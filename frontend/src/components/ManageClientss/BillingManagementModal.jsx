import { useState } from "react";
import { motion } from "framer-motion";
import { Input, Radio, Typography, Divider, Button, message } from "antd";
import {
  FileTextOutlined,
  SendOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  NumberOutlined,
  MessageOutlined,
  SwapOutlined,
  TransactionOutlined,
  CloseOutlined,
  SaveOutlined,
  UserOutlined,
  DollarOutlined,
  FormOutlined,
} from "@ant-design/icons";
import axios from "axios";
import handleApiError from "../../utils/errorHandler";

const { TextArea } = Input;
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

// Section Header Component
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-4">
    <motion.div
      whileHover={{ scale: 1.05, rotate: 5 }}
      className="w-10 h-10 rounded-xl flex items-center justify-center"
      style={{
        background: THEME.gradient,
        boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
      }}
    >
      <Icon style={{ color: "white", fontSize: 18 }} />
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

// Form Field Component
const FormField = ({ icon: Icon, label, children, required = false }) => (
  <div className="mb-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon style={{ color: THEME.primary, fontSize: 12 }} />
      <Text className="text-xs font-medium text-gray-600 uppercase tracking-wide">
        {label}
        {required && <span style={{ color: "#ef4444" }}> *</span>}
      </Text>
    </div>
    {children}
  </div>
);

// Radio Option Card Component
const RadioOptionCard = ({
  value,
  currentValue,
  onChange,
  icon: Icon,
  label,
  description,
}) => {
  const isSelected = currentValue === value;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onChange({ target: { value } })}
      className="flex-1 cursor-pointer rounded-xl p-4 transition-all"
      style={{
        background: isSelected ? "rgba(37,99,235,0.08)" : "#f9fafb",
        border: `2px solid ${isSelected ? THEME.primary : "#e5e7eb"}`,
      }}
    >
      <div className="flex items-start gap-3">
        <Radio value={value} checked={isSelected} style={{ marginTop: 2 }} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Icon
              style={{
                color: isSelected ? THEME.primary : "#9ca3af",
                fontSize: 16,
              }}
            />
            <Text
              strong
              style={{
                color: isSelected ? THEME.primaryDark : "#374151",
                fontSize: 14,
              }}
            >
              {label}
            </Text>
          </div>
          {description && (
            <Text className="text-xs text-gray-500 mt-1 block">
              {description}
            </Text>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const BillingManagementModal = ({ handleClose, clientUsername }) => {
  const [billingOption, setBillingOption] = useState("submission");
  const [billingType, setBillingType] = useState("conversation");
  const [contactCount, setContactCount] = useState("");
  const [sent, setSent] = useState("");
  const [delivered, setDelivered] = useState("");
  const [read, setRead] = useState("");
  const [count, setCount] = useState("");
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBillingOptionChange = (e) => {
    setBillingOption(e.target.value);
    // Reset fields when switching
    setContactCount("");
    setSent("");
    setDelivered("");
    setRead("");
  };

  const handleBillingTypeChange = (e) => {
    setBillingType(e.target.value);
  };

  const handleSave = async () => {
    // Validation
    if (billingOption === "submission" && !contactCount) {
      message.error("Please enter contact count");
      return;
    }
    if (billingOption === "delivered" && (!sent || !delivered || !read)) {
      message.error("Please fill in all delivery fields");
      return;
    }
    if (!count) {
      message.error("Please enter count");
      return;
    }

    setLoading(true);

    const payload = {
      username: clientUsername,
      billing_on:
        billingOption === "submission"
          ? "Submission message"
          : "Delivered message",
      contact_count:
        billingOption === "submission"
          ? parseFloat(contactCount)
          : parseFloat(contactCount) || 0,
      billing_type:
        billingType === "transaction"
          ? "Transaction based"
          : "Conversation based",
      count: parseFloat(count),
      remark,
    };

    if (billingOption === "delivered") {
      payload.sent = parseFloat(sent);
      payload.delivered = parseFloat(delivered);
      payload.read = parseFloat(read);
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVICE3_URL}/api/billing-forms`,
        payload,
      );

      if (response.status === 201) {
        message.success("Billing data saved successfully!");
        handleClose();
      } else {
        message.error("Failed to save billing data.");
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-[900px] mx-auto max-h-[85vh] overflow-y-auto scrollbar-hide"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between mb-6 pb-4"
        style={{ borderBottom: "1px solid rgba(37,99,235,0.15)" }}
      >
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{
              background: THEME.gradient,
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
          >
            <DollarOutlined style={{ fontSize: 28, color: "white" }} />
          </motion.div>
          <div>
            <Title level={4} style={{ marginBottom: 0, color: "#1f2937" }}>
              Billing Form
            </Title>
            <Text className="text-sm text-gray-500">
              Configure billing settings for client
            </Text>
          </div>
        </div>
      </div>

      {/* User Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl p-4 mb-6"
        style={{
          background: THEME.gradientLight,
          border: "1px solid rgba(37,99,235,0.15)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(37,99,235,0.2)" }}
          >
            <UserOutlined style={{ color: THEME.primaryDark, fontSize: 18 }} />
          </div>
          <div>
            <Text className="text-xs text-gray-500 block">Client Username</Text>
            <Text strong style={{ fontSize: 16, color: "#1f2937" }}>
              {clientUsername}
            </Text>
          </div>
        </div>
      </motion.div>

      {/* Billing On Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-xl p-5 mb-4"
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <SectionHeader
          icon={MessageOutlined}
          title="Billing On"
          subtitle="Select when to apply billing"
        />

        <Radio.Group
          value={billingOption}
          onChange={handleBillingOptionChange}
          className="w-full"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <RadioOptionCard
              value="submission"
              currentValue={billingOption}
              onChange={handleBillingOptionChange}
              icon={SendOutlined}
              label="Submission Message"
              description="Bill on message submission"
            />
            <RadioOptionCard
              value="delivered"
              currentValue={billingOption}
              onChange={handleBillingOptionChange}
              icon={CheckCircleOutlined}
              label="Delivered Message"
              description="Bill on successful delivery"
            />
          </div>
        </Radio.Group>

        {/* Conditional Fields */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
          className="mt-4"
        >
          {billingOption === "submission" && (
            <FormField icon={NumberOutlined} label="All Contact Count" required>
              <Input
                type="number"
                placeholder="Enter total contact count"
                value={contactCount}
                onChange={(e) => setContactCount(e.target.value)}
                size="large"
                className="rounded-lg"
                style={{ borderColor: "rgba(37,99,235,0.3)" }}
                prefix={
                  <NumberOutlined style={{ color: "#9ca3af", fontSize: 14 }} />
                }
              />
            </FormField>
          )}

          {billingOption === "delivered" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField icon={SendOutlined} label="Sent" required>
                <Input
                  type="number"
                  placeholder="Sent count"
                  value={sent}
                  onChange={(e) => setSent(e.target.value)}
                  size="large"
                  className="rounded-lg"
                  style={{ borderColor: "rgba(37,99,235,0.3)" }}
                  prefix={
                    <SendOutlined style={{ color: "#9ca3af", fontSize: 14 }} />
                  }
                />
              </FormField>

              <FormField icon={CheckCircleOutlined} label="Delivered" required>
                <Input
                  type="number"
                  placeholder="Delivered count"
                  value={delivered}
                  onChange={(e) => setDelivered(e.target.value)}
                  size="large"
                  className="rounded-lg"
                  style={{ borderColor: "rgba(37,99,235,0.3)" }}
                  prefix={
                    <CheckCircleOutlined
                      style={{ color: "#9ca3af", fontSize: 14 }}
                    />
                  }
                />
              </FormField>

              <FormField icon={EyeOutlined} label="Read" required>
                <Input
                  type="number"
                  placeholder="Read count"
                  value={read}
                  onChange={(e) => setRead(e.target.value)}
                  size="large"
                  className="rounded-lg"
                  style={{ borderColor: "rgba(37,99,235,0.3)" }}
                  prefix={
                    <EyeOutlined style={{ color: "#9ca3af", fontSize: 14 }} />
                  }
                />
              </FormField>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Billing Type Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl p-5 mb-4"
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <SectionHeader
          icon={SwapOutlined}
          title="Billing Type"
          subtitle="Choose billing calculation method"
        />

        <Radio.Group
          value={billingType}
          onChange={handleBillingTypeChange}
          className="w-full"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <RadioOptionCard
              value="transaction"
              currentValue={billingType}
              onChange={handleBillingTypeChange}
              icon={TransactionOutlined}
              label="Transaction Based"
              description="Bill per transaction"
            />
            <RadioOptionCard
              value="conversation"
              currentValue={billingType}
              onChange={handleBillingTypeChange}
              icon={MessageOutlined}
              label="Conversation Based"
              description="Bill per conversation"
            />
          </div>
        </Radio.Group>
      </motion.div>

      {/* Additional Details Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-xl p-5"
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <SectionHeader
          icon={FormOutlined}
          title="Additional Details"
          subtitle="Enter billing details"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField icon={NumberOutlined} label="Count" required>
            <Input
              type="number"
              placeholder="Enter count value"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              size="large"
              className="rounded-lg"
              style={{ borderColor: "rgba(37,99,235,0.3)" }}
              prefix={
                <NumberOutlined style={{ color: "#9ca3af", fontSize: 14 }} />
              }
            />
          </FormField>

          <FormField icon={FileTextOutlined} label="Remark">
            <TextArea
              placeholder="Add any notes or remarks..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              className="rounded-lg"
              style={{ borderColor: "rgba(37,99,235,0.3)" }}
            />
          </FormField>
        </div>
      </motion.div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl p-4 mt-4"
        style={{
          background: THEME.gradientLight,
          border: "1px solid rgba(37,99,235,0.15)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: THEME.primary }}
              />
              <Text className="text-sm text-gray-600">
                Billing On:{" "}
                <Text strong style={{ color: THEME.primaryDark }}>
                  {billingOption === "submission" ? "Submission" : "Delivered"}
                </Text>
              </Text>
            </div>
            <Divider type="vertical" />
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "#8b5cf6" }}
              />
              <Text className="text-sm text-gray-600">
                Type:{" "}
                <Text strong style={{ color: "#8b5cf6" }}>
                  {billingType === "transaction"
                    ? "Transaction"
                    : "Conversation"}
                </Text>
              </Text>
            </div>
          </div>
          {count && (
            <div
              className="px-4 py-2 rounded-lg"
              style={{ background: "rgba(37,99,235,0.15)" }}
            >
              <Text className="text-xs text-gray-500">Count</Text>
              <Text
                strong
                className="block"
                style={{ color: THEME.primaryDark, fontSize: 16 }}
              >
                {count}
              </Text>
            </div>
          )}
        </div>
      </motion.div>

      {/* Footer Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex justify-end gap-3 mt-6 pt-4"
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
            Cancel
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="primary"
            icon={loading ? null : <SaveOutlined />}
            onClick={handleSave}
            loading={loading}
            className="h-10 px-6 rounded-xl font-medium"
            style={{
              background: THEME.gradient,
              border: "none",
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
          >
            {loading ? "Saving..." : "Save Billing"}
          </Button>
        </motion.div>
      </motion.div>

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{__html: `
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

        .ant-input-lg {
          border-radius: 10px;
        }

        /* TextArea styling */
        .ant-input-textarea textarea {
          border-radius: 10px;
        }

        .ant-input-textarea textarea:hover,
        .ant-input-textarea textarea:focus {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1) !important;
        }

        /* Radio styling */
        .ant-radio-checked .ant-radio-inner {
          background-color: #2563EB !important;
          border-color: #2563EB !important;
        }

        .ant-radio:hover .ant-radio-inner {
          border-color: #2563EB !important;
        }

        .ant-radio-checked::after {
          border-color: #2563EB !important;
        }

        /* Button styling */
        .ant-btn-primary:hover {
          box-shadow: 0 6px 16px rgba(3, 207, 101, 0.35) !important;
        }

        /* Divider */
        .ant-divider-vertical {
          height: 20px;
          border-color: rgba(3, 207, 101, 0.2);
        }

        /* Spin */
        .ant-spin-dot-item {
          background-color: #2563EB !important;
        }

        /* Scrollbar hide */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Input number hide arrows */
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}} />
    </motion.div>
  );
};

export default BillingManagementModal;

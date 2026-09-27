import { useState, useContext } from "react";
import PropTypes from "prop-types";

import { Form, Input, Button, message, Row, Col, Typography } from "antd";
import {
  EyeInvisibleOutlined,
  EyeTwoTone,
  LockOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import { changeClientPassword, changeOwnPassword } from "../../services/api";
import { AppContext } from "../../utils/Context";
import handleApiError from "../../utils/errorHandler";
import Modal from "../Modal";

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

const PasswordValidationRule = ({ rule, isValid }) => {
  return (
    <div className="flex items-center mb-2">
      <span className="mr-2">
        {isValid ? (
          <svg
            className="w-4 h-4 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </span>
      <span
        className={`text-sm ${isValid ? "text-green-600" : "text-gray-500"}`}
      >
        {rule.message}
      </span>
    </div>
  );
};

PasswordValidationRule.propTypes = {
  rule: PropTypes.object.isRequired,
  isValid: PropTypes.bool.isRequired,
};

const passwordValidationRulesData = [
  { key: "passLength", message: "At least 8 characters long" },
  { key: "upperCase", message: "At least one uppercase letter" },
  { key: "lowerCase", message: "At least one lowercase letter" },
  { key: "num", message: "At least one digit" },
  { key: "specialChar", message: "At least one special character (@$!%*#?&)" },
];

const ChangePasswordModal = ({
  open,
  onClose,
  username,
  clientId,
  onSuccess,
  title = "Update Password",
}) => {
  const { user } = useContext(AppContext);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");

  const validatePassword = (password) => {
    return {
      passLength: password.length >= 8,
      upperCase: /[A-Z]/.test(password),
      lowerCase: /[a-z]/.test(password),
      num: /[0-9]/.test(password),
      specialChar: /[@$!%*#?&]/.test(password),
    };
  };

  const handleSubmit = async (values) => {
    const { currentPassword, newPassword, confirmPassword } = values;

    // Validation checks
    if (!newPassword || !confirmPassword) {
      message.error("Both password fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      message.error("Passwords do not match.");
      return;
    }

    const validationResults = validatePassword(newPassword);
    const isValid = Object.values(validationResults).every(Boolean);

    if (!isValid) {
      message.error("Please meet all password requirements.");
      return;
    }

    setLoading(true);

    try {
      let response;

      // If clientId is provided, change client password; otherwise change own password
      if (clientId) {
        response = await changeClientPassword(clientId, newPassword);
      } else {
        // For own password change, current password is required
        if (!currentPassword) {
          message.error("Current password is required.");
          setLoading(false);
          return;
        }
        response = await changeOwnPassword(
          currentPassword,
          newPassword,
          confirmPassword,
        );
      }

      if (response?.data?.success) {
        message.success(
          response?.data?.message || "Password changed successfully",
        );
        form.resetFields();
        setPassword("");
        onSuccess?.();
        onClose();
      } else {
        message.error(response?.data?.message || "Failed to change password.");
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setPassword("");
    onClose();
  };

  return (
    <Modal isModalOpen={open} closeModal={onClose} width="550px" height="auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="-mx-6 -mt-6"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{
            borderBottom: "1px solid rgba(37,99,235,0.1)",
            background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
            boxShadow: "0 1px 8px rgba(37,99,235,0.06)",
          }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: THEME.gradient,
                boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
              }}
            >
              <LockOutlined style={{ fontSize: 18, color: "white" }} />
            </motion.div>
            <Title level={4} className="!mb-0" style={{ color: "#1f2937" }}>
              {title}
            </Title>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          className="p-6"
        >
          {!clientId && (
            <Form.Item
              label={
                <span className="text-gray-600 font-medium">
                  Current Password
                </span>
              }
              name="currentPassword"
              rules={[
                {
                  required: true,
                  message: "Please enter your current password",
                },
              ]}
            >
              <Input.Password
                placeholder="Enter your current password"
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
                size="large"
                className="h-10 rounded-lg"
              />
            </Form.Item>
          )}

          <Form.Item
            label={
              <span className="text-gray-600 font-medium">New Password</span>
            }
            name="newPassword"
            rules={[
              { required: true, message: "Please enter new password" },
              { min: 8, message: "Password must be at least 8 characters" },
            ]}
          >
            <Input.Password
              placeholder="Enter new password"
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
              onChange={(e) => setPassword(e.target.value)}
              size="large"
              className="h-10 rounded-lg"
            />
          </Form.Item>

          <Form.Item
            label={
              <span className="text-gray-600 font-medium">
                Confirm Password
              </span>
            }
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Please confirm password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password
              placeholder="Confirm new password"
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
              size="large"
              className="h-10 rounded-lg"
            />
          </Form.Item>

          {password?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-4 p-4 rounded-lg border"
              style={{
                background: THEME.gradientLight,
                borderColor: "rgba(37,99,235,0.2)",
              }}
            >
              <div className="text-sm font-semibold mb-3 text-gray-700">
                Password Requirements:
              </div>
              {passwordValidationRulesData.map((rule) => {
                const validationResults = validatePassword(password);
                return (
                  <PasswordValidationRule
                    key={rule.key}
                    rule={rule}
                    isValid={validationResults[rule.key]}
                  />
                );
              })}
            </motion.div>
          )}

          {/* Action Buttons */}
          <Row gutter={12} className="mt-6">
            <Col xs={24} sm={12}>
              <Button
                onClick={onClose}
                disabled={loading}
                size="large"
                className="w-full h-10 rounded-lg font-medium"
              >
                Cancel
              </Button>
            </Col>
            <Col xs={24} sm={12}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                className="w-full h-10 rounded-lg font-medium"
                style={{ background: THEME.gradient, border: "none" }}
              >
                Update Password
              </Button>
            </Col>
          </Row>
        </Form>
      </motion.div>
    </Modal>
  );
};

ChangePasswordModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  username: PropTypes.string.isRequired,
  clientId: PropTypes.number,
  onSuccess: PropTypes.func,
  title: PropTypes.string,
};

export default ChangePasswordModal;

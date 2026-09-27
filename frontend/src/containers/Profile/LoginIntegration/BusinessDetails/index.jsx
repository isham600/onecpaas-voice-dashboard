import React, { useState, useEffect } from "react";
import { Input, Button, Form, message } from "antd";
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { AnimatePresence, motion } from "framer-motion";
import { profile, clearProfileMeCache } from "../../../../services/api";

const { TextArea } = Input;

// Helper to detect if impersonation status changed
const getImpersonationKey = () => {
  try {
    const impersonating = JSON.parse(localStorage.getItem("_impersonating"));
    return impersonating?.username || "main";
  } catch {
    return "main";
  }
};

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(29,78,216,0.04) 100%)",
};

const BusinessDetails = ({ user }) => {
  const [form] = Form.useForm();
  const [profileUser, setProfileUser] = useState({});
  const [formData, setFormData] = useState({
    username: user?.username,
    action: "update",
  });
  const [isEditable, setIsEditable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [impersonationKey, setImpersonationKey] = useState(
    getImpersonationKey()
  );

  // Configure message
  message.config({
    top: 100,
    duration: 3,
    maxCount: 3,
  });

  // Detect impersonation changes and reload data
  useEffect(() => {
    const currentKey = getImpersonationKey();
    if (currentKey !== impersonationKey) {
      setImpersonationKey(currentKey);
      clearProfileMeCache();
    }
    fetchUser();
  }, [impersonationKey]);

  const fetchUser = async () => {
    try {
      clearProfileMeCache();
      const response = await profile({
        username: user.username,
        action: "read",
      });

      const profileData = response?.data?.user?.profile;
      setProfileUser(profileData);

      if (profileData) {
        const newFormData = {
          business_ID: profileData.business_ID,
          business_hours_of_operation: profileData.business_hours_of_operation,
          business_address: profileData.business_address,
          username: user?.username,
          action: "update",
        };
        setFormData(newFormData);
        form.setFieldsValue(newFormData);
      }
    } catch (error) {
      message.error("Failed to load business details");
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (values) => {
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append("username", user?.username);
      formDataToSend.append("action", "update");
      formDataToSend.append("business_ID", formData?.business_ID || "");
      formDataToSend.append(
        "business_hours_of_operation",
        formData?.business_hours_of_operation || ""
      );
      formDataToSend.append(
        "business_address",
        formData?.business_address || ""
      );

      const response = await profile(formDataToSend);
      setIsEditable(false);
      message.success("Business details updated successfully");
      fetchUser();
    } catch {
      message.error("Failed to update business details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Compact edit button row */}
      <div className="flex justify-end mb-4">
        <Button
          type={isEditable ? "default" : "primary"}
          icon={isEditable ? <CloseOutlined /> : <EditOutlined />}
          onClick={() => setIsEditable(!isEditable)}
          className="rounded-xl font-medium"
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
          {isEditable ? "Cancel Edit" : "Edit Details"}
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleUpdate}
        initialValues={formData}
      >
        {/* 2-column grid: Location & Hours | Registration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Left card — Location & Hours */}
          <div
            className="bg-white rounded-2xl border border-gray-100 p-5"
            style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: THEME.gradientLight }}
              >
                <EnvironmentOutlined
                  style={{ color: "#2563EB", fontSize: 13 }}
                />
              </div>
              <span
                className="text-sm font-semibold"
                style={{ color: "#1f2937" }}
              >
                Location &amp; Hours
              </span>
            </div>

            <Form.Item
              label={
                <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  Business Address
                </span>
              }
              name="business_address"
              rules={[
                {
                  max: 500,
                  message: "Address cannot exceed 500 characters",
                },
              ]}
              extra={
                <span className="text-xs text-gray-400">
                  Enter your complete business address including city, state,
                  and postal code
                </span>
              }
            >
              <TextArea
                value={formData.business_address}
                onChange={(e) =>
                  handleChange("business_address", e.target.value)
                }
                disabled={!isEditable}
                placeholder="Enter your complete business address"
                rows={3}
                maxLength={500}
                showCount
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              label={
                <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  Operating Hours
                </span>
              }
              name="business_hours_of_operation"
              rules={[
                {
                  max: 200,
                  message: "Hours cannot exceed 200 characters",
                },
              ]}
              extra={
                <span className="text-xs text-gray-400">
                  Example: Mon-Fri: 9:00 AM - 6:00 PM, Sat: 10:00 AM - 4:00
                  PM, Sun: Closed
                </span>
              }
              style={{ marginBottom: 0 }}
            >
              <TextArea
                value={formData.business_hours_of_operation}
                onChange={(e) =>
                  handleChange("business_hours_of_operation", e.target.value)
                }
                disabled={!isEditable}
                placeholder="Enter your business hours (e.g., Mon-Fri: 9:00 AM - 6:00 PM)"
                rows={3}
                maxLength={200}
                showCount
                className="rounded-lg"
              />
            </Form.Item>
          </div>

          {/* Right card — Registration */}
          <div
            className="bg-white rounded-2xl border border-gray-100 p-5"
            style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: THEME.gradientLight }}
              >
                <IdcardOutlined style={{ color: "#2563EB", fontSize: 13 }} />
              </div>
              <span
                className="text-sm font-semibold"
                style={{ color: "#1f2937" }}
              >
                Registration
              </span>
            </div>

            <Form.Item
              label={
                <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  Business ID
                  <span
                    className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-normal normal-case"
                    style={{
                      background: "rgba(37,99,235,0.1)",
                      color: "#1D4ED8",
                    }}
                  >
                    Optional
                  </span>
                </span>
              }
              name="business_ID"
              rules={[
                {
                  max: 50,
                  message: "Business ID cannot exceed 50 characters",
                },
              ]}
            >
              <Input
                value={formData.business_ID}
                onChange={(e) => handleChange("business_ID", e.target.value)}
                disabled={!isEditable}
                placeholder="Enter your business registration ID or tax ID"
                prefix={<IdcardOutlined style={{ color: "#2563EB" }} />}
                maxLength={50}
                size="large"
                className="rounded-lg"
              />
            </Form.Item>

            {/* Inline tip */}
            <div
              className="rounded-xl p-3 mt-1"
              style={{
                background: THEME.gradientLight,
                border: "1px solid rgba(37,99,235,0.12)",
              }}
            >
              <p className="text-xs text-gray-500 mb-0 leading-relaxed">
                <span className="font-semibold" style={{ color: "#1D4ED8" }}>
                  Tip:
                </span>{" "}
                This is an optional field for your official business registration
                number, tax ID, or other government-issued business identifier.
              </p>
            </div>
          </div>
        </div>

        {/* Save bar */}
        <AnimatePresence>
          {isEditable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-4"
            >
              <div
                className="rounded-2xl p-4 flex items-center justify-between gap-4 border"
                style={{
                  background: THEME.gradientLight,
                  borderColor: "rgba(37,99,235,0.15)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(37,99,235,0.12)" }}
                  >
                    <SaveOutlined style={{ color: "#2563EB", fontSize: 14 }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-0">
                      Unsaved changes
                    </p>
                    <p className="text-xs text-gray-400">
                      Click Save to apply your edits
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsEditable(false)}
                    className="rounded-xl"
                    icon={<CloseOutlined />}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    htmlType="submit"
                    loading={loading}
                    className="rounded-xl font-semibold"
                    style={{
                      background: THEME.gradient,
                      border: "none",
                      boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Form>
    </div>
  );
};

export default BusinessDetails;

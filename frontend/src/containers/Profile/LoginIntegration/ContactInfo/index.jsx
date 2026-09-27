import { useState, useEffect } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { Input, Button, Form, message } from "antd";
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { profile, clearProfileMeCache } from "../../../../services/api";

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
  gradientLight: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(29,78,216,0.04) 100%)",
};

const ContactInfo = ({ user }) => {
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({ username: user?.username, action: "update" });
  const [isEditable, setIsEditable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [impersonationKey, setImpersonationKey] = useState(getImpersonationKey());

  message.config({ top: 100, duration: 3, maxCount: 3 });

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
      const response = await profile({ username: user?.username, action: "read" });
      const profileData = response?.data?.user?.profile;
      if (profileData) {
        const newFormData = {
          phone_number: profileData.phone_number,
          business_email_address: profileData.business_email_address,
          business_website: profileData.business_website,
          username: user?.username,
          action: "update",
        };
        setFormData(newFormData);
        form.setFieldsValue(newFormData);
      }
    } catch {
      message.error("Failed to load contact information");
    }
  };

  useEffect(() => { fetchUser(); }, []);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      formDataToSend.append("username", user?.username);
      formDataToSend.append("action", "update");
      formDataToSend.append("phone_number", formData?.phone_number || "");
      formDataToSend.append("business_email_address", formData?.business_email_address || "");
      formDataToSend.append("business_website", formData?.business_website || "");
      await profile(formDataToSend);
      setIsEditable(false);
      message.success("Contact information updated successfully");
      fetchUser();
    } catch (error) {
      if (error?.response?.data?.message?.phone_number) {
        error.response.data.message.phone_number.forEach((msg) => message.error(msg));
      }
      if (error?.response?.data?.message?.business_email_address) {
        error.response.data.message.business_email_address.forEach((msg) => message.error(msg));
      }
      if (error?.response?.data?.message?.business_website) {
        error.response.data.message.business_website.forEach((msg) => message.error(msg));
      }
      if (!error?.response?.data?.message) {
        message.error("Failed to update contact information");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleUpdate}>
      {/* Edit control */}
      <div className="flex justify-end mb-4">
        <Button
          type={isEditable ? "default" : "primary"}
          icon={isEditable ? <CloseOutlined /> : <EditOutlined />}
          onClick={() => setIsEditable(!isEditable)}
          className="rounded-xl font-medium"
          style={
            isEditable
              ? { borderColor: "#ef4444", color: "#ef4444" }
              : { background: THEME.gradient, border: "none", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }
          }
        >
          {isEditable ? "Cancel" : "Edit Contact Info"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Left — Phone & Email */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: THEME.gradientLight }}>
              <PhoneOutlined style={{ color: THEME.primary, fontSize: 13 }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: "#1f2937" }}>Phone & Email</span>
          </div>

          <Form.Item
            label={<span className="text-xs font-medium uppercase tracking-wide text-gray-500">Business Phone</span>}
            name="phone_number"
            rules={[{ required: true, message: "Please enter phone number" }]}
            extra={<span className="text-xs text-gray-400">Include country code for international format</span>}
          >
            <div className="phone-input-themed">
              <PhoneInput
                country="in"
                enableSearch
                placeholder="Enter your phone number"
                value={formData.phone_number}
                onChange={(value) => handleChange("phone_number", value)}
                disabled={!isEditable}
                containerStyle={{ width: "100%" }}
                inputStyle={{
                  width: "100%",
                  height: "44px",
                  fontSize: "14px",
                  borderRadius: "10px",
                  border: isEditable ? "1px solid #d9d9d9" : "1px solid #f0f0f0",
                  backgroundColor: isEditable ? "#ffffff" : "#f9fafb",
                  paddingLeft: "48px",
                }}
                buttonStyle={{
                  borderRadius: "10px 0 0 10px",
                  border: isEditable ? "1px solid #d9d9d9" : "1px solid #f0f0f0",
                  backgroundColor: isEditable ? "#fff" : "#f9fafb",
                }}
                dropdownStyle={{ borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
              />
            </div>
          </Form.Item>

          <Form.Item
            label={<span className="text-xs font-medium uppercase tracking-wide text-gray-500">Business Email</span>}
            name="business_email_address"
            rules={[{ type: "email", message: "Please enter a valid email address" }]}
            extra={<span className="text-xs text-gray-400">Used for business correspondence</span>}
            style={{ marginBottom: 0 }}
          >
            <Input
              value={formData.business_email_address}
              onChange={(e) => handleChange("business_email_address", e.target.value)}
              disabled={!isEditable}
              placeholder="Enter your business email address"
              prefix={<MailOutlined style={{ color: isEditable ? THEME.primary : "#9ca3af" }} />}
              size="large"
              className="rounded-lg"
              style={!isEditable ? { background: "#f9fafb", color: "#374151" } : {}}
            />
          </Form.Item>
        </motion.div>

        {/* Right — Online Presence */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: THEME.gradientLight }}>
              <GlobalOutlined style={{ color: THEME.primary, fontSize: 13 }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: "#1f2937" }}>Online Presence</span>
          </div>

          <Form.Item
            label={<span className="text-xs font-medium uppercase tracking-wide text-gray-500">Website URL</span>}
            name="business_website"
            rules={[{ type: "url", message: "Please enter a valid website URL" }]}
            extra={<span className="text-xs text-gray-400">Include https:// for secure URLs</span>}
          >
            <Input
              value={formData.business_website}
              onChange={(e) => handleChange("business_website", e.target.value)}
              disabled={!isEditable}
              placeholder="https://example.com"
              prefix={<GlobalOutlined style={{ color: isEditable ? THEME.primary : "#9ca3af" }} />}
              size="large"
              className="rounded-lg"
              style={!isEditable ? { background: "#f9fafb", color: "#374151" } : {}}
            />
          </Form.Item>
        </motion.div>
      </div>

      {/* Save bar */}
      <AnimatePresence>
        {isEditable && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl p-4 flex items-center justify-between gap-4 border"
            style={{ background: THEME.gradientLight, borderColor: "rgba(37,99,235,0.15)" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(37,99,235,0.12)" }}>
                <SaveOutlined style={{ color: THEME.primary, fontSize: 14 }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-0">Unsaved changes</p>
                <p className="text-xs text-gray-400">Click Save to apply your edits</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsEditable(false)} className="rounded-xl" icon={<CloseOutlined />} style={{ borderColor: "#e5e7eb" }}>
                Cancel
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                htmlType="submit"
                loading={loading}
                className="rounded-xl font-semibold"
                style={{ background: THEME.gradient, border: "none", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
              >
                Save Changes
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Form>
  );
};

export default ContactInfo;

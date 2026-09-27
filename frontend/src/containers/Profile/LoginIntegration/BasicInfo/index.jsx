import { useState, useEffect } from "react";
import {
  Input,
  Button,
  Select,
  Form,
  Typography,
  Alert,
  message,
} from "antd";
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  MailOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(29,78,216,0.04) 100%)",
};

const baseURL = import.meta.env.VITE_BASE_URL;

const verticalMapping = {
  ALCOHOL: "Alcoholic Beverages",
  APPAREL: "Clothing and Apparel",
  AUTO: "Automotive",
  BEAUTY: "Beauty, Spa and Salon",
  EDU: "Education",
  ENTERTAIN: "Entertainment",
  EVENT_PLAN: "Event Planning and Service",
  FINANCE: "Finance and Banking",
  GOVT: "Public Service",
  GROCERY: "Food and Grocery",
  HEALTH: "Medical and Health",
  HOTEL: "Hotel and Lodging",
  NONPROFIT: "Non-profit",
  ONLINE_GAMBLING: "Online Gambling & Gaming",
  OTC_DRUGS: "Over-the-Counter Drugs",
  OTHER: "Other",
  PHYSICAL_GAMBLING: "Non-Online Gambling & Gaming (E.g. Brick and mortar)",
  PROF_SERVICES: "Professional Services",
  RESTAURANT: "Restaurant",
  RETAIL: "Shopping and Retail",
  TRAVEL: "Travel and Transportation",
};

const BasicInfo = ({ user }) => {
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({
    about: "",
    description: "",
    vertical: "",
    email: "",
    websites: "",
    messaging_product: "whatsapp",
  });
  const [isEditable, setIsEditable] = useState(false);
  const [loading, setLoading] = useState(false);

  message.config({ top: 100, duration: 3, maxCount: 3 });

  const fetchUser = async () => {
    try {
      const response = await axios.get(
        `${baseURL}/api/invoice/auth/get-business-profile`,
        { params: { username: user?.username } },
      );
      const profileData = response.data?.data?.data?.[0];
      if (profileData) {
        const newFormData = {
          about: profileData.about || "business",
          description: profileData.description || "",
          vertical: profileData.vertical || "",
          email: profileData.email || "",
          websites: profileData.websites?.join(", ") || "",
          messaging_product: "whatsapp",
        };
        setFormData(newFormData);
        form.setFieldsValue(newFormData);
      }
    } catch {
      message.error("Failed to load profile data");
    }
  };

  useEffect(() => { fetchUser(); }, []);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      await axios.post(`${baseURL}/api/invoice/auth/update-business-profile`, {
        ...values,
        username: user?.username,
        websites: values.websites
          ? values.websites.split(",").map((w) => w.trim())
          : [],
      });
      setIsEditable(false);
      message.success("Profile updated successfully!");
      fetchUser();
    } catch {
      message.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
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
          {isEditable ? "Cancel" : "Edit Profile"}
        </Button>
      </div>

      {/* Verification badge */}
      <Alert
        message={
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: THEME.primary }} />
            <span className="font-semibold text-sm" style={{ color: THEME.primaryDark }}>
              Official Business Account
            </span>
          </div>
        }
        description={<span className="text-gray-600 text-xs">This account has been verified by our team</span>}
        type="info"
        showIcon
        icon={<CheckCircleOutlined style={{ color: THEME.primary }} />}
        className="mb-4 rounded-xl"
        style={{ background: THEME.gradientLight, border: "1px solid rgba(37,99,235,0.15)" }}
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={formData}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* Left — Business Information */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-white rounded-2xl border border-gray-100 p-5"
            style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: THEME.gradientLight }}>
                <AppstoreOutlined style={{ color: THEME.primary, fontSize: 13 }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: "#1f2937" }}>Business Information</span>
            </div>

            <Form.Item
              label={<span className="text-xs font-medium uppercase tracking-wide text-gray-500">Business Category</span>}
              name="vertical"
            >
              <Select
                value={formData.vertical}
                onChange={(value) => handleChange("vertical", value)}
                disabled={!isEditable}
                placeholder="Select business category"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
                size="large"
                className="w-full"
              >
                <Option value=""><em>Select Category</em></Option>
                {Object.keys(verticalMapping).map((opt) => (
                  <Option key={opt} value={opt}>{verticalMapping[opt]}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label={<span className="text-xs font-medium uppercase tracking-wide text-gray-500">About</span>}
              name="about"
              rules={[
                { required: true, message: "About is required" },
                { max: 139, message: "About cannot exceed 139 characters" },
              ]}
              extra={<span className="text-xs text-gray-400">{formData.about?.length || 0}/139 characters</span>}
            >
              <TextArea
                value={formData.about}
                onChange={(e) => handleChange("about", e.target.value)}
                disabled={!isEditable}
                placeholder="Describe your business"
                maxLength={139}
                rows={3}
                showCount
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-xs font-medium uppercase tracking-wide text-gray-500">Business Email</span>}
              name="email"
              rules={[
                { type: "email", message: "Please enter a valid email" },
                { max: 128, message: "Email cannot exceed 128 characters" },
              ]}
              style={{ marginBottom: 0 }}
            >
              <Input
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={!isEditable}
                placeholder="Enter business email"
                maxLength={128}
                prefix={<MailOutlined style={{ color: isEditable ? THEME.primary : "#9ca3af" }} />}
                size="large"
                className="rounded-lg"
                style={!isEditable ? { background: "#f9fafb", color: "#374151" } : {}}
              />
            </Form.Item>
          </motion.div>

          {/* Right — Additional Information */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-white rounded-2xl border border-gray-100 p-5"
            style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: THEME.gradientLight }}>
                <FileTextOutlined style={{ color: THEME.primary, fontSize: 13 }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: "#1f2937" }}>Additional Information</span>
            </div>

            <Form.Item
              label={<span className="text-xs font-medium uppercase tracking-wide text-gray-500">Business Description</span>}
              name="description"
              rules={[{ max: 512, message: "Description cannot exceed 512 characters" }]}
              extra={<span className="text-xs text-gray-400">{formData.description?.length || 0}/512 characters</span>}
            >
              <TextArea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                disabled={!isEditable}
                placeholder="Detailed description of your business"
                maxLength={512}
                rows={4}
                showCount
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-xs font-medium uppercase tracking-wide text-gray-500">Website URLs</span>}
              name="websites"
              rules={[
                {
                  validator: (_, value) => {
                    if (value) {
                      const websites = value.split(",").map((w) => w.trim());
                      if (websites.length > 2) return Promise.reject("Maximum 2 websites allowed");
                      for (let url of websites) {
                        if (url.length > 256) return Promise.reject("Website URL cannot exceed 256 characters");
                      }
                    }
                    return Promise.resolve();
                  },
                },
              ]}
              extra={<span className="text-xs text-gray-400">Separate multiple URLs with commas (Max: 2 URLs)</span>}
            >
              <TextArea
                value={formData.websites}
                onChange={(e) => handleChange("websites", e.target.value)}
                disabled={!isEditable}
                placeholder="https://example.com, https://shop.example.com"
                rows={2}
                className="rounded-lg"
              />
            </Form.Item>

            <div className="rounded-xl p-3 mt-1" style={{ background: THEME.gradientLight, border: "1px solid rgba(37,99,235,0.1)" }}>
              <div className="flex items-start gap-2">
                <InfoCircleOutlined style={{ color: THEME.primary, fontSize: 13, marginTop: 1 }} />
                <div>
                  <Text className="text-xs font-semibold block" style={{ color: THEME.primaryDark }}>Pro Tip</Text>
                  <Text className="text-[11px] text-gray-500">
                    A complete business profile helps build trust with your customers and improves engagement rates.
                  </Text>
                </div>
              </div>
            </div>
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
    </div>
  );
};

export default BasicInfo;

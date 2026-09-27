import { useState, useEffect } from "react";
import {
  Input,
  Button,
  Select,
  Form,
  Typography,
  message,
  Spin,
} from "antd";
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  LockOutlined,
  CheckCircleFilled,
  CrownOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProfileMe,
  updateAccountInfo,
  clearProfileMeCache,
} from "../../../../services/api";
import ChangePasswordModal from "../../../../components/ChangePasswordModal";
import handleApiError from "../../../../utils/errorHandler";

const { Text } = Typography;
const { Option } = Select;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(29,78,216,0.04) 100%)",
};

const BANNER_PATTERN = `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='white' fill-opacity='0.10'/%3E%3C/svg%3E")`;

const getCurrentToken = () => localStorage.getItem("token") || "";

const roleLabel = (role) =>
  ({ super: "Super Admin", admin: "Admin", agent: "Agent" }[role] ?? "User");

const roleStyle = (role) =>
  ({
    super: { bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
    admin: {
      bg: "rgba(37,99,235,0.08)",
      color: "#2563EB",
      border: "rgba(37,99,235,0.2)",
    },
  }[role] ?? { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" });

const LockedField = ({ name, label, prefix }) => (
  <Form.Item
    label={
      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <LockOutlined style={{ fontSize: 9 }} />
        {label}
      </span>
    }
    name={name}
    extra={<span className="text-[11px] text-gray-400">Cannot be changed</span>}
  >
    <Input
      disabled
      prefix={prefix}
      size="large"
      className="rounded-xl"
      style={{ background: "#f3f4f6", color: "#6b7280" }}
    />
  </Form.Item>
);

const SectionCard = ({ icon, title, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-0"
    style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
  >
    <div className="flex items-center gap-2 mb-4">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: THEME.gradientLight }}
      >
        {icon}
      </div>
      <Text className="text-sm font-semibold" style={{ color: "#1f2937" }}>
        {title}
      </Text>
    </div>
    {children}
  </motion.div>
);

const Credentials = ({ user }) => {
  const [form] = Form.useForm();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [tokenKey, setTokenKey] = useState(getCurrentToken());

  message.config({ top: 100, duration: 3, maxCount: 3 });

  useEffect(() => {
    clearProfileMeCache();
    fetchUserData();
  }, [tokenKey]);

  useEffect(() => {
    const id = setInterval(() => {
      const t = getCurrentToken();
      setTokenKey((p) => (p !== t ? t : p));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const res = await getProfileMe();
      const u = res?.data?.data?.user;
      if (u) {
        setProfileData(u);
        form.setFieldsValue({
          username: u.username || "",
          firstname: u.firstname || "",
          lastname: u.lastname || "",
          email: u.email || "",
          mobile_no: u.mobile_no || "",
          language: u.language || "English",
        });
      }
    } catch (e) {
      handleApiError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await updateAccountInfo({
        firstname: values.firstname,
        lastname: values.lastname,
        email: values.email,
      });
      setIsEditable(false);
      message.success("Profile updated successfully");
      clearProfileMeCache();
      fetchUserData();
    } catch (e) {
      if (e?.errorFields) {
        message.error("Please fix the form errors");
        return;
      }
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profileData) {
      form.setFieldsValue({
        username: profileData.username || "",
        firstname: profileData.firstname || "",
        lastname: profileData.lastname || "",
        email: profileData.email || "",
        mobile_no: profileData.mobile_no || "",
        language: profileData.language || "English",
      });
    }
    setIsEditable(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }

  const fname = profileData?.firstname || "";
  const lname = profileData?.lastname || "";
  const uname = profileData?.username || "";
  const role = user?.role || "user";
  const initials = ((fname[0] || uname[0] || "?") + (lname[0] || "")).toUpperCase();
  const fullName = [fname, lname].filter(Boolean).join(" ") || uname;
  const rs = roleStyle(role);

  return (
    <Form form={form} layout="vertical">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-5"
        style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
      >
        <div
          className="h-32 relative flex-shrink-0"
          style={{ background: THEME.gradient, backgroundImage: BANNER_PATTERN }}
        />

        <div className="px-6 pb-5">
          <div className="flex items-end gap-5 -mt-10 mb-4">
            <div
              className="w-20 h-20 rounded-2xl border-4 border-white flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 select-none"
              style={{
                background: THEME.gradient,
                boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
                letterSpacing: 1,
              }}
            >
              {initials}
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight mb-0.5">
                    {fullName}
                  </h2>
                  <p className="text-sm text-gray-400 mb-2">@{uname}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        background: rs.bg,
                        color: rs.color,
                        border: `1px solid ${rs.border}`,
                      }}
                    >
                      <CrownOutlined style={{ fontSize: 10 }} />
                      {roleLabel(role)}
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        background: "#f0fdf4",
                        color: "#16a34a",
                        border: "1px solid #bbf7d0",
                      }}
                    >
                      <CheckCircleFilled style={{ fontSize: 10 }} />
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mb-4 rounded-2xl border border-gray-100 bg-white px-4 py-4 flex items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="text-sm font-semibold text-gray-900">Security</div>
          <div className="text-xs text-gray-400">Update your account password from here</div>
        </div>
        <Button
          icon={<LockOutlined />}
          onClick={() => setPasswordModalOpen(true)}
          className="rounded-xl font-medium"
          style={{
            borderColor: "rgba(29,78,216,0.35)",
            color: "#FFFFFF",
            background: THEME.gradient,
            boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
          }}
        >
          Change Password
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <SectionCard
          icon={<UserOutlined style={{ color: THEME.primary, fontSize: 13 }} />}
          title="Personal Details"
          delay={0.08}
        >
          <Form.Item
            label={<span className="text-xs font-semibold uppercase tracking-wide text-gray-500">First Name</span>}
            name="firstname"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input
              disabled={!isEditable}
              placeholder="First name"
              size="large"
              className="rounded-xl"
              style={!isEditable ? { background: "#f9fafb", color: "#374151" } : {}}
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Last Name</span>}
            name="lastname"
          >
            <Input
              disabled={!isEditable}
              placeholder="Last name"
              size="large"
              className="rounded-xl"
              style={!isEditable ? { background: "#f9fafb", color: "#374151" } : {}}
            />
          </Form.Item>

          <Form.Item
            label={<span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Language</span>}
            name="language"
            style={{ marginBottom: 0 }}
          >
            <Select
              disabled={!isEditable}
              size="large"
              className="w-full"
              suffixIcon={<GlobalOutlined style={{ color: isEditable ? THEME.primary : "#9ca3af" }} />}
            >
              <Option value="English">English</Option>
              <Option value="Hindi">Hindi</Option>
            </Select>
          </Form.Item>
        </SectionCard>

        <SectionCard
          icon={<MailOutlined style={{ color: THEME.primary, fontSize: 13 }} />}
          title="Account & Contact"
          delay={0.12}
        >
          <LockedField
            name="username"
            label="Username"
            prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
          />

          <LockedField
            name="mobile_no"
            label="Mobile Number"
            prefix={<PhoneOutlined style={{ color: "#9ca3af" }} />}
          />

          <Form.Item
            label={<span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email Address</span>}
            name="email"
            rules={[
              { required: true, message: "Required" },
              { type: "email", message: "Invalid email" },
            ]}
            style={{ marginBottom: 0 }}
          >
            <Input
              disabled={!isEditable}
              placeholder="Email address"
              prefix={<MailOutlined style={{ color: isEditable ? THEME.primary : "#9ca3af" }} />}
              size="large"
              className="rounded-xl"
              style={!isEditable ? { background: "#f9fafb", color: "#374151" } : {}}
            />
          </Form.Item>
        </SectionCard>
      </div>

      <AnimatePresence>
        {isEditable && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
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
                <SaveOutlined style={{ color: THEME.primary, fontSize: 14 }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-0">Unsaved changes</p>
                <p className="text-xs text-gray-400">Click Save to apply your edits</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCancel}
                className="rounded-xl font-medium"
                icon={<CloseOutlined />}
                style={{ borderColor: "#e5e7eb" }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleUpdate}
                loading={saving}
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
          </motion.div>
        )}
      </AnimatePresence>

      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        username={profileData?.username || ""}
        title="Update Your Password"
        onSuccess={() => {
          message.success("Password changed successfully");
          setPasswordModalOpen(false);
        }}
      />
    </Form>
  );
};

export default Credentials;

import { useState, useContext, useEffect } from "react";
import {
  Input,
  Button,
  Select,
  Checkbox,
  Row,
  Col,
  Typography,
  Divider,
  message,
  DatePicker,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  PhoneOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  SafetyOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import dayjs from "dayjs";

import { AppContext } from "../../utils/Context";
import {
  clientCreate,
  clientUpdatePermissions,
  getProfileMe,
} from "../../services/api";
import handleApiError from "../../utils/errorHandler";

const { Title, Text } = Typography;
const { Option } = Select;

// Theme colors - matching BroadcastHistory
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
  danger: "#ef4444",
  warning: "#f59e0b",
};

const NewClientForm = ({ user, closeModal, refetchData }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    userName: "",
    mobile: "",
    email: "",
    role: "",
    password: "",
    password_confirmation: "",
    expiry: null, // Account expiry date
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [permissions, setPermissions] = useState({
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
    // Defaults on for every new client (matches the Permissions.voice_partial_refund
    // DB column default) — this form always PATCHes its full local state right
    // after client creation, which would otherwise silently overwrite that
    // DB default back down to 0.
    voice_partial_refund: 1,
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
  const [permissionsData, setPermissionsData] = useState({});
  const [ClientUsername, setClientusername] = useState();
  const { setReload } = useContext(AppContext);

  const handleInputChange = (e) => {
    let { name, value } = e.target;

    if (name === "userName") {
      value = value.replace(/[^a-zA-Z0-9_]/g, "");
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "userName") {
      setClientusername(value);
    }
  };

  const handlePhoneChange = (value, country) => {
    setFormData((prev) => ({
      ...prev,
      mobile: value,
    }));
  };

  const validatePhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) return false;
    if (cleanPhone.length > 15) return false;
    return true;
  };

  useEffect(() => {
    if (formData.role === "client") {
      setPermissions((prev) => ({
        ...prev,
        can_create_reseller: 0,
        reseller_setting: 0,
        your_integration: 0,
        manage_clients: 0,
        invoice: 0,
        invoice_create: 0,
        billing: 0,
      }));
    }
  }, [formData.role]);

  const handleChange = (key) => {
    setPermissions((prev) => {
      const newVal = prev[key] === 1 ? 0 : 1;
      const updated = { ...prev, [key]: newVal };
      if (key === "sms_credits" && newVal === 0) {
        updated.open_sms_template = 0;
        updated.can_create_smpp_gateway = 0;
        updated.sms_admin = 0;
      }
      if (
        (key === "Whatsapp_marketing" || key === "whatsapp_utility") &&
        newVal === 0
      ) {
        const otherWa =
          key === "Whatsapp_marketing"
            ? prev.whatsapp_utility
            : prev.Whatsapp_marketing;
        if (!otherWa) {
          updated.broadcast_masterreseller = 0;
          updated.broadcast_masterreseller_csv = 0;
        }
      }
      return updated;
    });
  };

  const updatePermission = async (clientId) => {
    if (!clientId || !Object.keys(permissions).length) return;
    try {
      await clientUpdatePermissions(clientId, permissions);
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (!validatePhoneNumber(formData.mobile)) {
      setErrors({ mobile: "Please enter a valid phone number" });
      message.error("Please enter a valid phone number");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      setErrors({ password_confirmation: "Passwords do not match" });
      message.error("Passwords do not match");
      setLoading(false);
      return;
    }

    const payload = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      client_username: formData.userName,
      client_mobile_no: formData.mobile,
      client_email: formData.email,
      user_type: formData.role,
      password: formData.password,
      password_confirmation: formData.password_confirmation,
      country: formData.country || "",
    };

    // Add expiry if set
    if (formData.expiry) {
      payload.expiry = dayjs(formData.expiry).format("YYYY-MM-DD");
    }

    try {
      const response = await clientCreate(payload);

      if (response?.data?.success || response?.data?.data) {
        const clientData =
          response.data.data?.client || response.data.data || {};
        updatePermission(clientData?.id);
        message.success("Client added successfully!");
        setReload((prev) => !prev);
        closeModal();
        if (refetchData) refetchData();
      } else {
        message.error("No data returned from the API");
      }
    } catch (error) {
      if (error.response && error.response.data) {
        const responseMessage = error.response.data.message;
        setReload((prev) => !prev);

        if (typeof responseMessage === "string") {
          if (responseMessage.includes("Duplicate entry")) {
            const match = responseMessage.match(
              /Duplicate entry '(.+?)' for key '(.+?)'/,
            );
            if (match) {
              const duplicateValue = match[1];
              const fieldName = match[2]
                .replace("ci_admin_", "")
                .replace("_unique", "");
              message.error(
                `'${fieldName}' value '${duplicateValue}' already exists.`,
              );
            } else {
              message.error("Duplicate entry detected.");
            }
          } else {
            message.error(responseMessage);
          }
        } else if (typeof responseMessage === "object") {
          const errorMessages = {};
          for (const field in responseMessage) {
            if (responseMessage.hasOwnProperty(field)) {
              errorMessages[field] = responseMessage[field][0];
              message.error(`${field}: ${responseMessage[field][0]}`);
            }
          }
          setErrors(errorMessages);
        } else {
          message.error("An unexpected error occurred. Please try again.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const permissionsActive = async () => {
    try {
      const response = await getProfileMe();
      const statusData = response?.data?.data?.permissions || {};
      setPermissionsData(statusData);
    } catch {
      // permissions fetch failure is non-critical; form still usable
    }
  };

  useEffect(() => {
    permissionsActive();
  }, []);

  const p = permissionsData;

  return (
    <div className="overflow-hidden -mx-6 -mt-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 py-5 mb-6"
        style={{
          background: THEME.gradientLight,
          borderBottom: `1px solid rgba(37,99,235,0.2)`,
        }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: THEME.gradient,
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
          >
            <UserAddOutlined style={{ color: "white", fontSize: 20 }} />
          </motion.div>
          <div>
            <Title level={3} style={{ marginBottom: 0, color: "#1f2937" }}>
              New Client
            </Title>
            <Text className="text-sm text-gray-600">
              Password will be sent to Email ID and Mobile number
            </Text>
          </div>
        </div>
      </motion.div>

      <div className="px-6 pb-6 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
        <form onSubmit={handleSubmit}>
          {/* User Information Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-5 mb-5 border border-gray-100"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `#2563EB15` }}
              >
                <UserOutlined style={{ color: THEME.primary, fontSize: 14 }} />
              </div>
              <Text strong className="text-base text-gray-800">
                User Information
              </Text>
            </div>

            <Row gutter={16}>
              <Col span={12}>
                <div className="mb-4">
                  <Text className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                    First Name
                  </Text>
                  <Input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    prefix={<UserOutlined style={{ color: THEME.primary }} />}
                    className="h-10 rounded-lg"
                    style={{ borderColor: "rgba(37,99,235,0.3)" }}
                    required
                  />
                  {errors.first_name && (
                    <Text type="danger" className="text-xs mt-1">
                      {errors.first_name}
                    </Text>
                  )}
                </div>
              </Col>

              <Col span={12}>
                <div className="mb-4">
                  <Text className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                    Last Name
                  </Text>
                  <Input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                    prefix={<UserOutlined style={{ color: THEME.primary }} />}
                    className="h-10 rounded-lg"
                    style={{ borderColor: "rgba(37,99,235,0.3)" }}
                    required
                  />
                  {errors.last_name && (
                    <Text type="danger" className="text-xs mt-1">
                      {errors.last_name}
                    </Text>
                  )}
                </div>
              </Col>
            </Row>
          </motion.div>

          {/* Authentication Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-5 mb-5 border border-gray-100"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `#2563EB15` }}
              >
                <SafetyOutlined
                  style={{ color: THEME.primary, fontSize: 14 }}
                />
              </div>
              <Text strong className="text-base text-gray-800">
                Authentication Details
              </Text>
            </div>

            <div className="mb-4">
              <Text className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                Username
              </Text>
              <Input
                name="userName"
                value={formData.userName}
                onChange={handleInputChange}
                placeholder="Enter username"
                prefix={<UserOutlined style={{ color: THEME.primary }} />}
                className="h-10 rounded-lg"
                style={{ borderColor: "rgba(37,99,235,0.3)" }}
                required
              />
              {errors.client_username && (
                <Text type="danger" className="text-xs mt-1">
                  {errors.client_username}
                </Text>
              )}
            </div>

            <div className="mb-4">
              <Text className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                Mobile Number
              </Text>
              <div className="phone-input-wrapper">
                <PhoneInput
                  country={"in"}
                  value={formData.mobile}
                  onChange={handlePhoneChange}
                  inputStyle={{
                    width: "100%",
                    height: "40px",
                    fontSize: "14px",
                    border: "1px solid rgba(37,99,235,0.3)",
                    borderRadius: "8px",
                    paddingLeft: "48px",
                  }}
                  containerStyle={{
                    width: "100%",
                  }}
                  buttonStyle={{
                    border: "1px solid rgba(37,99,235,0.3)",
                    borderRadius: "8px 0 0 8px",
                    backgroundColor: "#f9fafb",
                    height: "40px",
                  }}
                  dropdownStyle={{
                    zIndex: 1050,
                  }}
                  placeholder="Enter phone number"
                  enableSearch={true}
                  searchPlaceholder="Search country"
                  preferredCountries={["in", "us", "gb", "ca", "au"]}
                />
              </div>
              {(errors.client_mobile_no || errors.mobile) && (
                <Text type="danger" className="text-xs mt-1">
                  {errors.client_mobile_no || errors.mobile}
                </Text>
              )}
            </div>

            <div className="mb-4">
              <Text className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                Email Address
              </Text>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
                prefix={<MailOutlined style={{ color: THEME.primary }} />}
                className="h-10 rounded-lg"
                style={{ borderColor: "rgba(37,99,235,0.3)" }}
                required
              />
              {errors.client_email && (
                <Text type="danger" className="text-xs mt-1">
                  {errors.client_email}
                </Text>
              )}
            </div>

            <div className="mb-4">
              <Text className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                Role
              </Text>
              <Select
                placeholder="Select Role"
                value={formData.role || undefined}
                onChange={(value) =>
                  handleInputChange({ target: { name: "role", value } })
                }
                className="w-full"
                size="large"
                style={{ borderRadius: "8px" }}
                getPopupContainer={(trigger) => trigger.parentNode}
                required
              >
                <Option value="client">User</Option>
                <Option value="reseller">Reseller</Option>
              </Select>
            </div>

            <div className="mb-4">
              <Text className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                Account Expiry (Optional)
              </Text>
              <DatePicker
                value={formData.expiry ? dayjs(formData.expiry) : null}
                onChange={(date) =>
                  setFormData((prev) => ({
                    ...prev,
                    expiry: date ? date.toDate() : null,
                  }))
                }
                placeholder="Select expiry date"
                format="YYYY-MM-DD"
                className="w-full h-10 rounded-lg"
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
              <Text className="text-xs text-gray-500 mt-1 block">
                Leave empty for no expiration
              </Text>
            </div>

            <Row gutter={16}>
              <Col span={12}>
                <div className="mb-4">
                  <Text className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                    Password
                  </Text>
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password"
                    prefix={<LockOutlined style={{ color: THEME.primary }} />}
                    suffix={
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowPassword(!showPassword)}
                        className="cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOutlined style={{ color: THEME.primary }} />
                        ) : (
                          <EyeInvisibleOutlined style={{ color: "#9ca3af" }} />
                        )}
                      </motion.div>
                    }
                    className="h-10 rounded-lg"
                    style={{ borderColor: "rgba(37,99,235,0.3)" }}
                    required
                  />
                  {errors.password && (
                    <Text type="danger" className="text-xs mt-1">
                      {errors.password}
                    </Text>
                  )}
                </div>
              </Col>

              <Col span={12}>
                <div className="mb-4">
                  <Text className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
                    Confirm Password
                  </Text>
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    name="password_confirmation"
                    value={formData.password_confirmation}
                    onChange={handleInputChange}
                    placeholder="Confirm password"
                    prefix={<LockOutlined style={{ color: THEME.primary }} />}
                    suffix={
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeOutlined style={{ color: THEME.primary }} />
                        ) : (
                          <EyeInvisibleOutlined style={{ color: "#9ca3af" }} />
                        )}
                      </motion.div>
                    }
                    className="h-10 rounded-lg"
                    style={{ borderColor: "rgba(37,99,235,0.3)" }}
                    required
                  />
                  {errors.password_confirmation && (
                    <Text type="danger" className="text-xs mt-1">
                      {errors.password_confirmation}
                    </Text>
                  )}
                </div>
              </Col>
            </Row>
          </motion.div>

          {/* Permissions Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-5 mb-5 border border-gray-100"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `#2563EB15` }}
              >
                <CheckCircleOutlined
                  style={{ color: THEME.primary, fontSize: 14 }}
                />
              </div>
              <Text strong className="text-base text-gray-800">
                Manage Permissions
              </Text>
            </div>

            {/* Channels */}
            <Text
              strong
              className="text-sm block mb-3"
              style={{ color: THEME.primaryDark }}
            >
              Channels
            </Text>

            {/* Voice */}
            {p.voice_credits === 1 && (
              <div
                className="mb-4 rounded-lg border border-indigo-50 p-3"
                style={{ background: "rgba(37,99,235,0.02)" }}
              >
                <Text strong className="text-sm text-gray-700 block mb-2">
                  Voice
                </Text>
                <motion.div whileHover={{ x: 2 }} className="pl-1">
                  <Checkbox
                    checked={permissions.voice_credits === 1}
                    onChange={() => handleChange("voice_credits")}
                    className="permission-checkbox"
                  >
                    <Text className="text-sm text-gray-700">Voice 15</Text>
                  </Checkbox>
                </motion.div>
                {p.voice_pulse30 === 1 && (
                  <motion.div whileHover={{ x: 2 }} className="pl-1">
                    <Checkbox
                      checked={permissions.voice_pulse30 === 1}
                      onChange={() => handleChange("voice_pulse30")}
                      className="permission-checkbox"
                    >
                      <Text className="text-sm text-gray-700">Voice 30</Text>
                    </Checkbox>
                  </motion.div>
                )}
                {/* Refund Unheard Call Time: DB-managed only, always on by
                    default — intentionally no UI toggle here. */}
              </div>
            )}


            {/* AI Video */}
            {p.ai_videos_credits === 1 && (
              <div
                className="mb-4 rounded-lg border border-indigo-50 p-3"
                style={{ background: "rgba(37,99,235,0.02)" }}
              >
                <Text strong className="text-sm text-gray-700 block mb-2">
                  AI Video
                </Text>
                <motion.div whileHover={{ x: 2 }} className="pl-1">
                  <Checkbox
                    checked={permissions.ai_videos_credits === 1}
                    onChange={() => handleChange("ai_videos_credits")}
                    className="permission-checkbox"
                  >
                    <Text className="text-sm text-gray-700">AI Video Credits</Text>
                  </Checkbox>
                </motion.div>
              </div>
            )}

            {/* Reseller Permissions - only shown when role = reseller */}
            {formData.role === "reseller" && (
              <>
                <Divider style={{ borderColor: "rgba(37,99,235,0.2)" }} />
                <Text
                  strong
                  className="text-sm block mb-3"
                  style={{ color: THEME.primaryDark }}
                >
                  Reseller Permissions
                </Text>
                <Row gutter={[16, 10]} className="mb-2">
                  {p.can_create_reseller === 1 && (
                    <Col span={12}>
                      <motion.div whileHover={{ x: 2 }}>
                        <Checkbox
                          checked={permissions.can_create_reseller === 1}
                          onChange={() => handleChange("can_create_reseller")}
                          className="permission-checkbox"
                        >
                          <Text className="text-sm text-gray-700">
                            Can Create Reseller
                          </Text>
                        </Checkbox>
                      </motion.div>
                    </Col>
                  )}
                  {p.reseller_setting === 1 && (
                    <Col span={12}>
                      <motion.div whileHover={{ x: 2 }}>
                        <Checkbox
                          checked={permissions.reseller_setting === 1}
                          onChange={() => handleChange("reseller_setting")}
                          className="permission-checkbox"
                        >
                          <Text className="text-sm text-gray-700">
                            Reseller Setting
                          </Text>
                        </Checkbox>
                      </motion.div>
                    </Col>
                  )}
                  {p.your_integration === 1 && (
                    <Col span={12}>
                      <motion.div whileHover={{ x: 2 }}>
                        <Checkbox
                          checked={permissions.your_integration === 1}
                          onChange={() => handleChange("your_integration")}
                          className="permission-checkbox"
                        >
                          <Text className="text-sm text-gray-700">
                            Reseller Integration
                          </Text>
                        </Checkbox>
                      </motion.div>
                    </Col>
                  )}
                  {p.manage_clients === 1 && (
                    <Col span={12}>
                      <motion.div whileHover={{ x: 2 }}>
                        <Checkbox
                          checked={permissions.manage_clients === 1}
                          onChange={() => handleChange("manage_clients")}
                          className="permission-checkbox"
                        >
                          <Text className="text-sm text-gray-700">
                            Manage Clients
                          </Text>
                        </Checkbox>
                      </motion.div>
                    </Col>
                  )}
                </Row>
              </>
            )}

            {/* Utility */}
            {p.file_manager === 1 && (
              <>
                <Divider style={{ borderColor: "rgba(37,99,235,0.2)" }} />
                <Text
                  strong
                  className="text-sm block mb-3"
                  style={{ color: THEME.primaryDark }}
                >
                  Utility
                </Text>
                <Row gutter={[16, 10]}>
                  <Col span={12}>
                    <motion.div whileHover={{ x: 2 }}>
                      <Checkbox
                        checked={permissions.file_manager === 1}
                        onChange={() => handleChange("file_manager")}
                        className="permission-checkbox"
                      >
                        <Text className="text-sm text-gray-700">
                          File Hosting
                        </Text>
                      </Checkbox>
                    </motion.div>
                  </Col>
                </Row>
              </>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-end gap-3 pt-4"
            style={{ borderTop: "1px solid rgba(37,99,235,0.1)" }}
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="large"
                onClick={closeModal}
                icon={<CloseOutlined />}
                className="h-11 px-6 rounded-xl font-medium"
                style={{
                  borderColor: "#e5e7eb",
                  color: "#6b7280",
                }}
              >
                Cancel
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={loading}
                icon={<CheckCircleOutlined />}
                className="h-11 px-6 rounded-xl font-medium shadow-md hover:shadow-lg"
                style={{
                  background: THEME.gradient,
                  border: "none",
                }}
              >
                {loading ? "Adding Client..." : "Add Client"}
              </Button>
            </motion.div>
          </motion.div>
        </form>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f3f4f6; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2563EB; border-radius: 10px; }

        .ant-input:focus, .ant-input-focused,
        .ant-input-affix-wrapper:focus, .ant-input-affix-wrapper-focused {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.1) !important;
        }
        .ant-input:hover, .ant-input-affix-wrapper:hover { border-color: #2563EB !important; }

        .ant-select:not(.ant-select-disabled):hover .ant-select-selector { border-color: #2563EB !important; }
        .ant-select-focused:not(.ant-select-disabled).ant-select:not(.ant-select-customize-input) .ant-select-selector {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.1) !important;
        }
        .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
          background-color: rgba(37,99,235,0.1) !important;
          color: #1D4ED8 !important;
        }
        .ant-select-item-option-active:not(.ant-select-item-option-disabled) { background-color: rgba(37,99,235,0.05) !important; }

        .permission-checkbox .ant-checkbox-checked .ant-checkbox-inner { background-color: #2563EB !important; border-color: #2563EB !important; }
        .permission-checkbox .ant-checkbox-wrapper:hover .ant-checkbox-inner,
        .permission-checkbox .ant-checkbox:hover .ant-checkbox-inner,
        .permission-checkbox .ant-checkbox-input:focus + .ant-checkbox-inner { border-color: #2563EB !important; }
        .permission-checkbox .ant-checkbox-checked::after { border-color: #2563EB !important; }

        .phone-input-wrapper .react-tel-input .form-control:focus { border-color: #2563EB !important; box-shadow: 0 0 0 2px rgba(37,99,235,0.1) !important; }
        .phone-input-wrapper .react-tel-input .form-control:hover { border-color: #2563EB !important; }
        .phone-input-wrapper .react-tel-input .flag-dropdown:hover { background-color: rgba(37,99,235,0.05) !important; }
        .phone-input-wrapper .react-tel-input .country-list .country:hover { background-color: rgba(37,99,235,0.1) !important; }
        .phone-input-wrapper .react-tel-input .country-list .country.highlight { background-color: rgba(37,99,235,0.15) !important; }

        .ant-btn-default:hover { color: #1D4ED8 !important; border-color: #2563EB !important; }
        .ant-divider-horizontal { margin: 16px 0; }
        .ant-typography { margin-bottom: 0; }
        .ant-typography.ant-typography-danger { display: block; margin-top: 4px; }
      `,
        }}
      />
    </div>
  );
};

export default NewClientForm;

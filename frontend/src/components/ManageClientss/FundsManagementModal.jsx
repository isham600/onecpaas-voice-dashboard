import { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import {
  Input,
  Select,
  Button,
  Radio,
  Typography,
  Spin,
  Tooltip,
  Tag,
  message,
} from "antd";
import {
  WalletOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  AppstoreOutlined,
  DollarOutlined,
  FileTextOutlined,
  SendOutlined,
  CloseOutlined,
  CreditCardOutlined,
  UserOutlined,
  SettingOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

import { clientGetById, clientTransferCredits, getProfileMe } from "../../services/api";
import { AppContext } from "../../utils/Context";
import handleApiError from "../../utils/errorHandler";
import displayChannelName from "../../utils/channelNames";

const { Title, Text } = Typography;
const { TextArea } = Input;

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

// Service Credit Card Component
const ServiceCreditCard = ({ service, index }) => {
  const getServiceColor = (label) => {
    if (label?.toLowerCase().includes("whatsapp")) return "#25D366";
    if (label?.toLowerCase().includes("telegram")) return "#0088cc";
    if (label?.toLowerCase().includes("instagram")) return "#E4405F";
    if (label?.toLowerCase().includes("rcs")) return "#4285F4";
    if (label?.toLowerCase().includes("voice")) return "#f59e0b";
    if (label?.toLowerCase().includes("sms")) return "#8b5cf6";
    return THEME.primary;
  };

  const color = getServiceColor(service.label);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      className="flex items-center justify-between p-3 rounded-xl transition-all"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <AppstoreOutlined style={{ color, fontSize: 14 }} />
        </div>
        <Text className="text-sm font-medium" style={{ color: "#374151" }}>
          {service.label}
        </Text>
      </div>
      <Tag
        style={{
          borderRadius: 8,
          padding: "4px 12px",
          background: color,
          border: "none",
          color: "white",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        {service.clientCredits?.toLocaleString() || 0}
      </Tag>
    </motion.div>
  );
};

// Input Field Component
const FormField = ({ icon: Icon, label, children }) => (
  <div className="mb-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon style={{ color: THEME.primary, fontSize: 12 }} />
      <Text className="text-xs font-medium text-gray-600 uppercase tracking-wide">
        {label}
      </Text>
    </div>
    {children}
  </div>
);

const FundsManagementModal = ({ user, clientId, clientUsername, handleClose }) => {
  const [selectedService, setSelectedService] = useState("");
  const [credits, setCredits] = useState("");
  const [pricePerCredit, setPricePerCredit] = useState("");
  const [actionType, setActionType] = useState("Deduct");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState([]);
  const [mappedServices, setMappedServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingServices, setFetchingServices] = useState(true);

  const { reload, setReload } = useContext(AppContext);

  useEffect(() => {
    const fetchUserServices = async () => {
      setFetchingServices(true);
      try {
        // Fetch admin credits + channels from profile/me (cached)
        const profileResponse = await getProfileMe();
        const profileData = profileResponse?.data?.data || {};
        const creditsData = profileData.credits || {};
        const channelsData = profileData.channels || [];
        // Viewer runs a GSM SMS (virtual) business — real GSM is not transferable
        const isSimLine = Number(profileData.permissions?.Credit_SIM_line ?? 0) === 1;

        // Fetch client data — credits + permissions in one call
        const clientResponse = await clientGetById(clientId);
        const clientData = clientResponse?.data?.data || {};
        const creditsDataClient = clientData.credits || {};
        const clientPermissions = clientData.permissions || {};

        // Build a map from permission key → channel (so branded_whatsapp → channel row)
        const channelByPermission = channelsData.reduce((acc, ch) => {
          acc[ch.permissions] = ch;
          // The GSM SMS channel is keyed on Credit_SIM_line (the reseller's own
          // permission), but users hold Credit_SIM_GSM — map that key too so a
          // GSM SMS user shows up as a transfer target.
          if (ch.back_end_name === "gsm_sim_credit") {
            acc.Credit_SIM_GSM = ch;
          }
          return acc;
        }, {});

        // Active services = client permissions that are 1 AND have a matching channel
        const mapped = Object.entries(clientPermissions)
          .filter(([, val]) => val === 1)
          .map(([permKey]) => {
            const ch = channelByPermission[permKey];
            if (!ch) return null; // no channel entry for this permission
            // GSM SMS resellers cannot transfer real GSM credits
            if (isSimLine && ch.back_end_name === "gsm_credits") return null;
            return {
              value:         ch.back_end_name,
              label:         displayChannelName(ch.front_end_name),
              credits:       Number(creditsData[ch.back_end_name] ?? 0),
              clientCredits: Number(creditsDataClient[ch.back_end_name] ?? 0),
            };
          })
          .filter(Boolean);

        setServices(mapped.map((s) => s.value));
        setMappedServices(mapped);
      } catch (error) {
        handleApiError(error);
      } finally {
        setFetchingServices(false);
      }
    };

    if (clientId && clientUsername) {
      fetchUserServices();
    }
  }, [clientId, clientUsername]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedService) {
      message.error("Please select a service");
      return;
    }
    if (!credits) {
      message.error("Please enter credits");
      return;
    }
    if (!pricePerCredit) {
      message.error("Please enter the price per credit");
      return;
    }
    if (!description.trim()) {
      message.error("Description is required");
      return;
    }

    setReload((prev) => !prev);
    setLoading(true);

    const payload = {
      client_username: clientUsername,
      service: selectedService,
      credits: Number(credits),
      amount: Number(pricePerCredit),
      description,
      operation: actionType === "Add" ? "credit" : "debit",
    };

    try {
      await clientTransferCredits(clientId, payload);

      message.success(
        `${actionType === "Add" ? "Added" : "Deducted"} ${credits} credits successfully`,
      );

      setTimeout(() => {
        handleClose();
        setReload((prev) => !prev);
      }, 1000);
    } catch (error) {
      setReload((prev) => !prev);
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const validServices = mappedServices.filter(
    (service) => service.label !== "AI Video Credits",
  );

  // Calculate total credits
  const totalCredits = validServices.reduce(
    (sum, service) => sum + (service.clientCredits || 0),
    0,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-h-[85vh] overflow-y-auto scrollbar-hide"
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
            <WalletOutlined style={{ fontSize: 28, color: "white" }} />
          </motion.div>
          <div>
            <Title level={4} style={{ marginBottom: 0, color: "#1f2937" }}>
              Funds Management
            </Title>
            <Text className="text-sm text-gray-500">
              Manage credits and billing
            </Text>
          </div>
        </div>
      </div>

      {/* User Info Card */}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(37,99,235,0.2)" }}
            >
              <UserOutlined
                style={{ color: THEME.primaryDark, fontSize: 18 }}
              />
            </div>
            <div>
              <Text strong style={{ fontSize: 16, color: "#1f2937" }}>
                {clientUsername}
              </Text>
              <div className="flex items-center gap-1 mt-0.5">
                <SettingOutlined style={{ fontSize: 10, color: "#9ca3af" }} />
                <Text className="text-xs text-gray-500">
                  Services can be managed from Settings
                </Text>
              </div>
            </div>
          </div>
          <div className="text-right">
            <Text className="text-xs text-gray-500 block">Total Credits</Text>
            <Text strong style={{ fontSize: 20, color: THEME.primary }}>
              {totalCredits.toLocaleString()}
            </Text>
          </div>
        </div>
      </motion.div>

      {fetchingServices ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Spin size="large" />
          <p className="mt-4 text-sm text-gray-500">Loading services...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl p-5"
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <SectionHeader
              icon={CreditCardOutlined}
              title="Transfer Credits"
              subtitle="Add or deduct credits from account"
            />

            <FormField icon={AppstoreOutlined} label="Select Service">
              <Select
                value={selectedService}
                onChange={setSelectedService}
                placeholder="Choose a service"
                className="w-full"
                size="large"
                style={{ borderRadius: 10 }}
                getPopupContainer={(trigger) => trigger.parentElement}
                options={validServices.map((service) => ({
                  value: service.value,
                  label: (
                    <div className="flex items-center gap-2">
                      <AppstoreOutlined style={{ color: THEME.primary }} />
                      <span>{service.label}</span>
                    </div>
                  ),
                }))}
                notFoundContent={
                  <div className="text-center py-4 text-gray-400">
                    No services available
                  </div>
                }
              />
            </FormField>

            <FormField icon={CreditCardOutlined} label="Credits">
              <Input
                type="number"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                placeholder="Enter number of credits"
                size="large"
                className="rounded-lg"
                style={{ borderColor: "rgba(37,99,235,0.3)" }}
                prefix={
                  <CreditCardOutlined
                    style={{ color: "#9ca3af", fontSize: 14 }}
                  />
                }
              />
            </FormField>

            <FormField icon={DollarOutlined} label="Price Per Credit">
              <Input
                type="number"
                value={pricePerCredit}
                onChange={(e) => setPricePerCredit(e.target.value)}
                placeholder="Enter price per credit"
                size="large"
                className="rounded-lg"
                style={{ borderColor: "rgba(37,99,235,0.3)" }}
                prefix={
                  <DollarOutlined style={{ color: "#9ca3af", fontSize: 14 }} />
                }
                addonBefore="₹"
              />
            </FormField>

            <FormField icon={SendOutlined} label="Action Type">
              <Radio.Group
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full"
              >
                <div className="flex gap-3">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1"
                  >
                    <Radio.Button
                      value="Deduct"
                      className="w-full h-12 flex items-center justify-center rounded-xl"
                      style={{
                        background:
                          actionType === "Deduct"
                            ? "rgba(239,68,68,0.1)"
                            : "#f9fafb",
                        borderColor:
                          actionType === "Deduct" ? "#ef4444" : "#e5e7eb",
                        color: actionType === "Deduct" ? "#ef4444" : "#6b7280",
                        fontWeight: actionType === "Deduct" ? 600 : 400,
                      }}
                    >
                      <MinusCircleOutlined className="mr-2" />
                      Deduct
                    </Radio.Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1"
                  >
                    <Radio.Button
                      value="Add"
                      className="w-full h-12 flex items-center justify-center rounded-xl"
                      style={{
                        background:
                          actionType === "Add"
                            ? "rgba(16,185,129,0.1)"
                            : "#f9fafb",
                        borderColor:
                          actionType === "Add" ? "#10b981" : "#e5e7eb",
                        color: actionType === "Add" ? "#10b981" : "#6b7280",
                        fontWeight: actionType === "Add" ? 600 : 400,
                      }}
                    >
                      <PlusCircleOutlined className="mr-2" />
                      Add
                    </Radio.Button>
                  </motion.div>
                </div>
              </Radio.Group>
            </FormField>

            <FormField icon={FileTextOutlined} label="Description">
              <div>
                <TextArea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a note or description..."
                  rows={3}
                  className="rounded-lg"
                  style={{ borderColor: "rgba(37,99,235,0.3)" }}
                  status={description.trim() === "" ? "error" : ""}
                />
                <Text className="text-xs text-red-500 mt-1 block">
                  <span style={{ color: "#ef4444" }}>*</span> Required
                </Text>
              </div>
            </FormField>

            {/* Summary Card */}
            {credits && pricePerCredit && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4 mt-4"
                style={{
                  background:
                    actionType === "Add"
                      ? "rgba(16,185,129,0.08)"
                      : "rgba(239,68,68,0.08)",
                  border: `1px solid ${
                    actionType === "Add"
                      ? "rgba(16,185,129,0.2)"
                      : "rgba(239,68,68,0.2)"
                  }`,
                }}
              >
                <div className="flex items-center justify-between">
                  <Text className="text-sm text-gray-600">Total Amount:</Text>
                  <Text
                    strong
                    style={{
                      fontSize: 18,
                      color: actionType === "Add" ? "#10b981" : "#ef4444",
                    }}
                  >
                    {actionType === "Add" ? "+" : "-"}₹
                    {(
                      parseFloat(credits || 0) * parseFloat(pricePerCredit || 0)
                    ).toFixed(2)}
                  </Text>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Services Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl p-5"
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <SectionHeader
              icon={AppstoreOutlined}
              title="Current Balances"
              subtitle="Service-wise credit balances"
            />

            <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide">
              {validServices.length > 0 ? (
                validServices.map((service, idx) => (
                  <ServiceCreditCard key={idx} service={service} index={idx} />
                ))
              ) : (
                <div className="text-center py-8">
                  <div
                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ background: "rgba(156,163,175,0.1)" }}
                  >
                    <AppstoreOutlined
                      style={{ fontSize: 28, color: "#9ca3af" }}
                    />
                  </div>
                  <Text className="text-gray-500">No active services</Text>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            {validServices.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 pt-4"
                style={{ borderTop: "1px solid rgba(37,99,235,0.1)" }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-lg p-3 text-center"
                    style={{ background: THEME.gradientLight }}
                  >
                    <Text className="text-xs text-gray-500 block">
                      Active Services
                    </Text>
                    <Text
                      strong
                      style={{ fontSize: 18, color: THEME.primaryDark }}
                    >
                      {validServices.length}
                    </Text>
                  </div>
                  <div
                    className="rounded-lg p-3 text-center"
                    style={{ background: "rgba(139,92,246,0.08)" }}
                  >
                    <Text className="text-xs text-gray-500 block">
                      Total Credits
                    </Text>
                    <Text strong style={{ fontSize: 18, color: "#8b5cf6" }}>
                      {totalCredits.toLocaleString()}
                    </Text>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}

      {/* Footer Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
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
            icon={loading ? null : <CheckCircleOutlined />}
            onClick={handleSubmit}
            loading={loading}
            disabled={!selectedService || !credits || !pricePerCredit || !description.trim()}
            className="h-10 px-6 rounded-xl font-medium"
            style={{
              background:
                !selectedService || !credits || !pricePerCredit || !description.trim()
                  ? "#d1d5db"
                  : THEME.gradient,
              border: "none",
              boxShadow:
                selectedService && credits && pricePerCredit && description.trim()
                  ? "0 4px 12px rgba(37,99,235,0.3)"
                  : "none",
            }}
          >
            {loading ? "Processing..." : "Submit"}
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

        .ant-input-group-addon {
          background: linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%);
          border-color: rgba(3, 207, 101, 0.3);
          color: #1D4ED8;
          font-weight: 600;
        }

        /* Select styling */
        .ant-select-selector {
          border-radius: 10px !important;
          border-color: rgba(3, 207, 101, 0.3) !important;
          height: 44px !important;
        }

        .ant-select-selection-item {
          display: flex;
          align-items: center;
        }

        .ant-select:hover .ant-select-selector {
          border-color: #2563EB !important;
        }

        .ant-select-focused .ant-select-selector {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1) !important;
        }

        .ant-select-dropdown {
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
        }

        .ant-select-item {
          border-radius: 8px;
          padding: 10px 12px;
        }

        .ant-select-item-option-selected {
          background: rgba(3, 207, 101, 0.1) !important;
          font-weight: 600;
        }

        .ant-select-item-option-active {
          background: rgba(3, 207, 101, 0.05) !important;
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

        /* Radio Button styling */
        .ant-radio-button-wrapper {
          border-radius: 10px !important;
          border: none !important;
          height: 48px !important;
          line-height: 46px !important;
        }

        .ant-radio-button-wrapper::before {
          display: none !important;
        }

        .ant-radio-button-wrapper-checked {
          background: rgba(3, 207, 101, 0.1) !important;
          border-color: #2563EB !important;
        }

        .ant-radio-group {
          width: 100%;
        }

        /* Button styling */
        .ant-btn-primary:hover {
          box-shadow: 0 6px 16px rgba(3, 207, 101, 0.35) !important;
        }

        .ant-btn-primary:disabled {
          background: #d1d5db !important;
          border-color: #d1d5db !important;
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

FundsManagementModal.propTypes = {
  handleClose: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired,
  clientUsername: PropTypes.string.isRequired,
};

export default FundsManagementModal;

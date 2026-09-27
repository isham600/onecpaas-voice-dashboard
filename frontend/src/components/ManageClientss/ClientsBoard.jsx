import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  message,
  Spin,
  Input,
  Button,
  Table,
  Tag,
  Tooltip,
  Empty,
  Dropdown,
  Typography,
  Pagination,
  Select,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  SettingOutlined,
  WalletOutlined,
  DollarOutlined,
  TransactionOutlined,
  LoginOutlined,
  UserSwitchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MoreOutlined,
  TeamOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";

import Modal from "../Modal";
import UserProfileModal from "./UserProfileModal";
import UserTransactionModal from "./UserTransactionModal";
import FundsManagementModal from "./FundsManagementModal";
import BillingManagementModal from "./BillingManagementModal";

import {
  clientChangeStatus,
  clientChangeUserType,
  clientDelete,
  impersonate,
  getProfileMe,
  clearProfileMeCache,
} from "../../services/api";

import { AppContext } from "../../utils/Context";
import handleApiError from "../../utils/errorHandler";
import displayChannelName from "../../utils/channelNames";

const { Title, Text } = Typography;
const { Search } = Input;

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

// Action Button Component
const ActionButton = ({
  icon,
  label,
  onClick,
  color = THEME.primary,
  danger = false,
}) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all w-full"
    style={{
      background: danger ? "rgba(239,68,68,0.1)" : `${color}15`,
      color: danger ? "#ef4444" : color,
      border: `1px solid ${danger ? "rgba(239,68,68,0.2)" : `${color}30`}`,
    }}
  >
    {icon}
    <span>{label}</span>
  </motion.button>
);

// Section Header Component
const SectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <motion.div
        whileHover={{ scale: 1.05, rotate: 5 }}
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{
          background: THEME.gradient,
          boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
        }}
      >
        <Icon style={{ color: "white", fontSize: 20 }} />
      </motion.div>
      <div>
        <Title level={4} style={{ marginBottom: 0, color: "#1f2937" }}>
          {title}
        </Title>
        {subtitle && <Text className="text-xs text-gray-500">{subtitle}</Text>}
      </div>
    </div>
    {action}
  </div>
);

const ClientsBoard = ({
  broadcastData,
  setBroadcastData,
  loading,
  page,
  pageSize,
  total,
  searchTerm,
  onPageChange,
  onPageSizeChange,
  onSearch,
  onFilter,
}) => {
  const [localSearch, setLocalSearch] = useState(searchTerm ?? "");
  const [userTypeFilter, setUserTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userOverviewOpen, setUserOverviewOpen] = useState(false);
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
  const [isFundsModalOpen, setFundsModalOpen] = useState(false);
  const [isBillingModalOpen, setBillingModelOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState();
  const [channels, setChannels] = useState();
  const [selectedUsername, setSelectedUsername] = useState("");
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [userProfileData, setUserProfileData] = useState({
    firstName: "",
    lastName: "",
    clientMobileNo: "",
    clientEmail: "",
    user_type: "",
    country: "",
  });
  const { user, updateUser, reload, setReload } = useContext(AppContext);

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => onSearch?.(localSearch), 400);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Handle filter changes
  const handleUserTypeFilter = (value) => {
    setUserTypeFilter(value);
    onFilter?.({ userType: value, status: statusFilter });
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    onFilter?.({ userType: userTypeFilter, status: value });
  };

  const clearAllFilters = () => {
    setUserTypeFilter("");
    setStatusFilter("");
    setLocalSearch("");
    onSearch?.("");
    onFilter?.({ userType: "", status: "" });
  };

  useEffect(() => {
    const fetchStatusData = async () => {
      try {
        const profileResponse = await getProfileMe();
        const profileData = profileResponse?.data?.data || {};
        setChannels(profileData.channels || []);
        setUserPermissions(profileData.permissions || {});
      } catch (error) {
        handleApiError(error);
      }
    };
    fetchStatusData();
  }, [reload]);

  // Credit columns driven entirely by channels array from profile/me
  // Show if channel.status === 1 AND userPermissions[channel.permissions] === 1
  // GSM SMS resellers run a virtual business — real GSM is hidden from them
  const isSimLine = Number(userPermissions?.Credit_SIM_line ?? 0) === 1;
  const activeCreditChannels = (channels || []).filter(
    (ch) =>
      ch.status === 1 &&
      userPermissions?.[ch.permissions] === 1 &&
      !(isSimLine && ch.back_end_name === "gsm_credits"),
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const LoginClick = async (id, record) => {
    try {
      const response = await impersonate(id);
      const { token, client_username } = response.data?.data || {};

      if (token) {
        const displayName = [record?.first_name, record?.last_name].filter(Boolean).join(" ") || client_username;
        localStorage.setItem("_admin_token", localStorage.getItem("token"));
        localStorage.setItem("_admin_user", JSON.stringify(user));
        localStorage.setItem("_impersonating", JSON.stringify({ id, username: client_username, name: displayName }));
        localStorage.setItem("token", token);

        clearProfileMeCache();

        // Load the impersonated user's real profile — permissions and credits
        // included. Without them every permission check on the panel sees
        // undefined and the user is treated as a plain account (a GSM SMS user
        // would be routed to the real GSM broadcast and rejected).
        let impersonatedUser = { username: client_username };
        try {
          const me = await getProfileMe();
          const profile = me?.data?.data ?? me?.data ?? {};
          impersonatedUser = { ...profile, username: profile.username || client_username };
        } catch {
          // fall back to the username alone rather than blocking the login
        }
        updateUser(impersonatedUser);

        message.success(`Logged in as ${client_username}`);
        navigate("/dashboard");
      } else {
        message.error("Failed to login. Token not found in response.");
      }
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleOpenTransactionModal = (username, clientId) => {
    setSelectedUsername(username);
    setSelectedClientId(clientId);
    setTransactionModalOpen(true);
  };

  const handleOpenFundsModal = (username, clientId) => {
    setSelectedUsername(username);
    setSelectedClientId(clientId);
    setFundsModalOpen(true);
  };

  const handleOpenBillingModal = (username) => {
    setSelectedUsername(username);
    setBillingModelOpen(true);
  };

  const handleOpenUserProfileModal = (
    firstName,
    lastName,
    clientMobileNo,
    clientEmail,
    user_type,
    client_username,
    country,
    id,
  ) => {
    setUserProfileData({
      firstName,
      lastName,
      clientMobileNo,
      clientEmail,
      user_type,
      client_username,
      country,
      id,
    });
    setProfileModalOpen(true);
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    const isCurrentlyEnabled = currentStatus !== "false";
    const newStatus = isCurrentlyEnabled ? "false" : "true";

    try {
      await clientChangeStatus(userId, newStatus);
      setBroadcastData((prevData) =>
        prevData.map((broadcast) =>
          broadcast.id === userId
            ? { ...broadcast, account_status: newStatus }
            : broadcast,
        ),
      );
      message.success(
        `User ${newStatus === "true" ? "enabled" : "disabled"} successfully`,
      );
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleChangeUserType = async (userId, currentUserType) => {
    const newUserType = currentUserType === "client" ? "reseller" : "client";

    try {
      await clientChangeUserType(userId, newUserType);
      setBroadcastData((prevData) =>
        prevData.map((broadcast) =>
          broadcast.id === userId
            ? { ...broadcast, user_type: newUserType }
            : broadcast,
        ),
      );
      message.success(`User type changed to ${newUserType}`);
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleDeleteClient = async (userId) => {
    try {
      await clientDelete(userId);
      setBroadcastData((prevData) =>
        prevData.filter((broadcast) => broadcast.id !== userId),
      );
      message.success("Client deleted successfully");
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleDownloadCSV = () => {
    if (!broadcastData || broadcastData.length === 0) {
      message.error("No data available to download.");
      return;
    }

    const headers = [
      "User Name", "Email", "User Type", "Name", "Mobile No.", "Status", "Created Date",
      ...activeCreditChannels.map((ch) => displayChannelName(ch.front_end_name)),
    ];

    const csvContent = [
      headers.join(","),
      ...broadcastData.map((broadcast) =>
        [
          broadcast.client_username || "",
          broadcast.client_email || "",
          broadcast.user_type || "",
          broadcast.first_name || "",
          broadcast.client_mobile_no || "",
          broadcast.account_status === "true" ? "Enabled" : "Disabled",
          formatDate(broadcast.created_at) || "",
          ...activeCreditChannels.map((ch) => Number(broadcast.credit?.[ch.back_end_name] ?? 0)),
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `users_list_${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success("CSV downloaded successfully");
  };

  // Build dynamic columns
  const columns = [
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "left",
      render: (_, record) => {
        const actionItems = [
          {
            key: "settings",
            label: (
              <ActionButton
                icon={<SettingOutlined style={{ fontSize: 12 }} />}
                label="Settings"
                onClick={() =>
                  handleOpenUserProfileModal(
                    record.first_name,
                    record.last_name,
                    record.client_mobile_no,
                    record.client_email,
                    record.user_type,
                    record.client_username,
                    record.country,
                    record.id,
                  )
                }
              />
            ),
          },
          {
            key: "transactions",
            label: (
              <ActionButton
                icon={<TransactionOutlined style={{ fontSize: 12 }} />}
                label="Transactions"
                onClick={() =>
                  handleOpenTransactionModal(record.client_username, record.id)
                }
                color="#8b5cf6"
              />
            ),
          },
          {
            key: "funds",
            label: (
              <ActionButton
                icon={<WalletOutlined style={{ fontSize: 12 }} />}
                label="Funds"
                onClick={() => handleOpenFundsModal(record.client_username, record.id)}
                color="#06b6d4"
              />
            ),
          },
        ];

        if (userPermissions?.billing === 1) {
          actionItems.push({
            key: "billing",
            label: (
              <ActionButton
                icon={<DollarOutlined style={{ fontSize: 12 }} />}
                label="Billing"
                onClick={() => handleOpenBillingModal(record.client_username)}
                color="#f59e0b"
              />
            ),
          });
        }

        return (
          <Dropdown
            menu={{ items: actionItems }}
            trigger={["click"]}
            placement="bottomLeft"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: THEME.gradient,
                boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
              }}
            >
              <MoreOutlined style={{ color: "white", fontSize: 16 }} />
            </motion.button>
          </Dropdown>
        );
      },
    },
    {
      title: "Username",
      key: "client_username",
      width: 170,
      render: (_, record) => (
        <span className="text-base font-semibold text-indigo-600">
          {record.client_username}
        </span>
      ),
    },
    {
      title: "User Info",
      key: "user_info",
      width: 220,
      render: (_, record) => {
        const fn = (record.first_name || "").trim();
        const ln = (record.last_name || "").trim();
        const displayName = fn === ln ? fn : [fn, ln].filter(Boolean).join(" ");
        return (
          <div className="flex flex-col gap-0.5 py-0.5">
            <Text strong className="text-gray-900 text-sm leading-tight">
              {displayName || "—"}
            </Text>
            <Tooltip title={record.client_email}>
              <span className="text-xs text-gray-500 truncate max-w-[180px] block">
                {record.client_email || "—"}
              </span>
            </Tooltip>
            {record.client_mobile_no && (
              <span className="text-xs font-mono text-gray-400">
                {record.client_mobile_no}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "Type & Login",
      key: "type_login",
      width: 150,
      render: (_, record) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Tag
              color={record.user_type === "reseller" ? "purple" : "blue"}
              style={{ borderRadius: 6, fontWeight: 600, textTransform: "capitalize", margin: 0 }}
            >
              {record.user_type}
            </Tag>
            <Tooltip title="Change type">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleChangeUserType(record.id, record.user_type)}
                className="w-5 h-5 rounded flex items-center justify-center"
                style={{ background: "rgba(37,99,235,0.1)", color: THEME.primaryDark }}
              >
                <UserSwitchOutlined style={{ fontSize: 10 }} />
              </motion.button>
            </Tooltip>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="small"
              icon={<LoginOutlined />}
              onClick={() => LoginClick(record.id, record)}
              style={{
                background: THEME.gradient,
                border: "none",
                borderRadius: 6,
                fontSize: 11,
                color: "white",
                height: 24,
                boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
              }}
            >
              Login
            </Button>
          </motion.div>
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, record) => {
        const isEnabled = record?.account_status !== "false";
        return (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleStatusToggle(record.id, record?.account_status)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: isEnabled ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
              color: isEnabled ? "#10b981" : "#ef4444",
              border: `1px solid ${isEnabled ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
            }}
          >
            {isEnabled ? (
              <CheckCircleOutlined style={{ fontSize: 12 }} />
            ) : (
              <CloseCircleOutlined style={{ fontSize: 12 }} />
            )}
            {isEnabled ? "Enabled" : "Disabled"}
          </motion.button>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 100,
      render: (date) => (
        <span className="text-xs text-gray-500">{formatDate(date)}</span>
      ),
    },
    // Dynamic credit columns — driven by channels from profile/me
    ...activeCreditChannels.map((ch) => ({
      title: displayChannelName(ch.front_end_name),
      key: ch.back_end_name,
      width: 120,
      align: "center",
      render: (_, record) => {
        const value = Number(record.credit?.[ch.back_end_name] ?? 0);
        return (
          <Tag
            style={{
              background: value > 0 ? "rgba(37,99,235,0.1)" : "rgba(156,163,175,0.1)",
              border: "none",
              color: value > 0 ? THEME.primaryDark : "#9ca3af",
              fontWeight: 600,
              fontSize: 12,
              borderRadius: 6,
            }}
          >
            {value.toLocaleString()}
          </Tag>
        );
      },
    })),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden mt-6"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
    >
      {/* Header Section */}
      <div
        className="px-6 py-5"
        style={{
          background: THEME.gradientLight,
          borderBottom: "1px solid rgba(37,99,235,0.1)",
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title & Stats */}
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: THEME.gradient,
                boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
              }}
            >
              <TeamOutlined style={{ color: "white", fontSize: 20 }} />
            </motion.div>
            <div>
              <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>
                User List
              </Title>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-gray-500">
                  {total ?? 0} total users
                </span>
                {localSearch && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(37,99,235,0.15)",
                      color: THEME.primaryDark,
                    }}
                  >
                    Filtered
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Search & Filters & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                placeholder="Search users..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onClear={() => setLocalSearch("")}
                allowClear
                prefix={<SearchOutlined style={{ color: THEME.primary }} />}
                style={{ width: 260 }}
                className="clients-search"
              />
            </div>

            {/* User Type Filter */}
            <Select
              placeholder="User Type"
              value={userTypeFilter || undefined}
              onChange={handleUserTypeFilter}
              allowClear
              style={{ width: 140 }}
              className="clients-filter"
            >
              <Select.Option value="reseller">Reseller</Select.Option>
              <Select.Option value="client">Client</Select.Option>
            </Select>

            {/* Status Filter */}
            <Select
              placeholder="Status"
              value={statusFilter || undefined}
              onChange={handleStatusFilter}
              allowClear
              style={{ width: 120 }}
              className="clients-filter"
            >
              <Select.Option value="true">Active</Select.Option>
              <Select.Option value="false">Inactive</Select.Option>
            </Select>

            {/* Clear All Filters */}
            {(userTypeFilter || statusFilter || localSearch) && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="small"
                  onClick={clearAllFilters}
                  className="h-8 px-3 rounded-lg text-xs"
                  style={{
                    borderColor: "rgba(239,68,68,0.3)",
                    color: "#ef4444",
                  }}
                >
                  Clear Filters
                </Button>
              </motion.div>
            )}

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadCSV}
                className="h-10 px-5 rounded-xl font-medium"
                style={{
                  background: THEME.gradient,
                  border: "none",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                }}
              >
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Spin size="large" />
            <p className="mt-4 text-sm text-gray-500">Loading users...</p>
          </div>
        ) : !broadcastData?.length ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-16"
          >
            <Empty
              image={
                <div
                  className="w-24 h-24 rounded-full mx-auto flex items-center justify-center"
                  style={{ background: "rgba(37,99,235,0.1)" }}
                >
                  <TeamOutlined
                    style={{ fontSize: 40, color: THEME.primary }}
                  />
                </div>
              }
              description={
                <div className="mt-4">
                  <Text className="text-gray-500 text-base">
                    {localSearch
                      ? "No users match your search"
                      : "No users found"}
                  </Text>
                  <p className="text-xs text-gray-400 mt-1">
                    {localSearch
                      ? "Try adjusting your search criteria"
                      : "Add new clients to get started"}
                  </p>
                </div>
              }
            />
          </motion.div>
        ) : (
          <>
            <Table
              columns={columns}
              dataSource={broadcastData}
              loading={loading}
              pagination={false}
              rowKey="id"
              className="clients-table"
              scroll={{ x: 800 }}
              size="middle"
            />

            {/* Custom Pagination */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4"
              style={{ borderTop: "1px solid rgba(37,99,235,0.1)" }}
            >
              <div className="flex items-center gap-3">
                <Text className="text-xs text-gray-500">Rows per page:</Text>
                <Select
                  value={pageSize}
                  onChange={(value) => onPageSizeChange?.(value)}
                  size="small"
                  style={{ width: 70 }}
                  options={[
                    { value: 10, label: "10" },
                    { value: 25, label: "25" },
                    { value: 50, label: "50" },
                    { value: 100, label: "100" },
                  ]}
                />
                <Text className="text-xs text-gray-500">
                  Showing {Math.min((page - 1) * pageSize + 1, total ?? 0)} to{" "}
                  {Math.min(page * pageSize, total ?? 0)} of {total ?? 0} entries
                </Text>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPageChange?.(1)}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                  style={{
                    background: page === 1 ? "#f3f4f6" : "rgba(37,99,235,0.1)",
                    color: page === 1 ? "#9ca3af" : THEME.primaryDark,
                  }}
                >
                  <DoubleLeftOutlined style={{ fontSize: 10 }} />
                  First
                </motion.button>

                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={total ?? 0}
                  onChange={(newPage) => onPageChange?.(newPage)}
                  showSizeChanger={false}
                  size="small"
                />

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onPageChange?.(Math.ceil((total ?? 0) / pageSize))}
                  disabled={page === Math.ceil((total ?? 0) / pageSize)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                  style={{
                    background:
                      page === Math.ceil((total ?? 0) / pageSize)
                        ? "#f3f4f6"
                        : "rgba(37,99,235,0.1)",
                    color:
                      page === Math.ceil((total ?? 0) / pageSize)
                        ? "#9ca3af"
                        : THEME.primaryDark,
                  }}
                >
                  Last
                  <DoubleRightOutlined style={{ fontSize: 10 }} />
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Modals */}
      <UserProfileModal
        open={profileModalOpen}
        handleClose={() => setProfileModalOpen(false)}
        {...userProfileData}
      />

      <UserTransactionModal
        open={isTransactionModalOpen}
        handleClose={() => setTransactionModalOpen(false)}
        clientUsername={selectedUsername}
        clientId={selectedClientId}
      />

      {isFundsModalOpen && (
        <Modal
          isModalOpen={isFundsModalOpen}
          closeModal={() => setFundsModalOpen(false)}
        >
          <FundsManagementModal
            open={isFundsModalOpen}
            handleClose={() => setFundsModalOpen(false)}
            user={user}
            clientId={selectedClientId}
            clientUsername={selectedUsername}
            services={[]}
          />
        </Modal>
      )}

      {isBillingModalOpen && (
        <Modal
          isModalOpen={isBillingModalOpen}
          closeModal={() => setBillingModelOpen(false)}
        >
          <BillingManagementModal
            open={isBillingModalOpen}
            handleClose={() => setBillingModelOpen(false)}
            user={user}
            clientUsername={selectedUsername}
            services={[]}
          />
        </Modal>
      )}

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Table Container */
        .clients-table {
          border-radius: 12px;
          overflow: hidden;
        }

        /* Header Styling */
        .clients-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #374151;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid rgba(3, 207, 101, 0.2) !important;
          padding: 14px 12px;
        }

        .clients-table .ant-table-thead > tr > th::before {
          display: none !important;
        }

        /* Row Styling */
        .clients-table .ant-table-tbody > tr > td {
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
          transition: all 0.2s ease;
        }

        .clients-table .ant-table-tbody > tr:hover > td {
          background: rgba(3, 207, 101, 0.04) !important;
        }

        .clients-table .ant-table-tbody > tr:last-child > td {
          border-bottom: none;
        }

        /* Fixed Column Styling */
        .clients-table .ant-table-cell-fix-left,
        .clients-table .ant-table-cell-fix-right {
          background: #fff !important;
        }

        .clients-table .ant-table-tbody > tr:hover .ant-table-cell-fix-left,
        .clients-table .ant-table-tbody > tr:hover .ant-table-cell-fix-right {
          background: rgba(3, 207, 101, 0.04) !important;
        }

        /* Pagination Styling */
        .ant-pagination-item {
          border-radius: 8px !important;
          border-color: #e5e7eb !important;
        }

        .ant-pagination-item-active {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
          border-color: #2563EB !important;
        }

        .ant-pagination-item-active a {
          color: white !important;
        }

        .ant-pagination-item:hover {
          border-color: #2563EB !important;
        }

        .ant-pagination-item:hover a {
          color: #2563EB !important;
        }

        .ant-pagination-prev .ant-pagination-item-link,
        .ant-pagination-next .ant-pagination-item-link {
          border-radius: 8px !important;
        }

        .ant-pagination-prev:hover .ant-pagination-item-link,
        .ant-pagination-next:hover .ant-pagination-item-link {
          color: #2563EB !important;
          border-color: #2563EB !important;
        }

        /* Search Input */
        .clients-search .ant-input-affix-wrapper {
          border-radius: 10px;
          border-color: rgba(37,99,235,0.3);
          padding: 8px 12px;
        }

        .clients-search .ant-input-affix-wrapper:hover,
        .clients-search .ant-input-affix-wrapper:focus,
        .clients-search .ant-input-affix-wrapper-focused {
          border-color: #2563EB;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.1);
        }

        /* Filter Selects */
        .clients-filter .ant-select-selector {
          border-radius: 10px !important;
          border-color: rgba(37,99,235,0.3) !important;
          height: 32px !important;
        }

        .clients-filter .ant-select-selector:hover,
        .clients-filter.ant-select-focused .ant-select-selector {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.1) !important;
        }

        /* Select Styling */
        .ant-select-selector {
          border-radius: 8px !important;
        }

        .ant-select:hover .ant-select-selector {
          border-color: #2563EB !important;
        }

        .ant-select-focused .ant-select-selector {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1) !important;
        }

        /* Dropdown Menu */
        .ant-dropdown-menu {
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
        }

        .ant-dropdown-menu-item {
          border-radius: 8px;
          padding: 4px;
          margin-bottom: 4px;
        }

        .ant-dropdown-menu-item:last-child {
          margin-bottom: 0;
        }

        .ant-dropdown-menu-item:hover {
          background: transparent !important;
        }

        /* Tag Styling */
        .clients-table .ant-tag {
          border-radius: 6px;
          padding: 2px 10px;
        }

        /* Spin */
        .ant-spin-dot-item {
          background-color: #2563EB !important;
        }

        /* Tooltip */
        .ant-tooltip-inner {
          border-radius: 8px;
        }

        /* Empty State */
        .ant-empty-description {
          color: #6b7280;
        }
      `}} />
    </motion.div>
  );
};

export default ClientsBoard;

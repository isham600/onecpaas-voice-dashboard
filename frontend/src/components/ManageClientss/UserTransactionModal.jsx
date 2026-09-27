import React, { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import {
  Table,
  Input,
  Select,
  Spin,
  Pagination,
  Button,
  Typography,
  Tag,
  Empty,
  Tooltip,
  DatePicker,
  message,
} from "antd";
import {
  DoubleLeftOutlined,
  DoubleRightOutlined,
  SearchOutlined,
  TransactionOutlined,
  CalendarOutlined,
  FilterOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  UserOutlined,
  FileTextOutlined,
  NumberOutlined,
  SwapOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import Modal from "../Modal/index";
import { getClientTransactionLogs } from "../../services/api";
import handleApiError from "../../utils/errorHandler";

const { Search } = Input;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

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
const SectionHeader = ({ icon: Icon, title, subtitle, extra }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
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
        <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>
          {title}
        </Title>
        {subtitle && <Text className="text-xs text-gray-500">{subtitle}</Text>}
      </div>
    </div>
    {extra}
  </div>
);

// Summary Stat Component
const SummaryStat = ({ icon: Icon, label, value, color }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex items-center gap-2 px-3 py-2 rounded-lg"
    style={{ background: `${color}10`, border: `1px solid ${color}20` }}
  >
    <div
      className="w-7 h-7 rounded-md flex items-center justify-center"
      style={{ background: `${color}15` }}
    >
      <Icon style={{ color, fontSize: 12 }} />
    </div>
    <div>
      <Text className="text-[10px] text-gray-500 block">{label}</Text>
      <Text strong style={{ color, fontSize: 13 }}>
        {value}
      </Text>
    </div>
  </motion.div>
);

const UserTransactionModal = ({
  open,
  handleClose,
  clientUsername,
  clientId,
}) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [resellerFilter, setResellerFilter] = useState("All");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ["5", "10", "25", "50", "100"],
  });

  useEffect(() => {
    if (open && clientId) {
      setTransactions([]);
      setLoading(true);

      const fetchTransactions = async () => {
        try {
          const params = {
            page: pagination.current,
            limit: pagination.pageSize,
            start_date: dayjs(startDate).format("YYYY-MM-DD"),
            end_date: dayjs(endDate).format("YYYY-MM-DD"),
          };
          const response = await getClientTransactionLogs(clientId, params);

          const fetchedTransactions = response?.data?.data || [];

          setTransactions(fetchedTransactions);
          setPagination((prev) => ({
            ...prev,
            total: response.data.meta?.total || fetchedTransactions.length,
          }));
        } catch (error) {
          message.info("No transactions found for this period");
        } finally {
          setLoading(false);
        }
      };

      fetchTransactions();
    }
  }, [
    open,
    clientId,
    startDate,
    endDate,
    pagination.current,
    pagination.pageSize,
  ]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleResellerFilterChange = (value) => {
    setResellerFilter(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleDateRangeChange = (dates) => {
    if (dates) {
      setStartDate(dates[0].toDate());
      setEndDate(dates[1].toDate());
    }
  };

  const handleTableChange = (page, pageSize) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  const goToFirstPage = () => {
    handleTableChange(1, pagination.pageSize);
  };

  const goToLastPage = () => {
    const lastPage = Math.ceil(pagination.total / pagination.pageSize);
    handleTableChange(lastPage, pagination.pageSize);
  };

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (resellerFilter === "System") {
      filtered = filtered.filter((txn) => txn.reseller === "system");
    } else if (resellerFilter === "Reseller") {
      filtered = filtered.filter((txn) => txn.reseller !== "system");
    }

    const result = filtered
      .filter((txn) =>
        Object.values(txn).some((value) =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return result;
  }, [transactions, searchTerm, resellerFilter]);

  // Update pagination total when filtered data changes
  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      total: filteredTransactions.length,
    }));
  }, [filteredTransactions.length]);

  // Calculate paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, pagination.current, pagination.pageSize]);

  // Calculate summary stats
  const totalCredits = useMemo(() => {
    return filteredTransactions.reduce(
      (sum, txn) => sum + (parseFloat(txn.sms) || 0),
      0,
    );
  }, [filteredTransactions]);

  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce(
      (sum, txn) => sum + (parseFloat(txn.amt) || 0),
      0,
    );
  }, [filteredTransactions]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const columns = [
    {
      title: (
        <div className="flex items-center gap-1.5">
          <ClockCircleOutlined className="text-xs opacity-80" />
          <span>Time</span>
        </div>
      ),
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      render: (date) => (
        <span className="text-sm text-gray-600">{formatDate(date)}</span>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <NumberOutlined className="text-xs opacity-80" />
          <span>ID</span>
        </div>
      ),
      dataIndex: "id",
      key: "id",
      width: 80,
      render: (id) => (
        <span className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
          #{id}
        </span>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <SwapOutlined className="text-xs opacity-80" />
          <span>Type</span>
        </div>
      ),
      dataIndex: "cd",
      key: "cd",
      width: 100,
      render: (type) => (
        <Tag
          style={{
            borderRadius: 6,
            background:
              type?.toLowerCase() === "credit"
                ? "rgba(16,185,129,0.1)"
                : "rgba(239,68,68,0.1)",
            border: "none",
            color: type?.toLowerCase() === "credit" ? "#10b981" : "#ef4444",
            fontWeight: 600,
            fontSize: 11,
          }}
        >
          {type || "N/A"}
        </Tag>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <UserOutlined className="text-xs opacity-80" />
          <span>Reseller</span>
        </div>
      ),
      dataIndex: "reseller",
      key: "reseller",
      width: 120,
      render: (reseller) => (
        <Tag
          style={{
            borderRadius: 6,
            background:
              reseller === "system"
                ? "rgba(139,92,246,0.1)"
                : "rgba(6,182,212,0.1)",
            border: "none",
            color: reseller === "system" ? "#8b5cf6" : "#06b6d4",
            fontWeight: 600,
            fontSize: 11,
            textTransform: "capitalize",
          }}
        >
          {reseller || "N/A"}
        </Tag>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <UserOutlined className="text-xs opacity-80" />
          <span>User</span>
        </div>
      ),
      dataIndex: "name",
      key: "name",
      width: 120,
      render: (name) => (
        <Text className="text-sm text-gray-700 font-medium">{name || "—"}</Text>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <AppstoreOutlined className="text-xs opacity-80" />
          <span>Credits</span>
        </div>
      ),
      dataIndex: "sms",
      key: "sms",
      width: 100,
      align: "center",
      render: (credits) => (
        <Tag
          style={{
            background: "rgba(37,99,235,0.1)",
            border: "none",
            color: THEME.primaryDark,
            fontWeight: 600,
            fontSize: 12,
            borderRadius: 6,
          }}
        >
          {credits?.toLocaleString() || 0}
        </Tag>
      ),
    },
    {
      title: "Price",
      dataIndex: "pps",
      key: "pps",
      width: 80,
      align: "center",
      render: (price) => (
        <span className="text-sm text-gray-600">₹{price || 0}</span>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <DollarOutlined className="text-xs opacity-80" />
          <span>Amount</span>
        </div>
      ),
      dataIndex: "amt",
      key: "amt",
      width: 100,
      align: "center",
      render: (amount) => (
        <Text strong style={{ color: THEME.primary }}>
          ₹{parseFloat(amount || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <FileTextOutlined className="text-xs opacity-80" />
          <span>Description</span>
        </div>
      ),
      dataIndex: "decrip",
      key: "decrip",
      width: 180,
      ellipsis: true,
      render: (desc) => (
        <Tooltip title={desc}>
          <span className="text-sm text-gray-500">{desc || "—"}</span>
        </Tooltip>
      ),
    },
    {
      title: "Service",
      dataIndex: "service",
      key: "service",
      width: 120,
      render: (service) => (
        <Tag
          style={{
            borderRadius: 6,
            background: "rgba(249,115,22,0.1)",
            border: "none",
            color: "#f97316",
            fontWeight: 500,
            fontSize: 11,
          }}
        >
          {service || "N/A"}
        </Tag>
      ),
    },
  ];

  if (!open) return null;

  return (
    <Modal isModalOpen={open} closeModal={handleClose}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between mb-4 pb-4"
          style={{ borderBottom: "1px solid rgba(37,99,235,0.15)" }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: THEME.gradient,
                boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
              }}
            >
              <TransactionOutlined style={{ fontSize: 24, color: "white" }} />
            </motion.div>
            <div>
              <Title level={4} style={{ marginBottom: 0, color: "#1f2937" }}>
                User Transactions
              </Title>
              <Text className="text-xs text-gray-500">
                @{clientUsername} • Transaction history
              </Text>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {!loading && filteredTransactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-3 mb-4"
          >
            <SummaryStat
              icon={TransactionOutlined}
              label="Total Transactions"
              value={filteredTransactions.length}
              color={THEME.primary}
            />
            <SummaryStat
              icon={AppstoreOutlined}
              label="Total Credits"
              value={totalCredits.toLocaleString()}
              color="#8b5cf6"
            />
            <SummaryStat
              icon={DollarOutlined}
              label="Total Amount"
              value={`₹${totalAmount.toFixed(2)}`}
              color="#f59e0b"
            />
          </motion.div>
        )}

        {/* Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl p-4 mb-4"
          style={{
            background: THEME.gradientLight,
            border: "1px solid rgba(37,99,235,0.15)",
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Date Range */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CalendarOutlined
                  style={{ color: THEME.primary, fontSize: 12 }}
                />
                <Text className="text-xs font-medium text-gray-600">
                  Date Range
                </Text>
              </div>
              <RangePicker
                value={[dayjs(startDate), dayjs(endDate)]}
                onChange={handleDateRangeChange}
                format="DD/MM/YYYY"
                className="w-full"
                style={{ borderColor: "rgba(37,99,235,0.3)" }}
                getPopupContainer={(trigger) => trigger.parentElement}
              />
            </div>

            {/* Filter */}
            <div className="w-full lg:w-40">
              <div className="flex items-center gap-2 mb-2">
                <FilterOutlined
                  style={{ color: THEME.primary, fontSize: 12 }}
                />
                <Text className="text-xs font-medium text-gray-600">
                  Filter
                </Text>
              </div>
              <Select
                value={resellerFilter}
                onChange={handleResellerFilterChange}
                className="w-full"
                style={{ borderRadius: 10 }}
                getPopupContainer={(trigger) => trigger.parentElement}
                options={[
                  { value: "All", label: "All Transactions" },
                  { value: "System", label: "System Only" },
                  { value: "Reseller", label: "Reseller Only" },
                ]}
              />
            </div>

            {/* Search */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <SearchOutlined
                  style={{ color: THEME.primary, fontSize: 12 }}
                />
                <Text className="text-xs font-medium text-gray-600">
                  Search
                </Text>
              </div>
              <Search
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={handleSearchChange}
                allowClear
                prefix={<SearchOutlined style={{ color: THEME.primary }} />}
                className="transaction-search"
              />
            </div>
          </div>
        </motion.div>

        {/* Table Section */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Spin size="large" />
              <p className="mt-4 text-sm text-gray-500">
                Loading transactions...
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12"
            >
              <Empty
                image={
                  <div
                    className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
                    style={{ background: "rgba(37,99,235,0.1)" }}
                  >
                    <TransactionOutlined
                      style={{ fontSize: 36, color: THEME.primary }}
                    />
                  </div>
                }
                description={
                  <div className="mt-4">
                    <Text className="text-gray-500 text-base">
                      No transactions found
                    </Text>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your filters or date range
                    </p>
                  </div>
                }
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  border: "1px solid rgba(37,99,235,0.15)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <Table
                  columns={columns}
                  dataSource={paginatedData}
                  loading={loading}
                  pagination={false}
                  rowKey="id"
                  className="transaction-table"
                  scroll={{ x: 1100, y: 350 }}
                  size="middle"
                />
              </div>

              {/* Pagination */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4"
                style={{ borderTop: "1px solid rgba(37,99,235,0.1)" }}
              >
                <Text className="text-xs text-gray-500">
                  Showing {(pagination.current - 1) * pagination.pageSize + 1}{" "}
                  to{" "}
                  {Math.min(
                    pagination.current * pagination.pageSize,
                    pagination.total,
                  )}{" "}
                  of {pagination.total} transactions
                </Text>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goToFirstPage}
                    disabled={pagination.current === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                    style={{
                      background:
                        pagination.current === 1
                          ? "#f3f4f6"
                          : "rgba(37,99,235,0.1)",
                      color:
                        pagination.current === 1
                          ? "#9ca3af"
                          : THEME.primaryDark,
                    }}
                  >
                    <DoubleLeftOutlined style={{ fontSize: 10 }} />
                    First
                  </motion.button>

                  <Pagination
                    current={pagination.current}
                    pageSize={pagination.pageSize}
                    total={pagination.total}
                    onChange={handleTableChange}
                    showSizeChanger
                    pageSizeOptions={pagination.pageSizeOptions}
                    size="small"
                    onShowSizeChange={(current, size) => {
                      setPagination((prev) => ({
                        ...prev,
                        current: 1,
                        pageSize: size,
                      }));
                    }}
                  />

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={goToLastPage}
                    disabled={
                      pagination.current ===
                      Math.ceil(pagination.total / pagination.pageSize)
                    }
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                    style={{
                      background:
                        pagination.current ===
                        Math.ceil(pagination.total / pagination.pageSize)
                          ? "#f3f4f6"
                          : "rgba(37,99,235,0.1)",
                      color:
                        pagination.current ===
                        Math.ceil(pagination.total / pagination.pageSize)
                          ? "#9ca3af"
                          : THEME.primaryDark,
                    }}
                  >
                    Last
                    <DoubleRightOutlined style={{ fontSize: 10 }} />
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Custom Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* Table Container */
        .transaction-table {
          border-radius: 12px;
          overflow: hidden;
        }

        /* Header Styling */
        .transaction-table .ant-table-thead > tr > th {
          background: linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%) !important;
          color: #374151;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid rgba(3, 207, 101, 0.2) !important;
          padding: 12px 14px;
        }

        .transaction-table .ant-table-thead > tr > th::before {
          display: none !important;
        }

        /* Row Styling */
        .transaction-table .ant-table-tbody > tr > td {
          padding: 10px 14px;
          border-bottom: 1px solid #f1f5f9;
          transition: all 0.2s ease;
        }

        .transaction-table .ant-table-tbody > tr:hover > td {
          background: rgba(3, 207, 101, 0.04) !important;
        }

        .transaction-table .ant-table-tbody > tr:last-child > td {
          border-bottom: none;
        }

        /* Alternate row colors */
        .transaction-table .ant-table-tbody > tr:nth-child(odd) > td {
          background: #fafafa;
        }

        .transaction-table .ant-table-tbody > tr:nth-child(even) > td {
          background: #ffffff;
        }

        .transaction-table .ant-table-tbody > tr:nth-child(odd):hover > td,
        .transaction-table .ant-table-tbody > tr:nth-child(even):hover > td {
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
        .transaction-search .ant-input-affix-wrapper {
          border-radius: 10px;
          border-color: rgba(3, 207, 101, 0.3);
          padding: 8px 12px;
        }

        .transaction-search .ant-input-affix-wrapper:hover,
        .transaction-search .ant-input-affix-wrapper:focus,
        .transaction-search .ant-input-affix-wrapper-focused {
          border-color: #2563EB;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1);
        }

        /* Select Styling */
        .ant-select-selector {
          border-radius: 10px !important;
          border-color: rgba(3, 207, 101, 0.3) !important;
          height: 40px !important;
        }

        .ant-select:hover .ant-select-selector {
          border-color: #2563EB !important;
        }

        .ant-select-focused .ant-select-selector {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1) !important;
        }

        .ant-select-selection-item {
          display: flex;
          align-items: center;
        }

        /* DatePicker Styling */
        .ant-picker {
          border-radius: 10px !important;
          border-color: rgba(3, 207, 101, 0.3) !important;
          height: 40px;
        }

        .ant-picker:hover {
          border-color: #2563EB !important;
        }

        .ant-picker-focused {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(3, 207, 101, 0.1) !important;
        }

        /* Tag Styling */
        .transaction-table .ant-tag {
          border-radius: 6px;
          padding: 2px 8px;
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

        /* Scrollbar */
        .ant-table-body::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .ant-table-body::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .ant-table-body::-webkit-scrollbar-thumb {
          background: #2563EB40;
          border-radius: 3px;
        }

        .ant-table-body::-webkit-scrollbar-thumb:hover {
          background: #2563EB60;
        }

        /* Size changer select */
        .ant-pagination-options-size-changer .ant-select-selector {
          height: 28px !important;
          border-radius: 6px !important;
        }
      `,
        }}
      />
    </Modal>
  );
};

UserTransactionModal.propTypes = {
  open: PropTypes.bool.isRequired,
  handleClose: PropTypes.func.isRequired,
  clientUsername: PropTypes.string.isRequired,
};

export default UserTransactionModal;

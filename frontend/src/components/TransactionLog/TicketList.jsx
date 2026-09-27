import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button, Table, Input, Typography, Select, Spin,
  Pagination, message, Tooltip, Tag, DatePicker, Empty,
} from "antd";
import {
  ArrowLeftOutlined, DownloadOutlined, SearchOutlined,
  DoubleLeftOutlined, DoubleRightOutlined, TransactionOutlined,
  ReloadOutlined, FilterOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import displayChannelName from "../../utils/channelNames";

import { getMyTransactionLogs } from "../../services/api";
import handleApiError from "../../utils/errorHandler";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(29,78,216,0.04) 100%)",
};

const TYPE_COLORS = {
  CR: { bg: "#ECFDF5", color: "#059669", label: "Credit" },
  DR: { bg: "#FEF2F2", color: "#DC2626", label: "Debit" },
};

const TicketList = ({ user }) => {
  const navigate = useNavigate();

  const [transactionData, setTransactionData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resellerFilter, setResellerFilter] = useState("All");

  const [pagination, setPagination] = useState({
    current: 1, pageSize: 10, total: 0,
    showSizeChanger: true,
    pageSizeOptions: ["10", "25", "50", "100"],
  });

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d;
  });
  const [endDate, setEndDate] = useState(new Date());

  const fetchTransactionsData = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        start_date: dayjs(startDate).format("YYYY-MM-DD"),
        end_date: dayjs(endDate).format("YYYY-MM-DD"),
      };
      const response = await getMyTransactionLogs(params);
      const data = response.data.data || [];
      setTransactionData(data);
      setPagination((prev) => ({
        ...prev,
        total: response.data.meta?.total || data.length,
      }));
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionsData();
  }, [user, startDate, endDate, pagination.current, pagination.pageSize]);

  const handleDownloadCSV = async () => {
    setExporting(true);
    try {
      const limit = 100;
      let page = 1;
      let all = [];
      while (true) {
        const response = await getMyTransactionLogs({
          page,
          limit,
          start_date: dayjs(startDate).format("YYYY-MM-DD"),
          end_date: dayjs(endDate).format("YYYY-MM-DD"),
        });
        const data = response.data.data || [];
        all = all.concat(data);
        const total = response.data.meta?.total ?? all.length;
        if (data.length < limit || all.length >= total) break;
        page += 1;
      }

      let data = all.filter((item) =>
        Object.values(item).some((v) =>
          (v ? v.toString() : "").toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      if (resellerFilter === "System") data = data.filter((i) => i.reseller === "system");
      else if (resellerFilter === "Reseller") data = data.filter((i) => i.reseller !== "system");
      data.sort((a, b) => filter === "newest"
        ? new Date(b.dte) - new Date(a.dte)
        : new Date(a.dte) - new Date(b.dte)
      );

      const headers = ["Time", "T.ID", "Type", "Reseller", "User", "Credit", "Price", "Amount", "Description", "Service"];
      const rows = data.map((item) =>
        [item.dte, item.id, item.cd, item.reseller, item.name, item.sms, item.pps, item.amt, item.decrip, item.service].join(",")
      );
      const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `TransactionData_${Date.now()}.csv`;
      link.click();
      message.success(`CSV downloaded successfully (${data.length} records)`);
    } catch (error) {
      handleApiError(error);
      message.error("Failed to download CSV");
    } finally {
      setExporting(false);
    }
  };

  const filteredData = useMemo(() => {
    let data = transactionData.filter((item) =>
      Object.values(item).some((v) =>
        (v ? v.toString() : "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    if (resellerFilter === "System") data = data.filter((i) => i.reseller === "system");
    else if (resellerFilter === "Reseller") data = data.filter((i) => i.reseller !== "system");
    data.sort((a, b) => filter === "newest"
      ? new Date(b.dte) - new Date(a.dte)
      : new Date(a.dte) - new Date(b.dte)
    );
    return data;
  }, [transactionData, searchTerm, filter, resellerFilter]);

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));

  const columns = [
    {
      title: "Time",
      dataIndex: "dte",
      key: "dte",
      width: 160,
      sorter: (a, b) => new Date(a.dte) - new Date(b.dte),
      render: (v) => <Text className="text-xs text-gray-600">{v}</Text>,
    },
    {
      title: "T.ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      sorter: (a, b) => a.id - b.id,
      render: (v) => <Text className="font-mono text-xs font-semibold" style={{ color: THEME.primary }}>{v}</Text>,
    },
    {
      title: "Type",
      dataIndex: "cd",
      key: "cd",
      width: 90,
      render: (v) => {
        const t = TYPE_COLORS[v] || { bg: "#F3F4F6", color: "#6B7280", label: v };
        return (
          <Tag style={{ background: t.bg, color: t.color, border: "none", borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
            {t.label || v}
          </Tag>
        );
      },
    },
    {
      title: "Reseller",
      dataIndex: "reseller",
      key: "reseller",
      width: 120,
      render: (v) => <Text className="text-xs text-gray-700">{v}</Text>,
    },
    {
      title: "User",
      dataIndex: "name",
      key: "name",
      width: 130,
      render: (v) => <Text className="text-xs font-medium text-gray-800">{v}</Text>,
    },
    {
      title: "Credit",
      dataIndex: "sms",
      key: "sms",
      width: 90,
      align: "right",
      sorter: (a, b) => a.sms - b.sms,
      render: (v) => <Text className="text-xs font-semibold" style={{ color: THEME.primary }}>{Number(v).toLocaleString()}</Text>,
    },
    {
      title: "Price",
      dataIndex: "pps",
      key: "pps",
      width: 80,
      align: "right",
      render: (v) => <Text className="text-xs text-gray-600">{v}</Text>,
    },
    {
      title: "Amount",
      dataIndex: "amt",
      key: "amt",
      width: 100,
      align: "right",
      sorter: (a, b) => a.amt - b.amt,
      render: (v) => (
        <Text className="text-xs font-bold" style={{ color: Number(v) >= 0 ? "#059669" : "#DC2626" }}>
          {Number(v) >= 0 ? "+" : ""}{v}
        </Text>
      ),
    },
    {
      title: "Description",
      dataIndex: "decrip",
      key: "decrip",
      ellipsis: true,
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Text className="text-xs text-gray-600">{v}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Service",
      dataIndex: "service",
      key: "service",
      width: 120,
      render: (v) => (
        <Tag style={{ background: "rgba(37,99,235,0.08)", color: THEME.primaryDark, border: "none", borderRadius: 6, fontSize: 11 }}>
          {displayChannelName(v)}
        </Tag>
      ),
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#F8F9FB" }}>

      {/* ── STICKY HEADER ── */}
      <div className="sticky top-0 z-40 px-4 pt-4 pb-0" style={{ background: "#F8F9FB" }}>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="rounded-2xl border border-gray-100 px-6 py-5 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)", boxShadow: "0 1px 8px rgba(37,99,235,0.06)" }}
          >
            <div className="flex items-center gap-4">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                className="h-9 w-9 rounded-lg border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center"
              />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: THEME.gradient, boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}
              >
                <TransactionOutlined style={{ color: "#fff", fontSize: 20 }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">Transaction Logs</h1>
                <p className="text-xs text-gray-400 mt-0.5">View and export your transaction history</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <RangePicker
                value={[startDate ? dayjs(startDate) : null, endDate ? dayjs(endDate) : null]}
                onChange={(d) => {
                  if (d) {
                    setStartDate(d[0].toDate());
                    setEndDate(d[1].toDate());
                    setPagination((p) => ({ ...p, current: 1 }));
                  }
                }}
                format="YYYY-MM-DD"
                allowClear={false}
                presets={[
                  { label: "Today", value: [dayjs(), dayjs()] },
                  { label: "Last 7 days", value: [dayjs().subtract(7, "day"), dayjs()] },
                  { label: "Last 30 days", value: [dayjs().subtract(30, "day"), dayjs()] },
                  { label: "Last 90 days", value: [dayjs().subtract(90, "day"), dayjs()] },
                ]}
                className="h-9 rounded-lg bg-white"
                style={{ borderColor: "#e5e7eb", minWidth: 240 }}
              />
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadCSV}
                loading={exporting}
                disabled={exporting}
                className="h-9 rounded-lg border-gray-200 text-gray-600 hover:text-indigo-600"
              >
                {exporting ? "Exporting…" : "Export CSV"}
              </Button>
              <Button
                icon={<ReloadOutlined spin={loading} />}
                onClick={fetchTransactionsData}
                loading={loading}
                className="h-9 w-9 rounded-lg border-gray-200 text-gray-500 hover:text-indigo-600"
              />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-4 pt-4 pb-4 space-y-4">

        {/* ── FILTERS ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex flex-wrap items-center gap-3"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
        >
          <FilterOutlined style={{ color: THEME.primary, fontSize: 15 }} />
          <Input
            placeholder="Search transactions…"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPagination((p) => ({ ...p, current: 1 })); }}
            allowClear
            prefix={<SearchOutlined style={{ color: THEME.primary }} />}
            style={{ width: 260, borderColor: "rgba(37,99,235,0.25)" }}
            className="rounded-lg h-9"
          />
          <Select
            value={resellerFilter}
            onChange={(v) => { setResellerFilter(v); setPagination((p) => ({ ...p, current: 1 })); }}
            style={{ width: 150 }}
            className="h-9"
          >
            <Select.Option value="All">All Sources</Select.Option>
            <Select.Option value="System">System</Select.Option>
            <Select.Option value="Reseller">Reseller</Select.Option>
          </Select>
          <Select
            value={filter}
            onChange={setFilter}
            style={{ width: 150 }}
            className="h-9"
          >
            <Select.Option value="newest">Newest First</Select.Option>
            <Select.Option value="oldest">Oldest First</Select.Option>
          </Select>
          <div className="ml-auto text-xs text-gray-400">
            {pagination.total.toLocaleString()} records
          </div>
        </motion.div>

        {/* ── TABLE ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Spin size="large" />
              <p className="mt-4 text-sm text-gray-400">Loading transactions…</p>
            </div>
          ) : filteredData.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No transactions found" className="py-16" />
          ) : (
            <>
              <Table
                columns={columns}
                dataSource={filteredData}
                rowKey="id"
                pagination={false}
                scroll={{ x: 1100 }}
                size="middle"
                className="transaction-table"
              />

              {/* Pagination */}
              <div
                className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3"
                style={{ borderTop: "1px solid rgba(37,99,235,0.08)" }}
              >
                <span className="text-xs text-gray-400">
                  Showing {(pagination.current - 1) * pagination.pageSize + 1}–{Math.min(pagination.current * pagination.pageSize, pagination.total)} of {pagination.total}
                </span>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setPagination((p) => ({ ...p, current: 1 }))}
                    disabled={pagination.current === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                    style={{ background: pagination.current === 1 ? "#f3f4f6" : "rgba(37,99,235,0.1)", color: pagination.current === 1 ? "#9ca3af" : THEME.primaryDark }}
                  >
                    <DoubleLeftOutlined style={{ fontSize: 10 }} /> First
                  </motion.button>
                  <Pagination
                    current={pagination.current}
                    pageSize={pagination.pageSize}
                    total={pagination.total}
                    onChange={(page, size) => setPagination((p) => ({ ...p, current: page, pageSize: size }))}
                    showSizeChanger
                    pageSizeOptions={["10", "25", "50", "100"]}
                    size="small"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setPagination((p) => ({ ...p, current: totalPages }))}
                    disabled={pagination.current === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                    style={{ background: pagination.current === totalPages ? "#f3f4f6" : "rgba(37,99,235,0.1)", color: pagination.current === totalPages ? "#9ca3af" : THEME.primaryDark }}
                  >
                    Last <DoubleRightOutlined style={{ fontSize: 10 }} />
                  </motion.button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .transaction-table .ant-table-thead > tr > th {
          background: linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%) !important;
          color: #374151 !important;
          font-weight: 700 !important;
          font-size: 12px !important;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 2px solid rgba(37,99,235,0.12) !important;
        }
        .transaction-table .ant-table-tbody > tr:hover > td {
          background: rgba(37,99,235,0.04) !important;
        }
        .transaction-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f3f4f6 !important;
        }
        .ant-pagination-item-active {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
          border-color: #2563EB !important;
        }
        .ant-pagination-item-active a { color: white !important; }
        .ant-pagination-item:hover { border-color: #2563EB !important; }
        .ant-pagination-item:hover a { color: #2563EB !important; }
      `}} />
    </div>
  );
};

export default TicketList;

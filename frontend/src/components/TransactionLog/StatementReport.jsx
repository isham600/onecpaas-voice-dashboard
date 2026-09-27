import { useEffect, useState } from "react";
import { Table, Select, Typography, Spin, Pagination, Tag, DatePicker, Empty, Tooltip, Button, message } from "antd";
import {
  ShoppingCartOutlined, SwapOutlined, ThunderboltOutlined,
  UndoOutlined, ToolOutlined, ArrowUpOutlined, ArrowDownOutlined, DownloadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";

import { getMyStatement, getStatementServiceOptions } from "../../services/api";
import handleApiError from "../../utils/errorHandler";
import { getServiceMeta } from "./serviceMeta";
import { downloadCSV } from "./csvExport";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
};

const TYPE_STYLE = {
  Purchase:   { bg: "#ECFDF5", color: "#059669", icon: ShoppingCartOutlined },
  Transfer:   { bg: "#EFF6FF", color: "#2563EB", icon: SwapOutlined },
  Usage:      { bg: "#FFF7ED", color: "#C2410C", icon: ThunderboltOutlined },
  Refund:     { bg: "#F5F3FF", color: "#7C3AED", icon: UndoOutlined },
  Adjustment: { bg: "#F3F4F6", color: "#6B7280", icon: ToolOutlined },
};

// 01-Aug-2026 10:30 PM
const fmtDateTime = (v) => (v ? dayjs(v).format("DD-MMM-YYYY hh:mm A") : "—");

// Usage isn't offered as a filter yet — no rows exist until send-time debit logging ships.
const TYPE_OPTIONS = Object.keys(TYPE_STYLE)
  .filter((key) => key !== "Usage")
  .map((key) => ({ value: key, label: key }));
const ALL_TYPES = TYPE_OPTIONS.map((o) => o.value);

const StatementReport = () => {
  const [services, setServices] = useState(["all"]);
  const [serviceOptions, setServiceOptions] = useState([{ value: "all", label: "All Services" }]);
  const [types, setTypes] = useState(ALL_TYPES);
  const [rows, setRows] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(null);
  const [totals, setTotals] = useState({ credit: 0, debit: 0, purchase: 0, transfer: 0, refund: 0, used: 0 });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getStatementServiceOptions()
      .then((response) => setServiceOptions(response.data.data || []))
      .catch((error) => handleApiError(error));
  }, []);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d;
  });
  const [endDate, setEndDate] = useState(new Date());

  const [pagination, setPagination] = useState({
    current: 1, pageSize: 25, total: 0,
  });

  const baseParams = () => ({
    service: services.includes("all") ? "all" : services.join(","),
    type: types.length > 0 ? types.join(",") : ALL_TYPES.join(","),
    start_date: dayjs(startDate).format("YYYY-MM-DD"),
    end_date: dayjs(endDate).format("YYYY-MM-DD"),
  });

  const fetchStatement = async () => {
    setLoading(true);
    try {
      const params = {
        ...baseParams(),
        page: pagination.current,
        limit: pagination.pageSize,
      };
      const response = await getMyStatement(params);
      setRows(response.data.data || []);
      setCurrentBalance(response.data.meta?.current_balance ?? null);
      setTotals(response.data.meta?.totals || { credit: 0, debit: 0, purchase: 0, transfer: 0, refund: 0, used: 0 });
      setPagination((prev) => ({ ...prev, total: response.data.meta?.total || 0 }));
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, types, startDate, endDate, pagination.current, pagination.pageSize]);

  // "All Services" behaves as a toggle: picking it clears specific selections and
  // vice versa; clearing everything falls back to "all" rather than an empty filter.
  const handleServiceChange = (value) => {
    const prevHadAll = services.includes("all");
    let next = value;
    if (value.includes("all") && !prevHadAll) {
      next = ["all"];
    } else if (value.length > 1 && value.includes("all")) {
      next = value.filter((v) => v !== "all");
    } else if (value.length === 0) {
      next = ["all"];
    }
    setServices(next);
    setPagination((p) => ({ ...p, current: 1 }));
  };

  const handleTypeChange = (value) => {
    setTypes(value.length === 0 ? ALL_TYPES : value);
    setPagination((p) => ({ ...p, current: 1 }));
  };

  const handleDownloadCSV = async () => {
    setExporting(true);
    try {
      const limit = 100;
      let page = 1;
      let all = [];
      while (true) {
        const response = await getMyStatement({ ...baseParams(), page, limit });
        const data = response.data.data || [];
        all = all.concat(data);
        const total = response.data.meta?.total ?? all.length;
        if (data.length < limit || all.length >= total) break;
        page += 1;
      }

      const headers = ["Date & Time", "Transaction ID", "Service", "Description", "Type", "To / From", "Credit", "Debit", "Balance"];
      const rows = all.map((r) => [
        fmtDateTime(r.date_time),
        r.transaction_id,
        r.service,
        r.description || "",
        r.type,
        r.type === "Refund" ? "System" : r.counterparty,
        r.credit || "",
        r.debit || "",
        r.balance,
      ]);
      downloadCSV(`Statement_${dayjs(startDate).format("YYYYMMDD")}-${dayjs(endDate).format("YYYYMMDD")}.csv`, headers, rows);
      message.success(`CSV downloaded successfully (${all.length} records)`);
    } catch (error) {
      handleApiError(error);
      message.error("Failed to download CSV");
    } finally {
      setExporting(false);
    }
  };

  const overviewTiles = [
    { key: "credit",   label: "Credit",   value: totals.credit,   sign: "+", color: "#059669", icon: ArrowUpOutlined },
    { key: "debit",    label: "Debit",    value: totals.debit,    sign: "−", color: "#DC2626", icon: ArrowDownOutlined },
    { key: "refund",   label: "Refund",   value: totals.refund,   sign: "+", color: TYPE_STYLE.Refund.color,   icon: TYPE_STYLE.Refund.icon },
    { key: "transfer", label: "Transfer", value: totals.transfer, sign: "−", color: TYPE_STYLE.Transfer.color, icon: TYPE_STYLE.Transfer.icon },
    { key: "used",     label: "Used",     value: totals.used,     sign: "−", color: TYPE_STYLE.Usage.color,    icon: TYPE_STYLE.Usage.icon },
  ];

  const columns = [
    {
      title: "Date & Time",
      dataIndex: "date_time",
      key: "date_time",
      width: 190,
      render: (v) => <Text className="text-xs text-gray-600">{fmtDateTime(v)}</Text>,
    },
    {
      title: "Transaction ID",
      dataIndex: "transaction_id",
      key: "transaction_id",
      width: 120,
      render: (v) => <Text className="font-mono text-xs font-semibold" style={{ color: THEME.primary }}>{v}</Text>,
    },
    {
      title: "Service",
      dataIndex: "service",
      key: "service",
      width: 150,
      render: (v) => {
        const m = getServiceMeta(v);
        const Icon = m.icon;
        return (
          <span className="inline-flex items-center gap-1.5">
            <Icon style={{ color: m.color, fontSize: 13 }} />
            <Text className="text-xs text-gray-700">{v}</Text>
          </span>
        );
      },
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (v) => (
        <Tooltip title={v} placement="topLeft">
          <Text className="text-xs text-gray-600">{v || "—"}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 110,
      render: (v) => {
        const t = TYPE_STYLE[v] || TYPE_STYLE.Adjustment;
        const Icon = t.icon;
        return (
          <Tag
            icon={<Icon style={{ fontSize: 11 }} />}
            style={{ background: t.bg, color: t.color, border: "none", borderRadius: 6, fontWeight: 600, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            {v}
          </Tag>
        );
      },
    },
    {
      title: "To / From",
      dataIndex: "counterparty",
      key: "counterparty",
      width: 140,
      render: (v, row) => {
        const isOutgoing = row.type === "Transfer";
        const display = row.type === "Refund" ? "System" : v;
        return (
          <span className="inline-flex items-center gap-1.5">
            <Text className="text-[10px] uppercase tracking-wide text-gray-400">
              {isOutgoing ? "To" : "From"}
            </Text>
            <Text className="text-xs font-semibold text-gray-700">{display}</Text>
          </span>
        );
      },
    },
    {
      title: "Credit",
      dataIndex: "credit",
      key: "credit",
      width: 100,
      align: "right",
      render: (v) => v > 0
        ? <Text className="text-xs font-semibold" style={{ color: "#059669" }}>+{Number(v).toLocaleString()}</Text>
        : <Text className="text-xs text-gray-300">—</Text>,
    },
    {
      title: "Debit",
      dataIndex: "debit",
      key: "debit",
      width: 100,
      align: "right",
      render: (v) => v > 0
        ? <Text className="text-xs font-semibold" style={{ color: "#DC2626" }}>−{Number(v).toLocaleString()}</Text>
        : <Text className="text-xs text-gray-300">—</Text>,
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      width: 110,
      align: "right",
      render: (v) => <Text className="text-xs font-bold text-gray-800">{Number(v).toLocaleString()}</Text>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── OVERVIEW ── temporarily disabled, re-enable by flipping this flag */}
      {false && (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
      >
        {overviewTiles.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3"
              style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${t.color}1A` }}
              >
                <Icon style={{ color: t.color, fontSize: 16 }} />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400">{t.label}</div>
                <div className="text-sm font-bold" style={{ color: t.color }}>
                  {t.value > 0 ? `${t.sign}${Number(t.value).toLocaleString()}` : "—"}
                </div>
              </div>
            </div>
          );
        })}
        <div
          className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3"
          style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#F3F4F6" }}
          >
            <ShoppingCartOutlined style={{ color: "#374151", fontSize: 16 }} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-400">Current Balance</div>
            <div className="text-sm font-bold text-gray-800">
              {currentBalance != null ? currentBalance.toLocaleString() : "—"}
            </div>
          </div>
        </div>
      </motion.div>
      )}

      {/* ── FILTERS ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex flex-wrap items-start gap-3"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        <Select
          mode="multiple"
          value={services}
          onChange={handleServiceChange}
          style={{ width: 260 }}
          options={serviceOptions}
          maxTagCount="responsive"
          placeholder="Service"
          optionRender={(opt) => {
            if (opt.data.value === "all") return opt.data.label;
            const m = getServiceMeta(opt.data.label);
            const Icon = m.icon;
            return (
              <span className="inline-flex items-center gap-1.5">
                <Icon style={{ color: m.color, fontSize: 13 }} />
                {opt.data.label}
              </span>
            );
          }}
        />
        <Select
          mode="multiple"
          value={types}
          onChange={handleTypeChange}
          style={{ width: 240 }}
          options={TYPE_OPTIONS}
          maxTagCount="responsive"
          placeholder="Type"
          optionRender={(opt) => {
            const t = TYPE_STYLE[opt.data.value];
            const Icon = t.icon;
            return (
              <span className="inline-flex items-center gap-1.5">
                <Icon style={{ color: t.color, fontSize: 13 }} />
                {opt.data.label}
              </span>
            );
          }}
        />
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
          style={{ minWidth: 240 }}
        />
        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownloadCSV}
          loading={exporting}
          disabled={exporting}
          className="h-9 rounded-lg border-gray-200 text-gray-600 hover:text-indigo-600 ml-auto"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </motion.div>

      {/* ── TABLE ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spin size="large" />
            <p className="mt-4 text-sm text-gray-400">Loading statement…</p>
          </div>
        ) : rows.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No transactions in this period" className="py-16" />
        ) : (
          <>
            <Table
              columns={columns}
              dataSource={rows}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1000 }}
              size="middle"
              className="statement-table"
            />
            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3"
              style={{ borderTop: "1px solid rgba(37,99,235,0.08)" }}
            >
              <span className="text-xs text-gray-400">
                Showing {(pagination.current - 1) * pagination.pageSize + 1}–{Math.min(pagination.current * pagination.pageSize, pagination.total)} of {pagination.total}
              </span>
              <Pagination
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onChange={(page, size) => setPagination((p) => ({ ...p, current: page, pageSize: size }))}
                showSizeChanger
                pageSizeOptions={["25", "50", "100"]}
                size="small"
              />
            </div>
          </>
        )}
      </motion.div>

      <p className="text-xs text-gray-400 px-1">
        Usage and Refund rows will start appearing once every campaign-send debit is logged (in progress) — today this statement reflects purchases and transfers only.
      </p>

      <style dangerouslySetInnerHTML={{__html: `
        .statement-table .ant-table-thead > tr > th {
          background: linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%) !important;
          color: #374151 !important;
          font-weight: 700 !important;
          font-size: 12px !important;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 2px solid rgba(37,99,235,0.12) !important;
        }
        .statement-table .ant-table-tbody > tr:hover > td {
          background: rgba(37,99,235,0.04) !important;
        }
        .statement-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f3f4f6 !important;
        }
      `}} />
    </div>
  );
};

export default StatementReport;

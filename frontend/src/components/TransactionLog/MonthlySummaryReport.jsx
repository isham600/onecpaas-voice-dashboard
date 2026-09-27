import { useEffect, useState } from "react";
import { Table, Select, Typography, Spin, Empty, Tag, Button, message } from "antd";
import {
  ShoppingCartOutlined, SwapOutlined, UndoOutlined, ThunderboltOutlined,
  RiseOutlined, FallOutlined, MinusOutlined, DownloadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";

import { getMonthlySummary, getStatementServiceOptions } from "../../services/api";
import handleApiError from "../../utils/errorHandler";
import { getServiceMeta } from "./serviceMeta";
import { downloadCSV } from "./csvExport";

const { Text } = Typography;

const fmtMonth = (v) => (v ? dayjs(`${v}-01`).format("MMM YYYY") : "—");

const ColHeader = ({ icon: Icon, color, children }) => (
  <span className="inline-flex items-center gap-1.5">
    <Icon style={{ color, fontSize: 12 }} />
    {children}
  </span>
);

// Trend compares this month's closing balance to the previous month's — only
// meaningful for a single service (closing_balance is null under "All Services").
const getTrend = (curr, prev) => {
  if (curr == null) return null;
  if (prev == null) return { label: "New", color: "#6B7280", bg: "#F3F4F6", icon: MinusOutlined };
  if (curr > prev) return { label: "Up", color: "#059669", bg: "#ECFDF5", icon: RiseOutlined };
  if (curr < prev) return { label: "Down", color: "#DC2626", bg: "#FEF2F2", icon: FallOutlined };
  return { label: "Flat", color: "#6B7280", bg: "#F3F4F6", icon: MinusOutlined };
};

const MonthlySummaryReport = () => {
  const [service, setService] = useState(null);
  const [serviceOptions, setServiceOptions] = useState([]);
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getStatementServiceOptions()
      .then((response) => {
        const options = response.data.data || [];
        setServiceOptions(options);
        if (options.length > 0) setService(options[0].value);
      })
      .catch((error) => handleApiError(error));
  }, []);

  useEffect(() => {
    if (!service) return;
    setLoading(true);
    getMonthlySummary({ service })
      .then((response) => setMonths(response.data.data?.months || []))
      .catch((error) => handleApiError(error))
      .finally(() => setLoading(false));
  }, [service]);

  const handleDownloadCSV = () => {
    if (months.length === 0) return;
    const headers = ["Month", "Purchased", "Transferred Out", "Refunded", "Used", "Closing Balance", "Trend"];
    const rows = months.map((m, index) => {
      const prev = index > 0 ? months[index - 1].closing_balance : null;
      const t = getTrend(m.closing_balance, prev);
      return [
        fmtMonth(m.month),
        m.purchased,
        m.transferred_out || "",
        m.refunded || "",
        m.used || "",
        m.closing_balance == null ? "" : m.closing_balance,
        t ? t.label : "",
      ];
    });
    const label = serviceOptions.find((o) => o.value === service)?.label || "AllServices";
    downloadCSV(`MonthlySummary_${label.replace(/\s+/g, "")}.csv`, headers, rows);
    message.success(`CSV downloaded successfully (${months.length} records)`);
  };

  const columns = [
    {
      title: "Month",
      dataIndex: "month",
      key: "month",
      render: (v) => <Text className="text-xs font-semibold text-gray-800">{fmtMonth(v)}</Text>,
    },
    {
      title: <ColHeader icon={ShoppingCartOutlined} color="#059669">Purchased</ColHeader>,
      dataIndex: "purchased",
      key: "purchased",
      align: "right",
      render: (v) => <Text className="text-xs font-semibold" style={{ color: "#059669" }}>+{Number(v).toLocaleString()}</Text>,
    },
    {
      title: <ColHeader icon={SwapOutlined} color="#2563EB">Transferred Out</ColHeader>,
      dataIndex: "transferred_out",
      key: "transferred_out",
      align: "right",
      render: (v) => v > 0
        ? <Text className="text-xs font-semibold" style={{ color: "#DC2626" }}>−{Number(v).toLocaleString()}</Text>
        : <Text className="text-xs text-gray-300">—</Text>,
    },
    {
      title: <ColHeader icon={UndoOutlined} color="#7C3AED">Refunded</ColHeader>,
      dataIndex: "refunded",
      key: "refunded",
      align: "right",
      render: (v) => v > 0
        ? <Text className="text-xs font-semibold" style={{ color: "#7C3AED" }}>+{Number(v).toLocaleString()}</Text>
        : <Text className="text-xs text-gray-300">—</Text>,
    },
    {
      title: <ColHeader icon={ThunderboltOutlined} color="#C2410C">Used</ColHeader>,
      dataIndex: "used",
      key: "used",
      align: "right",
      render: (v) => <Text className="text-xs text-gray-300">{v > 0 ? Number(v).toLocaleString() : "—"}</Text>,
    },
    {
      title: "Closing Balance",
      dataIndex: "closing_balance",
      key: "closing_balance",
      align: "right",
      render: (v) => v == null
        ? <Text className="text-xs text-gray-300">—</Text>
        : <Text className="text-xs font-bold text-gray-800">{Number(v).toLocaleString()}</Text>,
    },
    {
      title: "Trend",
      key: "trend",
      width: 100,
      render: (_, row, index) => {
        const prev = index > 0 ? months[index - 1].closing_balance : null;
        const t = getTrend(row.closing_balance, prev);
        if (!t) return <Text className="text-xs text-gray-300">—</Text>;
        const Icon = t.icon;
        return (
          <Tag
            icon={<Icon style={{ fontSize: 11 }} />}
            style={{ background: t.bg, color: t.color, border: "none", borderRadius: 6, fontWeight: 600, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            {t.label}
          </Tag>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex flex-wrap items-center gap-3"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        <Select
          value={service}
          onChange={setService}
          style={{ width: 220 }}
          className="h-9"
          options={serviceOptions}
          placeholder="Select a service"
          optionRender={(opt) => {
            const m = getServiceMeta(opt.data.label);
            const Icon = m.icon;
            return (
              <span className="inline-flex items-center gap-1.5">
                <Icon style={{ color: m.color, fontSize: 13 }} />
                {opt.data.label}
              </span>
            );
          }}
          labelRender={(sel) => {
            const m = getServiceMeta(sel.label);
            const Icon = m.icon;
            return (
              <span className="inline-flex items-center gap-1.5">
                <Icon style={{ color: m.color, fontSize: 13 }} />
                {sel.label}
              </span>
            );
          }}
        />
        <span className="text-xs text-gray-400">Closing balance shows a dash under "All Services" — pick one service to see it.</span>
        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownloadCSV}
          disabled={months.length === 0}
          className="h-9 rounded-lg border-gray-200 text-gray-600 hover:text-indigo-600 ml-auto"
        >
          Export CSV
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spin size="large" />
            <p className="mt-4 text-sm text-gray-400">Loading monthly summary…</p>
          </div>
        ) : months.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No transactions for this service yet" className="py-16" />
        ) : (
          <Table
            columns={columns}
            dataSource={months}
            rowKey="month"
            pagination={false}
            size="middle"
          />
        )}
      </motion.div>

      <p className="text-xs text-gray-400 px-1">
        Used will populate once every campaign-send debit is logged for this service (in progress).
      </p>
    </div>
  );
};

export default MonthlySummaryReport;

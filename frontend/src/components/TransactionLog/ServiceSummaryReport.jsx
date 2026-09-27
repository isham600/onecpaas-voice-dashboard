import { useEffect, useState } from "react";
import { Table, Typography, Spin, DatePicker, Empty, Progress, Tag, Button, message } from "antd";
import {
  CheckCircleOutlined, WarningOutlined, CloseCircleOutlined, ThunderboltOutlined, DownloadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";

import { getServicePurchaseUsageSummary } from "../../services/api";
import handleApiError from "../../utils/errorHandler";
import { getServiceMeta } from "./serviceMeta";
import { downloadCSV } from "./csvExport";

const { Text } = Typography;
const { RangePicker } = DatePicker;

// Status is derived from how much of the purchased balance is left, not a stored
// field — Exhausted/Low kick in on remaining balance regardless of purchase history
// so a service that was only ever manually granted (never "purchased") still warns.
const getStatus = (purchased, remaining) => {
  if (remaining <= 0) return { label: "Exhausted", color: "#DC2626", bg: "#FEF2F2", icon: CloseCircleOutlined };
  const pct = purchased > 0 ? ((purchased - remaining) / purchased) * 100 : 0;
  if (pct >= 80) return { label: "Low Balance", color: "#C2410C", bg: "#FFF7ED", icon: WarningOutlined };
  if (purchased === 0) return { label: "Active", color: "#2563EB", bg: "#EFF6FF", icon: ThunderboltOutlined };
  return { label: "Healthy", color: "#059669", bg: "#ECFDF5", icon: CheckCircleOutlined };
};

const ServiceSummaryReport = () => {
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({ total_purchased: 0, total_transferred: 0, total_used: 0, total_remaining: 0 });
  const [services, setServices] = useState([]);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = dayjs(startDate).format("YYYY-MM-DD");
      if (endDate)   params.end_date   = dayjs(endDate).format("YYYY-MM-DD");
      const response = await getServicePurchaseUsageSummary(params);
      setTotals(response.data.data || {});
      setServices(response.data.data?.services || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const handleDownloadCSV = () => {
    if (services.length === 0) return;
    const headers = ["Service", "Status", "Purchased", "Transferred", "Remaining"];
    const rows = services.map((s) => [
      s.service,
      getStatus(Number(s.purchased) || 0, Number(s.remaining) || 0).label,
      s.purchased,
      s.transferred || "",
      s.remaining,
    ]);
    const range = startDate && endDate
      ? `${dayjs(startDate).format("YYYYMMDD")}-${dayjs(endDate).format("YYYYMMDD")}`
      : "AllTime";
    downloadCSV(`ServiceSummary_${range}.csv`, headers, rows);
    message.success(`CSV downloaded successfully (${services.length} records)`);
  };

  const columns = [
    {
      title: "Service",
      dataIndex: "service",
      key: "service",
      render: (v) => {
        const m = getServiceMeta(v);
        const Icon = m.icon;
        return (
          <span className="inline-flex items-center gap-1.5">
            <Icon style={{ color: m.color, fontSize: 13 }} />
            <Text className="text-xs font-medium text-gray-800">{v}</Text>
          </span>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      width: 130,
      render: (_, row) => {
        const s = getStatus(Number(row.purchased) || 0, Number(row.remaining) || 0);
        const Icon = s.icon;
        return (
          <Tag
            icon={<Icon style={{ fontSize: 11 }} />}
            style={{ background: s.bg, color: s.color, border: "none", borderRadius: 6, fontWeight: 600, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            {s.label}
          </Tag>
        );
      },
    },
    {
      title: "Purchased",
      dataIndex: "purchased",
      key: "purchased",
      align: "right",
      render: (v) => <Text className="text-xs font-semibold text-gray-700">{Number(v).toLocaleString()}</Text>,
    },
    {
      title: "Transferred",
      dataIndex: "transferred",
      key: "transferred",
      align: "right",
      render: (v) => v > 0
        ? <Text className="text-xs font-semibold" style={{ color: "#2563EB" }}>{Number(v).toLocaleString()}</Text>
        : <Text className="text-xs text-gray-300">—</Text>,
    },
    {
      title: "Remaining",
      dataIndex: "remaining",
      key: "remaining",
      align: "right",
      render: (v) => <Text className="text-xs font-bold" style={{ color: "#059669" }}>{Number(v).toLocaleString()}</Text>,
    },
    {
      title: "Utilization",
      key: "utilization",
      width: 180,
      render: (_, row) => {
        const total = Number(row.purchased) || 0;
        const remaining = Number(row.remaining) || 0;
        const pct = total > 0 ? Math.min(100, Math.round(((total - remaining) / total) * 100)) : 0;
        return <Progress percent={pct} size="small" strokeColor="#2563EB" />;
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
        <RangePicker
          value={[startDate ? dayjs(startDate) : null, endDate ? dayjs(endDate) : null]}
          onChange={(d) => {
            if (d) { setStartDate(d[0].toDate()); setEndDate(d[1].toDate()); }
            else { setStartDate(null); setEndDate(null); }
          }}
          format="YYYY-MM-DD"
          placeholder={["All time", "All time"]}
          presets={[
            { label: "Last 30 days", value: [dayjs().subtract(30, "day"), dayjs()] },
            { label: "Last 90 days", value: [dayjs().subtract(90, "day"), dayjs()] },
          ]}
          className="h-9 rounded-lg bg-white"
          style={{ minWidth: 240 }}
        />
        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownloadCSV}
          disabled={services.length === 0}
          className="h-9 rounded-lg border-gray-200 text-gray-600 hover:text-indigo-600"
        >
          Export CSV
        </Button>
        <div className="ml-auto flex items-center gap-5">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-gray-400">Purchased</div>
            <div className="text-sm font-bold text-gray-800">{Number(totals.total_purchased || 0).toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-gray-400">Transferred</div>
            <div className="text-sm font-bold" style={{ color: "#2563EB" }}>{Number(totals.total_transferred || 0).toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-gray-400">Remaining</div>
            <div className="text-sm font-bold" style={{ color: "#059669" }}>{Number(totals.total_remaining || 0).toLocaleString()}</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spin size="large" />
            <p className="mt-4 text-sm text-gray-400">Loading summary…</p>
          </div>
        ) : services.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No purchases in this period" className="py-16" />
        ) : (
          <Table
            columns={columns}
            dataSource={services}
            rowKey="back_end_name"
            pagination={false}
            size="middle"
          />
        )}
      </motion.div>

      <p className="text-xs text-gray-400 px-1">
        Remaining is your live balance today.
      </p>
    </div>
  );
};

export default ServiceSummaryReport;

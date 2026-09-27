import { useEffect, useState } from "react";
import { Table, Typography, Spin, Select, Empty, Tag, Button, Modal, message } from "antd";
import {
  UserOutlined, TeamOutlined, ArrowUpOutlined, ArrowDownOutlined,
  CheckCircleOutlined, MinusCircleOutlined, EyeOutlined, DownloadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";

import { getDownlineTransferSummary, getDownlineUserDetails, getStatementServiceOptions } from "../../services/api";
import handleApiError from "../../utils/errorHandler";
import { downloadCSV } from "./csvExport";

const { Text } = Typography;

const fmtDay = (v) => (v ? dayjs(v).format("DD-MMM-YYYY (ddd)") : "—");

const ROLE_META = {
  reseller: { color: "#7C3AED", bg: "#F5F3FF", icon: TeamOutlined },
  client:   { color: "#2563EB", bg: "#EFF6FF", icon: UserOutlined },
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: dayjs().month(i).format("MMMM"),
}));
const CURRENT_YEAR = dayjs().year();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => ({
  value: CURRENT_YEAR - i,
  label: String(CURRENT_YEAR - i),
}));

const DownlineSummaryReport = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ total_purchased: 0, total_transferred_out: 0, retained: 0 });
  const [downline, setDownline] = useState([]);

  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [service, setService] = useState("all");
  const [serviceOptions, setServiceOptions] = useState([]);

  const [detailsUser, setDetailsUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsDays, setDetailsDays] = useState([]);

  useEffect(() => {
    getStatementServiceOptions()
      .then((response) => setServiceOptions(response.data.data || []))
      .catch((error) => handleApiError(error));
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await getDownlineTransferSummary({ year, month, service });
      setSummary(response.data.data || {});
      setDownline(response.data.data?.downline || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, service]);

  const openDetails = async (row) => {
    setDetailsUser(row);
    setDetailsLoading(true);
    try {
      const response = await getDownlineUserDetails({ target: row.username, year, month, service });
      setDetailsDays(response.data.data?.days || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (downline.length === 0) return;
    const headers = ["Username", "Name", "Role", "Credited", "Reclaimed", "Net Transfer", "Status"];
    const rows = downline.map((u) => [
      u.username,
      u.name,
      u.user_type,
      u.credited || "",
      u.reclaimed || "",
      u.net_transferred,
      u.has_activity ? "Active" : "No Activity",
    ]);
    const monthLabel = dayjs().month(month - 1).format("MMMM");
    downloadCSV(`UserReport_${monthLabel}${year}.csv`, headers, rows);
    message.success(`CSV downloaded successfully (${downline.length} records)`);
  };

  const handleDownloadDetailsCSV = () => {
    if (!detailsUser || detailsDays.length === 0) return;
    const headers = ["Date", "Credited", "Reclaimed", "Net", "Transactions"];
    const rows = detailsDays.map((d) => [
      fmtDay(d.date),
      d.credited || "",
      d.reclaimed || "",
      d.net,
      d.count,
    ]);
    const monthLabel = dayjs().month(month - 1).format("MMMM");
    downloadCSV(`UserReport_${detailsUser.username}_${monthLabel}${year}.csv`, headers, rows);
    message.success(`CSV downloaded successfully (${detailsDays.length} records)`);
  };

  const columns = [
    {
      title: "User",
      dataIndex: "username",
      key: "username",
      render: (v, row) => {
        const r = ROLE_META[row.user_type] || ROLE_META.client;
        const Icon = r.icon;
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: r.bg }}
            >
              <Icon style={{ color: r.color, fontSize: 13 }} />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-800">{v}</div>
              {row.name && <div className="text-[11px] text-gray-400">{row.name}</div>}
            </div>
          </div>
        );
      },
    },
    {
      title: "Role",
      dataIndex: "user_type",
      key: "user_type",
      width: 100,
      render: (v) => {
        const r = ROLE_META[v] || ROLE_META.client;
        return (
          <Tag style={{ background: r.bg, color: r.color, border: "none", borderRadius: 6, fontWeight: 600, fontSize: 11, textTransform: "capitalize" }}>
            {v || "client"}
          </Tag>
        );
      },
    },
    {
      title: "Credited",
      dataIndex: "credited",
      key: "credited",
      align: "right",
      render: (v) => v > 0
        ? <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#059669" }}><ArrowUpOutlined style={{ fontSize: 10 }} />{Number(v).toLocaleString()}</span>
        : <Text className="text-xs text-gray-300">—</Text>,
    },
    {
      title: "Reclaimed",
      dataIndex: "reclaimed",
      key: "reclaimed",
      align: "right",
      render: (v) => v > 0
        ? <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#DC2626" }}><ArrowDownOutlined style={{ fontSize: 10 }} />{Number(v).toLocaleString()}</span>
        : <Text className="text-xs text-gray-300">—</Text>,
    },
    {
      title: "Net Transfer",
      dataIndex: "net_transferred",
      key: "net_transferred",
      align: "right",
      render: (v) => <Text className="text-xs font-bold" style={{ color: v >= 0 ? "#2563EB" : "#DC2626" }}>{Number(v).toLocaleString()}</Text>,
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      render: (_, row) => row.has_activity
        ? <Tag icon={<CheckCircleOutlined style={{ fontSize: 11 }} />} style={{ background: "#ECFDF5", color: "#059669", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 11 }}>Active</Tag>
        : <Tag icon={<MinusCircleOutlined style={{ fontSize: 11 }} />} style={{ background: "#F3F4F6", color: "#6B7280", border: "none", borderRadius: 6, fontWeight: 600, fontSize: 11 }}>No Activity</Tag>,
    },
    {
      title: "Action",
      key: "action",
      width: 90,
      fixed: "right",
      render: (_, row) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => openDetails(row)}
          disabled={!row.has_activity}
          className="text-xs"
        >
          Details
        </Button>
      ),
    },
  ];

  const detailColumns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (v) => <Text className="text-xs font-semibold text-gray-800">{fmtDay(v)}</Text>,
    },
    {
      title: "Credited",
      dataIndex: "credited",
      key: "credited",
      align: "right",
      render: (v) => v > 0
        ? <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#059669" }}><ArrowUpOutlined style={{ fontSize: 10 }} />{Number(v).toLocaleString()}</span>
        : <Text className="text-xs text-gray-300">—</Text>,
    },
    {
      title: "Reclaimed",
      dataIndex: "reclaimed",
      key: "reclaimed",
      align: "right",
      render: (v) => v > 0
        ? <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "#DC2626" }}><ArrowDownOutlined style={{ fontSize: 10 }} />{Number(v).toLocaleString()}</span>
        : <Text className="text-xs text-gray-300">—</Text>,
    },
    {
      title: "Net",
      dataIndex: "net",
      key: "net",
      align: "right",
      render: (v) => <Text className="text-xs font-bold" style={{ color: v >= 0 ? "#2563EB" : "#DC2626" }}>{Number(v).toLocaleString()}</Text>,
    },
    {
      title: "Transactions",
      dataIndex: "count",
      key: "count",
      align: "right",
      render: (v) => <Text className="text-xs text-gray-500">{v}</Text>,
    },
  ];

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex flex-wrap items-center gap-3"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        <Select value={year} onChange={setYear} style={{ width: 100 }} className="h-9" options={YEAR_OPTIONS} />
        <Select value={month} onChange={setMonth} style={{ width: 140 }} className="h-9" options={MONTH_OPTIONS} />
        <Select value={service} onChange={setService} style={{ width: 200 }} className="h-9" options={serviceOptions} />
        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownloadCSV}
          disabled={downline.length === 0}
          className="h-9 rounded-lg border-gray-200 text-gray-600 hover:text-indigo-600"
        >
          Export CSV
        </Button>
        <div className="ml-auto flex items-center gap-5">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-gray-400">Purchased</div>
            <div className="text-sm font-bold text-gray-800">{Number(summary.total_purchased || 0).toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-gray-400">Transferred Out</div>
            <div className="text-sm font-bold" style={{ color: "#2563EB" }}>{Number(summary.total_transferred_out || 0).toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-gray-400">Retained</div>
            <div className="text-sm font-bold" style={{ color: "#059669" }}>{Number(summary.retained || 0).toLocaleString()}</div>
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
            <p className="mt-4 text-sm text-gray-400">Loading downline summary…</p>
          </div>
        ) : downline.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No clients under your account yet" className="py-16" />
        ) : (
          <Table
            columns={columns}
            dataSource={downline}
            rowKey="username"
            pagination={false}
            size="middle"
            scroll={{ x: 900 }}
          />
        )}
      </motion.div>

      <p className="text-xs text-gray-400 px-1">
        Roster comes from your Manage Client list — every client you own shows up here, even ones with no transfer activity this month.
      </p>

      <Modal
        open={!!detailsUser}
        onCancel={() => setDetailsUser(null)}
        footer={
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownloadDetailsCSV}
            disabled={detailsDays.length === 0}
          >
            Export CSV
          </Button>
        }
        title={detailsUser ? `${detailsUser.username} — ${dayjs().month(month - 1).format("MMMM")} ${year}` : ""}
        width={620}
      >
        {detailsLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Spin />
          </div>
        ) : (
          <Table
            columns={detailColumns}
            dataSource={detailsDays}
            rowKey="date"
            pagination={false}
            size="small"
            locale={{ emptyText: "No transfer days in this period" }}
          />
        )}
      </Modal>
    </div>
  );
};

export default DownlineSummaryReport;

import { useEffect, useState } from "react";
import { Table, Tag, Spin, Typography } from "antd";
import {
  DesktopOutlined,
  MobileOutlined,
  TabletOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { getLoginHistory } from "../../../../services/api";
import handleApiError from "../../../../utils/errorHandler";

const { Text } = Typography;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight: "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const deviceIcon = (type) => {
  if (type === "mobile") return <MobileOutlined style={{ color: THEME.primary }} />;
  if (type === "tablet") return <TabletOutlined style={{ color: THEME.primary }} />;
  return <DesktopOutlined style={{ color: THEME.primary }} />;
};

const deviceLabel = (type) => {
  if (type === "mobile") return "Mobile";
  if (type === "tablet") return "Tablet";
  return "Desktop";
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const columns = [
  {
    title: "Device",
    dataIndex: "device_type",
    key: "device_type",
    render: (type) => (
      <div className="flex items-center gap-2">
        <span className="text-base">{deviceIcon(type)}</span>
        <Text className="text-sm font-medium" style={{ color: "#374151" }}>
          {deviceLabel(type)}
        </Text>
      </div>
    ),
  },
  {
    title: "Browser",
    dataIndex: "browser",
    key: "browser",
    render: (v) => <Text className="text-sm" style={{ color: "#4b5563" }}>{v || "—"}</Text>,
  },
  {
    title: "OS",
    dataIndex: "os",
    key: "os",
    render: (v) => (
      <Tag style={{ borderRadius: 6, fontSize: 11, border: "1px solid rgba(37,99,235,0.2)", color: THEME.primaryDark, background: "rgba(37,99,235,0.06)" }}>
        {v || "Unknown"}
      </Tag>
    ),
  },
  {
    title: "IP Address",
    dataIndex: "ip_address",
    key: "ip_address",
    render: (v) => (
      <div className="flex items-center gap-1.5">
        <GlobalOutlined style={{ color: "#9ca3af", fontSize: 12 }} />
        <Text className="text-sm font-mono" style={{ color: "#4b5563" }}>{v || "—"}</Text>
      </div>
    ),
  },
  {
    title: "Date & Time",
    dataIndex: "created_at",
    key: "created_at",
    render: (v) => (
      <div className="flex items-center gap-1.5">
        <ClockCircleOutlined style={{ color: "#9ca3af", fontSize: 12 }} />
        <Text className="text-sm" style={{ color: "#4b5563" }}>{formatDate(v)}</Text>
      </div>
    ),
  },
];

const LoginHistory = () => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLoginHistory()
      .then((res) => setData(res?.data?.data || []))
      .catch(handleApiError)
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-base font-semibold mb-0.5" style={{ color: "#1f2937" }}>
          Recent Login Activity
        </h3>
        <p className="text-xs" style={{ color: "#6b7280" }}>
          Last 10 logins to your account
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : data.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{ background: THEME.gradientLight, border: "1px dashed rgba(37,99,235,0.2)" }}
        >
          <ClockCircleOutlined style={{ fontSize: 32, color: THEME.primary, marginBottom: 12 }} />
          <Text style={{ color: "#6b7280" }}>No login history yet</Text>
        </div>
      ) : (
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="middle"
          style={{ borderRadius: 12, overflow: "hidden" }}
        />
      )}
    </motion.div>
  );
};

export default LoginHistory;

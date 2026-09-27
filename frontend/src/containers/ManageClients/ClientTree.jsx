import { useState, useEffect } from "react";
import { Tag, Typography, Spin, Empty, Tooltip, Badge } from "antd";
import DashboardNavbar from "../../components/Navbar/DashboardNavbar.jsx";
import {
  UserOutlined, TeamOutlined, CrownOutlined, ReloadOutlined,
  CheckCircleOutlined, StopOutlined, BankOutlined,
  CalendarOutlined, ClockCircleOutlined, WarningOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import handleApiError from "../../utils/errorHandler.js";
import { clientTree } from "../../services/api.js";

const { Text } = Typography;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight: "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const fmt = (n) => n != null ? Number(n).toLocaleString() : "—";

const statusBadge = (status) => {
  const active = status !== "false";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: active ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)",
        color: active ? "#16a34a" : "#dc2626",
      }}
    >
      {active ? <CheckCircleOutlined /> : <StopOutlined />}
      {active ? "Active" : "Disabled"}
    </span>
  );
};

const typeBadge = (type, isRoot = false) => {
  if (isRoot) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: THEME.gradient, color: "white" }}>
      <CrownOutlined /> You
    </span>
  );
  if (type === "reseller") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: "rgba(124,58,237,0.12)", color: "#7c3aed" }}>
      <BankOutlined /> Reseller
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: "rgba(37,99,235,0.1)", color: THEME.primary }}>
      <UserOutlined /> Client
    </span>
  );
};

const fmtDate = (d) => {
  if (!d) return null;
  const s = String(d).slice(0, 10);
  if (!s || s === "null") return null;
  return s;
};

const expiryBadge = (expiry) => {
  const d = fmtDate(expiry);
  if (!d) return null;
  const expired = new Date(d) < new Date();
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: expired ? "rgba(220,38,38,0.08)" : "rgba(234,179,8,0.1)",
        color: expired ? "#dc2626" : "#92400e",
      }}
    >
      {expired ? <WarningOutlined /> : <ClockCircleOutlined />}
      {expired ? "Expired" : "Exp"} {d}
    </span>
  );
};

const joinedTag = (created_at) => {
  const d = fmtDate(created_at);
  if (!d) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
      style={{ background: "#f1f5f9", color: "#6b7280" }}
    >
      <CalendarOutlined /> Joined {d}
    </span>
  );
};

const creditRow = (credits) => {
  if (!credits) return null;
  const items = [
    { label: "Voice",    value: credits.voice_credits },
    { label: "Voice 30", value: credits.voice_pulse30_credits },
  ].filter(i => i.value != null);

  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map(({ label, value }) => (
        <span key={label} className="text-xs px-2 py-0.5 rounded-lg"
          style={{ background: "#f1f5f9", color: "#374151" }}>
          {label}: <strong>{fmt(value)}</strong>
        </span>
      ))}
    </div>
  );
};

const TreeNode = ({ node, depth = 0, isRoot = false }) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const indent = depth * 24;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: depth * 0.04 }}
    >
      {/* Connector line */}
      <div className="relative" style={{ marginLeft: indent }}>
        {depth > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0"
            style={{
              left: -16,
              top: 0,
              width: 1,
              background: "linear-gradient(to bottom, rgba(37,99,235,0.3), transparent)",
            }}
          />
        )}

        {/* Node card */}
        <div
          className="rounded-xl mb-2 transition-all"
          style={{
            background: isRoot
              ? THEME.gradientLight
              : depth === 0 ? "white" : "#fafafa",
            border: isRoot
              ? `1.5px solid rgba(37,99,235,0.25)`
              : `1px solid #e5e7eb`,
            boxShadow: isRoot ? "0 2px 8px rgba(37,99,235,0.1)" : "none",
          }}
        >
          <div className="p-3">
            <div className="flex items-start justify-between gap-3">
              {/* Avatar + info */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                  style={{ background: isRoot ? THEME.gradient : node.user_type === "reseller" ? "linear-gradient(135deg,#7c3aed,#5b21b6)" : "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}
                >
                  {(node.first_name?.[0] ?? node.username?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Text strong style={{ fontSize: 14, color: "#1e293b" }}>
                      {node.first_name} {node.last_name}
                    </Text>
                    {typeBadge(node.user_type, isRoot)}
                    {statusBadge(node.account_status)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>@{node.username}</Text>
                  {node.email && (
                    <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{node.email}</Text>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {joinedTag(node.created_at)}
                    {expiryBadge(node.expiry)}
                  </div>
                  {creditRow(node.credits ?? (isRoot ? node.credits : null))}
                </div>
              </div>

              {/* Expand toggle + child count */}
              {hasChildren && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "rgba(37,99,235,0.1)", color: THEME.primary }}
                  >
                    {node.children.length} sub-account{node.children.length !== 1 ? "s" : ""}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setExpanded((p) => !p)}
                    style={{
                      background: expanded ? THEME.gradient : "white",
                      border: `1px solid ${expanded ? "transparent" : "#e5e7eb"}`,
                      color: expanded ? "white" : "#6b7280",
                      borderRadius: 8,
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {expanded ? "Collapse" : "Expand"}
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Children */}
        <AnimatePresence>
          {expanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ marginLeft: 24, borderLeft: "1px dashed rgba(37,99,235,0.2)", paddingLeft: 12 }}
            >
              {node.children.map((child) => (
                <TreeNode key={child.id ?? child.username} node={child} depth={depth + 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const ClientTree = ({ user, setUser }) => {
  const [treeData, setTreeData] = useState(null);
  const [loading,  setLoading]  = useState(false);

  const fetchTree = async () => {
    setLoading(true);
    try {
      const res = await clientTree();
      setTreeData(res?.data?.data ?? null);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTree(); }, []);

  const countNodes = (node) => {
    if (!node) return 0;
    return 1 + (node.children ?? []).reduce((acc, c) => acc + countNodes(c), 0);
  };

  return (
    <div className="p-6" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <DashboardNavbar user={user} setUser={setUser} />
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: THEME.gradient }}>
              <TeamOutlined style={{ color: "white", fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#1e293b" }}>Client Tree</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Your account hierarchy — resellers and their sub-clients
              </Text>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {treeData && (
              <span className="text-sm px-3 py-1 rounded-full"
                style={{ background: THEME.gradientLight, color: THEME.primary, fontWeight: 600 }}>
                {countNodes(treeData) - 1} total accounts
              </span>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={fetchTree}
              disabled={loading}
              style={{
                background: THEME.gradient, border: "none", color: "white",
                borderRadius: 10, padding: "7px 16px", cursor: "pointer",
                fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <ReloadOutlined spin={loading} /> Refresh
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Tree */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div
          className="rounded-2xl p-5"
          style={{ background: "white", border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(37,99,235,0.06)" }}
        >
          {loading ? (
            <div className="flex justify-center py-16"><Spin size="large" /></div>
          ) : !treeData ? (
            <Empty description="No tree data available" />
          ) : (
            <TreeNode node={treeData} depth={0} isRoot />
          )}
        </div>
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4">
        {[
          { icon: <CrownOutlined />, label: "You (root account)", color: THEME.primary },
          { icon: <BankOutlined />, label: "Reseller (has sub-accounts)", color: "#7c3aed" },
          { icon: <UserOutlined />, label: "Client (end user)", color: "#3b82f6" },
        ].map(({ icon, label, color }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: "#6b7280" }}>
            <span style={{ color }}>{icon}</span> {label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientTree;

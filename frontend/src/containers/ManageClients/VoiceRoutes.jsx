import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  Empty,
  Typography,
  Tooltip,
  message,
} from "antd";
import {
  ApiOutlined,
  EditOutlined,
  ReloadOutlined,
  CopyOutlined,
  SwapOutlined,
  DeleteOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  listVoiceRoutes,
  updateVoiceRoute,
  listVoiceRouteAssignments,
  getVoiceRouteLogs,
  setClientVoiceRoute,
  clientList,
} from "../../services/api";
import handleApiError from "../../utils/errorHandler";

const { Title, Text } = Typography;

const THEME = {
  primary: "#2563EB",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
};

const ROUTE_TAG = { default: "blue", notifynow: "purple" };
const STATUS_TAG = { sent: "green", failed: "red", received: "cyan" };

const callbackUrl = (route) =>
  route?.webhook_token
    ? `${window.location.origin}/api/v1/voice/webhook/notifynow?token=${route.webhook_token}`
    : "";

// ── NotifyNow settings modal ─────────────────────────────────────────────────
const EditRouteModal = ({ open, onClose, route, onSaved }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (open && route) {
      form.setFieldsValue({ url: route.url, api_key: "", enabled: route.status === 1 });
    }
  }, [open, route, form]);

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const payload = { url: values.url, status: values.enabled ? 1 : 0 };
      if (values.api_key) payload.api_key = values.api_key;
      await updateVoiceRoute(route.code, payload);
      message.success("Route saved.");
      onSaved();
      onClose();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await updateVoiceRoute(route.code, { regenerate_webhook_token: true });
      message.success("New callback URL generated — update it at the provider.");
      onSaved();
    } catch (error) {
      handleApiError(error);
    } finally {
      setRegenerating(false);
    }
  };

  const url = callbackUrl(route);

  return (
    <Modal
      title={<span><EditOutlined style={{ color: THEME.primary, marginRight: 8 }} />NotifyNow settings</span>}
      open={open}
      onCancel={onClose}
      width={600}
      zIndex={1200}
      footer={[
        <Button key="c" onClick={onClose}>Cancel</Button>,
        <Button key="s" type="primary" loading={saving} onClick={() => form.submit()} style={{ background: THEME.gradient, border: "none" }}>
          Save
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Form.Item label="API URL" name="url" rules={[{ required: true, message: "Enter the API URL" }, { type: "url", message: "Enter a valid URL" }]}>
          <Input size="large" placeholder="https://notifynow.in/api/voice/send-campaign" />
        </Form.Item>
        <Form.Item
          label="API key"
          name="api_key"
          extra={<span className="text-xs text-gray-400">{route?.has_api_key ? "A key is saved. Leave blank to keep it unchanged." : "Sent as the x-api-key header."}</span>}
        >
          <Input.Password size="large" placeholder={route?.has_api_key ? "•••••••• (unchanged)" : "Paste the API key"} autoComplete="new-password" />
        </Form.Item>
        <Form.Item label="Enabled" name="enabled" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>

      <div className="rounded-lg p-3 mt-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <Text className="text-xs font-medium uppercase tracking-wide text-gray-600 block mb-1">Callback URL — give this to NotifyNow</Text>
        <Text className="text-xs text-gray-500 block mb-2">NotifyNow posts each call's result here. It carries a secret token.</Text>
        <div className="flex gap-2">
          <Input readOnly value={url} className="font-mono text-xs" />
          <Button icon={<CopyOutlined />} onClick={() => { navigator.clipboard?.writeText(url); message.success("Copied"); }} />
        </div>
        <Popconfirm title="Generate a new token? The old callback URL stops working." onConfirm={handleRegenerate}>
          <Button size="small" type="link" loading={regenerating} style={{ paddingLeft: 0, marginTop: 4 }}>Regenerate token</Button>
        </Popconfirm>
      </div>
    </Modal>
  );
};

// ── Assign-to-client modal ───────────────────────────────────────────────────
const AssignModal = ({ open, onClose, routes, onDone }) => {
  const [clients, setClients] = useState([]);
  const [searching, setSearching] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [code, setCode] = useState("notifynow");
  const [saving, setSaving] = useState(false);

  const search = useCallback(async (q) => {
    setSearching(true);
    try {
      const res = await clientList({ page: 1, limit: 30, search: q || undefined });
      setClients(res?.data?.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (open) { setClientId(null); setCode("notifynow"); search(""); }
  }, [open, search]);

  const handleSave = async () => {
    if (!clientId) { message.warning("Select a client"); return; }
    setSaving(true);
    try {
      await setClientVoiceRoute(clientId, code);
      message.success("Route assigned.");
      onDone();
      onClose();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={<span><SwapOutlined style={{ color: THEME.primary, marginRight: 8 }} />Assign route to a client</span>}
      open={open}
      onCancel={onClose}
      zIndex={1200}
      footer={[
        <Button key="c" onClick={onClose}>Cancel</Button>,
        <Button key="s" type="primary" loading={saving} onClick={handleSave} style={{ background: THEME.gradient, border: "none" }}>Assign</Button>,
      ]}
    >
      <Text className="text-xs font-medium uppercase tracking-wide text-gray-600 block mb-2">Client or reseller</Text>
      <Select
        showSearch
        filterOption={false}
        size="large"
        className="w-full mb-4"
        placeholder="Search by name or username"
        value={clientId}
        onChange={setClientId}
        onSearch={search}
        loading={searching}
        options={clients.map((c) => ({
          value: c.id,
          label: `${c.client_username} — ${c.first_name || ""} ${c.last_name || ""}${c.user_type === "reseller" ? " (reseller)" : ""}`,
        }))}
      />
      <Text className="text-xs font-medium uppercase tracking-wide text-gray-600 block mb-2">Route</Text>
      <Select
        size="large"
        className="w-full"
        value={code}
        onChange={setCode}
        options={routes.map((r) => ({
          value: r.code,
          label: r.code === "default" ? `${r.name} (default)` : r.name,
          disabled: r.kind === "notifynow" && !(r.url && r.has_api_key),
        }))}
      />
      <Text className="text-xs text-gray-400 block mt-3">A reseller's route is inherited by the clients under them, unless a client has their own.</Text>
    </Modal>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────
const VoiceRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const [assignments, setAssignments] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);

  const [logs, setLogs] = useState([]);
  const [logsMeta, setLogsMeta] = useState({ total: 0, page: 1, limit: 25 });
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilters, setLogFilters] = useState({ route_code: undefined, status: undefined });

  message.config({ top: 100, duration: 3, maxCount: 3 });

  const loadRoutes = useCallback(async () => {
    setRoutesLoading(true);
    try {
      const res = await listVoiceRoutes();
      setRoutes(res?.data?.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    setAssignLoading(true);
    try {
      const res = await listVoiceRouteAssignments();
      setAssignments(res?.data?.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setAssignLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async (page = 1) => {
    setLogsLoading(true);
    try {
      const res = await getVoiceRouteLogs({ ...logFilters, page, limit: 25 });
      setLogs(res?.data?.data || []);
      setLogsMeta(res?.data?.meta || { total: 0, page, limit: 25 });
    } catch (error) {
      handleApiError(error);
    } finally {
      setLogsLoading(false);
    }
  }, [logFilters]);

  useEffect(() => { loadRoutes(); loadAssignments(); }, [loadRoutes, loadAssignments]);
  useEffect(() => { loadLogs(1); }, [loadLogs]);

  const refreshAll = () => { loadRoutes(); loadAssignments(); loadLogs(logsMeta.page); };

  const handleRemove = async (row) => {
    try {
      await setClientVoiceRoute(row.client_id, "default");
      message.success("Back to the default route.");
      refreshAll();
    } catch (error) {
      handleApiError(error);
    }
  };

  const routeColumns = [
    {
      title: "Route",
      dataIndex: "name",
      key: "name",
      width: 260,
      render: (name, row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{name}</span>
            {row.is_default === 1 && <Tag color="gold">Default</Tag>}
          </div>
          <div className="text-xs text-gray-400">{row.description}</div>
        </div>
      ),
    },
    {
      title: "Endpoint",
      key: "url",
      width: 260,
      render: (_, row) =>
        row.kind === "engine"
          ? <span className="text-xs text-gray-500">Our own sending route</span>
          : row.url
            ? <Tooltip title={row.url}><span className="text-xs text-gray-500 block truncate" style={{ maxWidth: 240 }}>{row.url}</span></Tooltip>
            : <span className="text-xs text-gray-400">Not set</span>,
    },
    {
      title: "Status",
      key: "status",
      width: 130,
      render: (_, row) => {
        if (row.kind === "engine") return <Tag color="green">Active</Tag>;
        if (!row.url || !row.has_api_key) return <Tag color="orange">Needs setup</Tag>;
        return row.status === 1 ? <Tag color="green">Active</Tag> : <Tag>Disabled</Tag>;
      },
    },
    {
      title: "Users",
      dataIndex: "assigned_count",
      key: "assigned_count",
      width: 100,
      render: (n) => <Tag>{n || 0}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, row) =>
        row.kind === "notifynow" ? (
          <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(row)}>Settings</Button>
        ) : (
          <span className="text-xs text-gray-300">Managed by platform</span>
        ),
    },
  ];

  const assignmentColumns = [
    { title: "User", dataIndex: "username", key: "username", width: 180 },
    { title: "Route", dataIndex: "route_name", key: "route_name", width: 160, render: (v, r) => <Tag color={ROUTE_TAG[r.route_code]}>{v}</Tag> },
    { title: "Assigned by", dataIndex: "assigned_by", key: "assigned_by", width: 150, render: (v) => v || "—" },
    { title: "Assigned", dataIndex: "assigned_at", key: "assigned_at", width: 180, render: (v) => (v ? new Date(v).toLocaleString() : "—") },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_, row) => (
        <Popconfirm title="Move this user back to the default route?" onConfirm={() => handleRemove(row)} disabled={!row.client_id}>
          <Button size="small" danger icon={<DeleteOutlined />} disabled={!row.client_id}>Reset</Button>
        </Popconfirm>
      ),
    },
  ];

  const logColumns = [
    { title: "Time", dataIndex: "created_at", key: "created_at", width: 170, render: (v) => (v ? new Date(v).toLocaleString() : "—") },
    { title: "User", dataIndex: "username", key: "username", width: 120, ellipsis: true, render: (v) => v || "—" },
    { title: "Campaign", dataIndex: "request_id", key: "request_id", width: 190, ellipsis: true, render: (v) => v || "—" },
    { title: "Route", dataIndex: "route_code", key: "route_code", width: 110, render: (v) => <Tag color={ROUTE_TAG[v]}>{v}</Tag> },
    { title: "Event", dataIndex: "kind", key: "kind", width: 90, render: (v) => (v === "submit" ? "Submit" : "Callback") },
    { title: "Contacts", dataIndex: "contacts", key: "contacts", width: 90, render: (v) => v ?? "—" },
    { title: "Status", dataIndex: "status", key: "status", width: 100, render: (v) => <Tag color={STATUS_TAG[v]}>{v}</Tag> },
    { title: "HTTP", dataIndex: "http_code", key: "http_code", width: 70, render: (v) => v ?? "—" },
    { title: "Provider ref", dataIndex: "provider_ref", key: "provider_ref", width: 190, ellipsis: true, render: (v) => v || "—" },
    {
      title: "Response / error",
      key: "resp",
      width: 260,
      render: (_, row) => {
        const text = row.error || row.response;
        return text
          ? <Tooltip title={<pre className="whitespace-pre-wrap text-xs">{text}</pre>}><span className="text-xs text-gray-500 block truncate" style={{ maxWidth: 240 }}>{text}</span></Tooltip>
          : "—";
      },
    },
  ];

  return (
    <div className="w-full mx-auto pb-8" style={{ maxWidth: 1400 }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="rounded-2xl border border-gray-100 p-5 mb-4" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(29,78,216,0.03) 100%)" }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: THEME.gradient }}>
                <ApiOutlined style={{ color: "white", fontSize: 16 }} />
              </div>
              <div>
                <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>Voice Routes</Title>
                <p className="text-xs text-gray-500 mb-0">Which provider sends a user's voice campaigns. Everyone uses the default unless you assign another route.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="primary" icon={<SwapOutlined />} onClick={() => setAssignOpen(true)} style={{ background: THEME.gradient, border: "none" }}>
                Assign route
              </Button>
              <Button icon={<ReloadOutlined />} onClick={refreshAll} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-2 mb-6">
          <Table columns={routeColumns} dataSource={routes} rowKey="id" loading={routesLoading} pagination={false} scroll={{ x: "max-content" }} />
        </div>

        <div className="rounded-2xl border border-gray-100 p-5 mb-6 bg-white">
          <Title level={5} style={{ color: "#1f2937" }}>Assigned users</Title>
          <Table
            columns={assignmentColumns}
            dataSource={assignments}
            rowKey="id"
            loading={assignLoading}
            pagination={false}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: <Empty description="No user has a custom route — everyone uses the default" /> }}
          />
        </div>

        <div className="rounded-2xl border border-gray-100 p-5 bg-white">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <FileSearchOutlined style={{ color: THEME.primary, fontSize: 18 }} />
              <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>Logs</Title>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select allowClear placeholder="Route" style={{ width: 150 }} value={logFilters.route_code}
                onChange={(v) => setLogFilters((f) => ({ ...f, route_code: v }))}
                options={routes.map((r) => ({ value: r.code, label: r.name }))} />
              <Select allowClear placeholder="Status" style={{ width: 130 }} value={logFilters.status}
                onChange={(v) => setLogFilters((f) => ({ ...f, status: v }))}
                options={[{ value: "sent", label: "Sent" }, { value: "failed", label: "Failed" }, { value: "received", label: "Received" }]} />
              <Button icon={<ReloadOutlined />} onClick={() => loadLogs(logsMeta.page)} />
            </div>
          </div>
          <Table
            columns={logColumns}
            dataSource={logs}
            rowKey="id"
            loading={logsLoading}
            scroll={{ x: "max-content" }}
            pagination={{ current: logsMeta.page, pageSize: logsMeta.limit, total: logsMeta.total, onChange: (p) => loadLogs(p), showSizeChanger: false }}
            locale={{ emptyText: <Empty description="No provider activity yet" /> }}
          />
        </div>
      </motion.div>

      <EditRouteModal open={!!editing} onClose={() => setEditing(null)} route={routes.find((r) => r.code === editing?.code) || editing} onSaved={loadRoutes} />
      <AssignModal open={assignOpen} onClose={() => setAssignOpen(false)} routes={routes} onDone={refreshAll} />
    </div>
  );
};

export default VoiceRoutes;

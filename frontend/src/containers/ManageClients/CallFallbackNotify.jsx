import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  Empty,
  Typography,
  message,
  Tooltip,
} from "antd";
import {
  ApiOutlined,
  LinkOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  ReloadOutlined,
  WhatsAppOutlined,
  MessageOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  listFallbackRoutes,
  createFallbackRoute,
  updateFallbackRoute,
  deleteFallbackRoute,
  setFallbackRouteDefault,
  clearFallbackRouteDefault,
  getFallbackLogs,
} from "../../services/api";
import handleApiError from "../../utils/errorHandler";

const { Title, Text } = Typography;
const { TextArea } = Input;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
};

const CHANNEL_META = {
  whatsapp: { label: "WhatsApp", color: "green", icon: <WhatsAppOutlined /> },
  sms: { label: "SMS", color: "blue", icon: <MessageOutlined /> },
};

const STATUS_META = {
  pending: { color: "gold" },
  sent: { color: "green" },
  failed: { color: "red" },
};

const METHODS = ["POST", "GET", "PUT", "PATCH"];

// ── Create / Edit Route modal — global, reusable API definitions ───────────
const RouteModal = ({ open, onClose, route, onSaved }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const isEdit = !!route;

  useEffect(() => {
    if (!open) return;
    if (route) {
      form.setFieldsValue({
        name: route.name,
        channel: route.channel,
        url: route.url,
        http_method: route.http_method,
        headers: route.headers?.length ? route.headers : [{}],
        body_template: route.body_template,
        content_type: route.content_type,
        secret: "",
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ channel: "whatsapp", http_method: "POST", content_type: "application/json", headers: [{}] });
    }
  }, [open, route, form]);

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const headers = (values.headers || []).filter((h) => h && h.key).map((h) => ({ key: h.key, value: h.value || "" }));
      const payload = {
        name: values.name,
        channel: values.channel,
        url: values.url,
        http_method: values.http_method,
        headers,
        body_template: values.body_template || null,
        content_type: values.content_type || "application/json",
      };
      // Only send `secret` if the admin typed something — omit to leave unchanged on edit.
      if (values.secret) payload.secret = values.secret;

      if (isEdit) await updateFallbackRoute(route.id, payload);
      else await createFallbackRoute({ ...payload, status: 1 });

      message.success(isEdit ? "Route updated." : "Route created.");
      onSaved();
      onClose();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={<span>{isEdit ? <EditOutlined style={{ color: THEME.primary, marginRight: 8 }} /> : <PlusOutlined style={{ color: THEME.primary, marginRight: 8 }} />}{isEdit ? "Edit Route" : "Create Route"}</span>}
      open={open}
      onCancel={onClose}
      width={640}
      zIndex={1200}
      footer={[
        <Button key="cancel" onClick={onClose}>Cancel</Button>,
        <Button key="save" type="primary" loading={saving} onClick={() => form.submit()} style={{ background: THEME.gradient, border: "none" }}>
          {isEdit ? "Save Changes" : "Create Route"}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item label="Route Name" name="name" rules={[{ required: true, message: "Enter a name" }]}>
            <Input placeholder="e.g. Twilio WhatsApp Sender" size="large" />
          </Form.Item>
          <Form.Item label="Channel" name="channel" rules={[{ required: true }]}>
            <Select size="large" options={[{ value: "whatsapp", label: "WhatsApp" }, { value: "sms", label: "SMS" }]} />
          </Form.Item>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Form.Item label="URL" name="url" className="col-span-2" rules={[{ required: true, message: "Enter the API URL" }, { type: "url", message: "Enter a valid URL" }]}>
            <Input prefix={<LinkOutlined style={{ color: THEME.primary }} />} placeholder="https://api.yourprovider.com/send" size="large" />
          </Form.Item>
          <Form.Item label="Method" name="http_method">
            <Select size="large" options={METHODS.map((m) => ({ value: m, label: m }))} />
          </Form.Item>
        </div>

        <Text className="text-xs font-medium uppercase tracking-wide text-gray-600 block mb-2">Headers</Text>
        <Form.List name="headers">
          {(fields, { add, remove }) => (
            <div className="mb-4">
              {fields.map((field) => (
                <div key={field.key} className="flex gap-2 mb-2">
                  <Form.Item {...field} name={[field.name, "key"]} noStyle>
                    <Input placeholder="Header key, e.g. Authorization" />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, "value"]} noStyle>
                    <Input placeholder="Header value, e.g. Bearer {{secret}}" />
                  </Form.Item>
                  <Button icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                </div>
              ))}
              <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>Add Header</Button>
            </div>
          )}
        </Form.List>

        <Form.Item
          label="Body"
          name="body_template"
          extra={<span className="text-xs text-gray-400">Use {"{{number}}"} — it's replaced with the recipient's number. {"{{secret}}"} and {"{{tracking_id}}"} are also available.</span>}
        >
          <TextArea rows={3} className="font-mono text-xs" placeholder='{"to": "{{number}}"}' />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item label="Secret / API Key" name="secret" extra={isEdit ? <span className="text-xs text-gray-400">Leave blank to keep the existing secret unchanged.</span> : null}>
            <Input.Password placeholder="Optional — substituted as {{secret}}" />
          </Form.Item>
          <Form.Item label="Content-Type" name="content_type">
            <Input placeholder="application/json" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────
const CallFallbackNotify = () => {
  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);

  const [logs, setLogs] = useState([]);
  const [logsMeta, setLogsMeta] = useState({ total: 0, page: 1, limit: 25 });
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilters, setLogFilters] = useState({ route_id: undefined, channel: undefined, status: undefined });

  message.config({ top: 100, duration: 3, maxCount: 3 });

  const loadRoutes = useCallback(async () => {
    setRoutesLoading(true);
    try {
      const res = await listFallbackRoutes();
      setRoutes(res?.data?.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async (page = 1) => {
    setLogsLoading(true);
    try {
      const res = await getFallbackLogs({ ...logFilters, page, limit: logsMeta.limit });
      setLogs(res?.data?.data || []);
      setLogsMeta(res?.data?.meta || { total: 0, page, limit: logsMeta.limit });
    } catch (error) {
      handleApiError(error);
    } finally {
      setLogsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logFilters]);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);
  useEffect(() => { loadLogs(1); }, [loadLogs]);

  const handleDelete = async (routeId) => {
    try {
      await deleteFallbackRoute(routeId);
      message.success("Route deleted.");
      loadRoutes();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleToggleDefault = async (route) => {
    try {
      if (route.is_default) await clearFallbackRouteDefault(route.id);
      else await setFallbackRouteDefault(route.id);
      message.success(route.is_default ? "Removed as default." : "Set as platform default.");
      loadRoutes();
    } catch (error) {
      handleApiError(error);
    }
  };

  const routeColumns = [
    {
      title: "Channel",
      dataIndex: "channel",
      key: "channel",
      width: 120,
      render: (channel) => (
        <Tag color={CHANNEL_META[channel]?.color} icon={CHANNEL_META[channel]?.icon}>
          {CHANNEL_META[channel]?.label || channel}
        </Tag>
      ),
    },
    {
      title: "Route Name",
      dataIndex: "name",
      key: "name",
      width: 200,
      ellipsis: true,
      render: (name, row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          {row.is_default === 1 && <Tag color="gold">Default</Tag>}
        </div>
      ),
    },
    { title: "URL", dataIndex: "url", key: "url", width: 260, render: (url) => <Tooltip title={url}><span className="text-xs text-gray-500 block truncate" style={{ maxWidth: 240 }}>{url}</span></Tooltip> },
    { title: "Method", dataIndex: "http_method", key: "http_method", width: 90 },
    {
      title: "Assigned To",
      dataIndex: "assigned_count",
      key: "assigned_count",
      width: 120,
      render: (count) => <Tag>{count || 0} client{count === 1 ? "" : "s"}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      render: (_, row) => (
        <div className="flex gap-2">
          <Tooltip title={row.is_default ? "Remove as platform default" : "Set as platform default"}>
            <Button size="small" icon={row.is_default ? <StarFilled style={{ color: "#eab308" }} /> : <StarOutlined />} onClick={() => handleToggleDefault(row)} />
          </Tooltip>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingRoute(row); setModalOpen(true); }}>Edit</Button>
          <Popconfirm title={`Delete this route? It will be unassigned from ${row.assigned_count || 0} client(s).`} onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const logColumns = [
    { title: "Time", dataIndex: "created_at", key: "created_at", width: 170, render: (v) => (v ? new Date(v).toLocaleString() : "—") },
    { title: "Username", dataIndex: "username", key: "username", width: 120, ellipsis: true },
    {
      title: "Channel",
      dataIndex: "channel",
      key: "channel",
      width: 110,
      render: (channel) => <Tag color={CHANNEL_META[channel]?.color} icon={CHANNEL_META[channel]?.icon}>{CHANNEL_META[channel]?.label || channel}</Tag>,
    },
    {
      title: "Route",
      dataIndex: "route_name",
      key: "route_name",
      width: 140,
      ellipsis: true,
      render: (v, row) => v || row.resolved_username || <span className="text-gray-400">—</span>,
    },
    { title: "Resolved Via", dataIndex: "resolution_level", key: "resolution_level", width: 110, render: (v) => <Tag>{v}</Tag> },
    { title: "Receiver", dataIndex: "receiver", key: "receiver", width: 130 },
    { title: "Call Status", dataIndex: "final_status", key: "final_status", width: 120 },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (status) => <Tag color={STATUS_META[status]?.color}>{status}</Tag>,
    },
    { title: "HTTP", dataIndex: "response_status", key: "response_status", width: 70, render: (v) => v ?? "—" },
    {
      title: "Response",
      dataIndex: "response_body",
      key: "response_body",
      width: 220,
      render: (v) => v ? <Tooltip title={v}><span className="text-xs text-gray-500 block truncate" style={{ maxWidth: 200 }}>{v}</span></Tooltip> : "—",
    },
    {
      title: "Payload",
      dataIndex: "request_payload",
      key: "request_payload",
      width: 220,
      render: (v) => v ? <Tooltip title={<pre className="whitespace-pre-wrap text-xs">{v}</pre>}><span className="text-xs text-gray-500 block truncate font-mono" style={{ maxWidth: 200 }}>{v}</span></Tooltip> : "—",
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
                <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>Call Fallback Notify — Routes</Title>
                <p className="text-xs text-gray-500 mb-0">Reusable WhatsApp/SMS APIs. Assign them to clients from Manage Clients → Call Fallback API.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRoute(null); setModalOpen(true); }} style={{ background: THEME.gradient, border: "none" }}>
                Create Route
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadRoutes} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-2 mb-6">
          <Table
            columns={routeColumns}
            dataSource={routes}
            rowKey="id"
            loading={routesLoading}
            pagination={false}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: <Empty description="No routes created yet" /> }}
          />
        </div>

        <div className="rounded-2xl border border-gray-100 p-5 mb-0 bg-white">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <FileSearchOutlined style={{ color: THEME.primary, fontSize: 18 }} />
              <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>Logs / Report</Title>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select
                allowClear
                placeholder="Filter by route"
                style={{ width: 200 }}
                value={logFilters.route_id}
                onChange={(v) => setLogFilters((f) => ({ ...f, route_id: v }))}
                options={routes.map((r) => ({ value: r.id, label: r.name }))}
              />
              <Select
                allowClear
                placeholder="Channel"
                style={{ width: 130 }}
                value={logFilters.channel}
                onChange={(v) => setLogFilters((f) => ({ ...f, channel: v }))}
                options={[{ value: "whatsapp", label: "WhatsApp" }, { value: "sms", label: "SMS" }]}
              />
              <Select
                allowClear
                placeholder="Status"
                style={{ width: 130 }}
                value={logFilters.status}
                onChange={(v) => setLogFilters((f) => ({ ...f, status: v }))}
                options={[{ value: "pending", label: "Pending" }, { value: "sent", label: "Sent" }, { value: "failed", label: "Failed" }]}
              />
              <Button icon={<ReloadOutlined />} onClick={() => loadLogs(logsMeta.page)} />
            </div>
          </div>

          <Table
            columns={logColumns}
            dataSource={logs}
            rowKey="id"
            loading={logsLoading}
            scroll={{ x: "max-content" }}
            pagination={{
              current: logsMeta.page,
              pageSize: logsMeta.limit,
              total: logsMeta.total,
              onChange: (page) => loadLogs(page),
              showSizeChanger: false,
            }}
            locale={{ emptyText: <Empty description="No fallback attempts yet" /> }}
          />
        </div>
      </motion.div>

      <RouteModal open={modalOpen} onClose={() => setModalOpen(false)} route={editingRoute} onSaved={loadRoutes} />
    </div>
  );
};

export default CallFallbackNotify;

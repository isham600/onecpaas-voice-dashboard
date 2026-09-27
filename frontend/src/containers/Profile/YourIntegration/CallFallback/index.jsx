import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Radio,
  Popconfirm,
  Empty,
  Typography,
  message,
} from "antd";
import {
  ApiOutlined,
  LinkOutlined,
  PlusOutlined,
  SwapOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  ReloadOutlined,
  WhatsAppOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  getClientFallbackAssignments,
  assignClientFallbackRoute,
  removeClientFallbackAssignment,
  testClientFallbackRoute,
  listFallbackRoutes,
  createFallbackRoute,
} from "../../../../services/api";
import handleApiError from "../../../../utils/errorHandler";

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

const METHODS = ["POST", "GET", "PUT", "PATCH"];

// ── Assign Route modal — pick a channel, then pick an existing route ────────
const AssignRouteModal = ({ open, onClose, clientId, onAssigned }) => {
  const [channel, setChannel] = useState("whatsapp");
  const [routes, setRoutes] = useState([]);
  const [routeId, setRouteId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRoutes = useCallback(async (ch) => {
    setLoading(true);
    setRouteId(null);
    try {
      const res = await listFallbackRoutes(ch);
      setRoutes(res?.data?.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadRoutes(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleChannelChange = (val) => {
    setChannel(val);
    loadRoutes(val);
  };

  const handleAssign = async () => {
    if (!routeId) {
      message.warning("Select a route to assign");
      return;
    }
    setSaving(true);
    try {
      await assignClientFallbackRoute(clientId, channel, routeId);
      message.success("Route assigned.");
      onAssigned();
      onClose();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={<span><SwapOutlined style={{ color: THEME.primary, marginRight: 8 }} />Assign Route</span>}
      open={open}
      onCancel={onClose}
      zIndex={1200}
      footer={[
        <Button key="cancel" onClick={onClose}>Cancel</Button>,
        <Button key="assign" type="primary" loading={saving} onClick={handleAssign} style={{ background: THEME.gradient, border: "none" }}>
          Assign
        </Button>,
      ]}
    >
      <div className="mb-4">
        <Text className="text-xs font-medium uppercase tracking-wide text-gray-600 block mb-2">Channel</Text>
        <Radio.Group value={channel} onChange={(e) => handleChannelChange(e.target.value)}>
          <Radio.Button value="whatsapp"><WhatsAppOutlined /> WhatsApp</Radio.Button>
          <Radio.Button value="sms"><MessageOutlined /> SMS</Radio.Button>
        </Radio.Group>
      </div>
      <div>
        <Text className="text-xs font-medium uppercase tracking-wide text-gray-600 block mb-2">Route</Text>
        <Select
          className="w-full"
          size="large"
          placeholder={routes.length ? "Select a route" : "No routes for this channel yet — create one first"}
          loading={loading}
          value={routeId}
          onChange={setRouteId}
          options={routes.map((r) => ({ value: r.id, label: r.name }))}
          notFoundContent={loading ? "Loading..." : "No routes for this channel yet"}
        />
      </div>
    </Modal>
  );
};

// ── Create Route modal — define a new reusable API, then assign it here ────
const CreateRouteModal = ({ open, onClose, clientId, onCreated }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleCreate = async (values) => {
    setSaving(true);
    try {
      const headers = (values.headers || [])
        .filter((h) => h && h.key)
        .map((h) => ({ key: h.key, value: h.value || "" }));

      const res = await createFallbackRoute({
        name: values.name,
        channel: values.channel,
        url: values.url,
        http_method: values.http_method,
        headers,
        body_template: values.body_template || null,
        secret: values.secret || null,
        content_type: values.content_type || "application/json",
        status: 1,
      });
      const route = res?.data?.data;
      if (route?.id) {
        await assignClientFallbackRoute(clientId, values.channel, route.id);
      }
      message.success("Route created and assigned.");
      form.resetFields();
      onCreated();
      onClose();
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={<span><PlusOutlined style={{ color: THEME.primary, marginRight: 8 }} />Create Route</span>}
      open={open}
      onCancel={onClose}
      width={640}
      zIndex={1200}
      footer={[
        <Button key="cancel" onClick={onClose}>Cancel</Button>,
        <Button key="save" type="primary" loading={saving} onClick={() => form.submit()} style={{ background: THEME.gradient, border: "none" }}>
          Create &amp; Assign
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ channel: "whatsapp", http_method: "POST", content_type: "application/json", headers: [{}] }}>
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
          <Form.Item label="Secret / API Key" name="secret">
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

// ── Test Route modal — asks for a real number before hitting the route,
// since the provider will genuinely reject a fake placeholder number ───────
const TestRouteModal = ({ open, onClose, clientId, channel }) => {
  const [number, setNumber] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) { setNumber(""); setResult(null); }
  }, [open]);

  const handleTest = async () => {
    if (!number.trim()) {
      message.warning("Enter a number to send the test to");
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      const res = await testClientFallbackRoute(clientId, channel, { number: number.trim() });
      setResult(res?.data?.result || null);
    } catch (error) {
      handleApiError(error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal
      title={<span><ExperimentOutlined style={{ color: THEME.primary, marginRight: 8 }} />Test {CHANNEL_META[channel]?.label} Route</span>}
      open={open}
      onCancel={onClose}
      zIndex={1200}
      footer={[
        <Button key="close" onClick={onClose}>Close</Button>,
        <Button key="send" type="primary" loading={testing} onClick={handleTest} style={{ background: THEME.gradient, border: "none" }}>
          Send Test
        </Button>,
      ]}
    >
      <Text className="text-xs font-medium uppercase tracking-wide text-gray-600 block mb-2">Number</Text>
      <Input
        size="large"
        placeholder="e.g. 919111991707"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        onPressEnter={handleTest}
      />
      {result && (
        <div className="mt-4 p-3 rounded-lg text-xs font-mono" style={{ background: result.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${result.ok ? "#bbf7d0" : "#fecaca"}` }}>
          <div className="mb-1"><strong>{result.ok ? "Success" : "Failed"}</strong>{result.status ? ` — HTTP ${result.status}` : ""}</div>
          <div className="whitespace-pre-wrap break-all text-gray-700">{result.error || result.body || "No response body"}</div>
        </div>
      )}
    </Modal>
  );
};

// ── Main table ───────────────────────────────────────────────────────────────
const CallFallback = ({ clientId, clientUsername }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [testRow, setTestRow] = useState(null);

  message.config({ top: 100, duration: 3, maxCount: 3 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getClientFallbackAssignments(clientId);
      setAssignments(res?.data?.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (channel) => {
    try {
      await removeClientFallbackAssignment(clientId, channel);
      message.success("Route removed.");
      load();
    } catch (error) {
      handleApiError(error);
    }
  };

  const columns = [
    {
      title: "Channel",
      dataIndex: "channel",
      key: "channel",
      render: (channel) => (
        <Tag color={CHANNEL_META[channel]?.color} icon={CHANNEL_META[channel]?.icon}>
          {CHANNEL_META[channel]?.label || channel}
        </Tag>
      ),
    },
    { title: "Route Name", dataIndex: "route_name", key: "route_name" },
    {
      title: "Assigned",
      dataIndex: "assigned_at",
      key: "assigned_at",
      render: (v) => (v ? new Date(v).toLocaleString() : "—"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <Button size="small" icon={<ExperimentOutlined />} onClick={() => setTestRow(row)}>
            Test
          </Button>
          <Popconfirm title="Remove this route from this client?" onConfirm={() => handleRemove(row.channel)}>
            <Button size="small" danger icon={<DeleteOutlined />}>Remove</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="rounded-2xl border border-gray-100 p-5 mb-0" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(29,78,216,0.03) 100%)" }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: THEME.gradient }}>
                <ApiOutlined style={{ color: "white", fontSize: 16 }} />
              </div>
              <div>
                <Title level={5} style={{ marginBottom: 0, color: "#1f2937" }}>Call Fallback Notify</Title>
                <p className="text-xs text-gray-500 mb-0">Routes assigned to {clientUsername ? <strong>@{clientUsername}</strong> : "this client"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button icon={<SwapOutlined />} onClick={() => setAssignOpen(true)}>Assign Route</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)} style={{ background: THEME.gradient, border: "none" }}>
                Create Route
              </Button>
              <Button icon={<ReloadOutlined />} onClick={load} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-b-2xl border border-t-0 border-gray-100 p-2">
          <Table
            columns={columns}
            dataSource={assignments}
            rowKey="id"
            loading={loading}
            pagination={false}
            locale={{ emptyText: <Empty description="No routes assigned to this account" /> }}
          />
        </div>
      </motion.div>

      <AssignRouteModal open={assignOpen} onClose={() => setAssignOpen(false)} clientId={clientId} onAssigned={load} />
      <CreateRouteModal open={createOpen} onClose={() => setCreateOpen(false)} clientId={clientId} onCreated={load} />
      <TestRouteModal open={!!testRow} onClose={() => setTestRow(null)} clientId={clientId} channel={testRow?.channel} />
    </div>
  );
};

export default CallFallback;

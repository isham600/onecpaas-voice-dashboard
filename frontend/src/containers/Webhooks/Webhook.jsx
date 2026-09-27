import { useState, useEffect } from "react";
import {
  Table, Modal, Form, Input, Select, Tag, Tooltip,
  Popconfirm, message, Typography, Switch, Drawer,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  ReloadOutlined, LinkOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  getProfileMe, getWebhooks, createWebhook, updateWebhook,
  toggleWebhook, deleteWebhook, getWebhookLogs,
} from "../../services/api";
import handleApiError from "../../utils/errorHandler";

const { Text, Title } = Typography;
const BLUE      = "#2563EB";
const BLUE_DARK = "#1D4ED8";
const VALUE_LABELS = { 1: "Status Only", 2: "Status + Messages" };

export default function Webhook() {
  const [webhooks,    setWebhooks]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [formOpen,    setFormOpen]    = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [form]                        = Form.useForm();
  const [logsOpen,    setLogsOpen]    = useState(false);
  const [logsWebhook, setLogsWebhook] = useState(null);
  const [logs,        setLogs]        = useState([]);
  const [logsTotal,   setLogsTotal]   = useState(0);
  const [logsPage,    setLogsPage]    = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [mobileNo,    setMobileNo]    = useState("");
  const PAGE_SIZE = 20;

  useEffect(() => {
    getProfileMe()
      .then(res => setMobileNo(res?.data?.data?.user?.mobile_no ?? ""))
      .catch(() => {});
  }, []);

  const fetchWebhooks = async (p = page) => {
    setLoading(true);
    try {
      const res = await getWebhooks({ page: p, limit: PAGE_SIZE });
      setWebhooks(res.data?.data ?? []);
      setTotal(res.data?.meta?.total ?? 0);
    } catch (err) { handleApiError(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWebhooks(1); }, []);

  const fetchLogs = async (webhook, p = 1) => {
    setLogsLoading(true);
    try {
      const res = await getWebhookLogs(webhook.id, { page: p, limit: 20 });
      setLogs(res.data?.data ?? []);
      setLogsTotal(res.data?.meta?.total ?? 0);
      setLogsPage(p);
    } catch (err) { handleApiError(err); }
    finally { setLogsLoading(false); }
  };

  const openLogs = (webhook) => {
    setLogsWebhook(webhook);
    setLogsOpen(true);
    fetchLogs(webhook, 1);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ value: 1, status: 1 });
    setFormOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({ url: record.url, value: record.value, status: record.status });
    setFormOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await updateWebhook(editing.id, values);
        message.success("Webhook updated");
      } else {
        await createWebhook({ ...values, sender_id: mobileNo });
        message.success("Webhook created");
      }
      setFormOpen(false);
      fetchWebhooks(page);
    } catch (err) { handleApiError(err); }
    finally { setSaving(false); }
  };

  const handleToggle = async (record) => {
    try {
      await toggleWebhook(record.id);
      setWebhooks(prev => prev.map(w => w.id === record.id ? { ...w, status: w.status === 1 ? 0 : 1 } : w));
    } catch (err) { handleApiError(err); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteWebhook(id);
      message.success("Webhook deleted");
      fetchWebhooks(page);
    } catch (err) { handleApiError(err); }
  };

  const columns = [
    {
      title: "#", dataIndex: "id", width: 60,
      render: (v) => <Text className="text-gray-400 text-xs">{v}</Text>,
    },
    {
      title: "Webhook URL", dataIndex: "url",
      render: (url) => (
        <div className="flex items-center gap-1.5">
          <LinkOutlined style={{ color: BLUE, fontSize: 12, flexShrink: 0 }} />
          <Text className="text-sm text-gray-700 truncate max-w-xs" title={url}>{url}</Text>
        </div>
      ),
    },
    {
      title: "Events", dataIndex: "value", width: 160,
      render: (v) => (
        <Tag style={{ background: BLUE + "15", border: "none", color: BLUE_DARK, fontWeight: 600, borderRadius: 6 }}>
          {VALUE_LABELS[v] ?? v}
        </Tag>
      ),
    },
    {
      title: "Status", dataIndex: "status", width: 100,
      render: (status, record) => (
        <Switch checked={status === 1} onChange={() => handleToggle(record)}
          checkedChildren="On" unCheckedChildren="Off"
          style={{ background: status === 1 ? "#10b981" : undefined }} />
      ),
    },
    {
      title: "Created", dataIndex: "created_date", width: 150,
      render: (v) => <Text className="text-xs text-gray-400">{v ? String(v).slice(0, 16) : "—"}</Text>,
    },
    {
      title: "Actions", key: "actions", width: 120, align: "center", fixed: "right",
      render: (_, record) => (
        <div className="flex items-center justify-center gap-1.5">
          <Tooltip title="View Logs">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
              onClick={() => openLogs(record)}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)` }}>
              <EyeOutlined style={{ color: "white", fontSize: 13 }} />
            </motion.button>
          </Tooltip>
          <Tooltip title="Edit">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
              onClick={() => openEdit(record)}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:text-blue-600">
              <EditOutlined style={{ fontSize: 13 }} />
            </motion.button>
          </Tooltip>
          <Popconfirm title="Delete this webhook?" onConfirm={() => handleDelete(record.id)}
            okText="Delete" okButtonProps={{ danger: true }}>
            <Tooltip title="Delete">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-red-100 text-red-400 hover:text-red-600">
                <DeleteOutlined style={{ fontSize: 13 }} />
              </motion.button>
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const logColumns = [
    {
      title: "Status", dataIndex: "status", width: 90,
      render: (v) => v === 1
        ? <Tag icon={<CheckCircleOutlined />} color="success">Success</Tag>
        : <Tag icon={<CloseCircleOutlined />} color="error">Failed</Tag>,
    },
    {
      title: "HTTP", dataIndex: "status_sent", width: 70,
      render: (v) => (
        <span className="text-xs font-mono font-semibold"
          style={{ color: String(v).startsWith("2") ? "#10b981" : "#ef4444" }}>{v}</span>
      ),
    },
    {
      title: "Date & Time", key: "dt", width: 160,
      render: (_, r) => {
        const raw = r.date || r.created_at || r.timestamp;
        let dateStr = r.date, timeStr = r.time;
        if (raw && raw.includes("T")) {
          const d = new Date(raw);
          dateStr = `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
          // only use ISO time if no separate r.time field (r.date is often just a midnight date stamp)
          if (!r.time) {
            const h = d.getHours(), m = d.getMinutes();
            timeStr = `${String(h % 12 || 12).padStart(2,"0")}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
          }
        }
        if (r.time) {
          const parts = r.time.split(":");
          const h = parseInt(parts[0], 10), m = parts[1];
          timeStr = `${String(h % 12 || 12).padStart(2,"0")}:${m} ${h >= 12 ? "PM" : "AM"}`;
        }
        return (
          <div className="flex flex-col leading-tight">
            <Text className="text-xs text-gray-700 font-medium">{dateStr || "—"}</Text>
            <Text className="text-xs text-gray-400">{timeStr || ""}</Text>
          </div>
        );
      },
    },
    {
      title: "Request ID", dataIndex: "request_id", width: 210,
      render: (v) => <Text className="text-xs font-mono text-gray-600 truncate block max-w-[190px]" title={v}>{v || "—"}</Text>,
    },
    {
      title: "Keyword", dataIndex: "keyword", width: 120,
      render: (v) => <Text className="text-xs text-gray-600">{v || "—"}</Text>,
    },
    {
      title: "Response", dataIndex: "response",
      render: (v) => {
        if (!v) return <Text className="text-xs text-gray-400">—</Text>;
        let parsed; try { parsed = JSON.parse(v); } catch { parsed = null; }
        const preview = parsed
          ? (parsed.message || parsed.error?.message || JSON.stringify(parsed).slice(0, 100))
          : String(v).slice(0, 100);
        return <Text className="text-xs text-gray-500" title={v}>{preview}</Text>;
      },
    },
  ];

  return (
    <div className="p-4 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`, boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
            <LinkOutlined style={{ fontSize: 18, color: "white" }} />
          </div>
          <div>
            <Title level={4} className="!mb-0" style={{ color: "#1f2937" }}>Webhooks</Title>
            <Text className="text-xs text-gray-400">Manage endpoints & view delivery logs</Text>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip title="Refresh">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => fetchWebhooks(page)}
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors">
              <ReloadOutlined />
            </motion.button>
          </Tooltip>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`, boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
            <PlusOutlined /> Add Webhook
          </motion.button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        <Table columns={columns} dataSource={webhooks} rowKey="id" loading={loading}
          pagination={{ current: page, pageSize: PAGE_SIZE, total,
            showSizeChanger: false,
            showTotal: (t) => `${t} webhook${t !== 1 ? "s" : ""}`,
            onChange: (p) => { setPage(p); fetchWebhooks(p); },
          }}
          scroll={{ x: 900 }} size="middle" />
      </motion.div>

      {/* Create / Edit Modal */}
      <Modal
        title={<div className="flex items-center gap-2"><LinkOutlined style={{ color: BLUE }} />{editing ? "Edit Webhook" : "Add Webhook"}</div>}
        open={formOpen} onCancel={() => setFormOpen(false)}
        onOk={handleSave} okText={editing ? "Save Changes" : "Create"} confirmLoading={saving}
        okButtonProps={{ style: { background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`, border: "none" } }}
        width={480}>
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="url" label="Webhook URL"
            rules={[{ required: true, message: "URL is required" }, { type: "url", message: "Enter a valid URL" }]}>
            <Input placeholder="https://your-server.com/webhook" prefix={<LinkOutlined className="text-gray-400" />} />
          </Form.Item>
          <Form.Item name="value" label="Events to send" rules={[{ required: true }]}>
            <Select options={[
              { value: 1, label: "Status Only — delivery status updates" },
              { value: 2, label: "Status + Messages — status + incoming messages" },
            ]} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[{ value: 1, label: "Enabled" }, { value: 0, label: "Disabled" }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Logs Drawer */}
      <Drawer
        title={
          <div>
            <div className="flex items-center gap-2">
              <EyeOutlined style={{ color: BLUE }} />
              <span>Delivery Logs</span>
            </div>
            {logsWebhook && (
              <Text className="text-xs text-gray-400 font-normal block mt-0.5 truncate max-w-md" title={logsWebhook.url}>
                {logsWebhook.url}
              </Text>
            )}
          </div>
        }
        open={logsOpen} onClose={() => setLogsOpen(false)} width={900}
        styles={{ body: { padding: "16px" } }}>
        <Table columns={logColumns} dataSource={logs} rowKey="id" loading={logsLoading}
          size="small" scroll={{ x: 800 }}
          pagination={{ current: logsPage, pageSize: 20, total: logsTotal,
            showTotal: (t) => `${t} entries`,
            onChange: (p) => fetchLogs(logsWebhook, p),
          }}
          rowClassName={(r) => r.status === 0 ? "bg-red-50" : ""} />
      </Drawer>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Table, Button, Tag, Empty, Input, Select, Popconfirm, Tooltip, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, ApartmentOutlined, WarningOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import CreateIvrModal from "../../../components/Voice/CreateIvrModal.jsx";
import { listIvrs, deleteIvr } from "../../../services/ivrApi.js";
import handleApiError from "../../../utils/errorHandler";

const GRADIENT = "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
];

const ROUTE_META = {
  transactional: { label: "Transactional", color: "blue" },
  promotional: { label: "Promotional", color: "purple" },
};

const RouteTag = ({ route }) => {
  const meta = ROUTE_META[route];
  return meta ? <Tag color={meta.color}>{meta.label}</Tag> : route || "-";
};

const formatDate = (value) => (value ? dayjs(value).format("DD MMM YYYY, hh:mm A") : "-");

const IvrStatus = ({ record }) => (
  <div className="flex items-center gap-1 flex-wrap">
    <Tag color={record.status === "active" ? "green" : "default"}>
      {record.status === "active" ? "Active" : "Draft"}
    </Tag>
    {!record.runnable && (
      <Tooltip
        title={
          <ul className="list-disc pl-4 m-0">
            {record.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        }
      >
        <Tag color="orange" icon={<WarningOutlined />}>
          Can&apos;t run
        </Tag>
      </Tooltip>
    )}
  </div>
);

// Saved IVR call flows (Voice › IVR). Pick one in Send Voice › Setup › IVR.
const IvrList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pulse30Suffix = searchParams.get("pulse30") === "1" ? "?pulse30=1" : "";

  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.current, limit: pagination.pageSize };
      if (statusFilter !== "all") params.status = statusFilter;
      if (search) params.search = search;
      const res = await listIvrs(params);
      setFlows(res.data || []);
      setPagination((p) => ({ ...p, total: res.meta?.total ?? 0 }));
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const goToFirstPage = () => setPagination((p) => ({ ...p, current: 1 }));

  const handleDelete = async (record) => {
    try {
      await deleteIvr(record.id);
      message.success(`"${record.title}" deleted.`);
      load();
    } catch (error) {
      handleApiError(error);
    }
  };

  const columns = [
    { title: "IVR ID", dataIndex: "id", key: "id", width: 80 },
    { title: "Title", dataIndex: "title", key: "title" },
    { title: "Type", dataIndex: "type", key: "type" },
    { title: "Created Time", dataIndex: "created_at", key: "created_at", render: formatDate },
    { title: "Updated Time", dataIndex: "updated_at", key: "updated_at", render: formatDate },
    { title: "Route", dataIndex: "route", key: "route", render: (route) => <RouteTag route={route} /> },
    { title: "Status", key: "status", render: (_, record) => <IvrStatus record={record} /> },
    {
      title: "Action",
      key: "action",
      width: 170,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => navigate(`/dashboard/voice/ivr/${record.id}/edit${pulse30Suffix}`)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this IVR?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
              Delete
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="-m-4 min-h-screen p-4" style={{ background: "#F8F9FB" }}>
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: GRADIENT, boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}
          >
            <ApartmentOutlined style={{ fontSize: 20, color: "white" }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">IVR</h2>
            <p className="text-sm text-gray-500">Build call-flow menus, then pick one under Send Voice › Setup › IVR.</p>
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: GRADIENT, border: "none" }}
          onClick={() => setIsCreateOpen(true)}
        >
          Create IVR
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-2">
        <div className="flex flex-wrap items-center gap-2 p-2">
          <Input.Search
            placeholder="Search by title"
            allowClear
            onSearch={(value) => {
              setSearch(value.trim());
              goToFirstPage();
            }}
            style={{ width: 260 }}
          />
          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              goToFirstPage();
            }}
            options={STATUS_OPTIONS}
            style={{ width: 150 }}
          />
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Refresh
          </Button>
        </div>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={flows}
          loading={loading}
          scroll={{ x: 1100 }}
          locale={{ emptyText: <Empty description="No IVR flows yet" /> }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (current, pageSize) => setPagination((p) => ({ ...p, current, pageSize })),
          }}
        />
      </div>

      <CreateIvrModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        pulse30Suffix={pulse30Suffix}
      />
    </div>
  );
};

export default IvrList;

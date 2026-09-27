import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Button, Typography, Tag, Popconfirm, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, ApiOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { listDtmfFlows, deleteDtmfFlow } from "../../../services/api";
import handleApiError from "../../../utils/errorHandler";

const { Text } = Typography;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
};

const DtmfFlows = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listDtmfFlows();
      setFlows(response?.data?.data || []);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  const handleDelete = async (id) => {
    try {
      await deleteDtmfFlow(id);
      message.success("Flow deleted");
      fetchFlows();
    } catch (error) {
      handleApiError(error);
    }
  };

  const columns = [
    {
      title: "Flow Name",
      dataIndex: "name",
      key: "name",
      render: (name) => <Text strong>{name}</Text>,
    },
    {
      title: "Options",
      dataIndex: "option_count",
      key: "option_count",
      render: (count) => (
        <Tag color="blue">{count} key{count === 1 ? "" : "s"}</Tag>
      ),
    },
    {
      title: "Last Updated",
      dataIndex: "updated_at",
      key: "updated_at",
      render: (v) => (v ? new Date(v).toLocaleString() : "—"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_, record) => (
        <div className="flex gap-2">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/dashboard/voice/dtmf-flows/${record.id}/edit`)}
          />
          <Popconfirm
            title="Delete this flow?"
            description="Campaigns already sent won't be affected."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-5"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: THEME.gradient, boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}
          >
            <ApiOutlined style={{ fontSize: 20, color: "white" }} />
          </div>
          <div>
            <Text strong className="text-lg block">DTMF Flows</Text>
            <Text type="secondary" className="text-sm">
              Build once, reuse across campaigns
            </Text>
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/dashboard/voice/dtmf-flows/new")}
          style={{ background: THEME.gradient, border: "none" }}
        >
          Create New Flow
        </Button>
      </motion.div>

      <Table
        columns={columns}
        dataSource={flows}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: "No flows yet — create one to reuse it across campaigns.",
        }}
      />
    </div>
  );
};

export default DtmfFlows;

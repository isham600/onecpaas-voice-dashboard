import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Table,
  Modal,
  Input,
  Typography,
  Tooltip,
  Spin,
  message,
  Form,
  Tag,
  Empty,
  Button,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  EyeOutlined,
  TeamOutlined,
  FolderOutlined,
  CalendarOutlined,
  NumberOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ContactsOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import handleApiError from "../../utils/errorHandler";
import {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
} from "../../services/api";

const { Title, Text } = Typography;

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const GroupList = ({ user }) => {
  const [groups, setGroups] = useState([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [addForm] = Form.useForm();

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ["10", "25", "50", "100"],
  });

  const navigate = useNavigate();
  const location = useLocation();

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await listGroups({ page: 1, limit: 100 });
      const groupData = response?.data?.data || [];
      setGroups(groupData);
      setTotalGroups(groupData.length);
      setPagination((prev) => ({ ...prev, total: groupData.length }));
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      if (selectedGroup) {
        await deleteGroup(selectedGroup.id);
        message.success("Group deleted successfully!");
        fetchGroups();
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedGroup(null);
    }
  };

  const handleEditGroup = async (values) => {
    try {
      if (selectedGroup) {
        await updateGroup(selectedGroup.id, {
          Group_name: values.groupName,
          is_active: 1,
        });
        message.success("Group updated successfully!");
        fetchGroups();
        setIsEditModalOpen(false);
        setSelectedGroup(null);
        editForm.resetFields();
      }
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleAddGroup = async (values) => {
    try {
      await createGroup({ Group_name: values.groupName, is_active: 1 });
      message.success("Group created successfully!");
      setIsAddGroupModalOpen(false);
      addForm.resetFields();
      fetchGroups();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleGroupClick = (groupId, groupName) => {
    // Determine the base path based on current location
    const basePath = location.pathname.includes("/utility/")
      ? "/dashboard/utility/contacts"
      : "/dashboard/voice/contacts";

    navigate(
      `${basePath}/${groupId}/${encodeURIComponent(groupName)}`,
      {
        state: {
          groups,
          selectedGroupId: groupId,
          selectedGroupName: groupName,
        },
      },
    );
  };

  const handleTableChange = (paginationConfig) => {
    setPagination((prev) => ({
      ...prev,
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
    }));
  };

  const openEditModal = (group) => {
    setSelectedGroup(group);
    editForm.setFieldsValue({ groupName: group.Group_name });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (group) => {
    setSelectedGroup(group);
    setIsDeleteModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedGroup(null);
    editForm.resetFields();
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedGroup(null);
  };

  const closeAddModal = () => {
    setIsAddGroupModalOpen(false);
    addForm.resetFields();
  };

  const columns = [
    {
      title: (
        <div className="flex items-center gap-1.5">
          <FolderOutlined className="text-xs opacity-80" />
          <span>Group Name</span>
        </div>
      ),
      dataIndex: "Group_name",
      key: "Group_name",
      width: 250,
      sorter: true,
      render: (text, record) => (
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => handleGroupClick(record.id, record.Group_name)}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ background: THEME.gradientLight }}
          >
            <TeamOutlined style={{ color: THEME.primary, fontSize: 16 }} />
          </div>
          <Text
            strong
            className="group-hover:underline transition-colors"
            style={{ color: THEME.primaryDark }}
          >
            {text}
          </Text>
        </div>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <NumberOutlined className="text-xs opacity-80" />
          <span>Contacts</span>
        </div>
      ),
      dataIndex: "count",
      key: "count",
      width: 120,
      align: "center",
      sorter: true,
      render: (count) => (
        <Tag
          style={{
            background: count > 0 ? THEME.gradientLight : "#f3f4f6",
            border: count > 0 ? `1px solid #2563EB30` : "1px solid #e5e7eb",
            color: count > 0 ? THEME.primaryDark : "#9ca3af",
            fontWeight: 600,
            fontSize: 12,
            padding: "4px 12px",
          }}
        >
          {count || "0"}
        </Tag>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5">
          <CalendarOutlined className="text-xs opacity-80" />
          <span>Date Created</span>
        </div>
      ),
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      sorter: true,
      render: (date) => (
        <span className="text-sm text-gray-600">
          {new Date(date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip title="View Contacts">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                handleGroupClick(record.id, record.Group_name);
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: THEME.gradient }}
            >
              <EyeOutlined style={{ color: "white", fontSize: 14 }} />
            </motion.button>
          </Tooltip>
          <Tooltip title="Edit Group">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(record);
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
              style={{
                borderColor: "#3b82f6",
                background: "rgba(59,130,246,0.06)",
              }}
            >
              <EditOutlined style={{ color: "#2563eb", fontSize: 14 }} />
            </motion.button>
          </Tooltip>
          <Tooltip title="Delete Group">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                openDeleteModal(record);
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
              style={{
                borderColor: "#ef4444",
                background: "rgba(239,68,68,0.06)",
              }}
            >
              <DeleteOutlined style={{ color: "#dc2626", fontSize: 14 }} />
            </motion.button>
          </Tooltip>
        </div>
      ),
    },
  ];

  useEffect(() => {
    fetchGroups();
  }, [user]);

  return (
    <div className="bg-gray-50 min-h-screen p-4 overflow-x-hidden">
      {/* ── HEADER CARD — sticky, matches Broadcast style ── */}
      <div
        className="sticky top-0 z-40 px-4 pt-4 pb-3"
        style={{ background: "#F8F9FB" }}
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            className="rounded-2xl border border-gray-100 px-6 py-5 flex items-center justify-between gap-4 flex-wrap"
            style={{
              background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
              boxShadow: "0 1px 8px rgba(37,99,235,0.06)",
            }}
          >
            {/* Left: back + icon + labels */}
            <div className="flex items-center gap-4">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                className="h-9 w-9 rounded-lg border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center"
              />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: THEME.gradient,
                  boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
                }}
              >
                <ContactsOutlined style={{ color: "#fff", fontSize: 22 }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                  Contact Groups
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {totalGroups > 0
                    ? `${totalGroups} group${totalGroups !== 1 ? "s" : ""} · Manage your contact lists`
                    : "Manage your contact groups"}
                </p>
              </div>
            </div>

            {/* Right: refresh + add group */}
            <div className="flex items-center gap-2">
              <Tooltip title="Refresh">
                <Button
                  icon={<ReloadOutlined spin={loading} />}
                  onClick={fetchGroups}
                  className="h-9 rounded-lg border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-300"
                />
              </Tooltip>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsAddGroupModalOpen(true)}
                className="flex items-center gap-2 h-9 px-5 rounded-xl font-medium text-white text-sm transition-all"
                style={{
                  background: THEME.gradient,
                  boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                }}
              >
                <PlusOutlined style={{ fontSize: 13 }} />
                Add Group
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-4 pb-4">
        {/* Table Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
        >
          <div className="p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Spin size="large" />
                <p className="mt-4 text-sm text-gray-500">Loading groups...</p>
              </div>
            ) : groups.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div className="text-gray-500">
                    <p className="text-base font-medium">No groups found</p>
                    <p className="mt-1 text-sm">
                      Create your first group to organize contacts
                    </p>
                  </div>
                }
                className="py-16"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsAddGroupModalOpen(true)}
                  className="flex items-center gap-2 mx-auto px-5 py-2 rounded-xl font-medium text-white transition-all"
                  style={{
                    background: THEME.gradient,
                    boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                  }}
                >
                  <PlusOutlined style={{ fontSize: 14 }} />
                  Create Your First Group
                </motion.button>
              </Empty>
            ) : (
              <Table
                columns={columns}
                dataSource={groups}
                loading={loading}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  onChange: (page, pageSize) =>
                    handleTableChange({ current: page, pageSize }),
                  showSizeChanger: pagination.showSizeChanger,
                  pageSizeOptions: pagination.pageSizeOptions,
                  showTotal: (total, range) => (
                    <span className="text-xs text-gray-500">
                      {range[0]}-{range[1]} of {total} groups
                    </span>
                  ),
                }}
                rowKey="id"
                className="group-table"
                scroll={{ x: 700 }}
                size="middle"
              />
            )}
          </div>
        </motion.div>

        {/* Edit Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.1)" }}
              >
                <EditOutlined style={{ color: "#3b82f6" }} />
              </div>
              <span style={{ color: "#1f2937" }}>Edit Group</span>
            </div>
          }
          open={isEditModalOpen}
          onCancel={closeEditModal}
          footer={null}
          destroyOnClose
          className="group-modal"
        >
          <Form
            form={editForm}
            onFinish={handleEditGroup}
            layout="vertical"
            className="mt-4"
          >
            <Form.Item
              name="groupName"
              label={
                <span className="text-gray-700 font-medium">Group Name</span>
              }
              rules={[
                { required: true, message: "Please enter group name" },
                { min: 1, message: "Group name cannot be empty" },
              ]}
            >
              <Input
                placeholder="Enter group name"
                className="h-10 rounded-lg"
                style={{ borderColor: "rgba(37,99,235,0.3)" }}
              />
            </Form.Item>
            <Form.Item className="mb-0 text-right">
              <div className="flex justify-end gap-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={closeEditModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                  style={{ background: THEME.gradient }}
                >
                  Save Changes
                </motion.button>
              </div>
            </Form.Item>
          </Form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.1)" }}
              >
                <ExclamationCircleOutlined style={{ color: "#ef4444" }} />
              </div>
              <span style={{ color: "#1f2937" }}>Delete Group</span>
            </div>
          }
          open={isDeleteModalOpen}
          onCancel={closeDeleteModal}
          footer={null}
          className="group-modal"
        >
          <div className="py-6">
            <div
              className="p-4 rounded-xl mb-4"
              style={{
                background: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <Text className="text-gray-700">
                Are you sure you want to delete the group{" "}
                <Text strong style={{ color: "#1f2937" }}>
                  "{selectedGroup?.Group_name}"
                </Text>
                ?
              </Text>
            </div>
            <Text className="text-sm text-gray-500">
              ⚠️ This action cannot be undone. All contacts in this group will
              be unassigned.
            </Text>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={closeDeleteModal}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDeleteGroup}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              }}
            >
              Delete Group
            </motion.button>
          </div>
        </Modal>

        {/* Add Group Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: THEME.gradientLight }}
              >
                <PlusOutlined style={{ color: THEME.primary }} />
              </div>
              <span style={{ color: "#1f2937" }}>Add New Group</span>
            </div>
          }
          open={isAddGroupModalOpen}
          onCancel={closeAddModal}
          footer={null}
          destroyOnClose
          className="group-modal"
        >
          <Form
            form={addForm}
            onFinish={handleAddGroup}
            layout="vertical"
            className="mt-4"
          >
            <Form.Item
              name="groupName"
              label={
                <span className="text-gray-700 font-medium">Group Name</span>
              }
              rules={[
                { required: true, message: "Please enter group name" },
                { min: 1, message: "Group name cannot be empty" },
              ]}
            >
              <Input
                placeholder="Enter group name"
                className="h-10 rounded-lg"
                style={{ borderColor: "rgba(37,99,235,0.3)" }}
              />
            </Form.Item>
            <Form.Item className="mb-0 text-right">
              <div className="flex justify-end gap-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={closeAddModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                  style={{ background: THEME.gradient }}
                >
                  <CheckCircleOutlined className="mr-1" />
                  Create Group
                </motion.button>
              </div>
            </Form.Item>
          </Form>
        </Modal>
      </div>

      {/* Custom Styling */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* Table Container */
        .group-table {
          border-radius: 12px;
          overflow: hidden;
        }

        /* Header Styling */
        .group-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #374151;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid rgba(37,99,235,0.2) !important;
          padding: 14px 16px;
        }

        .group-table .ant-table-thead > tr > th::before {
          display: none !important;
        }

        /* Row Styling */
        .group-table .ant-table-tbody > tr > td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          transition: all 0.2s ease;
        }

        .group-table .ant-table-tbody > tr:hover > td {
          background: rgba(37,99,235,0.04) !important;
        }

        .group-table .ant-table-tbody > tr:last-child > td {
          border-bottom: none;
        }

        /* Fixed Column Styling */
        .group-table .ant-table-cell-fix-right {
          background: #fff !important;
        }

        .group-table .ant-table-tbody > tr:hover .ant-table-cell-fix-right {
          background: rgba(37,99,235,0.04) !important;
        }

        /* Pagination Styling */
        .group-table .ant-pagination-item {
          border-radius: 8px !important;
          border-color: #e5e7eb !important;
        }

        .group-table .ant-pagination-item-active {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
          border-color: #2563EB !important;
        }

        .group-table .ant-pagination-item-active a {
          color: white !important;
        }

        .group-table .ant-pagination-item:hover {
          border-color: #2563EB !important;
        }

        .group-table .ant-pagination-item:hover a {
          color: #2563EB !important;
        }

        .group-table .ant-pagination-prev .ant-pagination-item-link,
        .group-table .ant-pagination-next .ant-pagination-item-link {
          border-radius: 8px !important;
        }

        .group-table .ant-pagination-prev:hover .ant-pagination-item-link,
        .group-table .ant-pagination-next:hover .ant-pagination-item-link {
          color: #2563EB !important;
          border-color: #2563EB !important;
        }

        /* Modal Styling */
        .group-modal .ant-modal-content {
          border-radius: 16px;
          overflow: hidden;
        }

        .group-modal .ant-modal-header {
          border-bottom: 1px solid rgba(37,99,235,0.1);
          padding: 16px 24px;
        }

        .group-modal .ant-modal-body {
          padding: 24px;
        }

        .group-modal .ant-modal-close {
          top: 16px;
          right: 16px;
        }

        /* Input Styling */
        .group-modal .ant-input:hover,
        .group-modal .ant-input:focus {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1) !important;
        }

        /* Form Label */
        .group-modal .ant-form-item-label > label {
          font-weight: 500;
        }

        /* Select Styling */
        .ant-select-selector {
          border-radius: 8px !important;
        }

        .ant-select:hover .ant-select-selector {
          border-color: #2563EB !important;
        }

        .ant-select-focused .ant-select-selector {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1) !important;
        }

        /* Tag Styling */
        .group-table .ant-tag {
          border-radius: 8px;
        }
      `,
        }}
      />
    </div>
  );
};

export default GroupList;

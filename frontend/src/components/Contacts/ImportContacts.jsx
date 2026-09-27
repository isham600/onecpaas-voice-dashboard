import { useState, useEffect } from "react";
import {
  Form,
  Select,
  Input,
  Button,
  Upload,
  Typography,
  Space,
  Row,
  Col,
  message,
  Table,
  Alert,
} from "antd";
import {
  UploadOutlined,
  PlusOutlined,
  CheckOutlined,
  EyeOutlined,
  DownloadOutlined,
} from "@ant-design/icons";

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

import handleApiError from "../../utils/errorHandler";
import { listGroups, createGroup, importContacts } from "../../services/api";
import Modal from "../Modal";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ImportContacts = ({
  user,
  closeContactModal,
  refreshGroups,
  reFetchContacts,
  selectedGroupId: initialGroupId,
  selectedGroupName: initialGroupName,
}) => {
  const [form] = Form.useForm();
  const [groupForm] = Form.useForm();

  const [uploadType, setUploadType] = useState("CSV File");
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(initialGroupName || "");
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId || "");
  const [loading, setLoading] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);

  // Handlers for upload type change
  const handleUploadTypeChange = (value) => {
    setUploadType(value);
    setCsvFile(null);
    setCsvPreview([]);
    setShowPreview(false);
    form.resetFields(["csvFile", "mobileNumbers"]);
  };

  const handleOpenGroupModal = () => {
    setIsGroupModalOpen(true);
  };

  const handleCloseGroupModal = () => {
    setIsGroupModalOpen(false);
    groupForm.resetFields();
  };

  // Function to fetch the group list
  const fetchGroups = async () => {
    try {
      const response = await listGroups({ page: 1, limit: 100 });
      const fetchedGroups = (response?.data?.data || []).map((group) => ({
        id: group.id,
        name: group.Group_name,
      }));
      setGroups(fetchedGroups);
    } catch (error) {
      setGroups([]);
      handleApiError(error);
    }
  };

  const handleCreateGroup = async (values) => {
    setGroupLoading(true);
    try {
      await createGroup({ Group_name: values.groupName, is_active: 1 });
      message.success("Group created successfully!");
      setIsGroupModalOpen(false);
      groupForm.resetFields();
      fetchGroups();
      if (refreshGroups) refreshGroups();
    } catch (error) {
      handleApiError(error);
    } finally {
      setGroupLoading(false);
    }
  };

  const handleGroupChange = (groupName) => {
    setSelectedGroup(groupName);
    const selectedGroupObj = groups.find((group) => group.name === groupName);
    setSelectedGroupId(selectedGroupObj?.id || "");
  };

  // Parse CSV file and show preview
  const parseCSVPreview = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/);

      if (lines.length === 0) {
        message.warning("CSV file is empty");
        return;
      }

      // Get header and first 5 data rows
      const header = lines[0].split(",");
      const previewData = [];

      for (let i = 1; i < Math.min(6, lines.length); i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(",");
          const row = {};
          header.forEach((col, index) => {
            row[col.trim()] = values[index] ? values[index].trim() : "N/A";
          });
          row.key = i;
          previewData.push(row);
        }
      }

      setCsvPreview(previewData);
      setShowPreview(true);
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (info) => {
    const { fileList } = info;
    if (fileList.length > 0) {
      const file = fileList[0].originFileObj;
      setCsvFile(file);

      parseCSVPreview(file);
      form.setFieldsValue({ csvFile: file });
    } else {
      setCsvFile(null);
      setCsvPreview([]);
      setShowPreview(false);
    }
    return false; // Prevent automatic upload
  };

  const handleSubmit = async (values) => {
    if (!selectedGroupId) {
      message.error("Please select a group.");
      return;
    }

    setLoading(true);

    try {
      if (uploadType === "CSV File") {
        if (!csvFile) {
          message.error("Please select a CSV file to upload.");
          setLoading(false);
          return;
        }
        await importContacts(selectedGroupId, csvFile);
        message.success("Contacts imported successfully via CSV!");
      } else {
        const mobileNumbers = values.mobileNumbers;
        if (!mobileNumbers || !mobileNumbers.trim()) {
          message.error("Please enter mobile numbers.");
          setLoading(false);
          return;
        }
        // Build a CSV blob from the entered numbers and import
        const lines = mobileNumbers.trim().split(/\r?\n/).filter(Boolean);
        const csvContent = "contact_mobile_number\n" + lines.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const file = new File([blob], "contacts.csv", { type: "text/csv" });
        await importContacts(selectedGroupId, file);
        message.success("Contacts imported successfully!");
      }

      if (reFetchContacts && selectedGroupId) {
        await reFetchContacts(selectedGroupId);
      }

      form.resetFields();
      setCsvFile(null);
      setCsvPreview([]);
      setShowPreview(false);
      closeContactModal();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [user]);

  useEffect(() => {
    setSelectedGroup(initialGroupName || "");
    setSelectedGroupId(initialGroupId || "");
    form.setFieldsValue({
      selectedGroup: initialGroupName || "",
    });
  }, [initialGroupId, initialGroupName, form]);

  const uploadProps = {
    beforeUpload: () => false,
    onChange: handleFileUpload,
    maxCount: 1,
    accept: ".csv",
    showUploadList: {
      showRemoveIcon: true,
    },
  };

  // Generate columns for CSV preview table
  const previewColumns =
    csvPreview.length > 0
      ? Object.keys(csvPreview[0])
          .filter((key) => key !== "key")
          .map((key) => ({
            title: key,
            dataIndex: key,
            key: key,
            ellipsis: true,
          }))
      : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-6 py-4 -mx-6 -mt-6 mb-5"
        style={{
          background: THEME.gradientLight,
          borderBottom: "1px solid rgba(37,99,235,0.1)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: THEME.gradient,
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
          >
            <DownloadOutlined style={{ fontSize: 18, color: "white" }} />
          </div>
          <Title level={4} className="!mb-0" style={{ color: "#1f2937" }}>
            Import Contacts
          </Title>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="space-y-4"
        >
          {/* Select Group */}
          <Form.Item
            label="Select Group"
            name="selectedGroup"
            rules={[{ required: true, message: "Please select a group" }]}
          >
            <Select
              placeholder="Select a group"
              value={selectedGroup || undefined}
              onChange={handleGroupChange}
              className="w-full"
              allowClear
              getPopupContainer={(triggerNode) => triggerNode.parentNode}
            >
              {groups.map((group) => (
                <Option key={group.id} value={group.name}>
                  {group.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Upload Type Selection */}
          <Form.Item
            label="Upload From"
            name="uploadType"
            initialValue="CSV File"
          >
            <Select
              value={uploadType}
              onChange={handleUploadTypeChange}
              className="w-full"
              getPopupContainer={(triggerNode) => triggerNode.parentNode}
            >
              <Option value="CSV File">CSV File</Option>
              <Option value="Enter Mobile Number">Enter Mobile Number</Option>
            </Select>
          </Form.Item>

          {/* Conditional Input Based on Selection */}
          {uploadType === "CSV File" ? (
            <>
              <Form.Item
                label="Upload File (Import Contacts Using .csv file)"
                name="csvFile"
                rules={[
                  {
                    required: uploadType === "CSV File",
                    message: "Please select a CSV file",
                  },
                ]}
              >
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />}>Select CSV File</Button>
                </Upload>
              </Form.Item>

              {/* CSV Preview */}
              {showPreview && csvPreview.length > 0 && (
                <div className="mt-4 mb-4">
                  <Alert
                    message={
                      <Space>
                        <EyeOutlined />
                        <Text strong>CSV Preview (First 5 rows)</Text>
                      </Space>
                    }
                    description={
                      <div className="mt-2">
                        <Table
                          columns={previewColumns}
                          dataSource={csvPreview}
                          pagination={false}
                          size="small"
                          scroll={{ x: "max-content" }}
                          bordered
                        />
                        <Text type="secondary" className="text-xs mt-2 block">
                          Total rows to import: {csvPreview.length} (showing
                          preview only)
                        </Text>
                      </div>
                    }
                    type="info"
                    showIcon={false}
                  />
                </div>
              )}
            </>
          ) : (
            <Form.Item
              label="Mobile Numbers"
              name="mobileNumbers"
              rules={[
                {
                  required: uploadType === "Enter Mobile Number",
                  message: "Please enter mobile numbers",
                },
              ]}
            >
              <TextArea
                rows={6}
                placeholder="Enter Mobile Numbers (one per line)"
                className="w-full"
                onBlur={(e) => {
                  // Ensure form field is updated on blur
                  const value = e.target.value;
                  form.setFieldValue("mobileNumbers", value);
                }}
              />
              <div className="mt-2">
                <Text type="secondary" className="text-sm">
                  For multiple numbers, use "ENTER" to separate numbers. Don't
                  use comma, semicolon, etc. Enter only 10 Digit number, don't
                  use 0, +91 or country code.
                  <br />
                  <Text strong>Example:</Text>
                  <div className="font-mono text-xs mt-1 bg-gray-50 p-2 rounded">
                    9783471692
                    <br />
                    8109692810
                    <br />
                    7000203011
                  </div>
                </Text>
              </div>
            </Form.Item>
          )}

          {/* Action Buttons */}
          <Row justify="space-between" className="pt-4">
            <Col>
              <Button
                type="default"
                icon={<PlusOutlined />}
                onClick={handleOpenGroupModal}
                className="border-blue-500 text-blue-500 hover:bg-blue-50"
              >
                Add Group
              </Button>
            </Col>
            <Col>
              <Space>
                <Button onClick={closeContactModal}>Cancel</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<CheckOutlined />}
                  loading={loading}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  Import Contacts
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </div>

      {/* Create Group Modal */}
      <Modal
        isModalOpen={isGroupModalOpen}
        closeModal={handleCloseGroupModal}
        width="360px"
        height="auto"
      >
        <Form
          form={groupForm}
          layout="vertical"
          onFinish={handleCreateGroup}
          className="pt-4"
        >
          <Form.Item
            label="Group Name"
            name="groupName"
            rules={[
              { required: true, message: "Please enter group name" },
              { min: 1, message: "Group name cannot be empty" },
            ]}
          >
            <Input placeholder="Enter group name" />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleCloseGroupModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={groupLoading}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Create Group
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ImportContacts;

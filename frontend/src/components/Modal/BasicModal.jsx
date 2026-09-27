import { useState } from "react";
import axios from "axios";
import { Modal, Form, Input, Select, Button, message, Typography } from "antd";
import { ApiOutlined, PlusOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight: "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const baseURL = import.meta.env.VITE_BASE_URL;

const BasicModal = ({ isOpen, closeModal, handleSubmit, user }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (values) => {
    if (
      !values.url?.trim() ||
      values.status === undefined ||
      values.value === undefined
    ) {
      message.error("Please fill all fields!");
      return;
    }

    // Get userData from localStorage
    const storedUserData = JSON.parse(localStorage.getItem("user"));
    const senderId = storedUserData?.mobile_no;

    if (!senderId) {
      message.error("Sender ID (mobileNumber) not found in localStorage!");
      return;
    }

    const payload = {
      username: user?.username,
      url: values.url,
      webhook_url: values.url, // same
      status: values.status,
      value: values.value,
      sender_id: senderId,
    };

    try {
      setLoading(true);
      const response = await axios.post(
        `${baseURL}/api/addfunds/auth/webhooks`,
        payload,
      );

      handleSubmit(response.data.data);
      message.success("Webhook Added!");
      form.resetFields();
      closeModal();
    } catch (err) {
      message.error(err.response?.data?.errors || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    closeModal();
  };

  return (
    <Modal
      title={null}
      open={isOpen}
      onCancel={handleCancel}
      footer={null}
      width={520}
      destroyOnClose
      className="webhook-modal"
      styles={{ body: { padding: 0 } }}
    >
      {/* Custom Header */}
      <div
        className="px-6 py-5 mb-6"
        style={{
          background: THEME.gradientLight,
          borderBottom: "1px solid rgba(37,99,235,0.1)",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: THEME.gradient,
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
          >
            <ApiOutlined style={{ fontSize: 18, color: "white" }} />
          </div>
          <Title level={4} className="m-0" style={{ color: "#1f2937" }}>
            Add New Webhook
          </Title>
        </div>
      </div>

      <div className="px-6 pb-6">
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        requiredMark={false}
      >
        <Form.Item
          label="Webhook URL"
          name="url"
          rules={[
            { required: true, message: "Please enter the webhook URL!" },
            { type: "url", message: "Please enter a valid URL!" },
          ]}
        >
          <Input placeholder="https://example.com/webhook" size="large" className="webhook-input" />
        </Form.Item>

        <Form.Item
          label="Status"
          name="status"
          rules={[{ required: true, message: "Please select a status!" }]}
        >
          <Select
            placeholder="Select Status"
            size="large"
            className="webhook-select"
            options={[
              { value: 1, label: "Enable" },
              { value: 0, label: "Disable" },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Value"
          name="value"
          rules={[{ required: true, message: "Please select a value!" }]}
        >
          <Select
            placeholder="Select Value"
            size="large"
            className="webhook-select"
            options={[
              { value: 1, label: "Send Status" },
              { value: 2, label: "Send Message Also" },
            ]}
          />
        </Form.Item>

        <Form.Item className="mb-0 mt-6">
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button onClick={handleCancel} size="large" className="h-9 rounded-lg">
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<PlusOutlined />}
              size="large"
              className="h-9 rounded-lg font-semibold"
              style={{
                background: THEME.gradient,
                border: "none",
                boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
              }}
            >
              Add Webhook
            </Button>
          </div>
        </Form.Item>
      </Form>
      </div>

      <style>{`
        .webhook-modal .ant-form-item-label > label {
          font-weight: 600;
          color: #374151;
        }

        .webhook-input,
        .webhook-select .ant-select-selector {
          border-radius: 8px;
          border-color: rgba(37,99,235,0.3);
        }

        .webhook-input:hover,
        .webhook-input:focus,
        .webhook-select:hover .ant-select-selector,
        .webhook-select.ant-select-focused .ant-select-selector {
          border-color: ${THEME.primary} !important;
        }

        .webhook-input:focus,
        .webhook-select.ant-select-focused .ant-select-selector {
          box-shadow: 0 0 0 2px rgba(37,99,235,0.1) !important;
        }
      `}</style>
    </Modal>
  );
};

export default BasicModal;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Select, Button, Typography, message } from "antd";
import { ApartmentOutlined, PlusOutlined } from "@ant-design/icons";

import Modal from "../Modal";
import handleApiError from "../../utils/errorHandler";
import { createIvr } from "../../services/ivrApi.js";

const { Title } = Typography;

const GRADIENT = "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)";

const CreateIvrModal = ({ open, onClose, pulse30Suffix = "" }) => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const { ivrId } = await createIvr({
        title: values.title,
        route: values.route,
      });
      message.success("IVR created — build your call flow now.");
      onClose();
      navigate(`/dashboard/voice/ivr/${ivrId}/edit${pulse30Suffix}`);
    } catch (error) {
      handleApiError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isModalOpen={open} closeModal={onClose} width="max-w-md" height="auto">
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: GRADIENT, boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}
        >
          <ApartmentOutlined style={{ fontSize: 18, color: "white" }} />
        </div>
        <Title level={4} className="m-0" style={{ color: "#1f2937" }}>
          Create IVR
        </Title>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Title"
          name="title"
          rules={[{ required: true, message: "Please enter a title" }]}
        >
          <Input placeholder="e.g. Support Call Menu" size="large" />
        </Form.Item>

        <Form.Item
          label="Route"
          name="route"
          rules={[{ required: true, message: "Please select a route" }]}
        >
          <Select
            size="large"
            placeholder="Select route"
            getPopupContainer={(triggerNode) => triggerNode.parentNode}
          >
            <Select.Option value="transactional">Transactional</Select.Option>
            <Select.Option value="promotional">Promotional</Select.Option>
          </Select>
        </Form.Item>

        <div className="flex justify-end gap-3 pt-2">
          <Button size="large" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="primary"
            size="large"
            htmlType="submit"
            icon={<PlusOutlined />}
            loading={submitting}
            style={{ background: GRADIENT, border: "none" }}
          >
            Create
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateIvrModal;

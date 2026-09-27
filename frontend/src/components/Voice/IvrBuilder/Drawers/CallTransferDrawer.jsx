import { useEffect } from "react";
import { Drawer, Form, Input, InputNumber, Select, Tooltip, Button, Alert } from "antd";
import { ExportOutlined, QuestionCircleOutlined } from "@ant-design/icons";

const CallTransferDrawer = ({ open, initialValues, onClose, onSave }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        country: "India",
        ringTime: 10,
        timeout: 15,
        ...initialValues,
      });
    }
  }, [open, initialValues, form]);

  const handleSave = () => {
    form.validateFields().then((values) => onSave(values));
  };

  return (
    <Drawer
      title={
        <span>
          <ExportOutlined className="mr-2" />
          Call Transfer
        </span>
      }
      width={520}
      open={open}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Back</Button>
          <Button type="primary" onClick={handleSave} style={{ background: "#2563EB", borderColor: "#2563EB" }}>
            Submit
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Title" name="title">
          <Input placeholder="Enter title" />
        </Form.Item>

        <Form.Item label="Select Country" name="country">
          <Select>
            <Select.Option value="India">India</Select.Option>
            <Select.Option value="United States">United States</Select.Option>
            <Select.Option value="United Kingdom">United Kingdom</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="Phone Number" name="phoneNumber" extra="10–16 digits, including the country code.">
          <Input placeholder="+91" />
        </Form.Item>

        <Form.Item
          label="Backup Number"
          name="backupNumber"
          extra="If the primary number doesn't answer, the call is tried on this number."
        >
          <Input placeholder="+91 (optional)" />
        </Form.Item>

        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="Ringtime sets how long the agent's phone rings; Retry Count re-tries the whole transfer if no one answers; Timeout caps the overall attempt. Attach a step to the No Answer branch on the canvas to control what the caller hears when no agent picks up."
        />

        <Form.Item
          label={
            <span>
              Ringtime (seconds){" "}
              <Tooltip title="How long to ring the destination before giving up">
                <QuestionCircleOutlined className="text-gray-400" />
              </Tooltip>
            </span>
          }
          name="ringTime"
        >
          <InputNumber min={1} className="w-full" />
        </Form.Item>

        <Form.Item
          label={
            <span>
              Retry Count{" "}
              <Tooltip title="How many times to retry the transfer if it fails">
                <QuestionCircleOutlined className="text-gray-400" />
              </Tooltip>
            </span>
          }
          name="retryCount"
        >
          <InputNumber min={0} className="w-full" />
        </Form.Item>

        <Form.Item
          label={
            <span>
              Timeout (seconds){" "}
              <Tooltip title="Overall time limit for completing the transfer">
                <QuestionCircleOutlined className="text-gray-400" />
              </Tooltip>
            </span>
          }
          name="timeout"
        >
          <InputNumber min={1} className="w-full" />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default CallTransferDrawer;

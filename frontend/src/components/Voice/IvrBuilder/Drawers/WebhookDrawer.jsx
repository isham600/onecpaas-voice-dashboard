import { useEffect } from "react";
import { Drawer, Form, Input, Select, Button, Space, Typography } from "antd";
import {
  LinkOutlined,
  PlusOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";

// Dynamic values the engine substitutes into the URL / header values / body.
const VARS = [
  { token: "{{receiver}}", label: "Number" },
  { token: "{{collected}}", label: "Entered input" },
  { token: "{{dtmf}}", label: "Keys pressed" },
  { token: "{{campaign}}", label: "Campaign ID" },
  { token: "{{caller_id}}", label: "Caller ID" },
];

const METHODS = ["POST", "GET", "PUT", "PATCH", "DELETE"];

// Fire-and-forget webhook: the call POSTs/GETs the caller's data to your URL and
// moves on; every attempt (success or failure) is logged in Voice → Webhook Logs.
const WebhookDrawer = ({ open, initialValues, onClose, onSave }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ method: "POST", headers: [], ...initialValues });
  }, [open, initialValues, form]);

  const handleSave = () => {
    form.validateFields().then((values) => onSave(values));
  };

  const insertVar = (token) => {
    const cur = form.getFieldValue("body") || "";
    form.setFieldValue("body", cur + token);
  };

  return (
    <Drawer
      title={
        <span>
          <LinkOutlined className="mr-2" />
          Webhook
        </span>
      }
      width={560}
      open={open}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Back</Button>
          <Button
            type="primary"
            onClick={handleSave}
            style={{ background: "#2563EB", borderColor: "#2563EB" }}
          >
            Submit
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Title" name="title">
          <Input placeholder="Enter title" />
        </Form.Item>

        <Form.Item
          label="URL"
          name="url"
          rules={[
            { required: true, message: "URL is required" },
            {
              pattern: /^https?:\/\/.+/i,
              message: "Must start with http:// or https://",
            },
          ]}
        >
          <Input placeholder="https://your-api.com/lead" />
        </Form.Item>

        <Form.Item label="Method" name="method">
          <Select>
            {METHODS.map((m) => (
              <Select.Option key={m} value={m}>
                {m}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Typography.Text strong>Headers</Typography.Text>
        <Form.List name="headers">
          {(fields, { add, remove }) => (
            <div className="mb-4 mt-1">
              {fields.map((field) => (
                <Space
                  key={field.key}
                  align="baseline"
                  style={{ display: "flex", marginBottom: 8 }}
                >
                  <Form.Item name={[field.name, "key"]} noStyle>
                    <Input placeholder="Header" style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item name={[field.name, "value"]} noStyle>
                    <Input placeholder="Value" style={{ width: 240 }} />
                  </Form.Item>
                  <MinusCircleOutlined onClick={() => remove(field.name)} />
                </Space>
              ))}
              <Button
                type="dashed"
                onClick={() => add({ key: "", value: "" })}
                icon={<PlusOutlined />}
                block
              >
                Add header
              </Button>
            </div>
          )}
        </Form.List>

        <Form.Item label="Body" name="body">
          <Input.TextArea
            rows={5}
            placeholder={'{"number":"{{receiver}}","entered":"{{collected}}"}'}
          />
        </Form.Item>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-gray-500 mr-1">Insert value:</span>
          {VARS.map((v) => (
            <Button key={v.token} size="small" onClick={() => insertVar(v.token)}>
              {v.label}
            </Button>
          ))}
        </div>
      </Form>
    </Drawer>
  );
};

export default WebhookDrawer;

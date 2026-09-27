import { useEffect } from "react";
import { Drawer, Form, Input, InputNumber, Radio, Tooltip, Button } from "antd";
import { FieldNumberOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { useAudioFiles, AudioSourceSelect } from "../AudioSource.jsx";

const LongDtmfDrawer = ({ open, initialValues, onClose, onSave }) => {
  const [form] = Form.useForm();
  const strategy = Form.useWatch("strategy", form);
  const startType = Form.useWatch("startingVoiceType", form);
  const { options, loading } = useAudioFiles(open);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        strategy: "fixedLength",
        enterLength: 1,
        timeOut: 10,
        startingVoiceType: "voice",
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
          <FieldNumberOutlined className="mr-2" />
          Long-DTMF (Multi Key Press) V1
        </span>
      }
      width={560}
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

        <Form.Item label="Key Input Strategy" name="strategy">
          <Radio.Group>
            <Radio value="fixedLength">Fixed Length</Radio>
            <Radio value="keyBased">Key Based Termination</Radio>
          </Radio.Group>
        </Form.Item>

        {strategy === "fixedLength" && (
          <Form.Item label="Enter Length" name="enterLength">
            <InputNumber min={1} className="w-full" />
          </Form.Item>
        )}

        <Form.Item label="Time Out (seconds)" name="timeOut">
          <InputNumber min={1} className="w-full" />
        </Form.Item>

        <Form.Item
          label={
            <span>
              No Input Looping{" "}
              <Tooltip title="Number of times to repeat if the caller doesn't press a key">
                <QuestionCircleOutlined className="text-gray-400" />
              </Tooltip>
            </span>
          }
          name="noInputLooping"
        >
          <InputNumber min={0} className="w-full" />
        </Form.Item>

        <Form.Item
          label={
            <span>
              Invalid Input Looping{" "}
              <Tooltip title="Number of times to repeat if the caller presses an unmapped key">
                <QuestionCircleOutlined className="text-gray-400" />
              </Tooltip>
            </span>
          }
          name="invalidInputLooping"
        >
          <InputNumber min={0} className="w-full" />
        </Form.Item>

        <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
          <div className="font-semibold text-sm mb-3">Starting Voice</div>
          <Form.Item label="Type" name="startingVoiceType">
            <Radio.Group>
              <Radio value="voice">Voice</Radio>
              <Radio value="text">Text</Radio>
              <Radio value="webhook">Webhook</Radio>
            </Radio.Group>
          </Form.Item>
          {startType === "text" && (
            <Form.Item label="Text to speak" name="startingVoiceText">
              <Input.TextArea rows={3} />
            </Form.Item>
          )}
          {startType === "webhook" && (
            <Form.Item label="Webhook URL" name="startingVoiceWebhookUrl">
              <Input placeholder="https://" />
            </Form.Item>
          )}
          {(!startType || startType === "voice") && (
            <Form.Item label="Source" name="startingVoiceSource">
              <AudioSourceSelect options={options} loading={loading} />
            </Form.Item>
          )}
        </div>
      </Form>
    </Drawer>
  );
};

export default LongDtmfDrawer;

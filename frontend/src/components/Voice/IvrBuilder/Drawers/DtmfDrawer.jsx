import { useEffect } from "react";
import { Drawer, Form, Input, InputNumber, Checkbox, Radio, Button, Alert } from "antd";
import { NumberOutlined } from "@ant-design/icons";
import { useAudioFiles, AudioSourceSelect, titleOf } from "../AudioSource.jsx";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

// Shared Voice/Text/Webhook config block, reused for Starting Voice, No Input
// Looping Voice and Invalid Looping Voice.
const VoiceTypeSection = ({ form, title, prefix, hint, options, loading }) => {
  const type = Form.useWatch(`${prefix}Type`, form);

  return (
    <div className="border border-gray-100 rounded-lg p-4 bg-gray-50 mb-4">
      <div className="font-semibold text-sm">{title}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
      <Form.Item label="Type" name={`${prefix}Type`} className="mt-3">
        <Radio.Group>
          <Radio value="voice">Voice</Radio>
          <Radio value="text">Text</Radio>
          <Radio value="webhook">Webhook</Radio>
        </Radio.Group>
      </Form.Item>
      {type === "text" && (
        <Form.Item label="Text to speak" name={`${prefix}Text`} extra="Text can't be played on calls yet.">
          <Input.TextArea rows={3} />
        </Form.Item>
      )}
      {type === "webhook" && (
        <Form.Item label="Webhook URL" name={`${prefix}WebhookUrl`} extra="Webhook audio can't be played on calls yet.">
          <Input placeholder="https://" />
        </Form.Item>
      )}
      {(!type || type === "voice") && (
        <Form.Item label="Source" name={`${prefix}Source`}>
          <AudioSourceSelect options={options} loading={loading} />
        </Form.Item>
      )}
    </div>
  );
};

const DtmfDrawer = ({ open, initialValues, onClose, onSave }) => {
  const [form] = Form.useForm();
  const { options, loading } = useAudioFiles(open);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        keys: [],
        timeOut: 10,
        startingVoiceType: "voice",
        noInputLoopingType: "voice",
        invalidLoopingType: "voice",
        ...initialValues,
      });
    }
  }, [open, initialValues, form]);

  const handleSave = () => {
    form
      .validateFields()
      .then((values) => onSave({ ...values, startingVoiceTitle: titleOf(options, values.startingVoiceSource) }));
  };

  return (
    <Drawer
      title={
        <span>
          <NumberOutlined className="mr-2" />
          DTMF (Key Press) V2
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

        <Form.Item label="Key values" name="keys" extra="Only keys 0–9 work on calls; * and # aren't supported yet.">
          <Checkbox.Group className="grid grid-cols-3 gap-2">
            {KEYS.map((key) => (
              <Checkbox key={key} value={key}>
                {key}
              </Checkbox>
            ))}
          </Checkbox.Group>
        </Form.Item>

        <VoiceTypeSection
          form={form}
          title="Starting Voice"
          prefix="startingVoice"
          hint="Plays when the caller reaches this menu. On the IVR's first menu it's also the campaign audio that sets the credits."
          options={options}
          loading={loading}
        />

        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="Time Out sets how long to wait for a keypress. By default the menu plays once; set a No Input or Invalid looping voice below to have it re-prompt (up to 3 times) with that voice."
        />

        <Form.Item label="Time Out (seconds)" name="timeOut">
          <InputNumber min={1} className="w-full" />
        </Form.Item>

        <VoiceTypeSection
          form={form}
          title="No Input Looping Voice"
          prefix="noInputLooping"
          options={options}
          loading={loading}
        />
        <VoiceTypeSection
          form={form}
          title="Invalid Looping Voice"
          prefix="invalidLooping"
          options={options}
          loading={loading}
        />
      </Form>
    </Drawer>
  );
};

export default DtmfDrawer;

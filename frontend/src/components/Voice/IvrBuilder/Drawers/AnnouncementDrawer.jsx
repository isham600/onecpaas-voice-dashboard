import { useEffect } from "react";
import { Drawer, Form, Input, Radio, Tabs, Button, Alert } from "antd";
import { SoundOutlined } from "@ant-design/icons";
import { useAudioFiles, AudioSourceSelect, titleOf } from "../AudioSource.jsx";

const AnnouncementDrawer = ({ open, initialValues, onClose, onSave }) => {
  const [form] = Form.useForm();
  const type = Form.useWatch("type", form);
  const { options, loading } = useAudioFiles(open);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({ type: "voice", ...initialValues });
  }, [open, initialValues, form]);

  const handleSave = () => {
    form.validateFields().then((values) => onSave({ ...values, sourceTitle: titleOf(options, values.source) }));
  };

  return (
    <Drawer
      title={
        <span>
          <SoundOutlined className="mr-2" />
          Announcement
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
      <Tabs
        items={[
          {
            key: "basic",
            label: "Basic",
            children: (
              <Form form={form} layout="vertical">
                <Form.Item label="Title" name="title">
                  <Input placeholder="Enter title" />
                </Form.Item>
                <Form.Item label="Type" name="type">
                  <Radio.Group>
                    <Radio value="voice">Voice</Radio>
                    <Radio value="text">Text</Radio>
                  </Radio.Group>
                </Form.Item>
                {type === "text" ? (
                  <>
                    <Alert
                      type="warning"
                      showIcon
                      className="mb-4"
                      message="Text announcements can't be played on calls yet. Choose Voice to use this IVR in a campaign."
                    />
                    <Form.Item label="Text to speak" name="text">
                      <Input.TextArea rows={4} placeholder="Enter the announcement text" />
                    </Form.Item>
                  </>
                ) : (
                  <Form.Item label="Source" name="source" extra="Only approved announcements are listed.">
                    <AudioSourceSelect options={options} loading={loading} />
                  </Form.Item>
                )}
              </Form>
            ),
          },
          {
            key: "tags",
            label: "During Call Dynamic Tags",
            children: <div className="text-sm text-gray-400">No dynamic tags configured.</div>,
          },
        ]}
      />
    </Drawer>
  );
};

export default AnnouncementDrawer;

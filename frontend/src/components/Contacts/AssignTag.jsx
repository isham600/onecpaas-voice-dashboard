import { useState } from "react";
import {
  Form,
  Input,
  Button,
  Typography,
  Space,
  Row,
  Col,
  message,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  CheckOutlined,
  TagOutlined,
} from "@ant-design/icons";
import handleApiError from "../../utils/errorHandler";

const { Title } = Typography;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight: "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const AssignTag = ({ onSubmitTags }) => {
  const [form] = Form.useForm();
  const [tags, setTags] = useState([""]); // Initially one empty input
  const [loading, setLoading] = useState(false);

  // Handle the change for individual tag inputs
  const handleTagChange = (index, value) => {
    const newTags = [...tags];
    newTags[index] = value;
    setTags(newTags);
  };

  // Add a new empty tag input field
  const handleAddTag = () => {
    setTags([...tags, ""]);
  };

  // Remove a tag input field
  const handleRemoveTag = (index) => {
    if (tags.length > 1) {
      const newTags = [...tags];
      newTags.splice(index, 1);
      setTags(newTags);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const validTags = tags.filter((tag) => tag.trim() !== ""); // Remove empty tags

      if (validTags.length === 0) {
        message.error("Please add at least one valid tag.");
        setLoading(false);
        return;
      }

      // Check for duplicate tags
      const uniqueTags = [...new Set(validTags.map((tag) => tag.trim()))];
      if (uniqueTags.length !== validTags.length) {
        message.warning("Duplicate tags removed.");
      }

      // Call the passed callback function with tags
      await onSubmitTags(uniqueTags);

      // Reset the input fields after successful submission
      setTags([""]);
      form.resetFields();
      message.success("Tags assigned successfully!");
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press to add new tag
  const handleKeyPress = (e, index) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      e.preventDefault();
      if (index === tags.length - 1) {
        handleAddTag();
      }
    }
  };

  return (
    <div
      className="flex flex-col"
      style={{ height: "50vh", maxHeight: "400px" }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 -mx-6 -mt-6 mb-5 flex-shrink-0"
        style={{
          background: THEME.gradientLight,
          borderBottom: "1px solid rgba(37,99,235,0.1)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: THEME.gradient, boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
          >
            <TagOutlined style={{ fontSize: 18, color: "white" }} />
          </div>
          <Title level={4} className="!mb-0" style={{ color: "#1f2937" }}>
            Assign Tags
          </Title>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pr-2" style={{ minHeight: 0 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-3">
            {tags.map((tag, index) => (
              <Row key={index} gutter={8} align="middle">
                <Col flex="1">
                  <Form.Item
                    label={`Tag ${index + 1}`}
                    className="!mb-0"
                    rules={[
                      {
                        validator: (_, value) => {
                          if (value && value.trim()) {
                            // Check for duplicates
                            const currentTags = tags.filter(
                              (t, i) => i !== index && t.trim(),
                            );
                            if (currentTags.includes(value.trim())) {
                              return Promise.reject(
                                new Error("This tag already exists"),
                              );
                            }
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input
                      placeholder={`Enter tag ${index + 1}`}
                      value={tag}
                      onChange={(e) => handleTagChange(index, e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      size="middle"
                    />
                  </Form.Item>
                </Col>

                <Col style={{ marginTop: 24 }}>
                  <Space>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddTag}
                      size="small"
                      className="bg-blue-500 hover:bg-blue-600"
                      title="Add new tag"
                    />

                    {tags.length > 1 && (
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveTag(index)}
                        size="small"
                        title="Remove this tag"
                      />
                    )}
                  </Space>
                </Col>
              </Row>
            ))}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-200 mt-6">
            <Row justify="end">
              <Col>
                <Space>
                  <Button
                    onClick={() => {
                      setTags([""]);
                      form.resetFields();
                    }}
                  >
                    Clear All
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<CheckOutlined />}
                    loading={loading}
                    className="bg-green-500 hover:bg-green-600 border-green-500"
                    disabled={tags.every((tag) => !tag.trim())}
                  >
                    Assign Tags
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>
        </Form>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200 flex-shrink-0">
        <div className="text-sm text-blue-700">
          <strong>Tips:</strong>
          <ul className="mt-1 ml-4 list-disc">
            <li>Press Enter after typing a tag to add a new field</li>
            <li>Empty tags will be automatically removed</li>
            <li>Duplicate tags will be filtered out</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AssignTag;

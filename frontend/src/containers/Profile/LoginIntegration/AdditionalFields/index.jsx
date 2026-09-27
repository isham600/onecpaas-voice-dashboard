import React, { useState, useEffect } from "react";
import { Input, Button, Row, Col, Form, message } from "antd";
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  InstagramOutlined,
  TwitterOutlined,
  FacebookOutlined,
  ShoppingOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  LinkOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { AnimatePresence, motion } from "framer-motion";
import { profile } from "../../../../services/api";

const { TextArea } = Input;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(29,78,216,0.04) 100%)",
};

const AdditionalFields = ({ user }) => {
  const [form] = Form.useForm();
  const [profileUser, setProfileUser] = useState({});
  const [formData, setFormData] = useState({
    username: user?.username,
    action: "update",
  });
  const [isEditable, setIsEditable] = useState(false);
  const [loading, setLoading] = useState(false);

  // Configure message
  message.config({
    top: 100,
    duration: 3,
    maxCount: 3,
  });

  const fetchUser = async () => {
    try {
      const response = await profile({
        username: user.username,
        action: "read",
      });

      const profileData = response?.data?.user?.profile;
      setProfileUser(profileData);

      if (profileData) {
        const newFormData = {
          instagram: profileData?.social_media_links?.[0] || "",
          twitter: profileData?.social_media_links?.[1] || "",
          facebook: profileData?.social_media_links?.[2] || "",
          status_verification: profileData?.status_verification || "",
          greeting_message: profileData?.greeting_message || "",
          away_message: profileData?.away_message || "",
          quick_replies: profileData?.quick_replies || "",
          catalogId: profileData?.catalogId || "",
          username: user?.username,
          action: "update",
        };
        setFormData(newFormData);
        form.setFieldsValue(newFormData);
      }
    } catch (error) {
      message.error("Failed to load additional fields");
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    const combinedSocialMediaLinks = [
      formData.instagram,
      formData.twitter,
      formData.facebook,
    ].filter(Boolean);

    setFormData((prev) => ({
      ...prev,
      social_media_links: combinedSocialMediaLinks,
    }));
  }, [formData.instagram, formData.twitter, formData.facebook]);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (values) => {
    try {
      setLoading(true);
      const response = await profile({
        ...formData,
        ...values,
      });
      setIsEditable(false);
      message.success("Additional fields updated successfully");
      fetchUser();
    } catch (error) {
      if (error?.response?.data?.message?.status_verification) {
        message.error(error.response.data.message.status_verification[0]);
      } else if (error?.response?.data?.message) {
        message.error("Status verification cannot be null");
      } else {
        message.error("Failed to update additional fields");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Compact edit button row */}
      <div className="flex justify-end mb-4">
        <Button
          type={isEditable ? "default" : "primary"}
          icon={isEditable ? <CloseOutlined /> : <EditOutlined />}
          onClick={() => setIsEditable(!isEditable)}
          className="rounded-xl font-medium"
          style={
            isEditable
              ? { borderColor: "#ef4444", color: "#ef4444" }
              : {
                  background: THEME.gradient,
                  border: "none",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                }
          }
        >
          {isEditable ? "Cancel Edit" : "Edit Fields"}
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleUpdate}
        initialValues={formData}
      >
        {/* Row 1 — 2 cols: Social Media | Verification & Catalog */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Social Media Links */}
          <div
            className="bg-white rounded-2xl border border-gray-100 p-5"
            style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: THEME.gradientLight }}
              >
                <LinkOutlined style={{ color: "#2563EB", fontSize: 13 }} />
              </div>
              <span
                className="text-sm font-semibold"
                style={{ color: "#1f2937" }}
              >
                Social Media Links
              </span>
            </div>

            <Form.Item
              label={
                <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  Instagram
                </span>
              }
              name="instagram"
              rules={[
                {
                  type: "url",
                  message: "Please enter a valid Instagram URL",
                },
              ]}
              extra={
                <span className="text-xs text-gray-400">
                  Your Instagram profile URL
                </span>
              }
            >
              <Input
                value={formData.instagram}
                onChange={(e) => handleChange("instagram", e.target.value)}
                disabled={!isEditable}
                placeholder="https://instagram.com/your-profile"
                prefix={
                  <InstagramOutlined style={{ color: "#2563EB" }} />
                }
                size="large"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              label={
                <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  Twitter / X
                </span>
              }
              name="twitter"
              rules={[
                {
                  type: "url",
                  message: "Please enter a valid Twitter URL",
                },
              ]}
              extra={
                <span className="text-xs text-gray-400">
                  Your Twitter/X profile URL
                </span>
              }
            >
              <Input
                value={formData.twitter}
                onChange={(e) => handleChange("twitter", e.target.value)}
                disabled={!isEditable}
                placeholder="https://twitter.com/your-profile"
                prefix={<TwitterOutlined style={{ color: "#2563EB" }} />}
                size="large"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              label={
                <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  Facebook
                </span>
              }
              name="facebook"
              rules={[
                {
                  type: "url",
                  message: "Please enter a valid Facebook URL",
                },
              ]}
              extra={
                <span className="text-xs text-gray-400">
                  Your Facebook page URL
                </span>
              }
              style={{ marginBottom: 0 }}
            >
              <Input
                value={formData.facebook}
                onChange={(e) => handleChange("facebook", e.target.value)}
                disabled={!isEditable}
                placeholder="https://facebook.com/your-page"
                prefix={<FacebookOutlined style={{ color: "#2563EB" }} />}
                size="large"
                className="rounded-lg"
              />
            </Form.Item>
          </div>

          {/* Verification & Catalog */}
          <div
            className="bg-white rounded-2xl border border-gray-100 p-5"
            style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: THEME.gradientLight }}
              >
                <IdcardOutlined style={{ color: "#2563EB", fontSize: 13 }} />
              </div>
              <span
                className="text-sm font-semibold"
                style={{ color: "#1f2937" }}
              >
                Verification &amp; Catalog
              </span>
            </div>

            <Form.Item
              label={
                <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  Verification Status
                </span>
              }
              name="status_verification"
              extra={
                <span className="text-xs text-gray-400">
                  Your current account verification status
                </span>
              }
            >
              <Input
                value={formData.status_verification}
                disabled={true}
                placeholder="Verification status"
                prefix={
                  <CheckCircleOutlined style={{ color: "#2563EB" }} />
                }
                size="large"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              label={
                <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                  Catalog ID
                </span>
              }
              name="catalogId"
              rules={[
                {
                  max: 50,
                  message: "Catalog ID cannot exceed 50 characters",
                },
              ]}
              extra={
                <span className="text-xs text-gray-400">
                  Your product catalog identifier
                </span>
              }
              style={{ marginBottom: 0 }}
            >
              <Input
                value={formData.catalogId}
                onChange={(e) => handleChange("catalogId", e.target.value)}
                disabled={!isEditable}
                placeholder="Enter your catalog ID"
                prefix={<ShoppingOutlined style={{ color: "#2563EB" }} />}
                size="large"
                className="rounded-lg"
              />
            </Form.Item>
          </div>
        </div>

        {/* Row 2 — Full width: Automated Messages (greeting + away side by side) */}
        <div
          className="bg-white rounded-2xl border border-gray-100 p-5 mb-4"
          style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: THEME.gradientLight }}
            >
              <MessageOutlined style={{ color: "#2563EB", fontSize: 13 }} />
            </div>
            <span
              className="text-sm font-semibold"
              style={{ color: "#1f2937" }}
            >
              Automated Messages
            </span>
          </div>

          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    Greeting Message
                  </span>
                }
                name="greeting_message"
                rules={[
                  {
                    max: 500,
                    message: "Greeting message cannot exceed 500 characters",
                  },
                ]}
                extra={
                  <span className="text-xs text-gray-400">
                    {formData.greeting_message?.length || 0}/500 characters
                  </span>
                }
                style={{ marginBottom: 0 }}
              >
                <TextArea
                  value={formData.greeting_message}
                  onChange={(e) =>
                    handleChange("greeting_message", e.target.value)
                  }
                  disabled={!isEditable}
                  placeholder="Welcome! How can we help you today?"
                  rows={3}
                  maxLength={500}
                  showCount
                  className="rounded-lg"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                    Away Message
                  </span>
                }
                name="away_message"
                rules={[
                  {
                    max: 500,
                    message: "Away message cannot exceed 500 characters",
                  },
                ]}
                extra={
                  <span className="text-xs text-gray-400">
                    {formData.away_message?.length || 0}/500 characters
                  </span>
                }
                style={{ marginBottom: 0 }}
              >
                <TextArea
                  value={formData.away_message}
                  onChange={(e) =>
                    handleChange("away_message", e.target.value)
                  }
                  disabled={!isEditable}
                  placeholder="We're currently away. We'll get back to you soon!"
                  rows={3}
                  maxLength={500}
                  showCount
                  className="rounded-lg"
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* Row 3 — Full width: Quick Replies */}
        <div
          className="bg-white rounded-2xl border border-gray-100 p-5 mb-4"
          style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: THEME.gradientLight }}
            >
              <CommentOutlined style={{ color: "#2563EB", fontSize: 13 }} />
            </div>
            <span
              className="text-sm font-semibold"
              style={{ color: "#1f2937" }}
            >
              Quick Replies
            </span>
          </div>

          <Form.Item
            label={
              <span className="text-xs font-medium uppercase tracking-wide text-gray-600">
                Quick Reply Templates
              </span>
            }
            name="quick_replies"
            rules={[
              {
                max: 1000,
                message: "Quick replies cannot exceed 1000 characters",
              },
            ]}
            extra={
              <span className="text-xs text-gray-400">
                {formData.quick_replies?.length || 0}/1000 characters —
                Separate multiple replies with commas
              </span>
            }
            style={{ marginBottom: 0 }}
          >
            <TextArea
              value={formData.quick_replies}
              onChange={(e) => handleChange("quick_replies", e.target.value)}
              disabled={!isEditable}
              placeholder="Hello, Thank you, How can I help?, Check our website, Call us"
              rows={4}
              maxLength={1000}
              showCount
              className="rounded-lg"
            />
          </Form.Item>
        </div>

        {/* Save bar */}
        <AnimatePresence>
          {isEditable && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-4"
            >
              <div
                className="rounded-2xl p-4 flex items-center justify-between gap-4 border"
                style={{
                  background: THEME.gradientLight,
                  borderColor: "rgba(37,99,235,0.15)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(37,99,235,0.12)" }}
                  >
                    <SaveOutlined style={{ color: "#2563EB", fontSize: 14 }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-0">
                      Unsaved changes
                    </p>
                    <p className="text-xs text-gray-400">
                      Click Save to apply your edits
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsEditable(false)}
                    className="rounded-xl"
                    icon={<CloseOutlined />}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    htmlType="submit"
                    loading={loading}
                    className="rounded-xl font-semibold"
                    style={{
                      background: THEME.gradient,
                      border: "none",
                      boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Form>
    </div>
  );
};

export default AdditionalFields;

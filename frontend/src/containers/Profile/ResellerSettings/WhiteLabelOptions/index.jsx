import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Form,
  Input,
  Select,
  Button,
  Checkbox,
  message,
  Upload,
  Modal,
  Tooltip,
} from "antd";
import {
  EyeOutlined,
  UploadOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  GlobalOutlined,
  PictureOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { getProfileMe } from "../../../../services/api";
import handleApiError from "../../../../utils/errorHandler";

const { Option } = Select;
const { TextArea } = Input;

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(29,78,216,0.04) 100%)",
};

const SectionCard = ({ icon, title, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white rounded-2xl border border-gray-100 p-5 mb-4"
    style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
  >
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: THEME.gradientLight }}>
        {icon}
      </div>
      <span className="text-sm font-semibold" style={{ color: "#1f2937" }}>{title}</span>
    </div>
    {children}
  </motion.div>
);

const WhiteLabelOptions = ({ user, permission }) => {
  const token = localStorage.getItem("token");
  const [responseData, setResponseData] = useState({});
  const [channelsData, setChannelsData] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [loading, setLoading] = useState(false);

  message.config({ top: 100, duration: 3, maxCount: 3 });

  const quillRef = useRef(null);

  const fetchUser = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/v1/resellers?username=${encodeURIComponent(user?.username)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setResponseData(response?.data?.data);
    } catch (error) {
      handleApiError(error);
    }
  };

  const fetchServices = async () => {
    try {
      const result = await getProfileMe();
      setChannelsData(result?.data?.data?.channels || []);
    } catch (error) {
      handleApiError(error);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchServices();
  }, [user]);

  const [formData, setFormData] = useState({
    username: user?.username,
    support: "1",
    loginHeading: "",
    loginSubheading: "",
    loginParagraph: "",
    signup: "0",
    domain: "",
    footer: "",
    services: {
      whatsapp: false,
      whatsappMarketing: false,
      bulk_whatsapp: false,
      officalWhatsapp: false,
      instagram: false,
      telegram: false,
      rcs: false,
      voice: false,
      sms: false,
    },
  });

  useEffect(() => {
    if (responseData?.id) {
      setFormData((prev) => ({
        ...prev,
        logo: responseData.logo || null,
        bg_image: responseData.bg_image || null,
        domain: responseData?.domain,
        footer: responseData?.footer,
        signup: responseData?.signup?.toString() || "0",
        loginHeading: responseData?.loginHeading || "Welcome to Our Platform",
        loginSubheading: responseData?.loginSubheading || "Powerful communication tools for your business",
        loginParagraph: responseData?.loginParagraph || "Connect with your customers using our advanced messaging solutions. Trusted by thousands of businesses worldwide.",
        id: responseData?.id,
        services: {
          whatsapp: responseData?.whatsapp === 1,
          whatsappMarketing: responseData?.whatsappMarketing === 1,
          bulk_whatsapp: responseData?.bulk_whatsapp === 1,
          officalWhatsapp: responseData?.officalWhatsapp === 1,
          instagram: responseData?.instagram === 1,
          telegram: responseData?.telegram === 1,
          rcs: responseData?.rcs === 1,
          voice: responseData?.voice === 1,
          sms: responseData?.sms === 1,
        },
      }));
    }
  }, [responseData]);

  const resizeImage = (file, maxWidth, maxHeight) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          let { width, height } = img;
          if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
          if (height > maxHeight) { width = (maxHeight / height) * width; height = maxHeight; }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() })),
            file.type, 1.0,
          );
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = () => {
    if (!quillRef.current) return;
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();
    if (!range) { message.warning("Please click within the editor before uploading an image."); return; }
    if (quill.root.querySelectorAll("img").length >= 5) { message.error("You can only upload a maximum of 5 images."); return; }
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const resizedFile = await resizeImage(file, 100, 100);
      const fd = new FormData();
      fd.append("image", resizedFile);
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/v1/resellers/images`,
          fd,
          { headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` } },
        );
        quill.insertEmbed(range.index, "image", response.data.data.path);
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    };
  };

  useEffect(() => {
    if (quillRef.current) {
      try {
        const quill = quillRef.current.getEditor();
        const toolbar = quill.getModule("toolbar");
        toolbar.addHandler("image", handleImageUpload);
      } catch (error) {
        console.error("Error setting up Quill toolbar:", error);
      }
    }
  }, [quillRef.current]);

  const handleChange = (name, value) => {
    if (name === "domain") {
      const cleanedValue = value.replace(/^https?:\/\//i, "");
      setFormData((prev) => ({ ...prev, [name]: `https://${cleanedValue}` }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const beforeUpload = (file, type) => {
    const validImageTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validImageTypes.includes(file.type)) {
      message.error("Please upload a valid image file (jpeg, jpg, or png).");
      return false;
    }
    const sizeLimit = type === "logo" ? 1024 : 5 * 1024;
    if (file.size / 1024 > sizeLimit) {
      message.error(`The ${type} image size must be less than ${type === "logo" ? "1MB" : "5MB"}.`);
      return false;
    }
    return false;
  };

  const handleFileChange = (info, fieldName) => {
    const file = info.fileList[0]?.originFileObj;
    setFormData((prev) => ({ ...prev, [fieldName]: file || null }));
  };

  const removeImage = (fieldName) => {
    setFormData((prev) => ({ ...prev, [fieldName]: null }));
  };

  const renderFilePreview = (fileField) => {
    const file = formData[fileField];
    if (!file) return null;
    const src = typeof file === "string" ? file : URL.createObjectURL(file);
    return (
      <img
        src={src}
        alt="Preview"
        className="rounded-xl border border-gray-100 object-cover"
        style={{ width: "150px", height: "150px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      />
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    const formDataToSend = new FormData();
    const formattedDomain = formData.domain?.startsWith("https://") ? formData.domain : `https://${formData.domain}`;
    if (formData.logo && typeof formData.logo !== "string") formDataToSend.append("logo", formData.logo);
    if (formData.bg_image && typeof formData.bg_image !== "string") formDataToSend.append("bg_image", formData.bg_image);
    formDataToSend.append("username", user?.username);
    formDataToSend.append("support", formData.support);
    formDataToSend.append("loginHeading", formData.loginHeading);
    formDataToSend.append("loginSubheading", formData.loginSubheading);
    formDataToSend.append("loginParagraph", formData.loginParagraph);
    formDataToSend.append("id", formData.id);
    formDataToSend.append("domain", formattedDomain);
    if (permission?.whatsapp_credits) formDataToSend.append("whatsapp", formData.services.whatsapp ? 1 : 0);
    if (permission?.bulk_whatsapp) formDataToSend.append("bulk_whatsapp", formData.services.bulk_whatsapp ? 1 : 0);
    if (permission?.instagram) formDataToSend.append("instagram", formData.services.instagram ? 1 : 0);
    if (permission?.telegram) formDataToSend.append("telegram", formData.services.telegram ? 1 : 0);
    if (permission?.rcs_credits) formDataToSend.append("rcs", formData.services.rcs ? 1 : 0);
    if (permission?.voice_credits) formDataToSend.append("voice", formData.services.voice ? 1 : 0);
    if (permission?.sms_credits) formDataToSend.append("sms", formData.services.sms ? 1 : 0);
    formDataToSend.append("footer", formData.footer);
    try {
      const url = formData.id
        ? `${import.meta.env.VITE_API_BASE_URL}/v1/resellers/${formData.id}`
        : `${import.meta.env.VITE_API_BASE_URL}/v1/resellers`;
      const method = formData.id ? "put" : "post";
      await axios[method](url, formDataToSend, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
      });
      setIsEditable(false);
      message.success("White label options updated successfully!");
    } catch (error) {
      if (error?.response?.data?.message?.domain) message.error(error.response.data.message.domain[0]);
      if (error?.response?.data?.message?.logo) message.error(error.response.data.message.logo[0]);
      if (error?.response?.data?.message?.bg_image) message.error(error.response.data.message.bg_image[0]);
      if (error?.response?.data?.message?.description) message.error(error.response.data.message.description[0]);
    } finally {
      setLoading(false);
    }
  };

  const services = [
    { key: "whatsapp", perm: permission?.whatsapp_credits, label: channelsData[0]?.front_end_name || "WhatsApp" },
    { key: "bulk_whatsapp", perm: permission?.bulk_whatsapp, label: channelsData[3]?.front_end_name || "Bulk WhatsApp" },
    { key: "instagram", perm: permission?.instagram, label: channelsData[8]?.front_end_name || "Instagram" },
    { key: "telegram", perm: permission?.telegram, label: channelsData[9]?.front_end_name || "Telegram" },
    { key: "rcs", perm: permission?.rcs_credits, label: channelsData[6]?.front_end_name || "RCS" },
    { key: "voice", perm: permission?.voice_credits, label: channelsData[5]?.front_end_name || "Voice" },
    { key: "sms", perm: permission?.sms_credits, label: channelsData[4]?.front_end_name || "SMS" },
  ].filter((s) => s.perm === 1);

  return (
    <div>
      {/* Top action row */}
      <div className="flex justify-end items-center gap-2 mb-4">
        <Button
          icon={<EyeOutlined />}
          onClick={() => setPreviewVisible(true)}
          className="rounded-xl font-medium"
          style={{ borderColor: THEME.primary, color: THEME.primaryDark, background: "rgba(37,99,235,0.06)" }}
        >
          Preview
        </Button>
        <Button
          type={isEditable ? "default" : "primary"}
          icon={isEditable ? <CloseOutlined /> : <EditOutlined />}
          onClick={() => setIsEditable((prev) => !prev)}
          className="rounded-xl font-medium"
          style={
            isEditable
              ? { borderColor: "#ef4444", color: "#ef4444" }
              : { background: THEME.gradient, border: "none", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }
          }
        >
          {isEditable ? "Cancel Edit" : "Edit Configuration"}
        </Button>
      </div>

      <Form layout="vertical">

        {/* Brand Assets */}
        <SectionCard
          icon={<PictureOutlined style={{ color: THEME.primary, fontSize: 13 }} />}
          title="Brand Assets"
          delay={0.06}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Logo */}
            <div className="rounded-xl p-4" style={{ background: THEME.gradientLight, border: "1px solid rgba(37,99,235,0.1)" }}>
              <p className="text-sm font-semibold mb-0.5" style={{ color: "#1f2937" }}>Brand Logo</p>
              <p className="text-xs text-gray-400 mb-3">Recommended: 150 × 150 px (Max: 1MB)</p>
              <Upload
                listType="picture"
                maxCount={1}
                beforeUpload={(file) => beforeUpload(file, "logo")}
                onChange={(info) => handleFileChange(info, "logo")}
                showUploadList={false}
                disabled={!isEditable}
              >
                <Button
                  icon={<UploadOutlined />}
                  disabled={!isEditable}
                  block
                  className="rounded-lg"
                  style={{ borderColor: isEditable ? THEME.primary : "#d9d9d9", color: isEditable ? THEME.primaryDark : undefined }}
                >
                  Select Logo
                </Button>
              </Upload>
              {renderFilePreview("logo") && (
                <div className="mt-3 text-center">
                  {renderFilePreview("logo")}
                  <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeImage("logo")} disabled={!isEditable} className="rounded-lg mt-2">
                    Remove
                  </Button>
                </div>
              )}
            </div>

            {/* Background */}
            <div className="rounded-xl p-4" style={{ background: THEME.gradientLight, border: "1px solid rgba(37,99,235,0.1)" }}>
              <p className="text-sm font-semibold mb-0.5" style={{ color: "#1f2937" }}>Background Image</p>
              <p className="text-xs text-gray-400 mb-3">Login page background (Max: 5MB)</p>
              <Upload
                listType="picture"
                maxCount={1}
                beforeUpload={(file) => beforeUpload(file, "bg_image")}
                onChange={(info) => handleFileChange(info, "bg_image")}
                showUploadList={false}
                disabled={!isEditable}
              >
                <Button
                  icon={<UploadOutlined />}
                  disabled={!isEditable}
                  block
                  className="rounded-lg"
                  style={{ borderColor: isEditable ? THEME.primary : "#d9d9d9", color: isEditable ? THEME.primaryDark : undefined }}
                >
                  Select Background
                </Button>
              </Upload>
              {renderFilePreview("bg_image") && (
                <div className="mt-3 text-center">
                  {renderFilePreview("bg_image")}
                  <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeImage("bg_image")} disabled={!isEditable} className="rounded-lg mt-2">
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Login Page Content */}
        <SectionCard
          icon={<EditOutlined style={{ color: THEME.primary, fontSize: 13 }} />}
          title="Login Page Content"
          delay={0.1}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-5">
            <Form.Item
              label={<span className="text-xs font-medium uppercase tracking-wide text-gray-500">Login Heading</span>}
              extra={<span className="text-xs text-gray-400">Main heading on the login page</span>}
            >
              <Input
                value={formData.loginHeading}
                onChange={(e) => handleChange("loginHeading", e.target.value)}
                disabled={!isEditable}
                placeholder="Welcome to Our Platform"
                size="large"
                className="rounded-lg"
                style={!isEditable ? { background: "#f9fafb", color: "#374151" } : {}}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-xs font-medium uppercase tracking-wide text-gray-500">Login Subheading</span>}
              extra={<span className="text-xs text-gray-400">Subtitle below the main heading</span>}
            >
              <Input
                value={formData.loginSubheading}
                onChange={(e) => handleChange("loginSubheading", e.target.value)}
                disabled={!isEditable}
                placeholder="Powerful communication tools for your business"
                size="large"
                className="rounded-lg"
                style={!isEditable ? { background: "#f9fafb", color: "#374151" } : {}}
              />
            </Form.Item>
          </div>

          <Form.Item
            label={<span className="text-xs font-medium uppercase tracking-wide text-gray-500">Login Paragraph</span>}
            extra={<span className="text-xs text-gray-400">Descriptive text to explain your service</span>}
            style={{ marginBottom: 0 }}
          >
            <TextArea
              value={formData.loginParagraph}
              onChange={(e) => handleChange("loginParagraph", e.target.value)}
              disabled={!isEditable}
              placeholder="Connect with your customers using our advanced messaging solutions..."
              rows={3}
              maxLength={500}
              showCount
              className="rounded-lg"
              style={!isEditable ? { background: "#f9fafb", color: "#374151" } : {}}
            />
          </Form.Item>
        </SectionCard>

        {/* Domain & Settings */}
        <SectionCard
          icon={<GlobalOutlined style={{ color: THEME.primary, fontSize: 13 }} />}
          title="Domain & Settings"
          delay={0.14}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-5">
            <Form.Item
              label={
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Domain
                  <Tooltip title="Point your domain to IP: 182.71.43.75">
                    <InfoCircleOutlined className="ml-1" style={{ color: THEME.primary }} />
                  </Tooltip>
                </span>
              }
              required
            >
              <Input
                addonBefore={<span style={{ color: THEME.primaryDark }}>https://</span>}
                value={formData.domain?.replace(/^https?:\/\//i, "")}
                onChange={(e) => handleChange("domain", e.target.value)}
                disabled={!isEditable}
                placeholder="example.com"
                size="large"
                className="rounded-lg"
                style={!isEditable ? { background: "#f9fafb" } : {}}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-xs font-medium uppercase tracking-wide text-gray-500">Footer Text</span>}
              required
            >
              <Input
                value={formData.footer}
                onChange={(e) => handleChange("footer", e.target.value)}
                disabled={!isEditable}
                placeholder="© 2024 Your Company Name. All rights reserved."
                size="large"
                className="rounded-lg"
                style={!isEditable ? { background: "#f9fafb", color: "#374151" } : {}}
              />
            </Form.Item>

            <Form.Item
              label={<span className="text-xs font-medium uppercase tracking-wide text-gray-500">Support Option</span>}
            >
              <Select
                value={formData.support}
                onChange={(value) => handleChange("support", value)}
                disabled={!isEditable}
                size="large"
                className="w-full"
              >
                <Option value="1">Enable Support</Option>
                <Option value="0">Disable Support</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label={<span className="text-xs font-medium uppercase tracking-wide text-gray-500">Sign Up</span>}
              style={{ marginBottom: 0 }}
            >
              <Select
                value={formData.signup}
                onChange={(value) => handleChange("signup", value)}
                disabled={!isEditable}
                size="large"
                className="w-full"
              >
                <Option value="0">Show Sign Up</Option>
                <Option value="1">Hide Sign Up</Option>
              </Select>
            </Form.Item>
          </div>
        </SectionCard>

        {/* Available Services */}
        {services.length > 0 && (
          <SectionCard
            icon={<CheckCircleOutlined style={{ color: THEME.primary, fontSize: 13 }} />}
            title="Available Services"
            delay={0.18}
          >
            <p className="text-xs text-gray-400 mb-3 -mt-1">Select which services are available on your white-label domain</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {services.map((service, index) => (
                <motion.div
                  key={service.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.04 }}
                  className="rounded-xl p-3.5 cursor-pointer"
                  style={{
                    background: formData.services[service.key] ? THEME.gradientLight : "white",
                    border: `1px solid ${formData.services[service.key] ? "rgba(37,99,235,0.25)" : "#f0f0f0"}`,
                    boxShadow: formData.services[service.key] ? "0 2px 8px rgba(37,99,235,0.08)" : "0 1px 3px rgba(0,0,0,0.02)",
                  }}
                >
                  <Checkbox
                    checked={formData.services[service.key]}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        services: { ...prev.services, [service.key]: e.target.checked },
                      }))
                    }
                    disabled={!isEditable}
                  >
                    <span className="text-sm font-medium" style={{ color: formData.services[service.key] ? THEME.primaryDark : "#4b5563" }}>
                      {service.label}
                    </span>
                  </Checkbox>
                </motion.div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Save bar */}
        <AnimatePresence>
          {isEditable && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl p-4 flex items-center justify-between gap-4 border"
              style={{ background: THEME.gradientLight, borderColor: "rgba(37,99,235,0.15)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(37,99,235,0.12)" }}>
                  <SaveOutlined style={{ color: THEME.primary, fontSize: 14 }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-0">Unsaved changes</p>
                  <p className="text-xs text-gray-400">Click Save to apply your edits</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setIsEditable(false)} className="rounded-xl" icon={<CloseOutlined />} style={{ borderColor: "#e5e7eb" }}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSubmit}
                  loading={loading}
                  className="rounded-xl font-semibold"
                  style={{ background: THEME.gradient, border: "none", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
                >
                  Save Changes
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Form>

      {/* Preview Modal — full login page simulation */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: THEME.gradient }}>
              <EyeOutlined style={{ color: "white", fontSize: 14 }} />
            </div>
            <span style={{ color: "#1f2937", fontWeight: 600 }}>Login Page Preview</span>
            <span className="text-xs text-gray-400 font-normal ml-1">— live simulation of your branded login</span>
          </div>
        }
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width="min(92vw, 1060px)"
        style={{ top: 32 }}
        styles={{
          content: { borderRadius: 16, overflow: "hidden", padding: 0 },
          header: { borderBottom: "1px solid rgba(37,99,235,0.1)", padding: "14px 20px" },
          body: { padding: 0 },
        }}
      >
        {/* Browser chrome */}
        <div className="border-t border-gray-100">
          {/* Address bar */}
          <div className="flex items-center gap-3 bg-gray-50 border-b border-gray-100 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded-md px-3 py-1.5 flex items-center gap-1.5 border border-gray-200 text-xs text-gray-500 max-w-xs mx-auto">
              <LockOutlined style={{ fontSize: 10, color: "#16a34a" }} />
              <span className="truncate">{(formData.domain || "https://yourdomain.com").replace(/^https?:\/\//i, "")}</span>
            </div>
          </div>

          {/* Page content — split layout */}
          <div className="flex" style={{ height: 520 }}>

            {/* Left panel — brand / hero */}
            <div className="relative w-[58%] overflow-hidden flex-shrink-0">
              {/* Background */}
              {formData.bg_image ? (
                <img
                  src={typeof formData.bg_image === "string" ? formData.bg_image : URL.createObjectURL(formData.bg_image)}
                  alt="Background"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0" style={{ background: THEME.gradient }} />
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.55) 100%)" }} />

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-between p-8">
                {/* Logo top-left */}
                <div>
                  {formData.logo ? (
                    <img
                      src={typeof formData.logo === "string" ? formData.logo : URL.createObjectURL(formData.logo)}
                      alt="Logo"
                      className="h-9 w-auto object-contain"
                      style={{ filter: "brightness(0) invert(1)" }}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <GlobalOutlined style={{ color: "white", fontSize: 14 }} />
                      </div>
                      <span className="text-white font-bold text-sm opacity-90">Your Brand</span>
                    </div>
                  )}
                </div>

                {/* Brand copy — bottom */}
                <div className="text-white">
                  <h2 className="text-2xl font-bold leading-tight mb-2">
                    {formData.loginHeading || "Welcome to Our Platform"}
                  </h2>
                  <p className="text-sm font-medium mb-3 opacity-85">
                    {formData.loginSubheading || "Powerful communication tools for your business"}
                  </p>
                  <p className="text-xs leading-relaxed opacity-70 max-w-sm">
                    {formData.loginParagraph || "Connect with your customers using our advanced messaging solutions."}
                  </p>

                  {/* Decorative dots */}
                  <div className="flex gap-1.5 mt-5">
                    <div className="w-6 h-1.5 rounded-full bg-white opacity-80" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right panel — login form */}
            <div className="flex-1 bg-white flex flex-col items-center justify-center px-10 py-8 overflow-y-auto">
              {/* Logo */}
              {formData.logo ? (
                <img
                  src={typeof formData.logo === "string" ? formData.logo : URL.createObjectURL(formData.logo)}
                  alt="Logo"
                  className="h-10 w-auto object-contain mb-6"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: THEME.gradient }}>
                  <GlobalOutlined style={{ color: "white", fontSize: 20 }} />
                </div>
              )}

              <h3 className="text-xl font-bold text-gray-900 mb-1">Sign in</h3>
              <p className="text-xs text-gray-400 mb-6">Enter your credentials to continue</p>

              {/* Simulated form fields */}
              <div className="w-full max-w-[280px] space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Username</label>
                  <div className="rounded-xl border border-gray-200 px-3 py-2.5 bg-gray-50 text-sm text-gray-400 flex items-center gap-2">
                    <UserOutlined style={{ fontSize: 12, color: "#9ca3af" }} />
                    <span>Enter username</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Password</label>
                    <span className="text-[11px]" style={{ color: THEME.primary }}>Forgot password?</span>
                  </div>
                  <div className="rounded-xl border border-gray-200 px-3 py-2.5 bg-gray-50 text-sm text-gray-400 flex items-center gap-2">
                    <LockOutlined style={{ fontSize: 12, color: "#9ca3af" }} />
                    <span>••••••••</span>
                  </div>
                </div>

                <button
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-white mt-1"
                  style={{ background: THEME.gradient, boxShadow: "0 4px 12px rgba(37,99,235,0.3)", cursor: "default" }}
                >
                  Sign In
                </button>

                {formData.signup !== "1" && (
                  <p className="text-center text-[11px] text-gray-400 pt-1">
                    Don't have an account?{" "}
                    <span className="font-semibold" style={{ color: THEME.primary }}>Sign up</span>
                  </p>
                )}
              </div>

              {/* Footer */}
              {formData.footer && (
                <p className="text-[10px] text-gray-300 mt-8 text-center leading-relaxed max-w-[260px]">
                  {formData.footer}
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WhiteLabelOptions;

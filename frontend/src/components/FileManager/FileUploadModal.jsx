import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Upload,
  Button,
  Input,
  Typography,
  Space,
  Card,
  message,
  Progress,
  Alert,
  Spin,
} from "antd";
import {
  UploadOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  FilePdfOutlined,
  SoundOutlined,
  SaveOutlined,
  CloseOutlined,
  InboxOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  FileOutlined,
  CloudUploadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import Modal from "../Modal";

const { Title, Text } = Typography;
const { Dragger } = Upload;

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const FileUploadModal = ({ isOpen, onClose, onUpload, existingFiles }) => {
  const [selectedType, setSelectedType] = useState(null);
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileTypes = [
    {
      id: 1,
      name: "Images",
      icon: <FileImageOutlined style={{ fontSize: 28 }} />,
      accept: [".jpeg", ".jpg", ".png", ".gif", ".webp", ".svg"],
      mimeTypes: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ],
      color: "#06b6d4",
      maxSize: 5,
      description: "JPG, PNG, GIF, WebP, SVG",
    },
    {
      id: 2,
      name: "Videos",
      icon: <VideoCameraOutlined style={{ fontSize: 28 }} />,
      accept: [".mp4", ".webm", ".avi", ".mov", ".mkv"],
      mimeTypes: [
        "video/mp4",
        "video/webm",
        "video/x-msvideo",
        "video/quicktime",
        "video/x-matroska",
      ],
      color: "#8b5cf6",
      maxSize: 50,
      description: "MP4, WebM, AVI, MOV",
    },
    {
      id: 3,
      name: "Documents",
      icon: <FilePdfOutlined style={{ fontSize: 28 }} />,
      accept: [
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".txt",
      ],
      mimeTypes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
      ],
      color: "#ef4444",
      maxSize: 10,
      description: "PDF, Word, Excel, PowerPoint, Text",
    },
    {
      id: 4,
      name: "Audio",
      icon: <SoundOutlined style={{ fontSize: 28 }} />,
      accept: [".mp3", ".wav", ".ogg", ".m4a", ".aac"],
      mimeTypes: [
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
        "audio/mp4",
        "audio/aac",
      ],
      color: THEME.primary,
      maxSize: 10,
      description: "MP3, WAV, OGG, M4A",
    },
  ];

  const selectedFileType = fileTypes.find((type) => type.id === selectedType);

  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  const validateFile = (uploadedFile) => {
    if (!selectedType) {
      message.warning("Please select a file type first!");
      return false;
    }

    const extension = "." + uploadedFile.name.split(".").pop().toLowerCase();
    if (!selectedFileType.accept.includes(extension)) {
      message.error(
        `Invalid file type. Accepted formats: ${selectedFileType.description}`,
      );
      return false;
    }

    if (!selectedFileType.mimeTypes.includes(uploadedFile.type)) {
      message.error(
        `Invalid file type. Please upload ${selectedFileType.description}`,
      );
      return false;
    }

    const maxSize = selectedFileType.maxSize * 1024 * 1024;
    if (uploadedFile.size > maxSize) {
      message.error(
        `File size exceeds ${selectedFileType.maxSize}MB limit. Your file is ${(
          uploadedFile.size /
          (1024 * 1024)
        ).toFixed(2)}MB`,
      );
      return false;
    }

    const nameWithoutExt = uploadedFile.name.substring(
      0,
      uploadedFile.name.lastIndexOf("."),
    );
    const isDuplicate = existingFiles.some((existingFile) => {
      const existingNameWithoutExt = (
        existingFile.media_name || existingFile.name
      ).substring(
        0,
        (existingFile.media_name || existingFile.name).lastIndexOf("."),
      );
      return existingNameWithoutExt === nameWithoutExt;
    });

    if (isDuplicate) {
      message.error("A file with this name already exists!");
      return false;
    }

    return true;
  };

  const beforeUpload = (uploadedFile) => {
    if (!validateFile(uploadedFile)) {
      return false;
    }

    setFile(uploadedFile);
    setFileName(uploadedFile.name);

    if (uploadedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(uploadedFile);
    } else if (uploadedFile.type.startsWith("video/")) {
      setFilePreview(URL.createObjectURL(uploadedFile));
    } else if (uploadedFile.type.startsWith("audio/")) {
      setFilePreview(URL.createObjectURL(uploadedFile));
    } else {
      setFilePreview(null);
    }

    return false;
  };

  const handleFileNameChange = (e) => {
    const value = e.target.value;
    const extension = file.name.substring(file.name.lastIndexOf("."));
    const nameWithoutExt = value.replace(extension, "");
    setFileName(nameWithoutExt + extension);
  };

  const handleUpload = async () => {
    if (!fileName || !file) {
      message.error("Please select a file!");
      return;
    }

    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf("."));
    if (nameWithoutExt.trim().length < 3) {
      message.error("File name must be at least 3 characters!");
      return;
    }

    setUploading(true);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 90) {
        clearInterval(interval);
      }
    }, 200);

    try {
      const updatedFile = {
        name: fileName,
        type: file.type,
        file: file,
        size: file.size,
      };

      await onUpload(updatedFile);
      setUploadProgress(100);

      setTimeout(() => {
        handleReset();
        onClose();
      }, 500);
    } catch (error) {
      message.error("Upload failed!");
      clearInterval(interval);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileName("");
    setFilePreview(null);
    setSelectedType(null);
    setUploading(false);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const renderPreview = () => {
    if (!file) return null;

    if (file.type.startsWith("image/")) {
      return (
        <div
          className="w-full h-64 rounded-xl overflow-hidden"
          style={{ background: "#f8fafc" }}
        >
          <img
            src={filePreview}
            alt="Preview"
            className="w-full h-full object-contain"
          />
        </div>
      );
    }

    if (file.type.startsWith("video/")) {
      return (
        <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden">
          <video
            src={filePreview}
            className="w-full h-full object-contain"
            controls
          />
        </div>
      );
    }

    if (file.type === "application/pdf") {
      return (
        <div
          className="w-full h-64 rounded-xl flex items-center justify-center"
          style={{ background: "#fef2f2" }}
        >
          <div className="text-center">
            <FilePdfOutlined
              style={{ fontSize: 64, color: "#ef4444", marginBottom: 12 }}
            />
            <Text type="secondary">PDF Document</Text>
          </div>
        </div>
      );
    }

    if (file.type.startsWith("audio/")) {
      return (
        <div
          className="w-full rounded-xl p-6"
          style={{ background: THEME.gradientLight }}
        >
          <div className="text-center mb-4">
            <SoundOutlined style={{ fontSize: 56, color: THEME.primary }} />
          </div>
          <audio controls className="w-full">
            <source src={filePreview} type={file.type} />
          </audio>
        </div>
      );
    }

    return (
      <div
        className="w-full h-64 rounded-xl flex items-center justify-center"
        style={{ background: "#f8fafc" }}
      >
        <div className="text-center">
          <FileOutlined
            style={{ fontSize: 64, color: "#9ca3af", marginBottom: 12 }}
          />
          <Text type="secondary">{file.type}</Text>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isModalOpen={isOpen}
      closeModal={onClose}
      width="800px"
      height="auto"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6"
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 mb-6 pb-4"
          style={{ borderBottom: "1px solid rgba(37,99,235,0.15)" }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: THEME.gradient,
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
          >
            <CloudUploadOutlined style={{ fontSize: 24, color: "white" }} />
          </motion.div>
          <div className="flex-1">
            <Title level={4} style={{ marginBottom: 0, color: "#1f2937" }}>
              Upload File
            </Title>
            <Text className="text-xs text-gray-500">
              Select file type and upload your file
            </Text>
          </div>
        </div>

        {/* Progress Bar (shown during upload) */}
        {uploading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert
              message={
                <span style={{ color: THEME.primaryDark, fontWeight: 600 }}>
                  Uploading your file...
                </span>
              }
              description={
                <Progress
                  percent={uploadProgress}
                  status="active"
                  strokeColor={{
                    "0%": THEME.primary,
                    "100%": THEME.primaryDark,
                  }}
                  trailColor="rgba(37,99,235,0.1)"
                  strokeWidth={10}
                />
              }
              type="info"
              className="mb-6"
              style={{
                borderRadius: 12,
                background: THEME.gradientLight,
                border: `1px solid #2563EB30`,
              }}
              showIcon
              icon={
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <UploadOutlined style={{ color: THEME.primary }} />
                </motion.div>
              }
            />
          </motion.div>
        )}

        {/* File Type Selection */}
        {!file && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white"
                style={{ background: THEME.gradient }}
              >
                1
              </div>
              <Text strong style={{ color: "#374151" }}>
                Select File Type
              </Text>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {fileTypes.map((type, index) => (
                <motion.div
                  key={type.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    hoverable={!uploading}
                    className="cursor-pointer transition-all"
                    style={{
                      borderRadius: 12,
                      border:
                        selectedType === type.id
                          ? `2px solid ${type.color}`
                          : "1px solid #e5e7eb",
                      boxShadow:
                        selectedType === type.id
                          ? `0 4px 12px ${type.color}20`
                          : "0 2px 4px rgba(0,0,0,0.02)",
                    }}
                    bodyStyle={{ padding: 16 }}
                    onClick={() => !uploading && setSelectedType(type.id)}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ rotate: 5 }}
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: `${type.color}15` }}
                      >
                        <span style={{ color: type.color }}>{type.icon}</span>
                      </motion.div>
                      <div className="flex-1">
                        <Text
                          strong
                          className="block"
                          style={{ color: "#1f2937" }}
                        >
                          {type.name}
                        </Text>
                        <Text className="text-xs text-gray-500 block">
                          {type.description}
                        </Text>
                        <Text className="text-xs text-gray-400">
                          Max: {type.maxSize}MB
                        </Text>
                      </div>
                      {selectedType === type.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring" }}
                        >
                          <CheckCircleOutlined
                            style={{ fontSize: 22, color: type.color }}
                          />
                        </motion.div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* File Upload Area */}
        {selectedType && !file && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white"
                style={{ background: THEME.gradient }}
              >
                2
              </div>
              <Text strong style={{ color: "#374151" }}>
                Upload File
              </Text>
            </div>
            <Dragger
              accept={selectedFileType.accept.join(",")}
              beforeUpload={beforeUpload}
              maxCount={1}
              showUploadList={false}
              disabled={uploading}
              className="upload-dragger"
              style={{
                borderRadius: 16,
                border: `2px dashed #2563EB50`,
                background: THEME.gradientLight,
              }}
            >
              <p className="ant-upload-drag-icon">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <InboxOutlined
                    style={{ fontSize: 56, color: THEME.primary }}
                  />
                </motion.div>
              </p>
              <p
                className="ant-upload-text"
                style={{ fontSize: 16, color: "#1f2937" }}
              >
                Click or drag file to this area to upload
              </p>
              <p className="ant-upload-hint" style={{ color: "#6b7280" }}>
                <strong>Accepted formats:</strong>{" "}
                {selectedFileType.description}
                <br />
                <strong>Maximum size:</strong> {selectedFileType.maxSize}MB
              </p>
            </Dragger>
          </motion.div>
        )}

        {/* File Preview and Details */}
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* File Info */}
            <div className="mb-6">
              <Card
                style={{
                  borderRadius: 12,
                  background: THEME.gradientLight,
                  border: `1px solid #2563EB30`,
                }}
              >
                <Space direction="vertical" className="w-full" size="small">
                  <div className="flex items-center justify-between">
                    <Space>
                      <motion.div
                        whileHover={{ rotate: 5 }}
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: `${selectedFileType.color}15` }}
                      >
                        <span style={{ color: selectedFileType.color }}>
                          {selectedFileType.icon}
                        </span>
                      </motion.div>
                      <div>
                        <Text
                          strong
                          className="block"
                          style={{ color: "#1f2937" }}
                        >
                          {file.name}
                        </Text>
                        <Text className="text-xs text-gray-500">
                          {formatFileSize(file.size)} • {file.type}
                        </Text>
                      </div>
                    </Space>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={handleReset}
                        disabled={uploading}
                        className="rounded-lg"
                      >
                        Remove
                      </Button>
                    </motion.div>
                  </div>
                </Space>
              </Card>
            </div>

            {/* Preview */}
            {filePreview && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <FileOutlined style={{ color: THEME.primary }} />
                  <Text strong style={{ color: "#374151" }}>
                    Preview
                  </Text>
                </div>
                {renderPreview()}
              </motion.div>
            )}

            {/* File Name Input */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <FileOutlined style={{ color: THEME.primary }} />
                <Text strong style={{ color: "#374151" }}>
                  File Name
                </Text>
              </div>
              <Input
                placeholder="Enter file name (min 3 characters)"
                value={fileName}
                onChange={handleFileNameChange}
                size="large"
                showCount
                maxLength={100}
                disabled={uploading}
                prefix={<FileOutlined style={{ color: THEME.primary }} />}
                className="file-name-input"
              />
              <Text className="text-xs text-gray-500 block mt-2">
                Note: File extension will be preserved automatically
              </Text>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div
          className="flex justify-end gap-3 pt-4"
          style={{ borderTop: "1px solid rgba(37,99,235,0.1)" }}
        >
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              icon={<CloseOutlined />}
              onClick={onClose}
              size="large"
              disabled={uploading}
              className="h-11 px-5 rounded-xl font-medium"
              style={{
                borderColor: "#e5e7eb",
                color: "#6b7280",
              }}
            >
              Cancel
            </Button>
          </motion.div>

          {file && !uploading && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleReset}
                size="large"
                className="h-11 px-5 rounded-xl font-medium"
                style={{
                  borderColor: THEME.primary,
                  color: THEME.primaryDark,
                }}
              >
                Reset
              </Button>
            </motion.div>
          )}

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="primary"
              icon={uploading ? <Spin size="small" /> : <SaveOutlined />}
              onClick={handleUpload}
              size="large"
              disabled={!file || !fileName || uploading}
              className="h-11 px-6 rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
              style={{
                background:
                  !file || !fileName || uploading ? "#9ca3af" : THEME.gradient,
                border: "none",
              }}
            >
              {uploading ? "Uploading..." : "Upload File"}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{__html: `
        /* Input Styling */
        .file-name-input .ant-input {
          border-radius: 12px;
          border-color: #e5e7eb;
          padding: 10px 14px;
          transition: all 0.2s ease;
        }

        .file-name-input .ant-input:hover {
          border-color: #2563EB;
        }

        .file-name-input .ant-input:focus,
        .file-name-input .ant-input-focused {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(3, 207, 101, 0.1);
        }

        .file-name-input .ant-input-affix-wrapper {
          border-radius: 12px !important;
          padding: 8px 14px;
        }

        .file-name-input .ant-input-affix-wrapper:hover {
          border-color: #2563EB !important;
        }

        .file-name-input .ant-input-affix-wrapper-focused {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 3px rgba(3, 207, 101, 0.1) !important;
        }

        /* Dragger Styling */
        .upload-dragger .ant-upload-btn {
          padding: 32px !important;
        }

        .upload-dragger:hover {
          border-color: #2563EB !important;
        }

        /* Card Hover */
        .ant-card-hoverable:hover {
          box-shadow: 0 8px 24px rgba(3, 207, 101, 0.12) !important;
        }

        /* Progress Bar */
        .ant-progress-inner {
          border-radius: 8px !important;
        }

        .ant-progress-bg {
          border-radius: 8px !important;
        }

        /* Button Disabled State */
        .ant-btn-primary:disabled {
          background: #9ca3af !important;
          border-color: #9ca3af !important;
          color: white !important;
        }

        /* Spin in Button */
        .ant-btn .ant-spin-dot-item {
          background-color: white !important;
        }

        /* Message Styling */
        .ant-message-success .anticon {
          color: #2563EB !important;
        }

        /* Character Count */
        .file-name-input .ant-input-show-count-suffix {
          color: #9ca3af;
          font-size: 11px;
        }

        /* Alert Styling */
        .ant-alert-info {
          border-radius: 12px;
        }
      `}} />
    </Modal>
  );
};

FileUploadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onUpload: PropTypes.func.isRequired,
  existingFiles: PropTypes.array,
  user: PropTypes.object,
};

FileUploadModal.defaultProps = {
  existingFiles: [],
};

export default FileUploadModal;

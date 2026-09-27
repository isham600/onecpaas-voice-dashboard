import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Input, Button, message, Typography, Space, Spin } from "antd";
import {
  FileAddOutlined,
  SaveOutlined,
  CloseOutlined,
  EditOutlined,
  FileOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import { fileManager } from "../../services/api";
import handleApiError from "../../utils/errorHandler";
import Modal from "../Modal";

const { Title, Text } = Typography;

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const FileCreationModal = ({
  isOpen,
  onClose,
  fileToEdit,
  user,
  onSuccess,
}) => {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fileToEdit && isOpen) {
      const nameWithoutExtension =
        fileToEdit.media_name?.replace(/\.[^/.]+$/, "") || "";
      setFileName(nameWithoutExtension);
    } else {
      setFileName("");
    }
    setError("");
  }, [fileToEdit, isOpen]);

  const getFileExtension = (filename) => {
    const match = filename?.match(/\.[^/.]+$/);
    return match ? match[0] : "";
  };

  const validateFileName = (name) => {
    const trimmedName = name.trim();

    if (trimmedName.length < 3) {
      return "File name must be at least 3 characters long.";
    }

    if (trimmedName.length > 100) {
      return "File name cannot exceed 100 characters.";
    }

    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      return "File name contains invalid characters.";
    }

    return null;
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setFileName(value);

    if (value.trim().length >= 3) {
      setError("");
    }
  };

  const handleSubmit = async () => {
    const validationError = validateFileName(fileName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const extension = getFileExtension(fileToEdit.media_name);
      const newFileName = fileName.trim() + extension;

      const payload = {
        action: "update",
        username: user?.username,
        id: fileToEdit.id,
        media_name: newFileName,
      };

      await fileManager(payload);
      message.success("File updated successfully!");

      if (onSuccess) {
        onSuccess();
      }

      onClose();
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  const fileExtension = getFileExtension(fileToEdit?.media_name);

  return (
    <Modal
      isModalOpen={isOpen}
      closeModal={onClose}
      width="500px"
      height="auto"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6"
      >
        {/* Header Section */}
        <div
          className="flex items-center gap-3 mb-6 pb-4"
          style={{ borderBottom: "1px solid rgba(37,99,235,0.15)" }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: THEME.gradient,
              boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
            }}
          >
            <EditOutlined style={{ fontSize: 20, color: "white" }} />
          </motion.div>
          <div>
            <Title level={4} style={{ marginBottom: 0, color: "#1f2937" }}>
              Rename File
            </Title>
            <Text className="text-xs text-gray-500">
              Update the name of your file
            </Text>
          </div>
        </div>

        <Space direction="vertical" className="w-full" size="large">
          {/* Current File Name */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl p-4"
            style={{ background: THEME.gradientLight }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(37,99,235,0.15)" }}
              >
                <FileOutlined style={{ color: THEME.primary, fontSize: 18 }} />
              </div>
              <div className="flex-1 min-w-0">
                <Text className="text-xs text-gray-500 block mb-1">
                  Current File Name
                </Text>
                <Text
                  strong
                  className="block truncate"
                  style={{ color: THEME.primaryDark }}
                  title={fileToEdit?.media_name}
                >
                  {fileToEdit?.media_name}
                </Text>
              </div>
            </div>
          </motion.div>

          {/* New File Name Input */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileAddOutlined style={{ color: THEME.primary }} />
              <Text strong style={{ color: "#374151" }}>
                New File Name
              </Text>
            </div>
            <Input
              placeholder="Enter new file name (3-100 characters)"
              value={fileName}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              size="large"
              maxLength={100}
              status={error ? "error" : ""}
              disabled={loading}
              autoFocus
              showCount
              className="file-name-input"
              addonAfter={
                fileExtension && (
                  <Text
                    className="text-xs font-medium"
                    style={{ color: THEME.primaryDark }}
                  >
                    {fileExtension}
                  </Text>
                )
              }
            />
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Text type="danger" className="text-xs block mt-2">
                  {error}
                </Text>
              </motion.div>
            )}
            <Text className="text-xs text-gray-500 block mt-2">
              Note: File extension will be preserved automatically
            </Text>
          </div>

          {/* Validation Indicator */}
          {fileName.trim().length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background:
                      fileName.trim().length >= 3 ? THEME.primary : "#f59e0b",
                  }}
                />
                <span className="text-xs text-gray-600">
                  <strong>{fileName.trim().length}</strong> / 100 characters
                </span>
              </div>
              {fileName.trim().length >= 3 && !error && (
                <div className="flex items-center gap-1">
                  <CheckOutlined
                    style={{ color: THEME.primary, fontSize: 12 }}
                  />
                  <span className="text-xs" style={{ color: THEME.primary }}>
                    Valid name
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* Preview */}
          {fileName.trim().length >= 3 && fileExtension && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-4 text-center"
              style={{
                background: "#f8fafc",
                border: "1px dashed #e5e7eb",
              }}
            >
              <Text className="text-xs text-gray-500 block mb-1">Preview</Text>
              <Text strong style={{ color: "#1f2937", fontSize: 14 }}>
                {fileName.trim()}
                {fileExtension}
              </Text>
            </motion.div>
          )}
        </Space>

        {/* Action Buttons */}
        <div
          className="flex justify-end gap-3 mt-6 pt-4"
          style={{ borderTop: "1px solid rgba(37,99,235,0.1)" }}
        >
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              icon={<CloseOutlined />}
              onClick={onClose}
              size="large"
              disabled={loading}
              className="h-11 px-6 rounded-xl font-medium"
              style={{
                borderColor: "#e5e7eb",
                color: "#6b7280",
              }}
            >
              Cancel
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="primary"
              icon={loading ? <Spin size="small" /> : <SaveOutlined />}
              onClick={handleSubmit}
              disabled={loading || fileName.trim().length < 3}
              size="large"
              className="h-11 px-6 rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
              style={{
                background:
                  loading || fileName.trim().length < 3
                    ? "#9ca3af"
                    : THEME.gradient,
                border: "none",
              }}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{__html: `
        /* Input Styling */
        .file-name-input .ant-input {
          border-radius: 12px 0 0 12px;
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

        .file-name-input .ant-input-status-error {
          border-color: #ef4444 !important;
        }

        .file-name-input .ant-input-status-error:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
        }

        .file-name-input .ant-input-group-addon {
          background: linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%);
          border-color: #e5e7eb;
          border-radius: 0 12px 12px 0;
          padding: 0 16px;
        }

        /* Character Count Styling */
        .file-name-input .ant-input-show-count-suffix {
          color: #9ca3af;
          font-size: 11px;
        }

        /* Input Wrapper */
        .file-name-input .ant-input-wrapper {
          border-radius: 12px;
        }

        .file-name-input .ant-input-group > .ant-input:first-child {
          border-top-left-radius: 12px;
          border-bottom-left-radius: 12px;
        }

        .file-name-input .ant-input-group-addon:last-child {
          border-top-right-radius: 12px;
          border-bottom-right-radius: 12px;
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
      `}} />
    </Modal>
  );
};

FileCreationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  fileToEdit: PropTypes.object,
  user: PropTypes.object,
  onSuccess: PropTypes.func,
};

FileCreationModal.defaultProps = {
  fileToEdit: null,
  onSuccess: () => {},
};

export default FileCreationModal;

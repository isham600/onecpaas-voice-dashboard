import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Input, Button, message, Typography, Spin } from "antd";
import {
  FolderAddOutlined,
  SaveOutlined,
  CloseOutlined,
  EditOutlined,
  FolderOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import Modal from "../Modal";
import { renameFolder } from "../../services/api";
import handleApiError from "../../utils/errorHandler";

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

const FolderCreationModal = ({
  isOpen,
  onClose,
  onCreate,
  folderToEdit,
  openFolderId,
  user,
  existingFolders,
}) => {
  const [folderName, setFolderName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditMode = !!folderToEdit;

  useEffect(() => {
    if (folderToEdit) {
      setFolderName(folderToEdit.name);
    } else {
      setFolderName("");
    }
    setError("");
  }, [folderToEdit, isOpen]);

  const validateFolderName = (name) => {
    const trimmedName = name.trim();

    if (trimmedName.length < 3) {
      return "Folder name must be at least 3 characters long.";
    }

    if (trimmedName.length > 50) {
      return "Folder name cannot exceed 50 characters.";
    }

    const isDuplicate = existingFolders.some(
      (folder) =>
        folder.name.toLowerCase() === trimmedName.toLowerCase() &&
        (!folderToEdit || folder.id !== folderToEdit.id),
    );

    if (isDuplicate) {
      return "Folder name already exists. Please choose another name.";
    }

    return null;
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setFolderName(value);

    if (value.trim().length >= 3) {
      setError("");
    }
  };

  const handleSubmit = async () => {
    const validationError = validateFolderName(folderName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      if (folderToEdit) {
        await renameFolder(openFolderId, folderName.trim());
        message.success("Folder updated successfully!");
        onCreate(folderName.trim(), folderToEdit.id);
      } else {
        onCreate(folderName.trim());
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
            {isEditMode ? (
              <EditOutlined style={{ fontSize: 20, color: "white" }} />
            ) : (
              <FolderAddOutlined style={{ fontSize: 20, color: "white" }} />
            )}
          </motion.div>
          <div>
            <Title level={4} style={{ marginBottom: 0, color: "#1f2937" }}>
              {isEditMode ? "Edit Folder" : "Create New Folder"}
            </Title>
            <Text className="text-xs text-gray-500">
              {isEditMode
                ? "Update your folder name"
                : "Create a new folder to organize your files"}
            </Text>
          </div>
        </div>

        {/* Folder Preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl p-4 mb-5 flex items-center justify-center"
          style={{ background: THEME.gradientLight }}
        >
          <motion.div
            animate={{
              rotate: folderName.length > 0 ? [0, -5, 5, 0] : 0,
            }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            <FolderOutlined
              style={{
                fontSize: 48,
                color: THEME.primary,
                marginBottom: 8,
              }}
            />
            <Text
              strong
              className="text-center truncate max-w-[200px]"
              style={{ color: THEME.primaryDark }}
            >
              {folderName.trim() || "New Folder"}
            </Text>
          </motion.div>
        </motion.div>

        {/* Input Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FolderOutlined style={{ color: THEME.primary }} />
            <Text strong style={{ color: "#374151" }}>
              Folder Name
            </Text>
          </div>
          <Input
            placeholder="Enter folder name (3-50 characters)"
            value={folderName}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            size="large"
            maxLength={50}
            status={error ? "error" : ""}
            disabled={loading}
            autoFocus
            showCount
            className="folder-name-input"
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
        </div>

        {/* Character Count Info */}
        {folderName.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-4 mb-5 p-3 rounded-xl bg-gray-50 border border-gray-100"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    folderName.trim().length >= 3 ? THEME.primary : "#f59e0b",
                }}
              />
              <span className="text-xs text-gray-600">
                <strong>{folderName.trim().length}</strong> / 50 characters
              </span>
            </div>
            {folderName.trim().length >= 3 && (
              <div className="flex items-center gap-1">
                <CheckOutlined style={{ color: THEME.primary, fontSize: 12 }} />
                <span className="text-xs" style={{ color: THEME.primary }}>
                  Valid name
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Action Buttons */}
        <div
          className="flex justify-end gap-3 pt-4"
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
              disabled={loading || folderName.trim().length < 3}
              size="large"
              className="h-11 px-6 rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
              style={{
                background:
                  loading || folderName.trim().length < 3
                    ? "#9ca3af"
                    : THEME.gradient,
                border: "none",
              }}
            >
              {loading
                ? isEditMode
                  ? "Saving..."
                  : "Creating..."
                : isEditMode
                  ? "Save Changes"
                  : "Create Folder"}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{__html: `
        /* Input Styling */
        .folder-name-input .ant-input {
          border-radius: 12px;
          border-color: #e5e7eb;
          padding: 12px 14px;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .folder-name-input .ant-input:hover {
          border-color: #2563EB;
        }

        .folder-name-input .ant-input:focus,
        .folder-name-input .ant-input-focused {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(3, 207, 101, 0.1);
        }

        .folder-name-input .ant-input-status-error {
          border-color: #ef4444 !important;
        }

        .folder-name-input .ant-input-status-error:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
        }

        /* Character Count Styling */
        .folder-name-input .ant-input-show-count-suffix {
          color: #9ca3af;
          font-size: 11px;
        }

        /* Button Disabled State */
        .ant-btn-primary:disabled {
          background: #9ca3af !important;
          border-color: #9ca3af !important;
          color: white !important;
        }

        /* Spin in Button */
        .ant-btn .ant-spin {
          margin-right: 8px;
        }

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

FolderCreationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  folderToEdit: PropTypes.object,
  openFolderId: PropTypes.string,
  user: PropTypes.object,
  existingFolders: PropTypes.array,
};

FolderCreationModal.defaultProps = {
  folderToEdit: null,
  openFolderId: null,
  existingFolders: [],
};

export default FolderCreationModal;

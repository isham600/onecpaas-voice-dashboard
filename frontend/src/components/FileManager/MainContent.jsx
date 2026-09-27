import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Card,
  Empty,
  Progress,
  Typography,
  Dropdown,
  Tag,
  Tooltip,
  Image,
  Space,
  message,
  Modal as AntModal,
} from "antd";
import {
  FileImageOutlined,
  FilePdfOutlined,
  VideoCameraOutlined,
  FileOutlined,
  FolderOutlined,
  FolderAddOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  LinkOutlined,
  MoreOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
  FileZipOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePptOutlined,
  FileTextOutlined,
  SearchOutlined,
  SoundOutlined,
  UploadOutlined,
  CloudUploadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { format } from "date-fns";

import { deleteFile, deleteFolder } from "../../services/api";
import handleApiError from "../../utils/errorHandler";

const { Text, Title } = Typography;

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
};

const MainContent = ({
  view,
  files,
  filesImagefn,
  onFolderClick,
  onFolderEdit,
  onEditFile,
  user,
  handleDeleteFromState,
  fileOutside,
  uploading = false,
  uploadProgress = 0,
  onRefresh,
  onUploadClick,
  onNewFolderClick,
  searchTerm = "",
}) => {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDeleteConfirm = (item, isFolder) => {
    AntModal.confirm({
      title: `Delete this ${isFolder ? "folder" : "file"}?`,
      content: `Are you sure you want to delete "${
        item.name || item.media_name
      }"? This action cannot be undone.`,
      okText: "Yes, Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          if (!isFolder) {
            await deleteFile(item.id);
            message.success("File deleted successfully!");
            handleDeleteFromState(item.id, true);
          } else {
            await deleteFolder(item.id);
            message.success("Folder deleted successfully!");
            handleDeleteFromState(item.id, false);
          }

          if (onRefresh) {
            onRefresh();
          }
        } catch (error) {
          handleApiError(error);
        }
      },
    });
  };

  const getFileIcon = (mediaType, size = "4xl") => {
    if (!mediaType)
      return <FileOutlined className={`text-${size} text-gray-400`} />;

    const type = mediaType.toLowerCase();

    if (type.startsWith("image/"))
      return (
        <FileImageOutlined
          className={`text-${size}`}
          style={{ color: "#06b6d4" }}
        />
      );

    if (type === "application/pdf")
      return (
        <FilePdfOutlined
          className={`text-${size}`}
          style={{ color: "#ef4444" }}
        />
      );

    if (type.startsWith("video/"))
      return (
        <VideoCameraOutlined
          className={`text-${size}`}
          style={{ color: "#8b5cf6" }}
        />
      );

    if (type.startsWith("audio/"))
      return (
        <SoundOutlined
          className={`text-${size}`}
          style={{ color: THEME.primary }}
        />
      );

    if (
      type.includes("zip") ||
      type.includes("rar") ||
      type.includes("7z") ||
      type.includes("tar")
    )
      return (
        <FileZipOutlined
          className={`text-${size}`}
          style={{ color: "#f59e0b" }}
        />
      );

    if (
      type.includes("excel") ||
      type.includes("spreadsheet") ||
      type.includes("xlsx") ||
      type.includes("xls")
    )
      return (
        <FileExcelOutlined
          className={`text-${size}`}
          style={{ color: THEME.primaryDark }}
        />
      );

    if (
      type.includes("word") ||
      type.includes("document") ||
      type.includes("docx") ||
      type.includes("doc")
    )
      return (
        <FileWordOutlined
          className={`text-${size}`}
          style={{ color: "#3b82f6" }}
        />
      );

    if (
      type.includes("powerpoint") ||
      type.includes("presentation") ||
      type.includes("pptx") ||
      type.includes("ppt")
    )
      return (
        <FilePptOutlined
          className={`text-${size}`}
          style={{ color: "#f97316" }}
        />
      );

    if (type.includes("text") || type.includes("plain"))
      return (
        <FileTextOutlined
          className={`text-${size}`}
          style={{ color: "#6b7280" }}
        />
      );

    return <FileOutlined className={`text-${size} text-gray-400`} />;
  };

  const getFileTypeTag = (mediaType) => {
    if (!mediaType) return null;

    const type = mediaType.split("/")[1]?.toUpperCase() || "FILE";
    const colors = {
      PNG: "cyan",
      JPG: "cyan",
      JPEG: "cyan",
      GIF: "cyan",
      WEBP: "cyan",
      PDF: "red",
      MP4: "purple",
      WEBM: "purple",
      AVI: "purple",
      MP3: "green",
      WAV: "green",
      OGG: "green",
      ZIP: "orange",
      RAR: "orange",
      XLSX: "green",
      XLS: "green",
      DOCX: "blue",
      DOC: "blue",
      PPTX: "orange",
      PPT: "orange",
    };

    return (
      <Tag
        color={colors[type] || "default"}
        style={{ borderRadius: 6, fontSize: 10, fontWeight: 600 }}
      >
        {type}
      </Tag>
    );
  };

  const handleCopyLink = async (item) => {
    try {
      await navigator.clipboard.writeText(item.media);
      message.success("Link copied to clipboard");
    } catch {
      message.error("Failed to copy link");
    }
  };

  const handleDownload = async (item) => {
    try {
      const response = await fetch(item.media);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: item.media_name || "download",
      });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(item.media, "_blank");
    }
  };

  const getDropdownItems = (item, isFolder = false) => {
    const items = [
      {
        key: "view",
        label: "View",
        icon: <EyeOutlined style={{ color: THEME.primary }} />,
        onClick: (e) => {
          if (e && e.domEvent) {
            e.domEvent.stopPropagation();
          }
          if (isFolder) {
            onFolderClick(item);
          } else {
            window.open(item.media, "_blank");
          }
          setMenuOpenId(null);
        },
      },
      ...(!isFolder
        ? [
            {
              key: "copy-link",
              label: "Copy Link",
              icon: <LinkOutlined style={{ color: "#06b6d4" }} />,
              onClick: (e) => {
                if (e && e.domEvent) {
                  e.domEvent.stopPropagation();
                }
                handleCopyLink(item);
                setMenuOpenId(null);
              },
            },
            {
              key: "download",
              label: "Download",
              icon: <DownloadOutlined style={{ color: "#8b5cf6" }} />,
              onClick: (e) => {
                if (e && e.domEvent) {
                  e.domEvent.stopPropagation();
                }
                handleDownload(item);
                setMenuOpenId(null);
              },
            },
          ]
        : []),
      {
        key: "rename",
        label: "Rename",
        icon: <EditOutlined style={{ color: "#3b82f6" }} />,
        onClick: (e) => {
          if (e && e.domEvent) {
            e.domEvent.stopPropagation();
          }
          if (isFolder) {
            onFolderEdit(item.id);
          } else {
            onEditFile(item);
          }
          setMenuOpenId(null);
        },
      },
      {
        type: "divider",
      },
      {
        key: "delete",
        label: "Delete",
        icon: <DeleteOutlined />,
        danger: true,
        onClick: (e) => {
          if (e && e.domEvent) {
            e.domEvent.stopPropagation();
          }
          showDeleteConfirm(item, isFolder);
          setMenuOpenId(null);
        },
      },
    ];

    return items;
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return "—";
    const d = new Date(dateTime);
    if (isNaN(d.getTime())) return "—";
    try {
      return format(d, "MMM dd, yyyy • hh:mm a");
    } catch {
      return "—";
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  // Grid View Component
  const GridView = ({ items, type = "folder" }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03, duration: 0.3 }}
          whileHover={{ y: -4, scale: 1.02 }}
        >
          <Card
            hoverable
            className="group relative overflow-hidden transition-all duration-200"
            style={{
              borderRadius: 16,
              border: "1px solid #f1f5f9",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
            styles={{ body: { padding: 16 } }}
            onClick={() => {
              if (type === "folder") {
                onFolderClick(item);
              } else if (item.media_type?.startsWith("image/")) {
                // Let Image component handle preview
              } else {
                window.open(item.media, "_blank");
              }
            }}
          >
            {/* Actions Menu */}
            <div className="absolute top-2 right-2 opacity-60 group-hover:opacity-100 transition-opacity z-10">
              <Dropdown
                menu={{ items: getDropdownItems(item, type === "folder") }}
                trigger={["click"]}
                placement="bottomRight"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white rounded-full p-1.5 shadow-md cursor-pointer"
                  style={{ border: "1px solid #e5e7eb" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreOutlined className="text-gray-600 text-lg" />
                </motion.div>
              </Dropdown>
            </div>

            <div className="flex flex-col items-center">
              {/* Icon/Preview */}
              <div
                className="w-full h-32 flex items-center justify-center mb-3 rounded-xl overflow-hidden"
                style={{
                  background:
                    type === "folder" ? "rgba(37,99,235,0.08)" : "#f8fafc",
                }}
              >
                {type === "folder" ? (
                  <FolderOutlined
                    style={{ fontSize: 56, color: THEME.primary }}
                  />
                ) : item.media_type?.startsWith("image/") ? (
                  <div
                    className="w-full h-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Image
                      src={item.media}
                      alt={item.media_name}
                      className="w-full h-full object-cover"
                      preview={{
                        mask: (
                          <div className="flex flex-col items-center">
                            <EyeOutlined className="text-2xl mb-1" />
                            <span className="text-xs">Preview</span>
                          </div>
                        ),
                      }}
                    />
                  </div>
                ) : item.media_type?.startsWith("video/") ? (
                  <div className="relative w-full h-full">
                    <video
                      src={item.media}
                      className="w-full h-full object-cover"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.9)" }}
                      >
                        <span style={{ color: "#8b5cf6", fontSize: 20 }}>
                          ▶
                        </span>
                      </div>
                    </div>
                  </div>
                ) : item.media_type === "application/pdf" ? (
                  <div className="relative w-full h-full bg-white p-2">
                    <object
                      data={item.media}
                      type="application/pdf"
                      className="w-full h-full pointer-events-none scale-110"
                    >
                      <FilePdfOutlined
                        style={{ fontSize: 56, color: "#ef4444" }}
                      />
                    </object>
                  </div>
                ) : (
                  getFileIcon(item.media_type, "6xl")
                )}
              </div>

              {/* Name */}
              <Tooltip title={item.name || item.media_name}>
                <Text
                  strong
                  className="text-center w-full truncate block mb-1"
                  style={{ color: "#1f2937" }}
                >
                  {item.name || item.media_name}
                </Text>
              </Tooltip>

              {/* Type Tag */}
              {type === "file" && (
                <div className="mb-2">{getFileTypeTag(item.media_type)}</div>
              )}

              {/* Folder meta */}
              {type === "folder" && (
                <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                  <span>{item.file_count ?? 0} file{item.file_count !== 1 ? "s" : ""}</span>
                  {item.size_label && item.size_label !== "—" && (
                    <>
                      <span>·</span>
                      <span>{item.size_label}</span>
                    </>
                  )}
                </div>
              )}

              {/* File size */}
              {type === "file" && item.file_size > 0 && (
                <div className="text-xs text-gray-400 mb-1">{formatFileSize(item.file_size)}</div>
              )}

              {/* Date */}
              <div className="flex items-center text-xs text-gray-500">
                <ClockCircleOutlined
                  className="mr-1"
                  style={{ color: THEME.primary }}
                />
                <Text type="secondary" className="text-xs">
                  {(() => {
                    const d = new Date(item.created_at || item.createdAt);
                    return !isNaN(d.getTime()) ? format(d, "MMM dd, yyyy") : "—";
                  })()}
                </Text>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );

  // List View Component
  const ListView = ({ items, type = "folder" }) => (
    <div className="space-y-2">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.03, duration: 0.3 }}
        >
          <Card
            hoverable
            className="group transition-all duration-200"
            style={{
              borderRadius: 12,
              border: "1px solid #f1f5f9",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            }}
            styles={{ body: { padding: "12px 16px" } }}
            onClick={() => {
              if (type === "folder") {
                onFolderClick(item);
              } else {
                window.open(item.media, "_blank");
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Icon/Thumbnail */}
                <div className="flex-shrink-0">
                  {type === "folder" ? (
                    <motion.div
                      whileHover={{ scale: 1.05, rotate: 3 }}
                      className="w-12 h-12 flex items-center justify-center rounded-xl"
                      style={{ background: "rgba(37,99,235,0.1)" }}
                    >
                      <FolderOutlined
                        style={{ fontSize: 24, color: THEME.primary }}
                      />
                    </motion.div>
                  ) : item.media_type?.startsWith("image/") ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100">
                      <img
                        src={item.media}
                        alt={item.media_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-12 h-12 flex items-center justify-center rounded-xl"
                      style={{ background: "#f8fafc" }}
                    >
                      {getFileIcon(item.media_type, "2xl")}
                    </div>
                  )}
                </div>

                {/* Name and Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Text
                      strong
                      className="truncate"
                      style={{ color: "#1f2937" }}
                    >
                      {item.name || item.media_name}
                    </Text>
                    {type === "file" && getFileTypeTag(item.media_type)}
                  </div>
                  <Space size="small" className="text-xs text-gray-500">
                    <ClockCircleOutlined style={{ color: THEME.primary }} />
                    <Text type="secondary" className="text-xs">
                      {formatDateTime(item.created_at || item.createdAt)}
                    </Text>
                    {type === "file" && item.file_size > 0 && (
                      <>
                        <span>•</span>
                        <Text type="secondary" className="text-xs">
                          {formatFileSize(item.file_size)}
                        </Text>
                      </>
                    )}
                    {type === "folder" && (
                      <>
                        <span>•</span>
                        <Text type="secondary" className="text-xs">
                          {item.file_count ?? 0} file{item.file_count !== 1 ? "s" : ""}
                        </Text>
                        {item.size_label && item.size_label !== "—" && (
                          <>
                            <span>•</span>
                            <Text type="secondary" className="text-xs">{item.size_label}</Text>
                          </>
                        )}
                      </>
                    )}
                  </Space>
                </div>
              </div>

              {/* Actions */}
              <Dropdown
                menu={{ items: getDropdownItems(item, type === "folder") }}
                trigger={["click"]}
                placement="bottomRight"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="opacity-60 group-hover:opacity-100 transition-opacity p-2 rounded-lg cursor-pointer"
                  style={{ background: "rgba(37,99,235,0.1)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreOutlined style={{ color: THEME.primaryDark }} />
                </motion.div>
              </Dropdown>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );

  // Empty State
  const EmptyState = () =>
    searchTerm ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: "#f3f4f6" }}
        >
          <SearchOutlined style={{ fontSize: 48, color: "#9ca3af" }} />
        </motion.div>
        <Title level={4} style={{ color: "#374151", marginBottom: 8 }}>
          No results found
        </Title>
        <Text type="secondary" className="text-center max-w-xs">
          Nothing matches &ldquo;{searchTerm}&rdquo;. Try a different search or
          clear the filters.
        </Text>
      </motion.div>
    ) : (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: THEME.gradientLight }}
        >
          <CloudUploadOutlined style={{ fontSize: 48, color: THEME.primary }} />
        </motion.div>
        <Title level={4} style={{ color: "#374151", marginBottom: 8 }}>
          No Files or Folders
        </Title>
        <Text type="secondary" className="text-center max-w-xs mb-6">
          Upload files or create folders to get started with your file
          management
        </Text>
        <Space>
          {onUploadClick && (
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={onUploadClick}
              style={{ background: THEME.gradient, border: "none" }}
            >
              Upload File
            </Button>
          )}
          {onNewFolderClick && (
            <Button icon={<FolderAddOutlined />} onClick={onNewFolderClick}>
              New Folder
            </Button>
          )}
        </Space>
        <Text type="secondary" className="text-xs mt-4" style={{ fontSize: 12 }}>
          Tip: you can also drag &amp; drop files anywhere on this page
        </Text>
      </motion.div>
    );

  // Upload Progress
  const UploadProgress = () => (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <Card
        className="w-80"
        style={{
          borderRadius: 16,
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
          border: `1px solid #2563EB30`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <Space>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <UploadOutlined style={{ color: THEME.primary, fontSize: 18 }} />
            </motion.div>
            <Text strong style={{ color: "#1f2937" }}>
              Uploading File...
            </Text>
          </Space>
          <Text strong style={{ color: THEME.primary }}>
            {uploadProgress}%
          </Text>
        </div>
        <Progress
          percent={uploadProgress}
          status="active"
          strokeColor={{
            "0%": THEME.primary,
            "100%": THEME.primaryDark,
          }}
          trailColor="rgba(37,99,235,0.1)"
          showInfo={false}
          strokeWidth={8}
          style={{ marginBottom: 0 }}
        />
      </Card>
    </motion.div>
  );

  const ViewComponent = view === "grid" ? GridView : ListView;

  const hasContent =
    files.length > 0 ||
    fileOutside.filter((f) => f.folder === null).length > 0 ||
    filesImagefn.length > 0;

  return (
    <div className="min-h-96">
      {uploading && <UploadProgress />}

      {!hasContent ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {/* Folders Section */}
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                className="flex items-center gap-2 mb-4 pb-3"
                style={{ borderBottom: "2px solid rgba(37,99,235,0.2)" }}
              >
                <motion.div
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(37,99,235,0.1)" }}
                >
                  <FolderOpenOutlined
                    style={{ fontSize: 18, color: THEME.primary }}
                  />
                </motion.div>
                <Title level={5} style={{ margin: 0, color: "#1f2937" }}>
                  Folders
                </Title>
                <Tag
                  style={{
                    background: "rgba(37,99,235,0.1)",
                    border: "none",
                    color: THEME.primaryDark,
                    fontWeight: 600,
                    borderRadius: 8,
                  }}
                >
                  {files.length}
                </Tag>
              </div>
              <ViewComponent items={files} type="folder" />
            </motion.div>
          )}

          {/* Files in Current Folder */}
          {filesImagefn.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div
                className="flex items-center gap-2 mb-4 pb-3"
                style={{ borderBottom: "2px solid rgba(6,182,212,0.2)" }}
              >
                <motion.div
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(6,182,212,0.1)" }}
                >
                  <FileOutlined style={{ fontSize: 18, color: "#06b6d4" }} />
                </motion.div>
                <Title level={5} style={{ margin: 0, color: "#1f2937" }}>
                  Files in Folder
                </Title>
                <Tag
                  style={{
                    background: "rgba(6,182,212,0.1)",
                    border: "none",
                    color: "#0891b2",
                    fontWeight: 600,
                    borderRadius: 8,
                  }}
                >
                  {filesImagefn.length}
                </Tag>
              </div>
              <ViewComponent items={filesImagefn} type="file" />
            </motion.div>
          )}

          {/* Files Outside Folders */}
          {fileOutside.filter((f) => f.folder === null).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div
                className="flex items-center gap-2 mb-4 pb-3"
                style={{ borderBottom: "2px solid rgba(245,158,11,0.2)" }}
              >
                <motion.div
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.1)" }}
                >
                  <FileOutlined style={{ fontSize: 18, color: "#f59e0b" }} />
                </motion.div>
                <Title level={5} style={{ margin: 0, color: "#1f2937" }}>
                  Files
                </Title>
                <Tag
                  style={{
                    background: "rgba(245,158,11,0.1)",
                    border: "none",
                    color: "#d97706",
                    fontWeight: 600,
                    borderRadius: 8,
                  }}
                >
                  {fileOutside.filter((f) => f.folder === null).length}
                </Tag>
              </div>
              <ViewComponent
                items={fileOutside.filter((f) => f.folder === null)}
                type="file"
              />
            </motion.div>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        /* Card Hover Effects */
        .ant-card-hoverable:hover {
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.12) !important;
          border-color: rgba(37, 99, 235, 0.3) !important;
        }

        /* Progress Bar */
        .ant-progress-inner {
          border-radius: 8px !important;
        }

        .ant-progress-bg {
          border-radius: 8px !important;
        }

        /* Dropdown Menu */
        .ant-dropdown-menu {
          border-radius: 12px !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12) !important;
          padding: 8px !important;
        }

        .ant-dropdown-menu-item {
          border-radius: 8px !important;
          padding: 8px 12px !important;
        }

        .ant-dropdown-menu-item:hover {
          background: rgba(37, 99, 235, 0.08) !important;
        }

        .ant-dropdown-menu-item-danger:hover {
          background: rgba(239, 68, 68, 0.08) !important;
        }

        /* Image Preview */
        .ant-image-preview-operations {
          background: rgba(0, 0, 0, 0.6);
          border-radius: 12px;
        }

        /* Modal Styling */
        .ant-modal-confirm .ant-modal-content {
          border-radius: 16px;
        }

        .ant-modal-confirm-btns .ant-btn-primary:not(.ant-btn-dangerous) {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          border: none;
        }

        .ant-modal-confirm-btns .ant-btn-primary:not(.ant-btn-dangerous):hover {
          background: #1D4ED8;
        }

        /* Tag Styling */
        .ant-tag {
          border-radius: 6px;
        }

        /* Spin Color */
        .ant-spin-dot-item {
          background-color: #2563EB !important;
        }
      `}} />
    </div>
  );
};

MainContent.propTypes = {
  view: PropTypes.oneOf(["grid", "list"]).isRequired,
  files: PropTypes.array.isRequired,
  filesImagefn: PropTypes.array.isRequired,
  onFolderClick: PropTypes.func.isRequired,
  onDeleteFile: PropTypes.func.isRequired,
  onFolderEdit: PropTypes.func.isRequired,
  onEditFile: PropTypes.func.isRequired,
  user: PropTypes.object.isRequired,
  handleDeleteFromState: PropTypes.func.isRequired,
  fileOutside: PropTypes.array.isRequired,
  uploading: PropTypes.bool,
  uploadProgress: PropTypes.number,
  onRefresh: PropTypes.func,
  onUploadClick: PropTypes.func,
  onNewFolderClick: PropTypes.func,
  searchTerm: PropTypes.string,
};

export default MainContent;

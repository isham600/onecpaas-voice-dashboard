import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  Button,
  Input,
  Select,
  Spin,
  message,
  Tooltip,
  Pagination,
  Row,
  Col,
  Progress,
} from "antd";
import {
  ArrowLeftOutlined,
  SearchOutlined,
  FolderAddOutlined,
  UploadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  HomeOutlined,
  FolderOutlined,
  ReloadOutlined,
  CloudUploadOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  SoundOutlined,
  DatabaseOutlined,
  FolderFilled,
  FileOutlined,
  HddOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import ReactApexChart from "react-apexcharts";

import MainContent from "../../components/FileManager/MainContent.jsx";
import FolderCreationModal from "../../components/FileManager/FolderCreationModal.jsx";
import FileUploadModal from "../../components/FileManager/FileUploadModal.jsx";
import FileCreationModal from "../../components/FileManager/FileCreationModal.jsx";
import {
  listFolders,
  listFiles,
  uploadFile,
  createFolder as createFolderApi,
  deleteFolder,
  getStorageOverview,
} from "../../services/api.js";
import handleApiError from "../../utils/errorHandler.js";

const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
};

const TYPE_COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#10b981", "#06b6d4"];
const bytesToMB = (b) => +(b / 1024 / 1024).toFixed(2);

const FileManager = ({ user, setUser }) => {
  const navigate = useNavigate();

  // State management
  const [files, setFiles] = useState([]);
  const filesRef = useRef([]);
  const [filesImage, setFilesImage] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [view, setView] = useState("grid");
  const [isFolderModalOpen, setFolderModalOpen] = useState(false);
  const [editFileModal, setEditFileModal] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState(null);
  const [fileEdit, setFileToEdit] = useState(null);
  const [isFileUploadModalOpen, setFileUploadModalOpen] = useState(false);
  const [openFolderId, setOpenFolderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [fileOutside, setFileOutside] = useState([]);
  const [fileOutsides, setFileOutsides] = useState([]);
  const [sortOrder, setSortOrder] = useState("newest");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [storage, setStorage] = useState(null);
  const [storageLoading, setStorageLoading] = useState(true);
  const [filesPage, setFilesPage] = useState(1);
  const [filesPageSize, setFilesPageSize] = useState(20);
  const [filesMeta, setFilesMeta] = useState({ total: 0, totalPages: 1 });
  const [folderFilesMeta, setFolderFilesMeta] = useState({ total: 0, totalPages: 1 });
  const [folderFilesPage, setFolderFilesPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Type filter predicate for files
  const matchesType = useCallback(
    (file) => {
      if (typeFilter === "all") return true;
      const t = (file.media_type || "").toLowerCase();
      if (typeFilter === "image") return t.startsWith("image/");
      if (typeFilter === "video") return t.startsWith("video/");
      if (typeFilter === "audio") return t.startsWith("audio/");
      if (typeFilter === "document")
        return (
          !t.startsWith("image/") &&
          !t.startsWith("video/") &&
          !t.startsWith("audio/")
        );
      return true;
    },
    [typeFilter],
  );

  // Filtered files based on search
  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    return files.filter((file) =>
      Object.values(file).some(
        (value) =>
          value &&
          value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }, [files, searchTerm]);

  // Filtered images based on search + type
  const filteredImages = useMemo(() => {
    let result = filesImage.filter(matchesType);
    if (searchTerm) {
      result = result.filter((image) =>
        Object.values(image).some(
          (value) =>
            value &&
            value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    }
    return result;
  }, [searchTerm, filesImage, matchesType]);

  // Filtered outside files based on search + type
  const filteredOutsideFiles = useMemo(() => {
    let result = fileOutside.filter(matchesType);
    if (searchTerm) {
      result = result.filter((file) =>
        Object.values(file).some(
          (value) =>
            value &&
            value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    }
    return result;
  }, [searchTerm, fileOutside, matchesType]);

  // Load folders
  const loadFolders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listFolders();
      const transformedFiles = (response.data.data || []).map((item) => ({
        id: item.id,
        type: "folder",
        contents: [],
        createdAt: item.created_at,
        name: item.folder_name,
        file_count: item.file_count ?? 0,
        size_label: item.size_label ?? "—",
        size_bytes: item.size_bytes ?? 0,
      }));

      const sortedFiles =
        sortOrder === "newest"
          ? transformedFiles.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
            )
          : transformedFiles.sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
            );

      filesRef.current = sortedFiles;
      setFiles(sortedFiles);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [user?.username, sortOrder]);

  // Load files (outside folders or inside a specific folder)
  const loadFilesOutside = useCallback(async (page, limit) => {
    try {
      if (openFolderId) {
        const folderName =
          filesRef.current.find((f) => f.id === openFolderId)?.name ??
          currentPath[currentPath.length - 1];
        const response = await listFiles({
          folder: folderName,
          page: page ?? folderFilesPage,
          limit: limit ?? filesPageSize,
        });
        const res = response.data;
        const images = res.data || [];
        setFilesImage(
          sortOrder === "newest"
            ? [...images].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            : [...images].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
        );
        if (res.meta) setFolderFilesMeta({ total: res.meta.total || 0, totalPages: res.meta.totalPages || 1 });
      } else {
        const response = await listFiles({ page: page ?? filesPage, limit: limit ?? filesPageSize });
        const res = response.data;
        const outSideImage = res.data || [];
        const sortedFiles =
          sortOrder === "newest"
            ? [...outSideImage].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            : [...outSideImage].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        setFileOutside(sortedFiles);
        setFileOutsides(sortedFiles);
        if (res.meta) setFilesMeta({ total: res.meta.total || 0, totalPages: res.meta.totalPages || 1 });
      }
    } catch (error) {
      handleApiError(error);
    }
  }, [user?.username, openFolderId, sortOrder, currentPath, filesPage, filesPageSize, folderFilesPage]);

  const loadStorage = useCallback(async () => {
    setStorageLoading(true);
    try {
      const res = await getStorageOverview();
      if (res?.data?.success) setStorage(res.data.data);
    } catch (err) {
      handleApiError(err);
    } finally {
      setStorageLoading(false);
    }
  }, []);

  // Storage: only on mount + explicit refresh
  useEffect(() => {
    loadStorage();
  }, [refreshTrigger, loadStorage]);

  // Folders: on mount, sort change, or refresh
  useEffect(() => {
    if (user?.username) loadFolders();
  }, [refreshTrigger, sortOrder, loadFolders]);

  // Files: on mount, pagination, sort change, folder change, or refresh
  useEffect(() => {
    if (user?.username) loadFilesOutside();
  }, [refreshTrigger, sortOrder, filesPage, filesPageSize, folderFilesPage, openFolderId, loadFilesOutside]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    message.success("Files refreshed successfully");
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleNewFolder = () => {
    setFolderToEdit(null);
    setFolderModalOpen(true);
  };

  const handleUploadClick = () => {
    setFileUploadModalOpen(true);
  };

  const handleToggleView = (viewType) => {
    setView(viewType);
  };

  const handleCreateFolder = async (folderName, folderId = null) => {
    if (folderId) {
      // rename handled in FolderCreationModal directly via renameFolder
      handleRefresh();
    } else {
      try {
        await createFolderApi(folderName);
        message.success("Folder created successfully!");
        handleRefresh();
      } catch (error) {
        handleApiError(error);
      }
    }
    setFolderModalOpen(false);
  };

  const handleUploadFile = async (file) => {
    const simulateProgress = () => {
      let simulatedProgress = 0;
      const interval = setInterval(() => {
        simulatedProgress += 10;
        setUploadProgress(simulatedProgress);
        if (simulatedProgress >= 90) clearInterval(interval);
      }, 300);
    };

    setUploading(true);
    simulateProgress();

    // Resolve folder name from openFolderId
    const folderName = openFolderId
      ? (files.find((f) => f.id === openFolderId)?.name ??
        currentPath[currentPath.length - 1])
      : undefined;

    try {
      await uploadFile(file.file, file.name, folderName);
      setUploadProgress(100);
      message.success("File uploaded successfully!");
      handleRefresh();
    } catch (error) {
      handleApiError(error);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
    setFileUploadModalOpen(false);
  };

  // Drag & drop upload anywhere on the page
  const handleDragEnter = (e) => {
    e.preventDefault();
    if (e.dataTransfer?.types?.includes("Files")) {
      dragCounter.current += 1;
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);

    const dropped = Array.from(e.dataTransfer?.files || []);
    if (!dropped.length) return;

    const folderName = openFolderId
      ? (files.find((f) => f.id === openFolderId)?.name ??
        currentPath[currentPath.length - 1])
      : undefined;

    setUploading(true);
    setUploadProgress(0);
    let done = 0;
    for (const file of dropped) {
      try {
        await uploadFile(file, file.name, folderName);
        done += 1;
        setUploadProgress(Math.round((done / dropped.length) * 100));
      } catch (error) {
        handleApiError(error);
      }
    }
    if (done > 0) {
      message.success(
        `${done} file${done > 1 ? "s" : ""} uploaded successfully!`,
      );
      handleRefresh();
    }
    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);
    }, 500);
  };

  const handleDeleteFromState = (id, isFile = true) => {
    if (isFile) {
      setFileOutside((prevFiles) => prevFiles.filter((file) => file.id !== id));
      setFileOutsides((prevFiles) =>
        prevFiles.filter((file) => file.id !== id),
      );
    } else {
      setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
    }
  };

  const handleFolderEdit = (id) => {
    setOpenFolderId(id);
    const fileToEdit = getCurrentFolderContents().find(
      (file) => file.id === id,
    );
    if (fileToEdit && fileToEdit.type === "folder") {
      setFolderToEdit(fileToEdit);
      setFolderModalOpen(true);
    }
  };

  const handleEditFile = async (file) => {
    const fileEdit = fileOutside.find((f) => f.id === file.id);
    if (fileEdit && fileEdit.folder === null) {
      setFileToEdit(fileEdit);
      setEditFileModal(true);
    }
  };

  const handleDeleteFile = (id) => {
    const updatedContents = getCurrentFolderContents().filter(
      (file) => file.id !== id,
    );
    updateCurrentFolderContents(updatedContents);
    handleRefresh();
  };

  const handleFolderClick = async (folder) => {
    setOpenFolderId(folder.id);
    try {
      const response = await listFiles({
        folder: folder.name,
        page: 1,
        limit: 100,
      });
      setFilesImage(response.data.data || []);
      setFileOutside([]);
      setCurrentPath((prevPath) => [...prevPath, folder.name]);
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleBreadcrumbClick = (index) => {
    setCurrentPath((currentPath) => currentPath.slice(0, index));
    setOpenFolderId(null);
    setFileOutside(fileOutsides);
    setFilesImage([]);
  };

  const getCurrentFolderContents = () => {
    if (!Array.isArray(filteredFiles)) return [];
    return currentPath.reduce((acc, folderName) => {
      if (!Array.isArray(acc)) return [];
      const folder = acc.find(
        (item) => item.type === "folder" && item.name === folderName,
      );
      return folder ? folder.contents : acc;
    }, filteredFiles);
  };

  const updateCurrentFolderContents = (newContents) => {
    const updatedFiles = [...filteredFiles];
    let folder = updatedFiles;
    currentPath.forEach((folderName) => {
      const foundFolder = folder.find(
        (item) => item.type === "folder" && item.name === folderName,
      );
      if (foundFolder) {
        folder = foundFolder.contents;
      }
    });
    folder.length = 0;
    folder.push(...newContents);
    setFiles(updatedFiles);
  };

  // ── Chart configs ─────────────────────────────────────────────────────────────
  const pct = storage?.storage?.usage_percent || 0;
  const isWarning = pct > 80;

  const gaugeOptions = {
    chart: { type: "radialBar", toolbar: { show: false }, animations: { enabled: true, speed: 900 } },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: { size: "60%", background: "transparent" },
        track: { background: "#f3f4f6", strokeWidth: "100%", margin: 0 },
        dataLabels: {
          show: true,
          name: { show: false },
          value: {
            offsetY: -4,
            fontSize: "30px",
            fontWeight: "700",
            color: "#1f2937",
            formatter: (val) => `${val}%`,
          },
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "horizontal",
        shadeIntensity: 0.4,
        gradientToColors: ["#7c3aed"],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100],
      },
    },
    colors: ["#a855f7"],
    stroke: { lineCap: "round" },
    labels: [""],
  };

  const TYPE_LIST_CFG = {
    image:     { label: "Images",    color: "#16a34a", bg: "#dcfce7", icon: <PictureOutlined />    },
    video:     { label: "Media",     color: "#dc2626", bg: "#fee2e2", icon: <VideoCameraOutlined /> },
    audio:     { label: "Audio",     color: "#ea580c", bg: "#ffedd5", icon: <SoundOutlined />       },
    document:  { label: "Documents", color: "#d97706", bg: "#fef3c7", icon: <FileTextOutlined />    },
    documents: { label: "Documents", color: "#d97706", bg: "#fef3c7", icon: <FileTextOutlined />    },
  };

  const folderBarCategories = storage?.by_folder?.map((f) =>
    f.folder === "(no folder)" ? "Root" : f.folder
  ) || [];
  const folderBarSeries = [{
    name: "Storage (MB)",
    data: storage?.by_folder?.map((f) => bytesToMB(f.size_bytes)) || [],
  }];
  const folderBarOptions = {
    chart: { type: "bar", toolbar: { show: false }, animations: { enabled: true, speed: 800 } },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, distributed: true, barHeight: "60%" } },
    dataLabels: {
      enabled: true,
      formatter: (val) => val < 1 ? `${(val * 1024).toFixed(0)} KB` : `${val} MB`,
      style: { fontSize: "10px", colors: ["#fff"], fontWeight: 600 },
    },
    xaxis: { categories: folderBarCategories, labels: { formatter: (val) => `${val}`, style: { fontSize: "11px" } } },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    tooltip: {
      y: {
        formatter: (val, { dataPointIndex }) => {
          const f = storage?.by_folder?.[dataPointIndex];
          return `${f?.size_label || ""} · ${f?.count || 0} files`;
        },
      },
    },
    colors: TYPE_COLORS,
    legend: { show: false },
    grid: { borderColor: "#f5f5f5", padding: { top: -8, bottom: -4 } },
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "#F8F9FB" }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── DRAG & DROP OVERLAY ── */}
      {isDragging && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{
            background: "rgba(37,99,235,0.08)",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            className="bg-white rounded-2xl px-12 py-10 flex flex-col items-center gap-3"
            style={{
              border: `2px dashed ${THEME.primary}`,
              boxShadow: "0 20px 60px rgba(37,99,235,0.2)",
            }}
          >
            <CloudUploadOutlined
              style={{ fontSize: 48, color: THEME.primary }}
            />
            <span className="text-lg font-semibold text-gray-800">
              Drop files to upload
            </span>
            <span className="text-xs text-gray-400">
              {currentPath.length > 0
                ? `Files will be uploaded to "${currentPath[currentPath.length - 1]}"`
                : "Files will be uploaded to Home"}
            </span>
          </div>
        </div>
      )}

      {/* ── STICKY HEADER ── */}
      <div className="sticky top-0 z-40 pb-4" style={{ background: "#F8F9FB" }}>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="rounded-2xl border border-gray-100 px-6 py-5 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: THEME.gradientLight, boxShadow: "0 1px 8px rgba(37,99,235,0.06)" }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                className="h-9 w-9 rounded-lg border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center flex-shrink-0"
              />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: THEME.gradient, boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}
              >
                <HddOutlined style={{ color: "#fff", fontSize: 20 }} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight truncate">File Hosting</h1>
                <p className="text-xs text-gray-400 mt-0.5">Storage analytics and file management</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {currentPath.length === 0 && (
                <Button icon={<FolderAddOutlined />} onClick={handleNewFolder} className="h-9 rounded-lg border-gray-200 text-gray-600 hover:text-indigo-600">
                  New Folder
                </Button>
              )}
              <Button icon={<UploadOutlined />} onClick={handleUploadClick} className="h-9 rounded-lg border-gray-200 text-gray-600 hover:text-indigo-600">
                Upload File
              </Button>
              <Button icon={<ReloadOutlined spin={isRefreshing} />} onClick={handleRefresh} className="h-9 rounded-lg border-gray-200 text-gray-600 hover:text-indigo-600">
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-4 pb-4 space-y-3">

        {/* ── COMPACT BENTO STATS STRIP ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div
            className="bg-white rounded-xl border border-gray-100 flex flex-wrap divide-x divide-gray-100"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            {/* Files */}
            <div className="flex items-center gap-3 px-5 py-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(37,99,235,0.08)" }}>
                <FileOutlined style={{ color: THEME.primary, fontSize: 14 }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium">Files</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">
                  {storageLoading ? "—" : (storage?.total_files?.toLocaleString() || "0")}
                </p>
              </div>
            </div>

            {/* Storage Used + progress */}
            <div className="flex items-center gap-3 px-5 py-3 min-w-0 flex-[2]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isWarning ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)" }}>
                <DatabaseOutlined style={{ color: isWarning ? "#ef4444" : "#10b981", fontSize: 14 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-medium">Storage</p>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-lg font-bold leading-tight" style={{ color: isWarning ? "#ef4444" : "#10b981" }}>
                    {storageLoading ? "—" : (storage?.storage?.used_label || "0")}
                  </span>
                  {!storageLoading && storage && (
                    <span className="text-xs text-gray-400">of {storage.storage.limit_label}</span>
                  )}
                </div>
                {!storageLoading && storage && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(pct, 100)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: isWarning ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "#10b981" }}
                      />
                    </div>
                    <span className="text-xs font-medium" style={{ color: isWarning ? "#ef4444" : "#10b981" }}>{pct.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Remaining */}
            <div className="flex items-center gap-3 px-5 py-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(139,92,246,0.08)" }}>
                <HddOutlined style={{ color: "#8b5cf6", fontSize: 14 }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium">Remaining</p>
                <p className="text-lg font-bold leading-tight" style={{ color: "#8b5cf6" }}>
                  {storageLoading ? "—" : (storage?.storage?.remaining_label || "—")}
                </p>
              </div>
            </div>

            {/* Folders */}
            <div className="flex items-center gap-3 px-5 py-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.08)" }}>
                <FolderFilled style={{ color: "#f59e0b", fontSize: 14 }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium">Folders</p>
                <p className="text-lg font-bold leading-tight" style={{ color: "#f59e0b" }}>
                  {loading ? "—" : files.length}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── COMPACT BENTO CHARTS ── */}
        {!storageLoading && storage && (storage.by_type?.length > 0 || storage.by_folder?.length > 0) && (() => {
          // Calculate left card height so right card matches exactly
          // gauge(200) + subtitle(20) + gap(-mb-6 = -24, mt-5 = 20) + N items × 44px + padding top+bottom(28)
          const nTypes = (storage.by_type || []).length;
          const leftCardHeight = 200 + 20 + (-24 + 20) + nTypes * 44 + 28;
          // right card chart = leftCardHeight − label row(24) − padding(24)
          const rightChartHeight = Math.max(160, leftCardHeight - 48);

          return (
            <Row gutter={[12, 12]}>
              {nTypes > 0 && (
                <Col xs={24} lg={9}>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <div
                      className="bg-white rounded-xl border border-gray-100 px-4 pt-4 pb-3"
                      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)", height: leftCardHeight }}
                    >
                      {/* Semicircle gauge */}
                      <div className="relative -mb-6">
                        <ReactApexChart
                          type="radialBar"
                          series={[+pct.toFixed(1)]}
                          options={gaugeOptions}
                          height={200}
                        />
                        <p className="text-center text-xs text-gray-400 -mt-4">
                          Used {storage.storage.used_label} / {storage.storage.limit_label}
                        </p>
                      </div>

                      {/* File type list */}
                      <div className="mt-5 space-y-2.5">
                        {(storage.by_type || []).map((t) => {
                          const key = (t.media_type || "").toLowerCase();
                          const cfg = TYPE_LIST_CFG[key] || { label: "Other", color: "#6b7280", bg: "#f3f4f6", icon: <FileOutlined /> };
                          return (
                            <div key={t.media_type} className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: cfg.bg, color: cfg.color, fontSize: 16 }}
                              >
                                {cfg.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 leading-tight">{cfg.label}</p>
                                <p className="text-xs text-gray-400">{t.count} {t.count === 1 ? "file" : "files"}</p>
                              </div>
                              <span className="text-sm font-bold text-gray-700 flex-shrink-0">{t.size_label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                </Col>
              )}
              {(storage.by_folder || []).length > 0 && (
                <Col xs={24} lg={nTypes > 0 ? 15 : 24}>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div
                      className="bg-white rounded-xl border border-gray-100 p-3"
                      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)", height: nTypes > 0 ? leftCardHeight : "auto" }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <FolderFilled style={{ color: THEME.primary, fontSize: 12 }} />
                        <span className="text-xs font-semibold text-gray-600">By Folder</span>
                      </div>
                      <ReactApexChart
                        type="bar"
                        series={folderBarSeries}
                        options={folderBarOptions}
                        height={nTypes > 0 ? rightChartHeight : Math.max(160, Math.min(220, (storage.by_folder?.length || 1) * 44))}
                      />
                    </div>
                  </motion.div>
                </Col>
              )}
            </Row>
          );
        })()}

        {/* ── FILE BROWSER ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
        >
          <div
            className="px-4 py-3 border-b border-gray-50 flex items-center justify-between flex-wrap gap-2"
            style={{ background: THEME.gradientLight }}
          >
            <Breadcrumb
              className="file-breadcrumb"
              items={[
                {
                  title: (
                    <a onClick={() => handleBreadcrumbClick(0)} className="!flex items-center gap-1 hover:text-indigo-600 transition-colors" style={{ color: THEME.primaryDark }}>
                      <HomeOutlined />
                      <span>Home</span>
                    </a>
                  ),
                },
                ...currentPath.map((folder, index) => ({
                  title: (
                    <a onClick={() => handleBreadcrumbClick(index + 1)} className="!flex items-center gap-1 hover:text-indigo-600 transition-colors" style={{ color: THEME.primaryDark }}>
                      <FolderOutlined />
                      <span>{folder}</span>
                    </a>
                  ),
                })),
              ]}
            />

            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={typeFilter}
                onChange={(value) => setTypeFilter(value)}
                style={{ width: 140, height: 38 }}
                size="small"
                options={[
                  { value: "all", label: "All Types" },
                  { value: "image", label: "Images" },
                  { value: "video", label: "Videos" },
                  { value: "audio", label: "Audio" },
                  { value: "document", label: "Documents" },
                ]}
              />
              <Select value={sortOrder} onChange={(value) => setSortOrder(value)} style={{ width: 150, height: 38 }} size="small">
                <Select.Option value="newest">Newest First</Select.Option>
                <Select.Option value="oldest">Oldest First</Select.Option>
              </Select>
              <Input
                placeholder="Search files and folders..."
                prefix={<SearchOutlined style={{ color: THEME.primary }} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 240, height: 32 }}
                className="file-search"
                size="small"
                allowClear
              />
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                <button
                  onClick={() => handleToggleView("grid")}
                  className="w-9 h-9 flex items-center justify-center transition-colors"
                  style={{ background: view === "grid" ? THEME.gradient : "white", color: view === "grid" ? "white" : "#6b7280" }}
                >
                  <AppstoreOutlined style={{ fontSize: 15 }} />
                </button>
                <button
                  onClick={() => handleToggleView("list")}
                  className="w-9 h-9 flex items-center justify-center transition-colors border-l border-gray-200"
                  style={{ background: view === "list" ? THEME.gradient : "white", color: view === "list" ? "white" : "#6b7280" }}
                >
                  <UnorderedListOutlined style={{ fontSize: 15 }} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex flex-col justify-center items-center h-64">
                <Spin size="large" />
                <p className="mt-4 text-sm text-gray-500">Loading files...</p>
              </div>
            ) : (
              <>
                <MainContent
                  view={view}
                  files={getCurrentFolderContents()}
                  filesImagefn={filteredImages}
                  onFolderClick={handleFolderClick}
                  onDeleteFile={handleDeleteFile}
                  onFolderEdit={handleFolderEdit}
                  onEditFile={handleEditFile}
                  user={user}
                  handleDeleteFromState={handleDeleteFromState}
                  fileOutside={filteredOutsideFiles}
                  uploading={uploading}
                  uploadProgress={uploadProgress}
                  onRefresh={handleRefresh}
                  onUploadClick={handleUploadClick}
                  onNewFolderClick={handleNewFolder}
                  searchTerm={searchTerm}
                />

                {openFolderId && folderFilesMeta.total > filesPageSize && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      Page {folderFilesPage} of {folderFilesMeta.totalPages} — {folderFilesMeta.total} files
                    </span>
                    <Pagination
                      current={folderFilesPage}
                      total={folderFilesMeta.total}
                      pageSize={filesPageSize}
                      size="small"
                      showSizeChanger
                      pageSizeOptions={["10", "20", "50"]}
                      onChange={(page, size) => { setFolderFilesPage(page); setFilesPageSize(size); }}
                    />
                  </div>
                )}

                {!openFolderId && filesMeta.total > filesPageSize && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      Page {filesPage} of {filesMeta.totalPages} — {filesMeta.total} files
                    </span>
                    <Pagination
                      current={filesPage}
                      total={filesMeta.total}
                      pageSize={filesPageSize}
                      size="small"
                      showSizeChanger
                      pageSizeOptions={["10", "20", "50"]}
                      onChange={(page, size) => { setFilesPage(page); setFilesPageSize(size); }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      {isFolderModalOpen && (
        <FolderCreationModal
          isOpen={isFolderModalOpen}
          onClose={() => setFolderModalOpen(false)}
          onCreate={handleCreateFolder}
          folderToEdit={folderToEdit}
          openFolderId={openFolderId}
          user={user}
          existingFolders={getCurrentFolderContents()}
        />
      )}

      {isFileUploadModalOpen && (
        <FileUploadModal
          isOpen={isFileUploadModalOpen}
          onClose={() => setFileUploadModalOpen(false)}
          onUpload={handleUploadFile}
          existingFiles={fileOutside}
          user={user}
        />
      )}

      {editFileModal && (
        <FileCreationModal
          isOpen={editFileModal}
          onClose={() => setEditFileModal(false)}
          fileToEdit={fileEdit}
          user={user}
          onSuccess={handleRefresh}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .file-search .ant-input-affix-wrapper { border-radius: 12px; border-color: rgba(37,99,235,0.25); }
        .file-search .ant-input-affix-wrapper:hover,
        .file-search .ant-input-affix-wrapper-focused { border-color: #2563EB; box-shadow: 0 0 0 2px rgba(37,99,235,0.1); }
        .ant-select-selector { border-radius: 12px !important; }
        .ant-select:not(.ant-select-disabled):hover .ant-select-selector { border-color: #2563EB !important; }
        .ant-select-focused:not(.ant-select-disabled) .ant-select-selector { border-color: #2563EB !important; box-shadow: 0 0 0 2px rgba(37,99,235,0.1) !important; }
        .ant-select-item-option-selected { background: rgba(37,99,235,0.08) !important; color: #1D4ED8 !important; }
        .file-breadcrumb .ant-breadcrumb-link a { color: #1D4ED8; }
        .file-breadcrumb .ant-breadcrumb-separator { color: #9ca3af; }
        .ant-spin-dot-item { background-color: #2563EB !important; }
      ` }} />
    </div>
  );
};

export default FileManager;

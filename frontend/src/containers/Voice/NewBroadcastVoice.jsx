import { useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  message,
  Button,
  Input,
  Typography,
  Card,
  Select,
  Upload,
  Progress,
  Steps,
  Row,
  Col,
  Spin,
  ConfigProvider,
  Tag,
  Checkbox,
  Tooltip,
} from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  UploadOutlined,
  PlusOutlined,
  CheckOutlined,
  SoundOutlined,
  SendOutlined,
  DownloadOutlined,
  PhoneOutlined,
  TeamOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import CallerIdModal from "../../components/Voice/CallerIdModal";
import Modal from "../../components/Modal";

import handleApiError from "../../utils/errorHandler";
import {
  voiceCallerId,
  listFiles,
  uploadFile,
  deleteFile,
  submitVoiceCampaign,
} from "../../services/api";
import { listIvrs } from "../../services/ivrApi.js";

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Step } = Steps;

// Theme colors
const THEME = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#3B82F6",
  gradient: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  gradientLight:
    "linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(29,78,216,0.05) 100%)",
  shadows: {
    sm: "0 2px 8px rgba(0,0,0,0.04)",
    md: "0 4px 12px rgba(0,0,0,0.08)",
    primary: "0 4px 12px rgba(37,99,235,0.3)",
  },
};

// Billing — must match the backend's voice/campaign/services/campaign.service.ts
// calculation exactly.
// Standard Voice: 1 credit per started 15s slab (0-15s=1, 16-30s=2, ...)
// Voice Pulse 30: 1 credit per started 30s slab (0-30s=1, 31-60s=2, ...)
const calcVoiceCredits = (durationSeconds, isPulse30 = false) => {
  const d = Number(durationSeconds) || 0;
  if (d <= 0) return 0;
  return Math.ceil(d / (isPulse30 ? 30 : 15));
};

// Section Header Component
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div
    className="flex items-center gap-4 px-6 py-5 -mx-6 -mt-6 mb-6"
    style={{
      background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
      borderBottom: "1px solid rgba(37,99,235,0.1)",
    }}
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-12 h-12 rounded-xl flex items-center justify-center"
      style={{
        background: THEME.gradient,
        boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
      }}
    >
      <Icon style={{ color: "white", fontSize: 24 }} />
    </motion.div>
    <div>
      <Title
        level={3}
        style={{
          marginBottom: 0,
          fontSize: 20,
          fontWeight: 700,
          color: "#1f2937",
        }}
      >
        {title}
      </Title>
      {subtitle && <Text className="text-sm text-gray-500">{subtitle}</Text>}
    </div>
  </div>
);

// Themed Input Component
const ThemedInput = ({ label, ...props }) => (
  <div className="space-y-2">
    {label && (
      <Text className="text-gray-600 block text-xs font-medium uppercase tracking-wide">
        {label}
      </Text>
    )}
    <Input
      {...props}
      className="h-11 rounded-xl"
      style={{ borderColor: "rgba(37,99,235,0.3)", ...props.style }}
    />
  </div>
);

// Themed TextArea Component
const ThemedTextArea = ({ label, ...props }) => (
  <div className="space-y-2">
    {label && (
      <Text className="text-gray-600 block text-xs font-medium uppercase tracking-wide">
        {label}
      </Text>
    )}
    <TextArea
      {...props}
      className="rounded-xl"
      style={{ borderColor: "rgba(37,99,235,0.3)", ...props.style }}
    />
  </div>
);

// Themed Select Component
const ThemedSelect = ({ label, ...props }) => (
  <div className="space-y-2">
    {label && (
      <Text className="text-gray-600 block text-xs font-medium uppercase tracking-wide">
        {label}
      </Text>
    )}
    <Select
      {...props}
      className="w-full"
      style={{ height: 44, ...props.style }}
    />
  </div>
);

// Primary Button Component
const PrimaryButton = ({
  children,
  icon,
  onClick,
  loading = false,
  disabled = false,
  className = "",
  size = "default",
  ...props
}) => (
  <motion.button
    whileHover={{ scale: disabled ? 1 : 1.02 }}
    whileTap={{ scale: disabled ? 1 : 0.98 }}
    onClick={onClick}
    disabled={disabled || loading}
    className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 ${className}`}
    style={{
      background: THEME.gradient,
      boxShadow: THEME.shadows.primary,
      height: size === "large" ? 44 : 40,
    }}
    {...props}
  >
    {loading ? <Spin size="small" /> : icon}
    {children}
  </motion.button>
);

// Secondary Button Component
const SecondaryButton = ({
  children,
  icon,
  onClick,
  loading = false,
  disabled = false,
  className = "",
  ...props
}) => (
  <motion.button
    whileHover={{ scale: disabled ? 1 : 1.02 }}
    whileTap={{ scale: disabled ? 1 : 0.98 }}
    onClick={onClick}
    disabled={disabled || loading}
    className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border disabled:opacity-50 ${className}`}
    style={{
      borderColor: THEME.primary,
      color: THEME.primaryDark,
      background: "white",
      height: 40,
    }}
    {...props}
  >
    {loading ? <Spin size="small" /> : icon}
    {children}
  </motion.button>
);

// Alert Box Component
const AlertBox = ({ type = "info", icon, title, children }) => {
  const colors = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-500",
      text: "text-blue-800",
    },
    warning: {
      bg: "bg-orange-50",
      border: "border-orange-500",
      text: "text-orange-800",
    },
    success: {
      bg: "bg-green-50",
      border: "border-green-500",
      text: "text-green-800",
    },
  };

  const style = colors[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 border-l-4 ${style.border} ${style.bg} rounded-r-xl`}
    >
      <div className={`font-semibold ${style.text} flex items-center gap-2`}>
        {icon} {title}
      </div>
      <div className={`text-sm mt-1 ${style.text} opacity-80`}>{children}</div>
    </motion.div>
  );
};

const NewBroadcastVoice = ({ closeModal, user, onBroadcastSuccess, pulse30 }) => {
  const modalContainerRef = useRef(null);
  const [searchParams] = useSearchParams();
  // pulse30 prop wins when the caller knows the channel explicitly (e.g. the
  // Voice sidebar's "Send Voice" button, whose URL doesn't carry ?pulse30=1
  // once you've navigated within the section) — falls back to the URL flag.
  const isPulse30 = pulse30 ?? searchParams.get("pulse30") === "1";

  const [formData, setFormData] = useState({
    broadcastName: "",
    callerNumber: "",
    selectedAudio: "",
    retries: 1,
    retryInterval: 10,
    responseInput: "",
    callbackAudio: "",
    fallbackWhatsappEnabled: false,
    fallbackWhatsappDelay: 0,
    fallbackSmsEnabled: false,
    fallbackSmsDelay: 0,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [callerIDs, setCallerIDs] = useState(["9999999999"]);
  const [loading, setLoading] = useState(true);
  const [selectedAudio, setSelectedAudio] = useState({
    name: "",
    duration: 0,
  });
  const [audioFiles, setAudioFiles] = useState([]);
  const [creditCount, setCreditCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Saved IVRs from the IVR builder. Picking one replaces the audio + DTMF
  // menu entirely — the voice engine runs the IVR's own flow and audio.
  const [ivrs, setIvrs] = useState([]);
  const [messageMode, setMessageMode] = useState("audio"); // "audio" | "ivr"

  const [uploadType, setUploadType] = useState("Voice");
  const [mobileNumbers, setMobileNumbers] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [contactCount, setContactCount] = useState(0);
  const [csvPreview, setCsvPreview] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [errors, setErrors] = useState({
    broadcastName: "",
    callerNumber: "",
    selectedAudio: "",
    contacts: "",
  });

  const fetchCallerIds = async () => {
    try {
      const response = await voiceCallerId({ action: "read", username: user });

      if (response?.data?.status) {
        const idsFromAPI = response.data.data.map((item) => item.caller_id);
        setCallerIDs(["9999999999", ...new Set(idsFromAPI)]);
      } else {
        setCallerIDs(["9999999999"]);
      }
    } catch (error) {
      handleApiError(error);
      setCallerIDs(["9999999999"]);
    }
  };

  const fetchAudioFiles = async () => {
    setLoading(true);
    try {
      const response = await listFiles({ media_type: "audio", limit: 100 });
      const audioList = (response?.data?.data || []).map((audio) => ({
        id: audio.id,
        name: audio.media_name,
        url: audio.url || audio.media,
        date: audio.created_at,
        size: audio.file_size,
        duration: 0,
      }));
      setAudioFiles(audioList);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    try {
      if (!file) return false;

      const getDuration = () => {
        return new Promise((resolve, reject) => {
          const audio = document.createElement("audio");
          audio.src = URL.createObjectURL(file);

          audio.onloadedmetadata = () => {
            const duration = Math.ceil(audio.duration);
            URL.revokeObjectURL(audio.src);
            resolve(duration);
          };

          audio.onerror = () => {
            URL.revokeObjectURL(audio.src);
            reject(new Error("Failed to load audio metadata"));
          };
        });
      };

      const duration = await getDuration();

      if (duration > 120) {
        message.error("Audio duration cannot exceed 120 seconds.");
        return false;
      }

      setIsUploading(true);
      // Persisted via File Hosting so the URL is real and reusable across
      // future broadcasts, instead of a browser-only blob: URL.
      const response = await uploadFile(file, file.name);
      const uploaded = response?.data;
      const url = uploaded?.url || uploaded?.media;

      const newAudio = {
        id: uploaded?.id,
        name: uploaded?.media_name || file.name,
        url,
        date: new Date().toISOString(),
        size: file.size,
        duration,
      };

      const calculatedCredits = calcVoiceCredits(duration, isPulse30);
      const totalCredits = calculatedCredits * contactCount;

      setAudioFiles((prev) => [newAudio, ...prev]);
      setSelectedAudio({ id: newAudio.id, name: newAudio.name, duration, url });
      setFormData((prev) => ({
        ...prev,
        selectedAudio: `${newAudio.name} (${duration}s)`,
        calculatedCredits,
      }));
      setCreditCount(totalCredits);
      message.success("Audio file uploaded successfully.");
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsUploading(false);
    }
    return false;
  };

  // Files fetched from the library default to duration: 0 until the
  // <audio onLoadedMetadata> event backfills it — a passive DOM event that
  // may not have fired yet by the time the user clicks to select it. That
  // race left selections silently going through with calculatedCredits=0,
  // which the backend then rejects at submit time ("counts must be a
  // positive integer") with no clear feedback — reusing a library file
  // looked broken, so users just re-uploaded every time instead.
  const resolveAudioDuration = (url) =>
    new Promise((resolve, reject) => {
      const probe = document.createElement("audio");
      probe.src = url;
      probe.onloadedmetadata = () => resolve(Math.ceil(probe.duration));
      probe.onerror = () => reject(new Error("Failed to load audio metadata"));
    });

  const handleAudioSelect = async (audio) => {
    let duration = audio.duration;

    if (!duration) {
      try {
        duration = await resolveAudioDuration(audio.url);
        setAudioFiles((prev) =>
          prev.map((f) => (f.id === audio.id ? { ...f, duration } : f)),
        );
      } catch {
        message.error(
          "Could not read this audio file's duration. Please try another file.",
        );
        return;
      }
    }

    if (duration > 120) {
      message.error("Audio duration cannot exceed 120 seconds.");
      return;
    }

    setErrors((prev) => ({
      ...prev,
      selectedAudio: "",
    }));

    const calculatedCredits = calcVoiceCredits(duration, isPulse30);
    const totalCredits = calculatedCredits * contactCount;

    setSelectedAudio({
      id: audio.id,
      name: audio.name,
      duration,
      url: audio.url,
    });

    setFormData((prev) => ({
      ...prev,
      selectedAudio: `${audio.name} (${duration}s)`,
      calculatedCredits,
    }));

    setCreditCount(totalCredits);
  };

  const handleModalSubmit = (phoneNumber) => {
    setCallerIDs((prevIDs) => [...prevIDs, phoneNumber]);
    setFormData({ ...formData, callerNumber: phoneNumber });
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("broadcast_name", formData.broadcastName);
      payload.append("caller_id", formData.callerNumber || "9999999999");
      if (selectedAudio.ivrId) payload.append("ivr_id", selectedAudio.ivrId);
      else payload.append("audio_file_id", selectedAudio.id);
      payload.append("contacts", contactCount);
      payload.append("counts", formData.calculatedCredits);
      payload.append("pulse30", isPulse30 ? "1" : "0");
      payload.append("fallback_whatsapp_enabled", formData.fallbackWhatsappEnabled ? "1" : "0");
      if (formData.fallbackWhatsappEnabled) {
        payload.append("fallback_whatsapp_delay_minutes", formData.fallbackWhatsappDelay);
      }
      payload.append("fallback_sms_enabled", formData.fallbackSmsEnabled ? "1" : "0");
      if (formData.fallbackSmsEnabled) {
        payload.append("fallback_sms_delay_minutes", formData.fallbackSmsDelay);
      }
      payload.append("retries", formData.retries);
      if (formData.retries && formData.retryInterval) {
        payload.append("retry_interval", formData.retryInterval);
      }

      if (uploadType === "Voice") {
        payload.append("textbox", mobileNumbers);
      }

      const response = await submitVoiceCampaign(payload);

      if (response.data.success) {
        message.success(
          response.data.message || "Broadcast submitted successfully!",
        );
        if (onBroadcastSuccess) {
          onBroadcastSuccess();
        }
        closeModal();
      } else {
        message.error("Submission failed, please try again.");
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (name, value) => {
    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUploadTypeChange = (e) => {
    setUploadType(e.target.value);
    setContactCount(0);
    setCsvFile(null);
    setCsvPreview([]);
    setMobileNumbers("");
  };

  const handleMobileNumbersChange = (e) => {
    const input = e.target.value;

    setErrors((prev) => ({
      ...prev,
      contacts: "",
    }));

    const filteredInput = input
      .split("")
      .filter((char) => /^[0-9\n]*$/.test(char))
      .join("");

    setMobileNumbers(filteredInput);

    const validNumbers = filteredInput
      .split(/\n/)
      .filter((num) => num.trim() !== "");
    setContactCount(validNumbers.length);

    const audioDuration = selectedAudio.duration || 0;
    const calculatedCredits = calcVoiceCredits(audioDuration, isPulse30);
    const totalCredits = calculatedCredits * validNumbers.length;
    setCreditCount(totalCredits);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      const currentNumbers = mobileNumbers
        .split("\n")
        .filter((num) => num.trim() !== "");
      const lastNumber = currentNumbers[currentNumbers.length - 1];

      if (/^\d+$/.test(lastNumber)) {
        const newNumbers = [...currentNumbers, ""].join("\n");
        setMobileNumbers(newNumbers);
        setContactCount(currentNumbers.length);
      }
    }
  };

  const handleCsvUpload = (file) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(progress);
      }
    };

    reader.onload = () => {
      setCsvFile(file);
      setUploadProgress(100);

      const text = reader.result.trim();
      const rows = text
        .split("\n")
        .map((row) => row.split(",").map((cell) => cell.trim()));

      if (rows.length <= 1) {
        message.error("CSV appears to be empty or has no valid data.");
        setCsvFile(null);
        setUploadProgress(0);
        return;
      }

      if (uploadType === "Voice" && rows.some((row) => row.length > 1)) {
        message.error("CSV must only contain one column for Voice uploads.");
        setCsvFile(null);
        setUploadProgress(0);
        return;
      }

      const phoneNumbers = rows
        .slice(1)
        .map((row) => row[0]?.trim())
        .filter((num) => num !== undefined && num !== "");

      const allNumbers = [
        ...mobileNumbers.split(/\s+/).filter((num) => num.trim() !== ""),
        ...phoneNumbers,
      ];

      setMobileNumbers(allNumbers.join("\n"));
      setContactCount(allNumbers.length);
      setCsvPreview(rows.slice(0, 6));

      const audioDuration = selectedAudio.duration || 0;
      const calculatedCredits = calcVoiceCredits(audioDuration, isPulse30);
      const totalCredits = calculatedCredits * allNumbers.length;
      setCreditCount(totalCredits);

      setTimeout(() => setUploadProgress(0), 1000);
    };

    reader.onerror = () => {
      message.error("Failed to read the file. Please try again.");
      setCsvFile(null);
    };

    reader.readAsText(file);
    return false;
  };

  const downloadSampleCsv = () => {
    const sampleContent =
      "PhoneNumber\n918517999182\n918878699182\n7000203011\n919783471692";

    const blob = new Blob([sampleContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "Sample_Voice_CSV.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.broadcastName.trim()) {
      newErrors.broadcastName = "Broadcast name is required";
    }

    if (!selectedAudio.name) {
      newErrors.selectedAudio = messageMode === "ivr" ? "Please select an IVR" : "Please select an audio file";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (contactCount === 0) {
      newErrors.contacts = "Please add at least one contact";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    let isValid = false;

    switch (step) {
      case 0:
        isValid = validateStep1();
        break;
      case 1:
        isValid = validateStep2();
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      setStep(step + 1);
    } else {
      message.error("Please fill in all required fields");
    }
  };

  const handlePrevStep = () => {
    setStep((prevStep) => prevStep - 1);
  };

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  // Render Step 1
  const renderStep1 = () => {
    const creditsPerCall = calcVoiceCredits(selectedAudio?.duration, isPulse30);
    const isIvrMode = messageMode === "ivr";

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-6"
      >
        <div
          className="p-4 rounded-xl border border-gray-100"
          style={{ background: THEME.gradientLight }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Text className="text-gray-600 block text-xs font-medium uppercase tracking-wide mb-2">
                Broadcast Name <span className="text-red-500">*</span>
              </Text>
              <Input
                size="large"
                placeholder="Enter broadcast name"
                value={formData.broadcastName}
                onChange={(e) => handleInputChange("broadcastName", e.target.value)}
                status={errors.broadcastName ? "error" : ""}
              />
              {errors.broadcastName && (
                <Text type="danger" className="text-sm block mt-2">
                  {errors.broadcastName}
                </Text>
              )}
            </Col>

            <Col xs={24} md={12}>
              <div className="flex justify-between items-center gap-3 mb-2">
                <Text className="text-gray-600 text-xs font-medium uppercase tracking-wide">
                  Caller ID
                </Text>
                <Button
                  type="link"
                  size="small"
                  onClick={handleOpenModal}
                  style={{ color: THEME.primary, height: 12, fontSize: "12px", padding: 0 }}
                >
                  + Add Caller ID
                </Button>
              </div>
              <Select
                size="large"
                allowClear
                placeholder="Default caller ID"
                value={formData.callerNumber || undefined}
                onChange={(value) => handleInputChange("callerNumber", value || "")}
                className="w-full"
                options={callerIDs.map((id) => ({ value: id, label: id }))}
                getPopupContainer={() => modalContainerRef.current || document.body}
              />
            </Col>
          </Row>
        </div>

        <div className="space-y-3">
          <Text className="text-gray-600 block text-xs font-medium uppercase tracking-wide">
            Message <span className="text-red-500">*</span>
          </Text>
          <div className="inline-flex gap-2">
            {[
              { value: "audio", label: "Audio", icon: <SoundOutlined /> },
              { value: "ivr", label: "IVR", icon: <PhoneOutlined /> },
            ].map((opt) => {
              const active = messageMode === opt.value;
              return (
                <Button
                  key={opt.value}
                  size="large"
                  icon={opt.icon}
                  onClick={() => messageMode !== opt.value && handleModeChange(opt.value)}
                  style={
                    active
                      ? { background: THEME.gradient, border: "none", color: "#ffffff", fontWeight: 600 }
                      : { background: "#ffffff", borderColor: "#d1d5db", color: "#374151" }
                  }
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>

          {isIvrMode ? (
            <div className="space-y-2">
              <Select
                allowClear
                showSearch
                size="large"
                className="w-full"
                placeholder="Select an IVR"
                value={selectedAudio?.ivrId}
                onChange={handleSelectIvr}
                optionFilterProp="label"
                options={ivrs.map((i) => ({
                  value: i.id,
                  label: `${i.title}${i.audio_duration ? ` (${i.audio_duration}s)` : ""}`,
                }))}
                notFoundContent="No IVR yet"
                getPopupContainer={() => modalContainerRef.current || document.body}
              />
              <Text className="text-xs text-gray-500 block">
                The IVR plays its own audio and key-press menu.{" "}
                <a
                  href={`/dashboard/voice/ivr${isPulse30 ? "?pulse30=1" : ""}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Create or edit IVRs
                </a>
              </Text>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select
                  allowClear
                  showSearch
                  size="large"
                  className="flex-1"
                  placeholder={loading ? "Loading audio files..." : "Select an audio file"}
                  loading={loading}
                  value={selectedAudio?.ivrId ? undefined : selectedAudio?.id}
                  onChange={(id) => {
                    if (id == null) {
                      handleModeChange("audio");
                      return;
                    }
                    const file = audioFiles.find((f) => f.id === id);
                    if (file) handleAudioSelect(file);
                  }}
                  optionFilterProp="label"
                  options={audioFiles.map((f) => ({
                    value: f.id,
                    label: `${f.name}${f.duration ? ` (${f.duration}s)` : ""}`,
                  }))}
                  notFoundContent="No audio files yet — click Add to upload one"
                  getPopupContainer={() => modalContainerRef.current || document.body}
                />
                <Upload beforeUpload={handleFileUpload} accept="audio/*" showUploadList={false}>
                  <Button
                    size="large"
                    icon={<PlusOutlined />}
                    loading={isUploading}
                    style={{ background: THEME.gradient, border: "none", color: "white" }}
                  >
                    {isUploading ? "Uploading..." : "Add"}
                  </Button>
                </Upload>
              </div>
              {selectedAudio?.url && !selectedAudio?.ivrId && (
                <audio controls src={selectedAudio.url} className="w-full" style={{ height: 36 }} />
              )}
            </div>
          )}

          {!!selectedAudio?.duration && (
            <div
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: THEME.gradientLight }}
            >
              <div>
                <Text strong className="block text-gray-700">
                  {selectedAudio.name}
                </Text>
                <Text className="text-sm text-gray-500">
                  Duration: {selectedAudio.duration}s · {creditsPerCall} credit
                  {creditsPerCall > 1 ? "s" : ""} per call
                </Text>
              </div>
              <Tag
                style={{
                  background: THEME.gradient,
                  border: "none",
                  color: "white",
                  fontWeight: 600,
                }}
              >
                <CheckOutlined /> Selected
              </Tag>
            </div>
          )}
          {errors.selectedAudio && (
            <Text type="danger" className="text-sm block">
              {errors.selectedAudio}
            </Text>
          )}
        </div>

        <AlertBox type="info" icon="ℹ️" title="Billing">
          Maximum audio duration: 120 seconds.{" "}
          {isPulse30
            ? "Voice 30: 1 credit per call for every 30 seconds started — up to 30s = 1 credit, 31–60s = 2 credits, 61–90s = 3 credits, and so on."
            : "Voice 15: 1 credit per call for every 15 seconds started — up to 15s = 1 credit, 16–30s = 2 credits, 31–45s = 3 credits, and so on."}
        </AlertBox>
      </motion.div>
    );
  };

  // Render Step 2
  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <ThemedTextArea
          label="Enter Mobile Numbers"
          rows={5}
          placeholder="Enter one number per line"
          value={mobileNumbers}
          onChange={handleMobileNumbersChange}
          onKeyDown={handleKeyDown}
          status={errors.contacts ? "error" : ""}
        />

        {errors.contacts && (
          <Text type="danger" className="text-sm">
            {errors.contacts}
          </Text>
        )}

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: THEME.gradientLight }}
            >
              <Text className="text-gray-600">Total Contacts:</Text>
              <Tag
                style={{
                  background: THEME.gradient,
                  border: "none",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 16,
                }}
              >
                {contactCount}
              </Tag>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: THEME.gradientLight }}
            >
              <Text className="text-gray-600">Credit Count:</Text>
              <Tag
                style={{
                  background: THEME.gradient,
                  border: "none",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 16,
                }}
              >
                {creditCount}
              </Tag>
            </div>
          </Col>
        </Row>

        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{
                background: THEME.gradient,
                boxShadow: THEME.shadows.primary,
                height: 40,
              }}
            >
              <UploadOutlined />
              Upload CSV
            </motion.div>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleCsvUpload(e.target.files[0])}
              className="hidden"
            />
          </label>

          {uploadProgress > 0 && (
            <Progress
              type="circle"
              percent={uploadProgress}
              size={40}
              strokeColor={THEME.primary}
            />
          )}

          <SecondaryButton
            icon={<DownloadOutlined />}
            onClick={downloadSampleCsv}
          >
            Sample CSV
          </SecondaryButton>
        </div>
      </motion.div>
    </motion.div>
  );

  // Render Step 4
  const renderStep4 = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <div className="space-y-3">
            <Text strong className="text-gray-700">
              Retries
            </Text>
            <Select
              value={formData.retries}
              onChange={(value) => handleInputChange("retries", value)}
              className="w-full"
              style={{ height: 44 }}
              getPopupContainer={() =>
                modalContainerRef.current || document.body
              }
            >
              <Select.Option value={0}>No retry</Select.Option>
              <Select.Option value={1}>1</Select.Option>
              <Select.Option value={2}>2</Select.Option>
              <Select.Option value={3}>3</Select.Option>
            </Select>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div className="space-y-3">
            <Text strong className="text-gray-700">
              Retry After
            </Text>
            <Select
              value={formData.retryInterval}
              onChange={(value) => handleInputChange("retryInterval", value)}
              className="w-full"
              style={{ height: 44 }}
              disabled={!formData.retries}
              getPopupContainer={() =>
                modalContainerRef.current || document.body
              }
            >
              <Select.Option value={5}>5 minutes</Select.Option>
              <Select.Option value={10}>10 minutes</Select.Option>
              <Select.Option value={30}>30 minutes</Select.Option>
              <Select.Option value={60}>1 hour</Select.Option>
              <Select.Option value={180}>3 hours</Select.Option>
              <Select.Option value={300}>5 hours</Select.Option>
            </Select>
            <Text className="text-xs text-gray-500 block">
              Numbers that were busy, failed, or didn&apos;t answer will be
              called again after this time.
            </Text>
          </div>
        </Col>
      </Row>

      <div className="rounded-xl border border-gray-100 p-4 mb-3" style={{ background: "#F9FAFB" }}>
        <Checkbox
          checked={formData.fallbackWhatsappEnabled}
          onChange={(e) => handleInputChange("fallbackWhatsappEnabled", e.target.checked)}
        >
          <Text className="text-sm font-medium text-gray-700">Call Failed WhatsApp</Text>
        </Checkbox>
        {formData.fallbackWhatsappEnabled && (
          <div className="mt-3 ml-6">
            <Text className="text-xs font-medium uppercase tracking-wide text-gray-500 block mb-1">Send Time</Text>
            <Select
              value={formData.fallbackWhatsappDelay}
              onChange={(val) => handleInputChange("fallbackWhatsappDelay", val)}
              style={{ width: 220 }}
            >
              <Select.Option value={0}>Immediate</Select.Option>
              <Select.Option value={10}>10 minutes</Select.Option>
              <Select.Option value={30}>30 minutes</Select.Option>
              <Select.Option value={60}>1 hour</Select.Option>
              <Select.Option value={120}>2 hours</Select.Option>
              <Select.Option value={180}>3 hours</Select.Option>
              <Select.Option value={300}>5 hours</Select.Option>
            </Select>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-100 p-4 mb-3" style={{ background: "#F9FAFB" }}>
        <Checkbox
          checked={formData.fallbackSmsEnabled}
          onChange={(e) => handleInputChange("fallbackSmsEnabled", e.target.checked)}
        >
          <Text className="text-sm font-medium text-gray-700">Call Failed SMS</Text>
        </Checkbox>
        {formData.fallbackSmsEnabled && (
          <div className="mt-3 ml-6">
            <Text className="text-xs font-medium uppercase tracking-wide text-gray-500 block mb-1">Send Time</Text>
            <Select
              value={formData.fallbackSmsDelay}
              onChange={(val) => handleInputChange("fallbackSmsDelay", val)}
              style={{ width: 220 }}
            >
              <Select.Option value={0}>Immediate</Select.Option>
              <Select.Option value={10}>10 minutes</Select.Option>
              <Select.Option value={30}>30 minutes</Select.Option>
              <Select.Option value={60}>1 hour</Select.Option>
              <Select.Option value={120}>2 hours</Select.Option>
              <Select.Option value={180}>3 hours</Select.Option>
              <Select.Option value={300}>5 hours</Select.Option>
            </Select>
          </div>
        )}
      </div>

      <AlertBox type="info" icon="ℹ️" title="Fallback Notifications">
        If a call ends NO ANSWER, BUSY, or FAILED, checked channels above will notify the recipient using the
        WhatsApp/SMS route assigned to your account (Manage Clients → Call Fallback API), after the delay you choose.
      </AlertBox>
    </motion.div>
  );

  const fetchIvrs = async () => {
    try {
      const res = await listIvrs({ status: "active", limit: 100 });
      setIvrs(
        (res?.data || [])
          .filter((i) => i.runnable)
          .map((i) => ({
            id: i.id,
            title: i.title,
            audio_duration: Number(i.root_prompt?.duration_seconds) || 0,
          })),
      );
    } catch {
      setIvrs([]); // IVR list is optional — plain audio broadcasts still work
    }
  };

  const handleModeChange = (mode) => {
    setMessageMode(mode);
    setSelectedAudio({ name: "", duration: 0 });
    setFormData((prev) => ({ ...prev, selectedAudio: "", calculatedCredits: 0 }));
    setCreditCount(0);
    setErrors((prev) => ({ ...prev, selectedAudio: "" }));
  };

  const handleSelectIvr = (ivrId) => {
    if (!ivrId) {
      setSelectedAudio({ name: "", duration: 0 });
      setFormData((prev) => ({ ...prev, selectedAudio: "", calculatedCredits: 0 }));
      setCreditCount(0);
      return;
    }
    const ivr = ivrs.find((i) => i.id === ivrId);
    if (!ivr) return;
    const duration = Number(ivr.audio_duration) || 0;
    const calculatedCredits = calcVoiceCredits(duration, isPulse30);
    setSelectedAudio({ ivrId: ivr.id, name: `${ivr.title} (IVR)`, duration });
    setFormData((prev) => ({
      ...prev,
      selectedAudio: `${ivr.title} (IVR)`,
      calculatedCredits,
    }));
    setCreditCount(calculatedCredits * contactCount);
  };

  useEffect(() => {
    fetchCallerIds();
    fetchAudioFiles();
    fetchIvrs();
  }, []);

  const steps = [
    {
      title: "Setup",
      content: renderStep1(),
    },
    {
      title: "Contacts",
      content: renderStep2(),
    },
    {
      title: "Settings",
      content: renderStep4(),
    },
  ];

  return (
    <ConfigProvider
      getPopupContainer={() => modalContainerRef.current || document.body}
    >
      <div ref={modalContainerRef} className="flex flex-col h-full">
        <div className="mb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SectionHeader
              icon={PhoneOutlined}
              title={isPulse30 ? "New Voice 30 Broadcast" : "New Voice 15 Broadcast"}
              subtitle="Create and schedule voice campaigns"
            />
          </motion.div>
        </div>

        <div className="mb-4 px-1">
          <Steps current={step} className="w-full">
            {steps.map((item) => (
              <Step key={item.title} title={item.title} />
            ))}
          </Steps>
        </div>

        <div className="flex-1 overflow-y-auto mb-6">
          <Card className="h-full">{steps[step].content}</Card>
        </div>

        <div className="flex justify-between gap-3 pt-3 pb-3 border-t border-gray-100">
          {step > 0 && (
            <SecondaryButton
              icon={<ArrowLeftOutlined />}
              onClick={handlePrevStep}
            >
              Previous
            </SecondaryButton>
          )}

          {step < steps.length - 1 && (
            <PrimaryButton
              icon={<ArrowRightOutlined />}
              onClick={handleNextStep}
              className="ml-auto"
            >
              Next
            </PrimaryButton>
          )}

          {step === steps.length - 1 && (
            <PrimaryButton
              icon={<SendOutlined />}
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              className="ml-auto"
            >
              Submit Broadcast
            </PrimaryButton>
          )}
        </div>

        {/* Modals */}
        {isModalOpen && (
          <Modal
            isModalOpen={isModalOpen}
            closeModal={handleCloseModal}
            width={600}
            height="55%"
          >
            <CallerIdModal
              closeModal={handleCloseModal}
              handleSubmit={handleModalSubmit}
              user={user}
            />
          </Modal>
        )}

        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4"
            >
              <Spin size="large" />
              <Text className="text-gray-600">Submitting broadcast...</Text>
            </motion.div>
          </div>
        )}

        {/* Global Styles */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
        .ant-select-selector {
          border-radius: 12px !important;
          border-color: rgba(37,99,235,0.3) !important;
        }

        .ant-select-selector:hover {
          border-color: #2563EB !important;
        }

        .ant-select-focused .ant-select-selector {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.1) !important;
        }

        .ant-input:hover,
        .ant-input-affix-wrapper:hover {
          border-color: #2563EB !important;
        }

        .ant-input:focus,
        .ant-input-affix-wrapper-focused {
          border-color: #2563EB !important;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.1) !important;
        }

        .ant-checkbox-checked .ant-checkbox-inner {
          background-color: #2563EB !important;
          border-color: #2563EB !important;
        }

        .ant-radio-button-wrapper-checked {
          border-color: #2563EB !important;
          color: #2563EB !important;
        }

        .ant-steps-item-process .ant-steps-item-icon {
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%) !important;
        }
      `,
          }}
        />
      </div>
    </ConfigProvider>
  );
};

export default NewBroadcastVoice;

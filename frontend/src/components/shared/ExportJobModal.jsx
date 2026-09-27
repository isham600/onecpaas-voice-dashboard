import { useEffect, useRef, useState } from "react";
import { Modal, Button, Progress, message } from "antd";
import {
  DownloadOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { streamDownloadFile } from "../../services/api";

const POLL_INTERVAL = 3000;

const STATUS_META = {
  queued:     { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", icon: <ClockCircleOutlined />,  label: "Queued"     },
  processing: { color: "#3b82f6", bg: "rgba(59,130,246,0.08)", icon: <LoadingOutlined spin />, label: "Processing" },
  ready:      { color: "#10b981", bg: "rgba(16,185,129,0.08)", icon: <CheckCircleOutlined />,  label: "Ready"      },
  failed:     { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  icon: <CloseCircleOutlined />,  label: "Failed"     },
};

const fmtBytes = (b) => {
  if (!b) return "";
  if (b < 1024)        return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * ExportJobModal — full async export lifecycle with real progress.
 *
 * Props:
 *   visible      {boolean}
 *   title        {string}
 *   jobId        {string|null}
 *   pollFn       {(jobId) => Promise}   — returns poll API response
 *   downloadPath {string|null}          — optional override; defaults to download_url from poll
 *   onClose      {() => void}
 *   onReset      {() => void}
 */
const ExportJobModal = ({ visible, title, jobId, pollFn, downloadPath, onClose, onReset }) => {
  const [status,        setStatus]        = useState("queued");
  const [totalRows,     setTotalRows]      = useState(null);
  const [expectedRows,  setExpectedRows]   = useState(null);
  const [downloadUrl,   setDownloadUrl]    = useState(null);
  const [expiresAt,     setExpiresAt]      = useState(null);
  const [error,         setError]          = useState(null);
  // Download streaming progress: { received, total } | null
  const [dlProgress,    setDlProgress]     = useState(null);

  const intervalRef = useRef(null);
  const abortRef    = useRef(null);

  const clearPoller = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const abortDownload = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setDlProgress(null);
  };

  const poll = async () => {
    if (!jobId) return;
    try {
      const res  = await pollFn(jobId);
      const data = res.data;
      setStatus(data.status);
      if (data.total_rows    != null) setTotalRows(data.total_rows);
      if (data.expected_rows != null) setExpectedRows(data.expected_rows);
      if (data.download_url)          setDownloadUrl(data.download_url);
      if (data.expires_at)            setExpiresAt(data.expires_at);
      if (data.error)                 setError(data.error);
      if (data.status === "ready" || data.status === "failed") clearPoller();
    } catch {
      setStatus("failed");
      setError("Failed to check export status.");
      clearPoller();
    }
  };

  useEffect(() => {
    if (!visible || !jobId) return;
    setStatus("queued");
    setDownloadUrl(null);
    setTotalRows(null);
    setExpectedRows(null);
    setExpiresAt(null);
    setError(null);
    setDlProgress(null);
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return clearPoller;
  }, [visible, jobId]);

  useEffect(() => {
    if (!visible) { clearPoller(); abortDownload(); }
  }, [visible]);

  useEffect(() => () => { clearPoller(); abortDownload(); }, []);

  const handleDownload = async () => {
    const url = downloadPath || downloadUrl;
    if (!url || dlProgress) return;
    const controller  = new AbortController();
    abortRef.current  = controller;
    setDlProgress({ received: 0, total: 0 });
    try {
      const blob      = await streamDownloadFile(url, (received, total) => {
        setDlProgress({ received, total });
      }, controller.signal);
      const href      = URL.createObjectURL(blob);
      const a         = Object.assign(document.createElement("a"), {
        href,
        download: `export_${jobId || Date.now()}.csv`,
      });
      a.click();
      URL.revokeObjectURL(href);
    } catch (e) {
      if (e.name !== "AbortError") message.error("Download failed. Please try again.");
    } finally {
      abortRef.current = null;
      setDlProgress(null);
    }
  };

  // Real progress % — uses expected_rows if known, else indeterminate
  const writePct = expectedRows > 0 && totalRows != null
    ? Math.min(98, Math.round((totalRows / expectedRows) * 100))
    : null;

  const dlPct = dlProgress?.total > 0
    ? Math.round((dlProgress.received / dlProgress.total) * 100)
    : null;

  const meta = STATUS_META[status] || STATUS_META.queued;

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={460}
      centered
      closable={status === "ready" || status === "failed"}
    >
      <div className="py-2">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)", color: "#fff" }}
          >
            <DownloadOutlined />
          </div>
          <div>
            <div className="font-semibold text-gray-800 text-base">{title}</div>
            <div className="text-xs text-gray-400">Export will be ready to download shortly</div>
          </div>
        </div>

        {/* Status badge */}
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 mb-4"
          >
            <span
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: meta.bg, color: meta.color }}
            >
              {meta.icon}
              {meta.label}
            </span>
            {/* Live row count while processing */}
            {(status === "queued" || status === "processing") && totalRows > 0 && (
              <span className="text-xs text-blue-500 font-semibold">
                {totalRows.toLocaleString()} rows written
                {expectedRows > 0 ? ` / ${expectedRows.toLocaleString()}` : "…"}
              </span>
            )}
            {status === "ready" && totalRows != null && (
              <span className="text-xs text-gray-500">{totalRows.toLocaleString()} rows</span>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress bar — real % if expected_rows known */}
        {(status === "queued" || status === "processing") && (
          <div className="mb-5">
            <Progress
              percent={writePct ?? (status === "queued" ? 5 : undefined)}
              status="active"
              showInfo={writePct !== null}
              format={(p) => `${p}%`}
              strokeColor="linear-gradient(90deg, #2563EB, #3b82f6)"
            />
            {status === "processing" && writePct === null && (
              <p className="text-xs text-gray-400 mt-1">
                {totalRows > 0 ? `Writing rows… ${totalRows.toLocaleString()} so far` : "Preparing…"}
              </p>
            )}
          </div>
        )}

        {/* Ready state — download button with streaming progress */}
        {status === "ready" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-3 mb-5"
          >
            <div
              className="rounded-xl p-4"
              style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold text-gray-800">CSV file ready</div>
                  {expiresAt && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      Expires {new Date(expiresAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <Button
                  type="primary"
                  icon={dlProgress ? <LoadingOutlined /> : <DownloadOutlined />}
                  onClick={handleDownload}
                  disabled={!!dlProgress}
                  style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)", border: "none" }}
                >
                  {dlProgress
                    ? dlPct !== null
                      ? `${dlPct}%`
                      : "Downloading…"
                    : "Download"}
                </Button>
              </div>
              {/* Streaming download progress bar */}
              {dlProgress && (
                <>
                  <Progress
                    percent={dlPct ?? 0}
                    status="active"
                    showInfo={false}
                    size="small"
                    strokeColor="linear-gradient(90deg, #2563EB, #3b82f6)"
                  />
                  <p className="text-xs text-blue-500 mt-1">
                    {dlProgress.total > 0
                      ? `${fmtBytes(dlProgress.received)} / ${fmtBytes(dlProgress.total)}`
                      : `${fmtBytes(dlProgress.received)} downloaded…`}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Failed */}
        {status === "failed" && (
          <div
            className="rounded-xl p-4 mb-5 text-sm"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#b91c1c" }}
          >
            {error || "Export failed. Please try again."}
          </div>
        )}

        {jobId && (
          <div className="text-xs text-gray-300 font-mono truncate mb-4" title={jobId}>
            Job: {jobId}
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-gray-50">
          {onReset && (status === "ready" || status === "failed") ? (
            <Button size="small" onClick={onReset} className="text-xs">New Export</Button>
          ) : (
            <div />
          )}
          <Button onClick={onClose} size="small">
            {status === "ready" ? "Close" : "Cancel"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportJobModal;

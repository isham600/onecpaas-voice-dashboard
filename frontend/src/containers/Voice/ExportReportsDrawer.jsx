import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { Drawer, Button, Tag, Spin, Empty, Tooltip, Progress } from "antd";
import {
  DownloadOutlined, PlusOutlined, ReloadOutlined,
  CheckCircleOutlined, ClockCircleOutlined, LoadingOutlined,
  CloseCircleOutlined, MinusCircleOutlined, FileTextOutlined,
  CalendarOutlined, FilterOutlined,
} from "@ant-design/icons";
import { listVoiceExports, streamDownloadFile } from "../../services/api";
import handleApiError from "../../utils/errorHandler";

// ── Type config ────────────────────────────────────────────────────────────────
const DEFAULT_TYPE_CFG = {
  voice_summary: { channel: "Voice", chColor: "#2563EB", module: "Campaign", modColor: "#2563EB", label: "Summary",  desc: "One row per broadcast, filtered by date" },
  voice_details: { channel: "Voice", chColor: "#2563EB", module: "Campaign", modColor: "#7C3AED", label: "Contacts", desc: "All recipients for one campaign"          },
};

const getDownloadPath = (job) =>
  `/api/v1/voice/summary/reports/${job.job_id}/download`;

const THEME = {
  primary:     "#2563EB",
  primaryDark: "#1D4ED8",
  gradient:    "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
};

const STATUS_CFG = {
  queued:     { label: "Queued",     color: "#D97706", bg: "#FFFBEB", Icon: ClockCircleOutlined },
  processing: { label: "Processing", color: "#2563EB", bg: "#EEF2FF", Icon: LoadingOutlined },
  ready:      { label: "Ready",      color: "#059669", bg: "#ECFDF5", Icon: CheckCircleOutlined },
  failed:     { label: "Failed",     color: "#DC2626", bg: "#FEF2F2", Icon: CloseCircleOutlined },
  expired:    { label: "Expired",    color: "#6B7280", bg: "#F3F4F6", Icon: MinusCircleOutlined },
};

const fmtDate  = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—";

const getDateRangeLine = (filters) => {
  if (!filters) return null;
  if (filters.from_date && filters.to_date) {
    return `${filters.from_date}  →  ${filters.to_date}`;
  }
  if (filters.from_date) return `From ${filters.from_date}`;
  if (filters.to_date)   return `To ${filters.to_date}`;
  return null;
};

const getFilterChips = (filters) => {
  if (!filters) return [];
  const chips = [];
  if (filters.request_id) chips.push({ icon: "🆔", text: `ID: …${String(filters.request_id).slice(-8)}` });
  if (filters.status)     chips.push({ icon: "📊", text: `Status: ${filters.status}` });
  if (filters.search)     chips.push({ icon: "🔍", text: `Search: ${filters.search}` });
  return chips;
};

const makeFilename = (job) => {
  const f = job.filters || {};
  const type = job.type.replace("voice_", "");
  const from = (f.from_date || "").replace(/-/g, "");
  const to   = (f.to_date   || "").replace(/-/g, "");
  const date = from && to ? `_${from}_${to}` : "";
  const rid  = f.request_id ? `_${String(f.request_id).slice(-8)}` : "";
  return `voice_${type}${date}${rid}_${job.job_id.slice(-8)}.csv`;
};

const fmtBytes = (bytes) => {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ExportReportsDrawer = forwardRef(({
  open,
  onClose,
  onNewExport,
  newExportLabel = "New Export",
  listFn  = listVoiceExports,
  typeCfg = DEFAULT_TYPE_CFG,
}, ref) => {
  const [reports,     setReports]     = useState([]);
  const [listLoading, setListLoading] = useState(false);
  // dlProgress: { jobId, received, total } | null
  const [dlProgress,  setDlProgress]  = useState(null);
  const pollRef    = useRef(null);
  const abortRef   = useRef(null); // AbortController for active streaming download

  const fetchReports = useCallback(async (silent = false) => {
    if (!silent) setListLoading(true);
    try {
      const res = await listFn();
      setReports(res.data?.data || []);
    } catch (e) {
      handleApiError(e);
    } finally {
      setListLoading(false);
    }
  }, [listFn]);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await listFn();
        const data = res.data?.data || [];
        setReports(data);
        if (!data.some((j) => ["queued", "processing"].includes(j.status))) stopPolling();
      } catch {}
    }, 2500);
  }, [listFn]);

  useEffect(() => {
    if (reports.some((j) => ["queued", "processing"].includes(j.status))) startPolling();
    else stopPolling();
  }, [reports]);

  useEffect(() => {
    if (open) {
      fetchReports();
    } else {
      stopPolling();
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
        setDlProgress(null);
      }
    }
  }, [open]);

  useEffect(() => () => {
    stopPolling();
    abortRef.current?.abort();
  }, []);

  // Lets callers force a refetch after queuing a new export while the drawer
  // is already open — the `open` prop won't change in that case, so the
  // effect above never fires and the new job would otherwise stay invisible.
  useImperativeHandle(ref, () => ({
    refresh: () => fetchReports(),
  }), [fetchReports]);

  const handleDownload = async (job) => {
    if (dlProgress) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setDlProgress({ jobId: job.job_id, received: 0, total: 0 });
    try {
      const blob = await streamDownloadFile(
        getDownloadPath(job),
        (received, total) => setDlProgress({ jobId: job.job_id, received, total }),
        controller.signal,
      );
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = makeFilename(job);
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      if (e.name !== "AbortError") handleApiError(e);
    } finally {
      abortRef.current = null;
      setDlProgress(null);
    }
  };

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <FileTextOutlined style={{ color: THEME.primary }} />
          <span className="font-bold text-gray-900">My Exports</span>
          <Tag
            className="rounded-full border-0 font-semibold text-xs ml-1"
            style={{ background: "rgba(37,99,235,0.08)", color: THEME.primaryDark }}
          >
            {reports.length}
          </Tag>
        </div>
      }
      open={open}
      onClose={onClose}
      width={480}
      styles={{ body: { padding: "16px", background: "#F8F9FB" }, header: { borderBottom: "1px solid #f1f5f9" } }}
      extra={
        <div className="flex items-center gap-2">
          <Tooltip title="Refresh list">
            <Button
              icon={<ReloadOutlined spin={listLoading} />}
              onClick={() => fetchReports()}
              className="h-8 w-8 rounded-lg border-gray-200 text-gray-500"
              size="small"
            />
          </Tooltip>
          {onNewExport && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onNewExport}
              size="small"
              className="h-8 rounded-lg font-semibold"
              style={{ background: THEME.gradient, border: "none", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}
            >
              {newExportLabel}
            </Button>
          )}
        </div>
      }
    >
      {listLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spin size="large" />
        </div>
      ) : reports.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span className="text-gray-400">No exports yet — click "{newExportLabel}" to start one</span>}
          className="py-16"
        />
      ) : (
        <div className="space-y-3">
          {reports.map((job) => {
            const typeEntry = typeCfg[job.type] || {
              channel: null, chColor: "#6B7280",
              module: null,  modColor: "#6B7280",
              label: job.type, desc: "",
            };
            const sCfg      = STATUS_CFG[job.status] || { label: job.status, color: "#6B7280", bg: "#F3F4F6", Icon: MinusCircleOutlined };
            const { Icon }  = sCfg;
            const isActive  = ["queued", "processing"].includes(job.status);
            const isReady   = job.status === "ready";
            const isQueued  = job.status === "queued";

            const dateRangeLine   = getDateRangeLine(job.filters);
            const filterChips     = getFilterChips(job.filters);
            const rowCount        = job.total_rows    ?? 0;
            const expectedRows    = job.expected_rows ?? 0;
            const pct             = expectedRows > 0
              ? Math.min(98, Math.round((rowCount / expectedRows) * 100))
              : undefined;

            return (
              <div
                key={job.job_id}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
              >
                <div className="flex items-start justify-between px-4 pt-3 pb-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      {typeEntry.channel && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${typeEntry.chColor}18`, color: typeEntry.chColor }}
                        >
                          {typeEntry.channel}
                        </span>
                      )}
                      {typeEntry.module && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${typeEntry.modColor}14`, color: typeEntry.modColor }}
                        >
                          {typeEntry.module}
                        </span>
                      )}
                    </div>
                    {job.filters?.campaign_name ? (
                      <div className="mt-0.5">
                        <span className="text-base font-extrabold text-gray-900 leading-tight">
                          📋 {job.filters.campaign_name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-gray-500">{typeEntry.label}</span>
                          {typeEntry.desc && (
                            <span className="text-[11px] text-gray-400">{typeEntry.desc}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800">{typeEntry.label}</span>
                        {typeEntry.desc && (
                          <span className="text-[11px] text-gray-400">{typeEntry.desc}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <Tag
                    icon={<Icon spin={job.status === "processing"} style={{ fontSize: 10 }} />}
                    style={{ background: sCfg.bg, color: sCfg.color, border: "none", fontWeight: 700, fontSize: 11, borderRadius: 6, margin: 0, flexShrink: 0 }}
                  >
                    {" "}{sCfg.label}
                  </Tag>
                </div>

                {dateRangeLine && (
                  <div className="px-4 pb-1 flex items-center gap-1.5">
                    <CalendarOutlined style={{ color: "#9CA3AF", fontSize: 12 }} />
                    <span className="text-sm font-semibold text-gray-700">{dateRangeLine}</span>
                  </div>
                )}

                {filterChips.length > 0 && (
                  <div className="px-4 pb-2 flex flex-wrap gap-1.5 items-center">
                    <FilterOutlined style={{ color: "#D1D5DB", fontSize: 11 }} />
                    {filterChips.map((c, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{ background: "#F3F4F6", color: "#6B7280" }}
                      >
                        {c.text}
                      </span>
                    ))}
                  </div>
                )}

                <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
                  <span>Created {fmtDate(job.created_at)}</span>
                  {isReady && job.expires_at && (
                    <span>Expires {fmtDate(job.expires_at)}</span>
                  )}
                  {rowCount > 0 && (
                    <span className="font-bold" style={{ color: isReady ? "#059669" : THEME.primary }}>
                      {rowCount.toLocaleString()} rows
                      {isActive ? " written…" : ""}
                    </span>
                  )}
                </div>

                <div className="px-4 pb-3">
                  <span className="font-mono text-[10px] text-gray-300 select-all">{job.job_id}</span>
                </div>

                {isActive && (
                  <div className="px-4 pb-3">
                    {isQueued ? (
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-full rounded-full"
                          style={{ background: "#FCD34D", width: "8%" }}
                        />
                      </div>
                    ) : (
                      <div>
                        <Progress
                          percent={pct ?? (rowCount > 0 ? 99 : undefined)}
                          status="active"
                          showInfo={pct !== undefined}
                          format={(p) => `${p}%`}
                          size="small"
                          strokeColor={THEME.gradient}
                          trailColor="#EEF2FF"
                          style={{ marginBottom: 4 }}
                        />
                        <p className="text-[11px] text-blue-500 font-medium">
                          {rowCount > 0 && expectedRows > 0
                            ? `Writing rows… ${rowCount.toLocaleString()} / ${expectedRows.toLocaleString()}`
                            : rowCount > 0
                              ? `Writing rows… ${rowCount.toLocaleString()} so far`
                              : "Preparing export…"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {isReady && (() => {
                  const dl      = dlProgress?.jobId === job.job_id ? dlProgress : null;
                  const dlPct   = dl && dl.total > 0 ? Math.round((dl.received / dl.total) * 100) : null;
                  const dlLabel = dl
                    ? dlPct !== null
                      ? `${fmtBytes(dl.received)} / ${fmtBytes(dl.total)}  (${dlPct}%)`
                      : `${fmtBytes(dl.received)} downloaded…`
                    : `Download CSV  (${rowCount.toLocaleString()} rows)`;
                  return (
                    <div className="px-4 pb-4 space-y-1.5">
                      {dl && (
                        <Progress
                          percent={dlPct ?? 0}
                          status="active"
                          showInfo={false}
                          size="small"
                          strokeColor={THEME.gradient}
                          trailColor="#EEF2FF"
                        />
                      )}
                      <Button
                        icon={dl ? <LoadingOutlined /> : <DownloadOutlined />}
                        loading={false}
                        disabled={!!dlProgress && !dl}
                        onClick={() => !dl && handleDownload(job)}
                        block
                        className="rounded-lg font-semibold"
                        style={{ borderColor: THEME.primary, color: THEME.primary, height: 38 }}
                      >
                        {dlLabel}
                      </Button>
                    </div>
                  );
                })()}

                {job.error && (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-1.5">{job.error}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
});

export default ExportReportsDrawer;

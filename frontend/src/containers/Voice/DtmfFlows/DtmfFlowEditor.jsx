import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Input, Button, Typography, message, Spin } from "antd";
import {
  ArrowLeftOutlined,
  SoundOutlined,
  SwapOutlined,
  AppstoreOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import DtmfFlowBuilder, { emptyRow } from "../../../components/Voice/DtmfFlowBuilder";
import { listFiles, getDtmfFlow, createDtmfFlow, updateDtmfFlow } from "../../../services/api";
import handleApiError from "../../../utils/errorHandler";

const { Text } = Typography;

const PALETTE = [
  { action: "audio",    label: "Play Audio",      desc: "Speak a message",           color: "#2563EB", icon: SoundOutlined },
  { action: "transfer", label: "Transfer Call",    desc: "Route to a number",         color: "#7C3AED", icon: SwapOutlined },
  { action: "submenu",  label: "Sub-Menu",         desc: "Open more options",         color: "#DB2777", icon: AppstoreOutlined },
  { action: "record",   label: "Record Key",       desc: "Ends call, no audio",       color: "#EA580C", icon: CheckCircleOutlined },
  { action: "back",     label: "Go Back",          desc: "Return to previous menu",   color: "#059669", icon: RollbackOutlined },
];

// Full-screen flow editor — deliberately rendered with no app chrome (no
// VoiceNavbar / UnifiedSidebar) to match the standalone canvas pitched to
// the client, not squeezed into a modal.
const DtmfFlowEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const containerRef = useRef(null);

  const [name, setName] = useState("");
  const [rows, setRows] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [audioRes, flowRes] = await Promise.all([
          listFiles({ media_type: "audio", limit: 100 }),
          id ? getDtmfFlow(id) : Promise.resolve(null),
        ]);
        if (cancelled) return;

        setAudioFiles(
          (audioRes?.data?.data || []).map((a) => ({
            id: a.id,
            name: a.media_name,
            url: a.url || a.media,
          })),
        );

        if (flowRes) {
          const flow = flowRes?.data?.data;
          setName(flow?.name || "");
          setRows(flow?.rows || []);
        }
      } catch (error) {
        if (!cancelled) handleApiError(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const addNodeWithAction = (action) => {
    if (rows.length >= 9) return;
    const col = rows.length % 4;
    const rowIdx = Math.floor(rows.length / 4);
    const pos = { x: 40 + col * 210, y: 70 + rowIdx * 140 };
    setRows([...rows, { ...emptyRow(), action, x: pos.x, y: pos.y }]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      message.error("Give this flow a name first");
      return;
    }
    setSaving(true);
    try {
      if (id) {
        await updateDtmfFlow(id, name.trim(), rows);
        message.success("Flow updated");
      } else {
        await createDtmfFlow(name.trim(), rows);
        message.success("Flow saved");
      }
      navigate("/dashboard/voice/dtmf-flows");
    } catch (error) {
      handleApiError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#f4f6fb" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-4"
        style={{
          padding: "16px 24px",
          background: "linear-gradient(135deg, #f5f6ff 0%, #eef0ff 100%)",
          borderBottom: "1px solid rgba(37,99,235,0.1)",
          flexShrink: 0,
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/dashboard/voice/dtmf-flows")}
        >
          Flows
        </Button>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
            boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
          }}
        >
          <ApiOutlined style={{ color: "white", fontSize: 20 }} />
        </div>
        <div className="flex-1 min-w-0">
          <Text strong style={{ fontSize: 17, display: "block", marginBottom: 4 }}>
            DTMF Flow Builder
          </Text>
          <Input
            placeholder="Flow name — required, e.g. Support Line Menu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            status={!name.trim() ? "warning" : ""}
            style={{ fontSize: 13, maxWidth: 340, background: "#fff" }}
          />
        </div>
        <Button
          type="primary"
          loading={saving}
          onClick={handleSave}
          style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)", border: "none", fontWeight: 600 }}
        >
          Save Flow
        </Button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spin />
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
          {/* Palette */}
          <div
            style={{
              width: 250, flexShrink: 0, background: "#fff",
              borderRight: "1px solid #eef0f4", padding: "20px 16px", overflowY: "auto",
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 12 }}>
              Add to Menu
            </Text>
            <div className="flex flex-col gap-2.5">
              {PALETTE.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.action}
                    onClick={() => addNodeWithAction(item.action)}
                    disabled={rows.length >= 9}
                    className="flex items-center gap-3 text-left"
                    style={{
                      padding: 12, borderRadius: 12, border: "1px solid #e5e7eb",
                      background: "#fafbff", cursor: rows.length >= 9 ? "not-allowed" : "pointer",
                      opacity: rows.length >= 9 ? 0.5 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: 34, height: 34, borderRadius: 9, background: item.color,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}
                    >
                      <Icon style={{ color: "#fff", fontSize: 16 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{item.label}</div>
                      <div style={{ fontSize: 11.5, color: "#9ca3af" }}>{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 24, padding: 14, borderRadius: 12, background: "#f5f6ff", border: "1px solid rgba(37,99,235,0.12)" }}>
              <Text style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8", display: "block", marginBottom: 4 }}>
                How it works
              </Text>
              <Text style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>
                Click a type on the left to add a key, then drag it around the canvas. Click a key to edit it on the right.
              </Text>
            </div>
          </div>

          {/* Canvas + properties panel (DtmfFlowBuilder renders both) */}
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, padding: 20, display: "flex" }}>
            <DtmfFlowBuilder
              rows={rows}
              onChange={setRows}
              audioFiles={audioFiles}
              getPopupContainer={() => containerRef.current || document.body}
              showAddButton={false}
              fillHeight
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DtmfFlowEditor;

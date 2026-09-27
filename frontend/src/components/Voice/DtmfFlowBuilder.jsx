import { useRef, useState, useEffect } from "react";
import { Button, Card, Input, Radio, Select, Typography } from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  SoundOutlined,
  SwapOutlined,
  AppstoreOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  MinusOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const ACTION_META = {
  audio:    { label: "Play Audio",    icon: SoundOutlined },
  transfer: { label: "Transfer Call", icon: SwapOutlined },
  submenu:  { label: "Sub-Menu",      icon: AppstoreOutlined },
  back:     { label: "Go Back",       icon: RollbackOutlined },
  record:   { label: "Record Key",    icon: CheckCircleOutlined },
};

export const MAX_DEPTH = 5;
const MAX_ROWS = 9;

const DEPTH_COLORS = ["#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#059669"];

export const emptyRow = () => ({
  id: Date.now() + Math.random(),
  digit: "",
  action: "audio", // audio | transfer | submenu | back | record
  audio: "",
  after: "hangup", // hangup | repeat
  number: "",
  promptAudio: "",
  rows: [],
  x: null,
  y: null,
});

/**
 * Strips UI-only fields and drops incomplete rows, producing the nested
 * dtmf_flow payload the backend expects. Returns null when nothing valid.
 */
export function toDtmfFlowPayload(rows) {
  const clean = (list) =>
    (list || [])
      .filter((r) => {
        if (!/^[0-9]$/.test(r.digit)) return false;
        if (r.action === "audio") return !!r.audio;
        if (r.action === "transfer") {
          if (!/^\d{10,16}$/.test(r.number)) return false;
          if (
            (r.afterTransfer === "audio" || r.afterTransfer === "rating") &&
            !r.afterTransferAudio
          )
            return false;
          return true;
        }
        if (r.action === "submenu") return !!r.promptAudio && clean(r.rows).length > 0;
        if (r.action === "back" || r.action === "record") return true;
        return false;
      })
      .map((r) => {
        if (r.action === "audio") {
          return { digit: r.digit, action: "audio", audio: r.audio, after: r.after || "hangup" };
        }
        if (r.action === "transfer") {
          const out = { digit: r.digit, action: "transfer", number: r.number };
          const fallbacks = [r.number2, r.number3].filter((n) =>
            /^\d{10,16}$/.test(n || ""),
          );
          if (fallbacks.length > 0) out.fallback_numbers = fallbacks;
          if (r.afterTransfer && r.afterTransfer !== "hangup") {
            out.after_transfer = r.afterTransfer;
            if (r.afterTransfer === "audio" || r.afterTransfer === "rating") {
              out.after_transfer_audio = r.afterTransferAudio;
            }
          }
          return out;
        }
        if (r.action === "submenu") {
          return {
            digit: r.digit,
            action: "submenu",
            prompt_audio: r.promptAudio,
            rows: clean(r.rows),
          };
        }
        if (r.action === "record") {
          return { digit: r.digit, action: "record" };
        }
        return { digit: r.digit, action: "back" };
      });

  const cleaned = clean(rows);
  return cleaned.length > 0 ? { rows: cleaned } : null;
}

// Legacy flat shape for delivery33.callback_audio compatibility - the voice
// engine's callback_audio API only understands "press digit -> play audio"
// or "press digit -> transfer to number". record/submenu/back have no
// engine-side equivalent here (that richer behavior only exists in the
// nested dtmf_flow/ivr_flows.flow_json built alongside this, which isn't
// forwarded to this engine - see voice-dispatch.worker.ts). Those rows are
// just skipped rather than nulling out the whole flow, so any audio/
// transfer keys in the same flow still reach the engine and work.
export function toFlatCallbackAudio(rows) {
  const valid = (rows || [])
    .filter((r) => /^[0-9]$/.test(r.digit))
    .filter((r) => r.action === "audio" || r.action === "transfer");
  if (valid.length === 0) return null;

  return valid
    .filter((r) => (r.action === "audio" ? !!r.audio : /^\d{10,16}$/.test(r.number)))
    .map((r) =>
      r.action === "audio"
        ? { dtmf: r.digit, selected_audio: r.audio }
        : { dtmf: r.digit, selected_number: r.number },
    );
}

// ── Tree helpers ──────────────────────────────────────────────────────────
// Every row id is globally unique (Date.now() + Math.random() at creation),
// so these can find/update/remove a node anywhere in the tree by id alone —
// no path-tracking needed. This is what lets the whole flow, at every
// depth, live on one canvas instead of a separate drilled-into view.

function updateNodeById(rows, id, patch) {
  return rows.map((r) => {
    if (r.id === id) return { ...r, ...patch };
    if (r.action === "submenu" && r.rows?.length) {
      return { ...r, rows: updateNodeById(r.rows, id, patch) };
    }
    return r;
  });
}

function removeNodeById(rows, id) {
  return rows
    .filter((r) => r.id !== id)
    .map((r) => (r.action === "submenu" ? { ...r, rows: removeNodeById(r.rows, id) } : r));
}

function addChildById(rows, parentId, child) {
  return rows.map((r) => {
    if (r.id === parentId) return { ...r, rows: [...(r.rows || []), child] };
    if (r.action === "submenu" && r.rows?.length) {
      return { ...r, rows: addChildById(r.rows, parentId, child) };
    }
    return r;
  });
}

// Returns { row, depth, siblings } for the node with this id, or null.
function findNodeById(rows, id, depth = 1) {
  for (const r of rows) {
    if (r.id === id) return { row: r, depth, siblings: rows };
    if (r.action === "submenu" && r.rows?.length) {
      const found = findNodeById(r.rows, id, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function usedDigits(siblings, exceptId) {
  return new Set(siblings.filter((r) => r.id !== exceptId && r.digit).map((r) => r.digit));
}

function nodeSummary(row, audioFiles) {
  const audioName = (url) => audioFiles.find((a) => a.url === url)?.name;
  if (row.action === "audio") return audioName(row.audio) || "No audio selected";
  if (row.action === "transfer") return row.number ? `→ ${row.number}` : "No number set";
  if (row.action === "submenu") {
    const n = row.rows.length;
    return `${n} option${n === 1 ? "" : "s"}`;
  }
  if (row.action === "record") return "Ends call, no audio";
  return "Returns to previous menu";
}

// ── Canvas geometry ──────────────────────────────────────────────────────
const NODE_W = 180;
const STAGE_W = 2400;
const STAGE_H = 1400;
const VIEWPORT_H = 560;
const START_ANCHOR = { x: 22, y: 22 };

function defaultPosition(index) {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return { x: 40 + col * 210, y: 70 + row * 140 };
}

// Children cascade to the right of their parent so they read as "inside"
// it, not as unrelated nodes sharing the same canvas.
function childDefaultPosition(parentPos, childIndex) {
  return { x: parentPos.x + 230, y: parentPos.y + childIndex * 100 };
}

// Where an incoming connector points TO — left edge of the card.
function nodeTargetAnchor(pos) {
  return { x: pos.x, y: pos.y + 28 };
}

// Where a node's own children's connectors start FROM — right edge of the
// card. Using the same (left-edge) point for both ends put the midpoint
// (and its digit badge) underneath the parent card itself, since children
// sit close to their parent; anchoring from the right edge keeps the whole
// connector — and its badge — in the open space between the two cards.
function nodeSourceAnchor(pos) {
  return { x: pos.x + NODE_W, y: pos.y + 28 };
}

function connectorPath(from, to) {
  const dx = Math.max(50, Math.abs(to.x - from.x) / 2);
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

// Walks the whole tree (respecting collapsed submenus) into one flat list
// of { row, pos, depth, parentAnchor } ready to render on a single canvas.
function flattenTree(rows, depth, parentAnchor, collapsed) {
  let out = [];
  rows.forEach((row, index) => {
    const pos = row.x != null && row.y != null ? { x: row.x, y: row.y } : defaultPosition(index);
    out.push({ row, pos, depth, parentAnchor });
    if (row.action === "submenu" && row.rows?.length && !collapsed.has(row.id)) {
      out = out.concat(flattenTree(row.rows, depth + 1, nodeSourceAnchor(pos), collapsed));
    }
  });
  return out;
}

const NodeCard = ({ row, pos, depth, selected, audioFiles, collapsed, readOnly, onMouseDown, onToggleCollapse }) => {
  const meta = ACTION_META[row.action] || ACTION_META.audio;
  const Icon = meta.icon;
  const color = DEPTH_COLORS[(depth - 1) % DEPTH_COLORS.length];
  return (
    <div
      onMouseDown={onMouseDown}
      className="select-none"
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: NODE_W,
        padding: 12,
        borderRadius: 14,
        background: "#fff",
        border: selected ? `2px solid ${color}` : "1px solid #e5e7eb",
        boxShadow: selected ? `0 6px 18px ${color}26` : "0 2px 8px rgba(15,23,42,0.05)",
        cursor: readOnly ? "default" : "grab",
        zIndex: selected ? 2 : 1,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          style={{
            width: 26, height: 26, borderRadius: 7, background: color,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <Icon style={{ color: "#fff", fontSize: 13 }} />
        </div>
        <Text style={{ fontSize: 10.5, fontWeight: 800, color, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {meta.label}
        </Text>
        {row.action === "submenu" && row.rows?.length > 0 && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
            title={collapsed ? "Expand" : "Collapse"}
            style={{
              marginLeft: "auto", width: 18, height: 18, borderRadius: 5,
              border: "1px solid #e5e7eb", background: "#f9fafb", display: "flex",
              alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
            }}
          >
            {collapsed ? <PlusOutlined style={{ fontSize: 8 }} /> : <MinusOutlined style={{ fontSize: 8 }} />}
          </button>
        )}
      </div>
      <div className="text-sm font-bold text-gray-900 truncate">
        {row.digit ? `Key ${row.digit}` : "No key assigned"}
      </div>
      <div className="text-xs text-gray-500 truncate mt-0.5">{nodeSummary(row, audioFiles)}</div>
    </div>
  );
};

const AddNodeButton = ({ onClick, disabled, label }) => (
  <Button type="dashed" icon={<PlusOutlined />} onClick={onClick} disabled={disabled}>
    {label}
  </Button>
);

const PropertiesPanel = ({ row, taken, depth, audioFiles, getPopupContainer, onChange, onDelete, onAddChild, onClose }) => {
  const color = DEPTH_COLORS[(depth - 1) % DEPTH_COLORS.length];
  const audioSelect = (value, onSelect, placeholder) => (
    <Select
      placeholder={placeholder}
      value={value || undefined}
      onChange={onSelect}
      className="w-full"
      getPopupContainer={getPopupContainer}
      showSearch
      optionFilterProp="children"
    >
      {audioFiles.map((audio) => (
        <Select.Option key={audio.id} value={audio.url}>
          {audio.name}
        </Select.Option>
      ))}
    </Select>
  );

  const meta = ACTION_META[row.action] || ACTION_META.audio;
  const Icon = meta.icon;

  return (
    <Card size="small" style={{ borderTop: `3px solid ${color}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div style={{ width: 28, height: 28, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ color: "#fff", fontSize: 14 }} />
        </div>
        <Text strong className="text-sm">{meta.label}</Text>
        <Text className="text-xs text-gray-400">level {depth}</Text>
        <button
          onClick={onClose}
          title="Minimize panel"
          className="ml-auto"
          style={{
            width: 22, height: 22, borderRadius: 6,
            border: "1px solid #e5e7eb", background: "#f9fafb", display: "flex",
            alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
          }}
        >
          <MinusOutlined style={{ fontSize: 9, color: "#6b7280" }} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <Text className="text-xs text-gray-500 block mb-1">Key Press</Text>
          <Select
            value={row.digit || undefined}
            placeholder="Choose a key"
            className="w-full"
            onChange={(v) => onChange({ digit: v })}
            getPopupContainer={getPopupContainer}
          >
            {"1234567890".split("").map((d) => (
              <Select.Option key={d} value={d} disabled={taken.has(d)}>
                {d}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div>
          <Text className="text-xs text-gray-500 block mb-1">Action</Text>
          <Select
            value={row.action}
            className="w-full"
            onChange={(v) => onChange({ action: v })}
            getPopupContainer={getPopupContainer}
          >
            <Select.Option value="audio">Play Audio</Select.Option>
            <Select.Option value="record">Record Key Only</Select.Option>
            <Select.Option value="transfer">Forward Call</Select.Option>
            {depth < MAX_DEPTH && (
              <Select.Option value="submenu">Open Sub-menu</Select.Option>
            )}
            {depth > 1 && <Select.Option value="back">Go Back</Select.Option>}
          </Select>
        </div>

        {row.action === "audio" && (
          <>
            <div>
              <Text className="text-xs text-gray-500 block mb-1">Audio to play</Text>
              {audioSelect(row.audio, (v) => onChange({ audio: v }), "--Select Audio--")}
            </div>
            <div>
              <Text className="text-xs text-gray-500 block mb-1">After playing</Text>
              <Radio.Group
                value={row.after || "hangup"}
                onChange={(e) => onChange({ after: e.target.value })}
              >
                <Radio value="hangup">Hang up</Radio>
                <Radio value="repeat">Back to menu</Radio>
              </Radio.Group>
            </div>
          </>
        )}

        {row.action === "transfer" && (
          <>
            <div>
              <Text className="text-xs text-gray-500 block mb-1">Forward to number</Text>
              <Input
                placeholder="Phone number"
                value={row.number}
                maxLength={12}
                onChange={(e) => onChange({ number: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div>
              <Text className="text-xs text-gray-500 block mb-1">Backup number 1 (optional)</Text>
              <Input
                placeholder="If 1st doesn't answer"
                value={row.number2}
                maxLength={12}
                onChange={(e) => onChange({ number2: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div>
              <Text className="text-xs text-gray-500 block mb-1">Backup number 2 (optional)</Text>
              <Input
                placeholder="If 2nd doesn't answer"
                value={row.number3}
                maxLength={12}
                onChange={(e) => onChange({ number3: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div>
              <Text className="text-xs text-gray-500 block mb-1">After forward ends</Text>
              <Select
                value={row.afterTransfer || "hangup"}
                className="w-full"
                onChange={(v) => onChange({ afterTransfer: v })}
                getPopupContainer={getPopupContainer}
              >
                <Select.Option value="hangup">Hang up</Select.Option>
                <Select.Option value="menu">Play main menu again</Select.Option>
                <Select.Option value="audio">Play an audio</Select.Option>
                <Select.Option value="rating">Ask for rating (1-5)</Select.Option>
              </Select>
            </div>
            {(row.afterTransfer === "audio" || row.afterTransfer === "rating") && (
              <div>
                <Text className="text-xs text-gray-500 block mb-1">
                  {row.afterTransfer === "rating"
                    ? "Rating question audio (e.g. press 1-5)"
                    : "Audio to play after forward"}
                </Text>
                {audioSelect(row.afterTransferAudio, (v) => onChange({ afterTransferAudio: v }), "--Select Audio--")}
              </div>
            )}
          </>
        )}

        {row.action === "submenu" && (
          <>
            <div>
              <Text className="text-xs text-gray-500 block mb-1">
                Sub-menu audio (the question callers hear)
              </Text>
              {audioSelect(row.promptAudio, (v) => onChange({ promptAudio: v }), "--Select menu prompt audio--")}
            </div>
            <AddNodeButton
              onClick={onAddChild}
              disabled={(row.rows?.length || 0) >= MAX_ROWS}
              label={`+ Add option here (${row.rows?.length || 0}/${MAX_ROWS})`}
            />
          </>
        )}

        {row.action === "back" && (
          <Text className="text-gray-500 italic text-sm block">
            Returns to the previous menu
          </Text>
        )}

        {row.action === "record" && (
          <Text className="text-gray-500 italic text-sm block">
            Saves the key press and ends the call (no audio)
          </Text>
        )}
      </div>

      <Button danger block icon={<DeleteOutlined />} onClick={onDelete} className="mt-4">
        Remove This Key
      </Button>
    </Card>
  );
};

const DtmfFlowBuilder = ({
  rows, onChange, audioFiles, getPopupContainer,
  showAddButton = true, // the full-screen editor has its own sidebar palette instead
  fillHeight = false,   // canvas fills its parent's height instead of a fixed viewport
  readOnly = false,     // preview only — no add/drag/edit/delete, no properties panel
}) => {
  const [selectedId, setSelectedId] = useState(null);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const canvasRef = useRef(null);
  const dragState = useRef(null);

  const addRootRow = () => {
    if (rows.length >= MAX_ROWS) return;
    const pos = defaultPosition(rows.length);
    const row = { ...emptyRow(), x: pos.x, y: pos.y };
    onChange([...rows, row]);
    setSelectedId(row.id);
  };

  const addChildRow = (parentId, parentPos) => {
    const parentInfo = findNodeById(rows, parentId);
    const childIndex = parentInfo?.row.rows?.length || 0;
    const pos = childDefaultPosition(parentPos, childIndex);
    const child = { ...emptyRow(), x: pos.x, y: pos.y };
    onChange(addChildById(rows, parentId, child));
    setSelectedId(child.id);
    setCollapsed((prev) => {
      if (!prev.has(parentId)) return prev;
      const next = new Set(prev);
      next.delete(parentId);
      return next;
    });
  };

  const updateRow = (id, patch) => onChange(updateNodeById(rows, id, patch));

  const removeRow = (id) => {
    onChange(removeNodeById(rows, id));
    if (selectedId === id) setSelectedId(null);
  };

  const toggleCollapse = (id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startDrag = (e, row, pos) => {
    if (readOnly || e.button !== 0) return;
    const stageRect = canvasRef.current.getBoundingClientRect();
    dragState.current = {
      id: row.id,
      offsetX: e.clientX - stageRect.left - pos.x,
      offsetY: e.clientY - stageRect.top - pos.y,
    };
    setSelectedId(row.id);
  };

  useEffect(() => {
    const onMove = (e) => {
      const drag = dragState.current;
      if (!drag || !canvasRef.current) return;
      const stageRect = canvasRef.current.getBoundingClientRect();
      const x = Math.min(STAGE_W - NODE_W, Math.max(0, e.clientX - stageRect.left - drag.offsetX));
      const y = Math.min(STAGE_H - 40, Math.max(0, e.clientY - stageRect.top - drag.offsetY));
      onChange(updateNodeById(rows, drag.id, { x, y }));
    };
    const onUp = () => { dragState.current = null; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const flat = flattenTree(rows, 1, null, collapsed);
  const selectedInfo = selectedId ? findNodeById(rows, selectedId) : null;

  return (
    <div
      className={fillHeight ? "flex gap-4 items-stretch h-full min-w-0" : "flex gap-4 items-start flex-wrap"}
      style={fillHeight ? { minHeight: 0 } : undefined}
    >
      {/* min-width: 0 + overflow: hidden — without both, this flex item
          refuses to shrink below the canvas stage's full content width
          (2400px), pushing the properties panel off-screen to the right
          instead of leaving it visible beside a scrollable canvas. */}
      <div
        className={fillHeight ? "flex-1 flex flex-col" : "flex-1"}
        style={{ minWidth: 280, overflow: "hidden", minHeight: fillHeight ? 0 : undefined }}
      >
        <div className="flex items-center justify-between mb-2" style={{ flexShrink: 0 }}>
          <Text className="text-xs text-gray-400">
            {readOnly
              ? "Preview of this flow — build or edit flows from DTMF Flows."
              : "Drag keys to arrange the flow. Click a key to edit it. Select a sub-menu to add options inside it — everything stays on one flow."}
          </Text>
          {showAddButton && !readOnly && (
            <AddNodeButton
              onClick={addRootRow}
              disabled={rows.length >= MAX_ROWS}
              label={rows.length >= MAX_ROWS ? "Max 9 keys" : "Add key"}
            />
          )}
        </div>

        <div
          style={{
            ...(fillHeight ? { flex: 1, minHeight: 0 } : { height: VIEWPORT_H }),
            overflow: "auto",
            border: "1px solid #eef0f4",
            borderRadius: 16,
          }}
        >
          <div
            ref={canvasRef}
            className="relative"
            style={{
              width: STAGE_W,
              height: STAGE_H,
              background: "#fafbfd",
              backgroundImage: "radial-gradient(#e2e6ef 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            {flat.length === 0 && (
              <div style={{ position: "absolute", left: 24, top: 24 }}>
                <Text className="text-xs text-gray-400">
                  {readOnly
                    ? "No flow selected — pick one above, or leave it as a simple broadcast."
                    : `Leave empty for a simple broadcast, or add a key${showAddButton ? " above." : " from the sidebar."}`}
                </Text>
              </div>
            )}

            <svg width={STAGE_W} height={STAGE_H} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
              {flat.length > 0 && (
                <circle cx={START_ANCHOR.x} cy={START_ANCHOR.y} r={5} fill="#94a3b8" />
              )}
              {flat.map(({ row, pos, depth, parentAnchor }) => {
                const from = parentAnchor || START_ANCHOR;
                const to = nodeTargetAnchor(pos);
                const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
                const color = DEPTH_COLORS[(depth - 1) % DEPTH_COLORS.length];
                return (
                  <g key={row.id}>
                    <path
                      d={connectorPath(from, to)}
                      stroke={row.id === selectedId ? color : "#c7ccd6"}
                      strokeWidth={row.id === selectedId ? 2.5 : 2}
                      fill="none"
                    />
                    <circle cx={mid.x} cy={mid.y} r={11} fill={row.digit ? color : "#c7ccd6"} />
                    <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="10.5" fontWeight="800">
                      {row.digit || "?"}
                    </text>
                  </g>
                );
              })}
            </svg>

            {flat.map(({ row, pos, depth }) => (
              <NodeCard
                key={row.id}
                row={row}
                pos={pos}
                depth={depth}
                selected={row.id === selectedId}
                audioFiles={audioFiles}
                collapsed={collapsed.has(row.id)}
                readOnly={readOnly}
                onMouseDown={readOnly ? undefined : (e) => startDrag(e, row, pos)}
                onToggleCollapse={() => toggleCollapse(row.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {!readOnly && selectedInfo && (
        <div style={{ width: 300, flexShrink: 0 }}>
          <PropertiesPanel
            row={selectedInfo.row}
            taken={usedDigits(selectedInfo.siblings, selectedInfo.row.id)}
            depth={selectedInfo.depth}
            audioFiles={audioFiles}
            getPopupContainer={getPopupContainer}
            onChange={(patch) => updateRow(selectedInfo.row.id, patch)}
            onDelete={() => removeRow(selectedInfo.row.id)}
            onClose={() => setSelectedId(null)}
            onAddChild={() => {
              const flatEntry = flat.find((f) => f.row.id === selectedInfo.row.id);
              addChildRow(selectedInfo.row.id, flatEntry?.pos || { x: 40, y: 70 });
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DtmfFlowBuilder;

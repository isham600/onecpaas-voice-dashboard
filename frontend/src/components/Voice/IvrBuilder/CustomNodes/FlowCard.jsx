import { Handle, Position } from "@xyflow/react";
import { ToolOutlined, CloseOutlined } from "@ant-design/icons";

export const HIDDEN_HANDLE = "!w-px !h-px !min-w-0 !min-h-0 !border-0 !bg-transparent";

// Shared step card: flat colored box with "#n Label" and a subtitle, a wrench
// on the right edge to configure, and a hover "x" to remove. Card clicks are
// handled by the canvas's onNodeClick (nodes aren't draggable/selectable).
const FlowCard = ({ id, seq, color, icon: Icon, label, subtitle, onEdit, onDelete, hasTarget = true, hasSource = true }) => (
  <div className="group relative w-full h-full">
    {hasTarget && <Handle type="target" position={Position.Top} isConnectable={false} className={HIDDEN_HANDLE} />}

    <div
      className={`w-full h-full rounded-md shadow-sm text-white flex flex-col items-center justify-center px-8 ${
        onEdit ? "cursor-pointer" : "cursor-default"
      }`}
      style={{ background: color }}
    >
      <div className="flex items-center gap-2 max-w-full text-[13px] font-semibold leading-tight">
        {Icon && <Icon className="flex-shrink-0" />}
        <span className="truncate">
          {seq ? `#${seq} ` : ""}
          {label}
        </span>
      </div>
      {subtitle && <div className="text-[11px] opacity-90 truncate max-w-full mt-0.5">{subtitle}</div>}
    </div>

    {onEdit && (
      <button
        type="button"
        title="Configure step"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(id);
        }}
        className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-gray-300 text-gray-600 hover:text-gray-900 shadow-sm flex items-center justify-center text-xs"
      >
        <ToolOutlined />
      </button>
    )}

    {onDelete && (
      <button
        type="button"
        title="Remove step"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(id);
        }}
        className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-white border border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-300 shadow-sm flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <CloseOutlined />
      </button>
    )}

    {hasSource && <Handle type="source" position={Position.Bottom} isConnectable={false} className={HIDDEN_HANDLE} />}
  </div>
);

export default FlowCard;

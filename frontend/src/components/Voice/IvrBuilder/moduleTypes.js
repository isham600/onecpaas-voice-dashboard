import {
  SoundOutlined,
  NumberOutlined,
  FieldNumberOutlined,
  LinkOutlined,
  ExportOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

// The "List Of Module" picker options. `shortLabel` is what fits on a canvas card.
export const MODULE_TYPES = [
  { type: "announcement", label: "Announcement", shortLabel: "Announcement", icon: SoundOutlined, color: "#2563EB" },
  { type: "dtmf", label: "DTMF (Key Press) V2", shortLabel: "DTMF V2", icon: NumberOutlined, color: "#0EA5E9" },
  { type: "longDtmf", label: "Long-DTMF (Multi Key Press) V1", shortLabel: "Long-DTMF V1", icon: FieldNumberOutlined, color: "#64748B" },
  { type: "webhook", label: "Webhook", shortLabel: "Webhook", icon: LinkOutlined, color: "#F59E0B" },
  { type: "callTransfer", label: "Call Transfer", shortLabel: "Call Transfer", icon: ExportOutlined, color: "#6366F1" },
  { type: "hangup", label: "Hangup / Cut the Call", shortLabel: "Hangup", icon: CloseCircleOutlined, color: "#DC2626" },
];

export const getModuleMeta = (type) =>
  MODULE_TYPES.find((module) => module.type === type) || MODULE_TYPES[0];

export const summarizeModule = (type, config = {}) => {
  if (config.title) return config.title;
  switch (type) {
    case "announcement":
      return config.sourceTitle || (config.type === "text" ? "Text announcement" : "Not configured");
    case "dtmf": {
      const count = config.keys?.length || 0;
      return count ? `${count} key${count > 1 ? "s" : ""} mapped` : "Pick keys to branch";
    }
    case "longDtmf":
      return config.strategy === "keyBased" ? "Key based termination" : "Not configured";
    case "webhook":
      return config.url || "Not configured";
    case "callTransfer":
      return config.phoneNumber || "Not configured";
    default:
      return "";
  }
};

import {
  WhatsAppOutlined, MessageOutlined, CommentOutlined, MobileOutlined,
  PhoneOutlined, MailOutlined, InstagramOutlined, SendOutlined,
  VideoCameraOutlined, AppstoreOutlined,
} from "@ant-design/icons";

// Service names come as free text from the channels table (front_end_name) —
// match by keyword so new variants (e.g. "International Bulk Whatsapp") still land.
const SERVICE_META = [
  { test: /whatsapp/i,  color: "#25D366", icon: WhatsAppOutlined },
  { test: /\bsms\b/i,   color: "#2563EB", icon: MessageOutlined },
  { test: /\brcs\b/i,   color: "#B45309", icon: CommentOutlined },
  { test: /gsm/i,       color: "#7C3AED", icon: MobileOutlined },
  { test: /voice/i,     color: "#C2410C", icon: PhoneOutlined },
  { test: /email/i,     color: "#0891B2", icon: MailOutlined },
  { test: /instagram/i, color: "#DB2777", icon: InstagramOutlined },
  { test: /telegram/i,  color: "#229ED9", icon: SendOutlined },
  { test: /video/i,     color: "#9333EA", icon: VideoCameraOutlined },
];
const DEFAULT_SERVICE_META = { color: "#6B7280", icon: AppstoreOutlined };

export const getServiceMeta = (name) =>
  SERVICE_META.find((m) => m.test.test(name || "")) || DEFAULT_SERVICE_META;

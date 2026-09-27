import axios from "axios";

const SUPPORT_API_BASE_URL =
  import.meta.env.VITE_SUPPORT_API_BASE_URL || "https://emsapi.nuke.co.in";

const supportApi = axios.create({
  baseURL: SUPPORT_API_BASE_URL,
});

supportApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const SUPPORT_BASE = "/api/support";
const CHAT_BASE = "/api/chat";

const appendDefinedFields = (formData, payload) => {
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });
};

export const createPlatformSupportTicket = (payload, file) => {
  if (file) {
    const formData = new FormData();
    appendDefinedFields(formData, payload);
    formData.append("file", file);

    return supportApi.post(SUPPORT_BASE, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  return supportApi.post(SUPPORT_BASE, payload, {
    headers: { "Content-Type": "application/json" },
  });
};

export const getSupportTicketsByPlatform = (platform, username) =>
  supportApi.get(`${SUPPORT_BASE}/platform/${encodeURIComponent(platform)}`, {
    params: username ? { username } : undefined,
  });

export const getTicketChatByTicketId = (ticketId) =>
  supportApi.get(`${CHAT_BASE}/${encodeURIComponent(ticketId)}`);

export const sendTicketChatMessage = (payload) =>
  supportApi.post(CHAT_BASE, payload, {
    headers: { "Content-Type": "application/json" },
  });

export const uploadTicketChatAttachment = ({
  endpoint,
  fieldName,
  file,
  ticket_id,
  username,
  message,
  type,
}) => {
  const formData = new FormData();
  formData.append("ticket_id", ticket_id);
  formData.append("username", username);
  formData.append("type", type);
  if (message) {
    formData.append("message", message);
  }
  formData.append(fieldName, file);

  return supportApi.post(`${CHAT_BASE}/${endpoint}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getTicketChatAttachmentUrl = (filename, ticketId) => {
  const base = SUPPORT_API_BASE_URL.replace(/\/$/, "");
  return `${base}${CHAT_BASE}/file/${encodeURIComponent(filename)}?ticket_id=${encodeURIComponent(ticketId)}`;
};

export const sendTicketOtp = (payload) =>
  supportApi.post("/api/ticket-otp/send-otp", payload, {
    headers: { "Content-Type": "application/json" },
  });

export const closeTicketWithoutOtp = (payload) =>
  supportApi.post("/api/ticket-otp/close-without-otp", payload, {
    headers: { "Content-Type": "application/json" },
  });

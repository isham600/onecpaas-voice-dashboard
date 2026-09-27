import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const NEW_BASE_URL = import.meta.env.VITE_BASE_URL;
// Falls back to the origin of API_BASE_URL when VITE_AUTH_BASE_URL is not set
const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_BASE_URL || new URL(API_BASE_URL).origin;

if (!API_BASE_URL || !NEW_BASE_URL) {
  throw new Error("Base URLs not specified");
}

// Create separate axios instances for each base URL
const primaryApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const secondaryApi = axios.create({
  baseURL: NEW_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auth API instance (http://192.168.1.23:3005)
const authApiInstance = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const SESSION_ERROR_CODES = new Set([
  "TOKEN_EXPIRED",
  "TOKEN_INVALID",
  "UNAUTHORIZED",
]);

const PUBLIC_AUTH_PATHS = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/verify-otp",
  "/api/v1/auth/reset-password",
]);

const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  // Clear any leftover impersonation state so the next login on this
  // browser doesn't inherit a stale "viewing as X" badge in the navbar.
  localStorage.removeItem("_admin_token");
  localStorage.removeItem("_admin_user");
  localStorage.removeItem("_impersonating");
  window.dispatchEvent(new Event("sessionExpired"));
};

const isSessionError = (code) => {
  if (SESSION_ERROR_CODES.has(code)) return true;
  return false;
};

const isPublicAuthRequest = (config) => {
  const url = config?.url || "";
  return Array.from(PUBLIC_AUTH_PATHS).some((path) => url.endsWith(path));
};

// Add interceptors to both instances
const addAuthInterceptor = (instance) => {
  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // Response interceptor for auth errors
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const requestConfig = error?.config;
      const status = error?.response?.status;
      const code   = error?.response?.data?.code || "";
      const message = error?.response?.data?.message || "";

      if (isPublicAuthRequest(requestConfig)) {
        return Promise.reject(error);
      }

      // Handle 401 — invalid/expired token → show session expired modal
      if (isSessionError(code)) {
        clearSession();
        return Promise.reject(error);
      }

      // Handle 403 with account expired message
      if (status === 403 && message.toLowerCase().includes("account expired")) {
        clearSession();
        if (typeof window !== "undefined") {
          import("antd").then(({ message: antdMessage }) => {
            antdMessage.error("Account expired. Please contact your administrator.");
          });
          setTimeout(() => { window.location.href = "/"; }, 1500);
        }
      }

      return Promise.reject(error);
    },
  );

  return instance;
};

// Auth instance interceptor — skips token for login/register/password-reset
authApiInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    const publicPaths = [
      "/api/v1/auth/login",
      "/api/v1/auth/register",
      "/api/v1/auth/forgot-password",
      "/api/v1/auth/verify-otp",
      "/api/v1/auth/reset-password",
    ];
    if (token && !publicPaths.includes(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Auth instance response interceptor for auth errors
authApiInstance.interceptors.response.use(
  (response) => response,
    (error) => {
      const requestConfig = error?.config;
      const status  = error?.response?.status;
      const code    = error?.response?.data?.code || "";
      const message = error?.response?.data?.message || "";

      if (isPublicAuthRequest(requestConfig)) {
        return Promise.reject(error);
      }

      if (isSessionError(code)) {
        clearSession();
        return Promise.reject(error);
      }

    if (status === 403 && message.toLowerCase().includes("account expired")) {
      clearSession();
      if (typeof window !== "undefined") {
        import("antd").then(({ message: antdMessage }) => {
          antdMessage.error("Account expired. Please contact your administrator.");
        });
        setTimeout(() => { window.location.href = "/"; }, 1500);
      }
    }

    return Promise.reject(error);
  },
);

// Apply interceptors
const api = addAuthInterceptor(primaryApi);
const newApi = addAuthInterceptor(secondaryApi);
export const authApi = authApiInstance;

// Downloads a file via authenticated request and triggers a browser save-as dialog.
// `url` may be a relative path — authApiInstance.baseURL is the backend origin.
export const downloadAuthenticatedFile = async (url, filename = "export.csv") => {
  const res = await authApiInstance.get(url, { responseType: "blob" });
  const blob = new Blob([res.data], { type: res.headers["content-type"] || "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(href);
};

// Streaming download — calls onProgress(received, total) as bytes arrive.
// Returns a Blob. Use this for large files so the user sees real-time progress
// instead of a blank wait while the browser buffers the entire response.
export const streamDownloadFile = async (relativeUrl, onProgress, signal) => {
  const token = localStorage.getItem("token");
  const fullUrl = `${AUTH_BASE_URL}${relativeUrl}`;
  const response = await fetch(fullUrl, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Download failed (${response.status})`);
  }
  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  const contentType = response.headers.get("content-type") || "text/csv;charset=utf-8;";
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress?.(received, total || received);
  }
  return new Blob(chunks, { type: contentType });
};

// ─── Auth endpoints (http://192.168.1.23:3005) ───────────────────────────────
export const LOGIN = `/api/v1/auth/login`;
export const SIGN_UP = `/api/v1/auth/register`;
export const GET_ME = `/api/v1/auth/me`;
export const LOGIN_HISTORY = `/api/v1/auth/login-history`;

// ─── Profile/Me endpoint (http://192.168.1.23:3005) ──────────────────────────
export const PROFILE_ME = `/api/v1/profile/me`;
export const PROFILE_API_TOKEN = `/api/v1/profile/api-token`;

// ─── WhatsApp Campaign endpoints (http://192.168.1.23:3005) ──────────────────
export const WHATSAPP_CAMPAIGN_SUMMARY = `/api/v1/whatsapp/campaign/summary`;
export const WHATSAPP_CAMPAIGN_API_SUMMARY = `/api/v1/whatsapp/campaign/api/summary`;
export const WHATSAPP_CAMPAIGN_OVERVIEW = `/api/v1/whatsapp/campaign/overview`;
export const WHATSAPP_CAMPAIGN_SUBMIT = `/api/v1/whatsapp/campaign/submit`;

// ─── WhatsApp Template endpoints (http://192.168.1.23:3005) ──────────────────
export const WHATSAPP_TEMPLATE = `/api/v1/whatsapp/template`;
export const WHATSAPP_TEMPLATE_LANGUAGES = `/api/v1/whatsapp/template/languages`;
export const WHATSAPP_TEMPLATE_VERIFY = `/api/v1/whatsapp/template/verify`;
export const WHATSAPP_TEMPLATE_ACTIVE = `/api/v1/whatsapp/template/active`;

// ─── File Hosting endpoints (http://192.168.1.23:3005) ───────────────────────
export const FILE_HOSTING_FOLDERS = `/api/v1/file-hosting/folders`;
export const FILE_HOSTING_FILES = `/api/v1/file-hosting/files`;
export const FILE_HOSTING_UPLOAD = `/api/v1/file-hosting/upload`;

// ─── WhatsApp Automation endpoints (http://192.168.1.23:3005) ────────────────
export const WHATSAPP_AUTOMATION = `/api/v1/whatsapp/automation`;

export const MOBILE_OTP = `${API_BASE_URL}/send-mobile-otp`;
export const VERIFY_MOBILE_OTP = `${API_BASE_URL}/verify-mobile-otp`;
export const SEND_EMAIL_OTP = `${API_BASE_URL}/send-email-otp`;
export const VERIFY_EMAIL_OTP = `${API_BASE_URL}/verify-email-otp`;
export const CHANGE_PASSWORD = `${API_BASE_URL}/update-password`;
export const LOGOUT = `${API_BASE_URL}/logout`;
export const TEMPLATE_DATA = `${API_BASE_URL}/template`;
export const TEMPLATE_SYNC = `${API_BASE_URL}/templates/sync-templates`;
export const SUBMIT_BROADCAST_DATA = `${API_BASE_URL}/insert-broadcast-data`;
export const SUBMIT_BROADCAST_DATA_CSV = `${API_BASE_URL}/broadcastcsv`;

export const CHATS_LIST = `${API_BASE_URL}/filtered-data`;
export const ALL_CHATS = `${API_BASE_URL}/filtered-data-pdf`;
export const CHAT_STATUS = `${API_BASE_URL}/chat-message-room/update`;
export const ADVANCE_FILTER_CHAT_DATA = `${API_BASE_URL}/advance-filtered-data`;
export const CHAT_DATA = `${API_BASE_URL}/chat-messages`;
export const AGENTS_LIST = `${API_BASE_URL}/assign-users`;
export const GET_CHARTDATA = `${API_BASE_URL}/chart-data`;
export const GET_BROADCAST = `${API_BASE_URL}/broadcast`;
export const GET_BROADCASTCOUNT = `${API_BASE_URL}/broadcaststatus-counts`;
export const GET_CREDITS = `${API_BASE_URL}/credits`;
export const SUPPORT_TICKETS = `${API_BASE_URL}/support-tickets`;
export const BROADCAST_SPECIFIC = `${API_BASE_URL}/broadcast/specific`;
export const BROADCAST_SPECIFIC_CAMPAIGN = `${API_BASE_URL}/broadcastSpecific`;
export const QUICK_REPLIES = `${API_BASE_URL}/quick-replies`;
export const USER_NOTES = `${API_BASE_URL}/chat-inbox/note`;
export const CRM_CHATS = `${API_BASE_URL}/crm/all-chat`;
export const CRM_CHAT_DETAILS = `${API_BASE_URL}/crm/specific-chat`;
export const USER_TAGS = `${API_BASE_URL}/chat-inbox/tag`;
export const CRM_BROADCAST = `${API_BASE_URL}/crm_broadcast`;
export const GROUP_CONTACTS = `${API_BASE_URL}/group-data`;
export const ASSIGN_TAG = `${API_BASE_URL}/crm_tags`;
export const GROUPS_LIST = `${API_BASE_URL}/group-names`;
export const TEAMS_DATA = `${API_BASE_URL}/teams`;
export const TRANSACTIONS = `${API_BASE_URL}/fund`;
export const IMPERSONATE = `${API_BASE_URL}/impersonate`;
export const CLIENTS = `${API_BASE_URL}/clients`;
export const TRANSACTION = `${API_BASE_URL}/client-funds`;
export const FUNDS = `${API_BASE_URL}/client-credits`;
export const WORKS = `${API_BASE_URL}/services`;
export const PROFILE = `${API_BASE_URL}/profile`;
export const INVOICE = `${API_BASE_URL}/invoice-company`;
export const INVOICE_CUSTOMER = `${API_BASE_URL}/invoice-user`;
export const INVOICE_FULL = `${API_BASE_URL}/invoice`;

export const SENDER_ID = `${API_BASE_URL}/sender-id`;
export const SMS_TEMPLATES = `${API_BASE_URL}/sms-templates`;
export const GSM_BROADCAST = `${API_BASE_URL}/gsm-broadcast`;
export const GSM_CSV_BROADCAST = `${API_BASE_URL}/gsm-csv-broadcast`;
export const GSM_READ = `${API_BASE_URL}/gsm-read`;

// SMS module (New API v1 structure)
export const SMS_SENDER_IDS = `${API_BASE_URL}/sender-ids`;
export const SMS_BROADCAST_URL = `${API_BASE_URL}/sms-broadcast`;
export const SMS_BROADCAST_CSV_URL = `${API_BASE_URL}/sms-broadcast-csv`;
export const SMS_BLACKLIST = `${API_BASE_URL}/v1/sms/gateways/blacklist`;
export const SMS_SMPP = `${API_BASE_URL}/v1/sms/gateways/smpp`;
export const SMS_SMPP_ROUTES = `${API_BASE_URL}/v1/sms/gateways/smpp/routes`;
export const SMS_SMPP_ROUTES_LIST = `${API_BASE_URL}/v1/sms/gateways/smpp/routes/names`;
export const SMS_MANAGE_TEMPLATES = `${API_BASE_URL}/managetemplates`;
export const SMS_MANAGE_SENDER_IDS = `${API_BASE_URL}/managesenderids`;

export const VOICE_DATA = `${API_BASE_URL}/get-delivery-data`;
export const VOICE_CALLER_ID = `${API_BASE_URL}/voice_caller_ids`;
export const VOICE_BROADCAST = `${API_BASE_URL}/voice-broadcast`;
export const VOICE_AUDIOS = `${API_BASE_URL}/voice_audios`;
export const GET_VOICECOUNT = `${API_BASE_URL}/voice-status`;
export const VOICE_PAUSE = `${API_BASE_URL}/voice-pause`;

export const CHATBOT_FLOW = `${API_BASE_URL}/chatbot-flow`;
export const CHATBOT_STEPS = `${API_BASE_URL}/chatbot-step`;

export const FILE_MANAGER = `${API_BASE_URL}/file-managers`;
export const FILE_FOLDER = `${API_BASE_URL}/file-folders`;
export const PERMISSIONS_READ = `${API_BASE_URL}/permissions/read`;
export const PERMISSIONS = `${API_BASE_URL}/permissions/read`;

export const WEBHOOKS_DATA = `${API_BASE_URL}/webhook-logs`;
export const WEBHOOKS = `${API_BASE_URL}/webhook`;

export const USERS_UPDATE = `${API_BASE_URL}/assign-users`;
export const TEAMS_UPDATE = `${API_BASE_URL}/teams`;

export const META_LOGIN = `${API_BASE_URL}/meta-login`;
export const META_ACTION = `${API_BASE_URL}/meta-action`;

export const BUY_NUMBER = `${API_BASE_URL}/numbers`;
export const ACTIVE_NUMBER = `${API_BASE_URL}/active-numbers`;
export const Now_Buy = `${API_BASE_URL}/payu/checkout`;

export const GET_ALL_CHANNELS = `${API_BASE_URL}/channels`;

export const CHATBOT_LOGS = `${NEW_BASE_URL}/api/user/auth/getLogsByName`;
export const CHATBOT_HISTORY_CONTACTS = `${NEW_BASE_URL}/api/user/auth/getChatbotHistory`;
export const CHATBOT_HISTORY_BY_USER = `${NEW_BASE_URL}/api/user/auth/getChatHistory`;

// Export API functions
export const signUp = (userData) => {
  return authApi.post(SIGN_UP, userData);
};

export const login = (userData) => {
  return authApi.post(LOGIN, userData);
};

// ─── Password-reset flow (public — no auth) ───────────────────────────────────
export const forgotPassword = (email) =>
  authApi.post("/api/v1/auth/forgot-password", { email });

export const verifyResetOtp = (email, otp) =>
  authApi.post("/api/v1/auth/verify-otp", { email, otp });

export const resetPassword = (reset_token, new_password) =>
  authApi.post("/api/v1/auth/reset-password", { reset_token, new_password });

export const getMe = () => {
  return authApi.get(GET_ME);
};

export const getLoginHistory = () => authApi.get(LOGIN_HISTORY);

// ─── getProfileMe with deduplication + 30s cache ────────────────────────────
let _profileMeCache = null;
let _profileMeCacheTime = 0;
let _profileMeInflight = null;
const PROFILE_ME_TTL = 30_000;

export const clearProfileMeCache = () => {
  _profileMeCache = null;
  _profileMeCacheTime = 0;
  _profileMeInflight = null;
};

export const getProfileMe = () => {
  const now = Date.now();
  if (_profileMeCache && now - _profileMeCacheTime < PROFILE_ME_TTL) {
    return Promise.resolve(_profileMeCache);
  }
  if (!_profileMeInflight) {
    _profileMeInflight = authApi
      .get(PROFILE_ME)
      .then((result) => {
        _profileMeCache = result;
        _profileMeCacheTime = Date.now();
        _profileMeInflight = null;
        return result;
      })
      .catch((err) => {
        _profileMeInflight = null;
        throw err;
      });
  }
  return _profileMeInflight;
};

export const generateApiToken = () => {
  return authApi.post(PROFILE_API_TOKEN).then((result) => {
    clearProfileMeCache();
    return result;
  });
};

export const getWhatsappCampaignSummary = (params) => {
  return authApi.get(WHATSAPP_CAMPAIGN_SUMMARY, { params });
};

export const getWhatsappCampaignApiSummary = (params) => {
  return authApi.get(WHATSAPP_CAMPAIGN_API_SUMMARY, { params });
};

export const getWhatsappCampaignOverview = (params) => {
  return authApi.get(WHATSAPP_CAMPAIGN_OVERVIEW, { params });
};

export const getWhatsappCampaignUpcoming = (params) => {
  return authApi.get(`/api/v1/whatsapp/campaign/summary/upcoming`, { params });
};

export const getWhatsappCampaignScheduled = (params) => {
  return authApi.get(`/api/v1/whatsapp/campaign/scheduled`, { params });
};

export const deleteScheduledCampaign = (request_id) => {
  return authApi.delete(`/api/v1/whatsapp/campaign/scheduled/${request_id}`);
};

export const rescheduleWhatsappCampaign = (
  request_id,
  scheduled_date,
  scheduled_time,
) => {
  return authApi.patch(`/api/v1/whatsapp/campaign/scheduled/${request_id}`, {
    scheduled_date,
    scheduled_time,
  });
};

export const getWhatsappCampaignDetails = (params) => {
  return authApi.get(`/api/v1/whatsapp/campaign/details`, { params });
};

const WA_CAMPAIGN = `/api/v1/whatsapp/campaign`;
const WA_VIRTUAL  = `/api/v1/whatsapp/virtual`;

// ── Virtual channel export (async job-queue pattern) ─────────────────────────
export const requestVirtualBroadcastExport = (requestId) =>
  authApi.post(`${WA_VIRTUAL}/export`, { request_id: requestId });

export const getVirtualExportReport = (jobId) =>
  authApi.get(`${WA_VIRTUAL}/reports/${jobId}`);

export const listVirtualExportReports = (params) =>
  authApi.get(`${WA_VIRTUAL}/reports`, { params });

export const getVirtualScheduled = (params) =>
  authApi.get(`${WA_VIRTUAL}/scheduled`, { params });

export const getVirtualOverview = (params) =>
  authApi.get(`${WA_VIRTUAL}/overview`, { params });

// ── Export POST endpoints (3 types) ──────────────────────────────────────────
export const requestSummaryExport = (params) =>
  authApi.post(`${WA_CAMPAIGN}/export`, {}, { params });

export const requestDetailsExport = (params) =>
  authApi.post(`${WA_CAMPAIGN}/details/export`, {}, { params });

export const requestContactsExport = (requestId, params) =>
  authApi.post(`${WA_CAMPAIGN}/details/${requestId}/export`, {}, { params });

export const getWhatsappCampaignReport = (params) =>
  authApi.get(`${WA_CAMPAIGN}/details/report`, { params });

export const requestReportExport = (params) =>
  authApi.post(`${WA_CAMPAIGN}/details/report/export`, {}, { params });

// ── Shared status & download (all types) ────────────────────────────────────
export const listExportReports = (params) =>
  authApi.get(`${WA_CAMPAIGN}/reports`, { params });

export const getExportReport = (jobId) =>
  authApi.get(`${WA_CAMPAIGN}/reports/${jobId}`);

export const downloadExportReport = (jobId) =>
  authApi.get(`${WA_CAMPAIGN}/reports/${jobId}/download`, {
    responseType: "blob",
  });

export const getWhatsappCampaignAnalytics = (params) => {
  return authApi.get(`/api/v1/whatsapp/campaign/analytics`, { params });
};

// Click report — same async job-queue + file-download pattern as every other
// export (requestSummaryExport, requestDetailsExport, ...). Was previously a
// direct CSV stream via reply.raw, which the browser blocked as a CORS
// violation even though the server returned 200.
export const requestClickReportExport = (requestId, params) =>
  authApi.post(`${WA_CAMPAIGN}/${requestId}/click-report/export`, {}, { params });

// ─── WhatsApp Template API functions ─────────────────────────────────────────
export const getTemplateLanguages = () => {
  return authApi.get(WHATSAPP_TEMPLATE_LANGUAGES);
};

export const verifyTemplateName = (template_name) => {
  return authApi.get(WHATSAPP_TEMPLATE_VERIFY, { params: { template_name } });
};

export const getActiveTemplates = (params) => {
  return authApi.get(WHATSAPP_TEMPLATE_ACTIVE, { params });
};

export const getAllTemplates = (params) => {
  return authApi.get(WHATSAPP_TEMPLATE, { params });
};

export const getTemplateById = (id) => {
  return authApi.get(`${WHATSAPP_TEMPLATE}/${id}`);
};

export const createTemplate = (data) => {
  return authApi.post(WHATSAPP_TEMPLATE, data);
};

export const updateTemplate = (id, data) => {
  return authApi.put(`${WHATSAPP_TEMPLATE}/${id}`, data);
};

// ─── File Hosting API functions ───────────────────────────────────────────────
export const listFolders = () => {
  return authApi.get(FILE_HOSTING_FOLDERS);
};

export const createFolder = (folder_name) => {
  return authApi.post(FILE_HOSTING_FOLDERS, { folder_name });
};

export const renameFolder = (id, folder_name) => {
  return authApi.put(`${FILE_HOSTING_FOLDERS}/${id}`, { folder_name });
};

export const deleteFolder = (id) => {
  return authApi.delete(`${FILE_HOSTING_FOLDERS}/${id}`);
};

export const listFiles = (params) => {
  return authApi.get(FILE_HOSTING_FILES, { params });
};

export const getStorageOverview = () =>
  authApi.get("/api/v1/file-hosting/storage");

export const uploadFile = (file, name, folder) => {
  const formData = new FormData();
  formData.append("file", file);
  const params = {};
  if (name) params.name = name;
  if (folder) params.folder = folder;
  return authApi.post(FILE_HOSTING_UPLOAD, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    params,
  });
};

export const deleteFile = (id) => {
  return authApi.delete(`${FILE_HOSTING_FILES}/${id}`);
};

// ─── WhatsApp Automation API functions ───────────────────────────────────────
export const createAutomation = (data) => {
  return authApi.post(WHATSAPP_AUTOMATION, data);
};

export const listAutomations = (params) => {
  return authApi.get(WHATSAPP_AUTOMATION, { params });
};

export const getAutomationById = (id) => {
  return authApi.get(`${WHATSAPP_AUTOMATION}/${id}`);
};

export const updateAutomation = (id, data) => {
  return authApi.put(`${WHATSAPP_AUTOMATION}/${id}`, data);
};

export const deleteAutomation = (id) => {
  return authApi.delete(`${WHATSAPP_AUTOMATION}/${id}`);
};

// ─── WhatsApp Automation Text endpoints ──────────────────────────────────────
export const WHATSAPP_AUTOMATION_TEXT = `/api/v1/whatsapp/automation/text`;

export const listAutomationTexts = (params) =>
  authApi.get(WHATSAPP_AUTOMATION_TEXT, { params });

export const createAutomationText = (data) =>
  authApi.post(WHATSAPP_AUTOMATION_TEXT, data);

export const getAutomationTextById = (id) =>
  authApi.get(`${WHATSAPP_AUTOMATION_TEXT}/${id}`);

export const updateAutomationText = (id, data) =>
  authApi.put(`${WHATSAPP_AUTOMATION_TEXT}/${id}`, data);

export const deleteAutomationText = (id) =>
  authApi.delete(`${WHATSAPP_AUTOMATION_TEXT}/${id}`);

// ─── WhatsApp Contacts / Groups endpoints ────────────────────────────────────
export const WA_GROUPS = `/api/v1/whatsapp/contacts/group`;
export const WA_CONTACTS = `/api/v1/whatsapp/contacts`;

// Groups
export const listGroups = (params) => authApi.get(WA_GROUPS, { params });
export const createGroup = (data) => authApi.post(WA_GROUPS, data);
export const getGroup = (id) => authApi.get(`${WA_GROUPS}/${id}`);
export const updateGroup = (id, data) =>
  authApi.put(`${WA_GROUPS}/${id}`, data);
export const deleteGroup = (id) => authApi.delete(`${WA_GROUPS}/${id}`);

// Contacts
export const listContacts = (params) => authApi.get(WA_CONTACTS, { params });
export const createContact = (data) => authApi.post(WA_CONTACTS, data);
export const getContact = (id) => authApi.get(`${WA_CONTACTS}/${id}`);
export const updateContact = (id, data) =>
  authApi.put(`${WA_CONTACTS}/${id}`, data);
export const deleteContact = (id) => authApi.delete(`${WA_CONTACTS}/${id}`);
export const bulkDeleteContacts = (ids) =>
  authApi.delete(`${WA_CONTACTS}/bulk`, { data: { ids } });
export const exportContacts = (params) =>
  authApi.get(`${WA_CONTACTS}/export`, { params, responseType: "blob" });
export const importContacts = (groupId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return authApi.post(`${WA_CONTACTS}/import`, formData, {
    params: { group_id: groupId },
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ─── RCS Team Inbox endpoints ────────────────────────────────────────────────────
export const RCS_INBOX = `/api/v1/rcs/inbox`;

// Get conversations (sidebar)
export const getRcsConversations = (params) =>
  authApi.get(RCS_INBOX, { params });

// Get unread count
export const getRcsUnreadCount = () =>
  authApi.get(`${RCS_INBOX}/unread-count`);

// Get agents list
export const getRcsInboxAgents = () =>
  authApi.get(`${RCS_INBOX}/agents`);

// Get message thread for a specific phone number
export const getRcsMessageThread = (phone, params) =>
  authApi.get(`${RCS_INBOX}/${phone}`, { params });

// Mark conversation as read
export const markRcsConversationAsRead = (phone) =>
  authApi.patch(`${RCS_INBOX}/${phone}/read`);

// Update conversation status (open, pending, solved)
export const updateRcsConversationStatus = (phone, status) =>
  authApi.patch(`${RCS_INBOX}/${phone}/status`, { status });

// Star/Unstar conversation
export const updateRcsConversationStarred = (phone, isStarred) =>
  authApi.patch(`${RCS_INBOX}/${phone}/starred`, { is_starred: isStarred });

// Assign agent to conversation
export const assignRcsConversationAgent = (phone, agentId) =>
  authApi.patch(`${RCS_INBOX}/${phone}/assign`, { agent_id: agentId });

// Get tags for a conversation
export const getRcsConversationTags = (phone) =>
  authApi.get(`${RCS_INBOX}/${phone}/tags`);

// Add tag to conversation
export const addRcsConversationTag = (phone, tag) =>
  authApi.post(`${RCS_INBOX}/${phone}/tags`, { tag });

// Update tag for a conversation
export const updateRcsConversationTag = (phone, tagId, tag) =>
  authApi.put(`${RCS_INBOX}/${phone}/tags/${tagId}`, { tag });

// Delete tag from conversation
export const deleteRcsConversationTag = (phone, tagId) =>
  authApi.delete(`${RCS_INBOX}/${phone}/tags/${tagId}`);

// Get notes for a conversation
export const getRcsConversationNotes = (phone) =>
  authApi.get(`${RCS_INBOX}/${phone}/notes`);

// Add note to conversation
export const addRcsConversationNote = (phone, note) =>
  authApi.post(`${RCS_INBOX}/${phone}/notes`, { note });

// Update note for a conversation
export const updateRcsConversationNote = (phone, noteId, note) =>
  authApi.put(`${RCS_INBOX}/${phone}/notes/${noteId}`, { note });

// Delete note from conversation
export const deleteRcsConversationNote = (phone, noteId) =>
  authApi.delete(`${RCS_INBOX}/${phone}/notes/${noteId}`);
// Async export — trigger
export const exportRCSInbox = (params) =>
  authApi.post(`${RCS_INBOX}/export`, null, { params });

export const exportRCSInboxAllMessages = (params) =>
  authApi.post(`${RCS_INBOX}/export/messages`, null, { params });

export const exportRCSInboxConversation = (phone, params) =>
  authApi.post(`${RCS_INBOX}/${phone}/messages/export`, null, { params });

// Async export — poll + list
export const pollRCSInboxReport = (jobId) =>
  authApi.get(`${RCS_INBOX}/reports/${jobId}`);

export const listRCSInboxReports = (params) =>
  authApi.get(`${RCS_INBOX}/reports`, { params });

// ─── RCS Blacklist endpoints ────────────────────────────────────────────────────
export const RCS_BLACKLIST = `/api/v1/rcs/blacklist`;

// Get blacklisted numbers
export const getRcsBlacklistNumbers = (params) =>
  authApi.get(RCS_BLACKLIST, { params });

// Add single number to blacklist
export const addRcsBlacklistNumber = (data) =>
  authApi.post(RCS_BLACKLIST, data);

// Bulk import blacklist numbers (up to 10,000)
export const importRcsBlacklistNumbers = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return authApi.post(`${RCS_BLACKLIST}/import`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// Check if single number is blocked
export const checkRcsBlacklistNumber = (phone_number) =>
  authApi.post(`${RCS_BLACKLIST}/check`, { phone_number });

// Check multiple numbers at once
export const checkRcsBlacklistNumbers = (phone_numbers) =>
  authApi.post(`${RCS_BLACKLIST}/check-bulk`, { phone_numbers });

// Remove number from blacklist
export const deleteRcsBlacklistNumber = (id) =>
  authApi.delete(`${RCS_BLACKLIST}/${id}`);

// Download blacklist as CSV
export const downloadRcsBlacklistCSV = (params) => {
  const queryString = params ? new URLSearchParams(params).toString() : "";
  return authApi.get(
    queryString
      ? `${RCS_BLACKLIST}/download?${queryString}`
      : `${RCS_BLACKLIST}/download`,
    { responseType: "blob" },
  );
};

export const requestMobileOtp = (mobile_no, username_or_email) => {
  return api.post(MOBILE_OTP, { mobile_no, username_or_email });
};

export const verifyMobileOtp = (mobile_no, otp) => {
  return api.post(VERIFY_MOBILE_OTP, { mobile_no, otp });
};

export const requestEmailOtp = (email) => {
  return api.post(SEND_EMAIL_OTP, { email });
};

export const verifyEmailOtp = (email, otp) => {
  return api.post(VERIFY_EMAIL_OTP, { email, otp });
};

export const changePassword = (email, password, password_confirmation) => {
  return api.post(CHANGE_PASSWORD, {
    email,
    password,
    password_confirmation,
  });
};

export const logout = () => {
  return api.post(LOGOUT);
};

export const invoice = (formData) => {
  return api.post(INVOICE, formData, {
    headers: {
      "Content-Type": "multipart/form-data", // Required for file uploads
    },
  });
};

export const invoicecustomer = (data) => {
  return api.post(INVOICE_CUSTOMER, data);
};
export const invoicefull = (data) => {
  return api.post(INVOICE_FULL, data);
};
export const templateData = (data) => {
  return api.post(TEMPLATE_DATA, data);
};

export const templateSync = (data) => {
  return api.get(TEMPLATE_SYNC, data);
};

export const submitCampaign = (data) => {
  return authApi.post(WHATSAPP_CAMPAIGN_SUBMIT, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const fetchAllChats = (action) => {
  return api.post(CHATS_LIST, action);
};

export const getAllChats = (action) => {
  return api.post(ALL_CHATS, action);
};

export const advanceFilterChatData = (data) => {
  return api.post(ADVANCE_FILTER_CHAT_DATA, data);
};

export const updateChatStatus = (payload) => {
  return api.post(CHAT_STATUS, payload);
};

export const fetchSelectedChatData = (payload) => {
  return api.post(CHAT_DATA, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const fetchAgentsName = (payload) => {
  return api.post(AGENTS_LIST, payload);
};

export const agentsData = (formData) => {
  return api.post(AGENTS_LIST, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const handleQuickReplies = (payload) => {
  return api.post(QUICK_REPLIES, payload);
};

export const handleQuickRepliesFormData = (formData) => {
  return api.post(QUICK_REPLIES, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const fetchUserNotes = (payload) => {
  return api.post(USER_NOTES, payload);
};

export const fetchCrmChats = (user) => {
  return api.post(CRM_CHATS, user);
};

export const fetchCrmSpecificChat = (payload) => {
  return api.post(CRM_CHAT_DETAILS, payload);
};

export const fetchUserTags = (payload) => {
  return api.post(USER_TAGS, payload);
};

export const handleGroupOperations = (payload) => {
  return api.post(GROUPS_LIST, payload);
};

export const fetchChartdata = (data) => {
  return api.get(GET_CHARTDATA, data);
};

export const clients = (data) => {
  return api.post(CLIENTS, data);
};
export const impersonate = (id) =>
  api.post(`/v1/clients/management/${id}/impersonate`);

export const transaction = (data) => {
  return api.post(TRANSACTION, data);
};

export const works = (data) => {
  return api.post(WORKS, data);
};

export const funds = (data) => {
  return api.post(FUNDS, data);
};

export const profile = (data) => {
  // Route to correct endpoint based on action
  if (data?.action === "read") {
    return authApi.get("/api/v1/profile/me");
  }
  
  // For update, use the correct PUT endpoints
  if (data?.action === "update") {
    // Determine which endpoint to use based on data fields
    const hasBusinessFields = data.business_name || data.business_email_address || data.business_address || data.business_hours_of_operation || data.business_ID || data.business_website || data.official_business_name || data.business_industry || data.gst_or_taxId || data.about || data.phone_number || data.greeting_message || data.away_message || data.social_media_links || data.quick_replies || data.catalogID || data.profile_picture;
    
    if (hasBusinessFields) {
      // Update business profile
      return authApi.put("/api/v1/profile/business", data);
    } else {
      // Update account info
      return authApi.put("/api/v1/profile/account", data);
    }
  }
  
  // Fallback to old endpoint for backward compatibility
  return api.post(PROFILE, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const sendCrmBroadcast = (payload) => {
  return api.post(CRM_BROADCAST, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const assignTagContacts = (payload) => {
  return api.post(ASSIGN_TAG, payload);
};

export const teamData = (payload) => {
  return api.post(TEAMS_DATA, payload);
};

export const handleContactOperations = (payload) => {
  return api.post(GROUP_CONTACTS, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const fetchbroadcast = (data) => {
  return api.post(GET_BROADCAST, data);
};

export const fetchbroadcastcount = (data) => {
  return api.post(GET_BROADCASTCOUNT, data);
};

export const fetchCredits = (data) => {
  return api.post(GET_CREDITS, data);
};

export const supportTickets = (formData) => {
  return api.post(SUPPORT_TICKETS, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const broadcastSpecific = (data) => {
  return api.post(BROADCAST_SPECIFIC, data);
};

export const broadcastSpecificcampaign = (data) => {
  return api.post(BROADCAST_SPECIFIC_CAMPAIGN, data);
};

export const transactions = (data) => {
  return api.post(TRANSACTIONS, data);
};

export const senderId = (payload) => {
  return api.post(SENDER_ID, payload);
};

export const smsTemplate = (payload) => {
  return api.post(SMS_TEMPLATES, payload);
};

// GSM submit — new backend (/api/v1/gsm/campaign/*). username comes from JWT;
// empty schedule fields are stripped (backend schema rejects empty strings).
export const gsmBroadcast = (payload) => {
  const { username, schedule_date, schedule_time, counts, contacts, unicode, ...rest } = payload;
  const body = {
    ...rest,
    unicode: Number(unicode),
    counts: Number(counts) || 1,
    ...(Number(contacts) > 0 ? { contacts: Number(contacts) } : {}),
    ...(schedule_date ? { schedule_date } : {}),
    ...(schedule_time ? { schedule_time } : {}),
  };
  return authApi.post("/api/v1/gsm/campaign/submit", body);
};

export const gsmCsvBroadcast = (formData) => {
  return authApi.post("/api/v1/gsm/campaign/submit-csv", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const gsmRead = (payload) => {
  return api.post(GSM_READ, payload);
};

export const voiceDataApi = (payload) => {
  return api.post(VOICE_DATA, payload);
};

export const voiceCallerId = (payload) => {
  return api.post(VOICE_CALLER_ID, payload);
};

export const voiceBroadcast = (formData) => {
  return api.post(VOICE_BROADCAST, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// New backend voice campaign submit — replaces the legacy voiceBroadcast
// PHP endpoint. username comes from the JWT; audio is referenced by its
// File Hosting id (audio_file_id), not a raw URL.
export const submitVoiceCampaign = (formData) => {
  return authApi.post("/api/v1/voice/campaign/submit", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// Saved IVRs (built in the IVR builder) that a campaign can launch with.
export const listVoiceIvrs = () => {
  return authApi.get("/api/v1/voice/campaign/ivrs");
};

// Hard-stops a running campaign — not-yet-dialed and retry-pending rows are
// flipped to STOP, campaign status becomes 'Stopped'. One-way, no resume.
export const pauseVoiceCampaign = (requestId) => {
  return authApi.post(`/api/v1/voice/campaign/${requestId}/pause`);
};

export const voiceAudios = (formData) => {
  return api.post(VOICE_AUDIOS, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const applyVoiceAction = (payload) => {
  return api.post(VOICE_PAUSE, payload);
};

export const fetchVoiceStatuscount = (data) => {
  return api.get(GET_VOICECOUNT, data);
};

// Voice campaign report list — new backend, replaces the legacy
// VITE_VOICE_API_URL/voice-campaign PHP endpoint. username comes from the
// JWT (authApi attaches it), not a query param.
export const getVoiceSummary = (params) =>
  authApi.get("/api/v1/voice/summary", { params });

// Voice campaign per-recipient drill-down ("eye" action) — new backend,
// replaces the legacy VITE_API_BASE_URL/voice-details PHP endpoint.
export const getVoiceCampaignDetails = (requestId, params) =>
  authApi.get(`/api/v1/voice/summary/${requestId}`, { params });

// Voice call status breakdown ("Call Overview" dashboard cards) — new
// backend, replaces the legacy VITE_VOICE_API_URL/voice-status endpoint.
export const getVoiceStatusCounts = (params) =>
  authApi.get("/api/v1/voice/summary/status", { params });

// Voice call status breakdown for one campaign (details modal pie chart) —
// new backend, replaces the legacy VITE_API_BASE_URL/voice-status-req.
export const getVoiceCampaignStatusCounts = (requestId) =>
  authApi.get(`/api/v1/voice/summary/${requestId}/status`);

// The uploaded DTMF menu (engine flow_json) for a campaign, read-only view.
export const getVoiceCampaignFlow = (requestId) =>
  authApi.get(`/api/v1/voice/summary/${requestId}/flow`);

// ─── Reusable named DTMF flows (Voice > DTMF Flows) ─────────────────────────
export const listDtmfFlows = () => authApi.get("/api/v1/voice/flows");
export const getDtmfFlow = (id) => authApi.get(`/api/v1/voice/flows/${id}`);
export const createDtmfFlow = (name, rows) =>
  authApi.post("/api/v1/voice/flows", { name, rows });
export const updateDtmfFlow = (id, name, rows) =>
  authApi.put(`/api/v1/voice/flows/${id}`, { name, rows });
export const deleteDtmfFlow = (id) => authApi.delete(`/api/v1/voice/flows/${id}`);

// Voice campaign CSV exports — async job queue (queued -> processing ->
// ready/failed), same pattern as WhatsApp/RCS/SMS exports. Replaces the old
// synchronous blob-download versions, which would have blocked the request
// building the whole CSV in one go instead of streaming it in the background.
export const requestVoiceSummaryExport = (params) =>
  authApi.post("/api/v1/voice/summary/export", null, { params });

export const requestVoiceDetailsExport = (requestId, params) =>
  authApi.post(`/api/v1/voice/summary/${requestId}/export`, null, { params });

export const listVoiceExports = (params) =>
  authApi.get("/api/v1/voice/summary/reports", { params });

export const chatbotFlow = (payload) => {
  return api.post(CHATBOT_FLOW, payload);
};

export const chatbotSteps = (formData) => {
  return api.post(CHATBOT_STEPS, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// ─── Chatbot Flow REST API (new) ──────────────────────────────────────────────
export const chatbotFlowList = (params) =>
  api.get("/v1/whatsapp/chatbot/flows", { params });

export const chatbotFlowCheckName = (name) =>
  api.get("/v1/whatsapp/chatbot/flows/check-name", { params: { name } });

export const chatbotFlowCreate = (payload) =>
  api.post("/v1/whatsapp/chatbot/flows", payload);

export const chatbotFlowGetById = (id) =>
  api.get(`/v1/whatsapp/chatbot/flows/${id}`);

export const chatbotFlowUpdate = (id, payload) =>
  api.put(`/v1/whatsapp/chatbot/flows/${id}`, payload);

export const chatbotFlowSaveSteps = (id, payload) =>
  api.put(`/v1/whatsapp/chatbot/flows/${id}/steps`, payload);

export const chatbotFlowStepsAction = (id, payload) =>
  api.post(`/v1/whatsapp/chatbot/flows/${id}/steps`, payload);

export const chatbotFlowDeleteSteps = (id) =>
  api.delete(`/v1/whatsapp/chatbot/flows/${id}/steps`);

export const chatbotFlowDelete = (id) =>
  api.delete(`/v1/whatsapp/chatbot/flows/${id}`);

export const fileManager = (formData) => {
  return api.post(FILE_MANAGER, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const fileFolder = (payload) => {
  return api.post(FILE_FOLDER, payload);
};
export const permissionsRead = (payload) => {
  return api.post(PERMISSIONS_READ, payload);
};

export const permissions = (payload) => {
  return api.post(PERMISSIONS, payload);
};

export const webhooksDataFetch = (payload) => {
  return api.post(WEBHOOKS_DATA, payload);
};

export const webhooks = (payload) => {
  return api.post(WEBHOOKS, payload);
};

export const usersUpdate = (payload) => {
  return api.post(USERS_UPDATE, payload);
};

export const teamsUpdate = (payload) => {
  return api.post(TEAMS_UPDATE, payload);
};

export const fbUserData = (payload) => {
  return api.post(META_LOGIN, payload);
};

export const metaAction = (payload) => {
  return api.post(META_ACTION, payload);
};
// number
export const nowBuy = (payload) => {
  return api.post(Now_Buy, payload);
};

export const activeNumber = (payload) => {
  return api.post(ACTIVE_NUMBER, payload);
};
export const buyNumber = (payload) => {
  return api.post(BUY_NUMBER, payload);
};
export const fetchChannels = () => {
  return api.get(GET_ALL_CHANNELS);
};

export const getChatbotLogs = (
  username,
  flowId,
  page = 1,
  pagePerData = 10,
) => {
  return newApi.get(CHATBOT_LOGS, {
    params: {
      username,
      flow_id: flowId,
      page,
      pagePerData,
    },
  });
};

export const getChatbotHistoryContacts = (
  username,
  flowId,
  page = 1,
  pagePerData = 10,
) => {
  return newApi.get(CHATBOT_HISTORY_CONTACTS, {
    params: { username, flow_id: flowId, page, pagePerData },
  });
};

export const getChatHistoryByUser = (
  username,
  flowId,
  receiverId,
  page = 1,
  pagePerData = 20,
) => {
  return newApi.get(CHATBOT_HISTORY_BY_USER, {
    params: {
      username,
      flow_id: flowId,
      receiver_id: receiverId,
      page,
      pagePerData,
    },
  });
};

// ─── WhatsApp Team Inbox ──────────────────────────────────────────────────────
const WA_TEAMINBOX = `/api/v1/whatsapp/teaminbox`;

export const getTeamInbox = (params) => authApi.get(WA_TEAMINBOX, { params });

export const exportTeamInbox = (params) =>
  authApi.post(`${WA_TEAMINBOX}/export`, null, { params });

export const exportTeamInboxAllMessages = (params) =>
  authApi.post(`${WA_TEAMINBOX}/export/messages`, null, { params });

export const exportTeamInboxConversation = (receiverId) =>
  authApi.post(`${WA_TEAMINBOX}/${receiverId}/messages/export`);

export const pollWATeamInboxReport = (jobId) =>
  authApi.get(`${WA_TEAMINBOX}/reports/${jobId}`);

export const listWATeamInboxReports = (params) =>
  authApi.get(`${WA_TEAMINBOX}/reports`, { params });

export const getTeamInboxMessages = (receiverId, params) =>
  authApi.get(`${WA_TEAMINBOX}/${receiverId}/messages`, { params });

export const markTeamInboxRead = (receiverId) =>
  authApi.patch(`${WA_TEAMINBOX}/${receiverId}/read`);

export const sendTeamInboxMessage = (receiverId, data) =>
  authApi.post(`${WA_TEAMINBOX}/${receiverId}/send`, data);

export const getTeamInboxMessageStatus = (receiverId, messageId) =>
  authApi.get(`${WA_TEAMINBOX}/${receiverId}/messages/${messageId}/status`);

export const updateTeamInboxStatus = (receiverId, data) =>
  authApi.patch(`${WA_TEAMINBOX}/${receiverId}/status`, data);

export const starTeamInboxConversation = (receiverId, data) =>
  authApi.patch(`${WA_TEAMINBOX}/${receiverId}/starred`, data);

export const assignTeamInboxAgent = (receiverId, data) =>
  authApi.patch(`${WA_TEAMINBOX}/${receiverId}/assign`, data);

export const getTeamInboxNotes = (receiverId) =>
  authApi.get(`${WA_TEAMINBOX}/${receiverId}/notes`);

export const addTeamInboxNote = (receiverId, data) =>
  authApi.post(`${WA_TEAMINBOX}/${receiverId}/notes`, data);

export const updateTeamInboxNote = (receiverId, noteId, data) =>
  authApi.put(`${WA_TEAMINBOX}/${receiverId}/notes/${noteId}`, data);

export const deleteTeamInboxNote = (receiverId, noteId) =>
  authApi.delete(`${WA_TEAMINBOX}/${receiverId}/notes/${noteId}`);

export const getTeamInboxTags = (receiverId) =>
  authApi.get(`${WA_TEAMINBOX}/${receiverId}/tags`);

export const addTeamInboxTag = (receiverId, data) =>
  authApi.post(`${WA_TEAMINBOX}/${receiverId}/tags`, data);

export const updateTeamInboxTag = (receiverId, tagId, data) =>
  authApi.put(`${WA_TEAMINBOX}/${receiverId}/tags/${tagId}`, data);

export const deleteTeamInboxTag = (receiverId, tagId) =>
  authApi.delete(`${WA_TEAMINBOX}/${receiverId}/tags/${tagId}`);

// NOTE: Backend needs to add GET /api/v1/whatsapp/teaminbox/agents
export const getTeamInboxAgents = () => authApi.get(`${WA_TEAMINBOX}/agents`);

export const sendTeaminboxTemplate = (formData) =>
  authApi.post(`${WA_TEAMINBOX}/template/send`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// ─── SMS Module API Functions ─────────────────────────────────────────────────

export const getSmsBroadcastSummary = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(`${SMS_BROADCAST_URL}/summary?${queryParams}`);
};

export const getSmsOverview = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(`${SMS_BROADCAST_URL}/status-summary?${queryParams}`);
};

export const downloadSmsBroadcastSummaryCSV = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(`${SMS_BROADCAST_URL}/summary/download?${queryParams}`, {
    responseType: "blob",
  });
};

export const sendSmsBroadcast = (payload) =>
  api.post(SMS_BROADCAST_URL, payload);

export const sendCsvSmsBroadcast = (data) =>
  api.post(SMS_BROADCAST_CSV_URL, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// SMS Blacklist API functions
export const getBlacklistNumbers = (params) =>
  api.get(SMS_BLACKLIST, { params });

export const addBlacklistNumber = (data) => api.post(SMS_BLACKLIST, data);

export const deleteBlacklistNumber = (id) =>
  api.delete(`${SMS_BLACKLIST}/${id}`);

export const downloadBlacklistCSV = (params) => {
  const queryString = params ? new URLSearchParams(params).toString() : "";
  return api.get(
    queryString
      ? `${SMS_BLACKLIST}/download?${queryString}`
      : `${SMS_BLACKLIST}/download`,
    { responseType: "blob" },
  );
};

// SMS SMPP Gateway API functions
export const getSMPPGateways = (params) => api.get(SMS_SMPP, { params });

export const createSMPPGateway = (data) => api.post(SMS_SMPP, data);

export const getSMPPGatewayNames = () => api.get(`${SMS_SMPP}/names`);

export const getSMPPGateway = (id) => api.get(`${SMS_SMPP}/${id}`);

export const updateSMPPGateway = (id, data) =>
  api.put(`${SMS_SMPP}/${id}`, data);

export const deleteSMPPGateway = (id) => api.delete(`${SMS_SMPP}/${id}`);

export const downloadSMPPGatewaysCSV = (params) => {
  const queryString = params ? new URLSearchParams(params).toString() : "";
  return api.get(
    queryString
      ? `${SMS_SMPP}/download?${queryString}`
      : `${SMS_SMPP}/download`,
    { responseType: "blob" },
  );
};

export const getRoutesList = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(`${SMS_SMPP_ROUTES_LIST}?${queryParams}`);
};

export const getSenderIds = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(`${SMS_SENDER_IDS}?${queryParams}`);
};

export const getTemplates = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(`${SMS_MANAGE_TEMPLATES}?${queryParams}`);
};

export const getSpamKeywords = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(`${API_BASE_URL}/spam-keywords?${queryParams}`);
};

export const getSmsSenderIds = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(`${SMS_SENDER_IDS}?${queryParams}`);
};

export const getSmsTemplates = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(`${SMS_MANAGE_TEMPLATES}?${queryParams}`);
};

// ─── SMS REST API (Part 8/9) — /api/v1/sms/* ─────────────────────────────────
// These endpoints require Bearer auth and match the new backend contract.
const SMS_V1 = `/api/v1/sms`;

// Campaign
export const createSmsCampaign = (payload) =>
  authApi.post(`${SMS_V1}/campaign`, payload);

// Sender IDs
export const listSmsSenderIdsV1 = (params) =>
  authApi.get(`${SMS_V1}/senderid`, { params });

export const createSmsSenderIdV1 = (payload) =>
  authApi.post(`${SMS_V1}/senderid`, payload);

export const updateSmsSenderIdV1 = (id, payload) =>
  authApi.put(`${SMS_V1}/senderid/${id}`, payload);

export const deleteSmsSenderIdV1 = (id) =>
  authApi.delete(`${SMS_V1}/senderid/${id}`);

// DLT Templates
export const listSmsTemplatesV1 = (params) =>
  authApi.get(`${SMS_V1}/template`, { params });

export const createSmsTemplateV1 = (payload) =>
  authApi.post(`${SMS_V1}/template`, payload);

export const updateSmsTemplateV1 = (id, payload) =>
  authApi.put(`${SMS_V1}/template/${id}`, payload);

export const deleteSmsTemplateV1 = (id) =>
  authApi.delete(`${SMS_V1}/template/${id}`);

// Gateways
export const listSmppRouteNamesV1 = () =>
  authApi.get(`${SMS_V1}/gateways/smpp/routes/names`);

export const listSpamKeywordsV1 = (params) =>
  authApi.get(`${SMS_V1}/gateways/spam-keywords`, { params });

// ─── SMS Detailed / Scheduled / Archive Report API Functions ─────────────────

export const getSmsDeliveryDetails = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(`${SMS_BROADCAST_URL}/delivery-details?${queryParams}`);
};

export const downloadSmsDeliveryDetailsCSV = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(
    `${SMS_BROADCAST_URL}/delivery-details/download?${queryParams}`,
    {
      responseType: "blob",
    },
  );
};

export const getScheduledBroadcasts = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(`${SMS_BROADCAST_URL}/scheduled?${queryParams}`);
};

export const pauseScheduledBroadcast = (payload) =>
  api.post(`${SMS_BROADCAST_URL}/scheduled/pause`, payload);

export const getSmsArchiveReport = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(`${SMS_BROADCAST_URL}/archive?${queryParams}`);
};

export const downloadSmsArchiveReportCSV = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(`${SMS_BROADCAST_URL}/archive/download?${queryParams}`, {
    responseType: "blob",
  });
};

export const shiftArchiveToMainTable = (params) => {
  const queryParams = new URLSearchParams(params).toString();
  return api.get(`${SMS_BROADCAST_URL}/archive/shift-preview?${queryParams}`);
};

export const transferArchiveData = (payload) =>
  api.post(`${SMS_BROADCAST_URL}/archive/transfer`, payload);

// ─── SMS Campaign REST API (v1) ───────────────────────────────────────────────
export const getSmsCampaignStatusSummary = (params) =>
  api.get("/v1/sms/campaign/status-summary", { params });

export const getSmsCampaignSummary = (params) =>
  api.get("/v1/sms/campaign/summary", { params });

export const getSmsCampaignStatus = (params) =>
  api.get("/v1/sms/campaign/status", { params });

export const getSmsCampaignDetails = (params) =>
  api.get("/v1/sms/campaign/details", { params });

export const getSmsCampaignDeliveryDetails = (params) =>
  api.get("/v1/sms/campaign/delivery-details", { params });

export const getSmsCampaignScheduled = (params) =>
  api.get("/v1/sms/campaign/scheduled", { params });

export const deleteSmsScheduledCampaign = (request_id) =>
  api.delete(`/v1/sms/campaign/scheduled/${request_id}`);

export const rescheduleSmsScheduledCampaign = (request_id, scheduled_date, scheduled_time) =>
  api.patch(`/v1/sms/campaign/scheduled/${request_id}/reschedule`, { scheduled_date, scheduled_time });

export const getSmsCampaignArchive = (params) =>
  api.get("/v1/sms/campaign/archive", { params });

export const getSmsTrafficSummary = (params) =>
  api.get("/v1/sms/campaign/traffic-summary", { params });

// ── SMS Export (async queue) ──────────────────────────────────────────────────
const SMS_REPORTS = "/api/v1/sms/campaign/reports";

export const requestSmsSummaryExport = (params) =>
  authApi.post("/api/v1/sms/campaign/summary/export", {}, { params });

export const requestSmsDeliveryExport = (params) =>
  authApi.post("/api/v1/sms/campaign/delivery-details/export", {}, { params });

export const getSmsArchiveMonths = () =>
  authApi.get("/api/v1/sms/campaign/archive/months");

export const getSmsArchiveSummary = (month) =>
  authApi.get("/api/v1/sms/campaign/archive/summary", { params: { month } });

export const requestSmsArchiveExport = (month) =>
  authApi.post("/api/v1/sms/campaign/archive/export", { month });

export const listSmsExportReports = () =>
  authApi.get(SMS_REPORTS);

export const getSmsExportReport = (jobId) =>
  authApi.get(`${SMS_REPORTS}/${jobId}`);

export const downloadSmsExportReport = (jobId) =>
  authApi.get(`${SMS_REPORTS}/${jobId}/download`, { responseType: "blob" });

export const requestSmsDetailsExport = (requestId) =>
  authApi.get("/api/v1/sms/campaign/details/export", { params: { request_id: requestId } });

export const requestSmsAdminLogsExport = (params) =>
  authApi.get("/api/v1/sms/admin/broadcast/logs/export", { params });

export const getSmsAdminUserStats = (params) =>
  authApi.get("/api/v1/sms/admin/broadcast/user-stats", { params });

// ─── Client Password Change ───────────────────────────────────────────────────
export const changeClientPassword = (clientId, newPassword) =>
  api.patch(`/v1/clients/management/${clientId}/password`, {
    new_password: newPassword,
    new_password_confirmation: newPassword,
  });

// ─── Credit Transfer & Transaction Logs ───────────────────────────────────────
export const transferCreditsToClient = (clientId, payload) =>
  api.post(`/v1/clients/management/${clientId}/credits`, payload);

export const getMyTransactionLogs = (params) =>
  api.get(`/v1/clients/credits/logs`, { params });

export const getClientTransactionLogs = (clientId, params) =>
  api.get(`/v1/clients/management/${clientId}/credits/logs`, { params });

export const getMyStatement = (params) =>
  api.get(`/v1/clients/credits/statement`, { params });

export const getStatementServiceOptions = () =>
  api.get(`/v1/clients/credits/services`);

export const getServicePurchaseUsageSummary = (params) =>
  api.get(`/v1/clients/credits/service-summary`, { params });

export const getMonthlySummary = (params) =>
  api.get(`/v1/clients/credits/monthly-summary`, { params });

export const getDownlineTransferSummary = (params) =>
  api.get(`/v1/clients/credits/downline-summary`, { params });

export const getDownlineUserDetails = (params) =>
  api.get(`/v1/clients/credits/downline-summary/details`, { params });

// ─── Support Tickets ──────────────────────────────────────────────────────────
export const createSupportTicket = (payload) =>
  api.post(`/v1/support/tickets`, payload);

export const replyToTicket = (ticketId, payload) =>
  api.post(`/v1/support/tickets/${ticketId}/reply`, payload);

export const getMyTickets = (params) =>
  api.get(`/v1/support/tickets`, { params });

export const getTicketThread = (ticketId) =>
  api.get(`/v1/support/tickets/${ticketId}`);

// ─── Agent Template Assignment ────────────────────────────────────────────────
export const agentGetTemplates = (agentId) =>
  api.get(`/v1/whatsapp/agent-management/agents/${agentId}/templates`);

export const agentAssignTemplates = (agentId, template_ids) =>
  api.post(`/v1/whatsapp/agent-management/agents/${agentId}/templates`, {
    template_ids,
  });

export const agentRemoveTemplate = (agentId, templateId) =>
  api.delete(
    `/v1/whatsapp/agent-management/agents/${agentId}/templates/${templateId}`,
  );

export const teamList = (params) =>
  api.get("/v1/whatsapp/agent-management/teams", { params });

export const teamCreate = (payload) =>
  api.post("/v1/whatsapp/agent-management/teams", payload);

export const teamUpdate = (id, payload) =>
  api.put(`/v1/whatsapp/agent-management/teams/${id}`, payload);

export const teamDelete = (id) =>
  api.delete(`/v1/whatsapp/agent-management/teams/${id}`);

// ─── Client Management REST API (/api/v1/clients/management) ─────────────────
export const clientList = (params) =>
  api.get("/v1/clients/management", { params });

export const clientCreate = (payload) =>
  api.post("/v1/clients/management", payload);

export const clientGetById = (id) => api.get(`/v1/clients/management/${id}`);

export const clientUpdate = (id, payload) =>
  api.put(`/v1/clients/management/${id}`, payload);

export const clientChangeUserType = (id, user_type) =>
  api.patch(`/v1/clients/management/${id}/usertype`, { user_type });

export const clientChangeStatus = (id, status) =>
  api.patch(`/v1/clients/management/${id}/status`, { status });

export const clientDelete = (id) => api.delete(`/v1/clients/management/${id}`);

export const clientTransferCredits = (id, payload) =>
  api.post(`/v1/clients/management/${id}/credits`, payload);

export const clientStats = () => api.get("/v1/clients/management/stats");
export const clientTree  = () => api.get("/v1/clients/management/tree");

export const clientUpdatePermissions = (id, permissions) =>
  api.patch(`/v1/clients/management/${id}/permissions`, permissions);

export const clientGetPermissions = (id) =>
  api.get(`/v1/clients/management/${id}/permissions`);

export const clientUpdateExpiry = (id, expiry) =>
  api.patch(`/v1/clients/management/${id}/expiry`, { expiry });

// ─── Voice Routes (which provider carries a user's voice campaigns) ─────────
export const listVoiceRoutes = () => api.get(`/v1/clients/management/voice-routes`);

export const updateVoiceRoute = (code, payload) =>
  api.put(`/v1/clients/management/voice-routes/${code}`, payload);

export const listVoiceRouteAssignments = () =>
  api.get(`/v1/clients/management/voice-route-assignments`);

export const getVoiceRouteLogs = (params) =>
  api.get(`/v1/clients/management/voice-route-logs`, { params });

export const getClientVoiceRoute = (clientId) =>
  api.get(`/v1/clients/management/${clientId}/voice-route`);

export const setClientVoiceRoute = (clientId, routeCode) =>
  api.put(`/v1/clients/management/${clientId}/voice-route`, { route_code: routeCode });

// ─── Voice Call Fallback Notify (WhatsApp/SMS on call failure) ──────────────
// Routes are reusable, named API definitions (not tied to any one client).
// Assignments link one client to one route per channel — managed from
// Manage Clients.
export const listFallbackRoutes = (channel) =>
  api.get(`/v1/clients/management/fallback-routes`, { params: channel ? { channel } : {} });

export const createFallbackRoute = (payload) =>
  api.post(`/v1/clients/management/fallback-routes`, payload);

export const updateFallbackRoute = (routeId, payload) =>
  api.put(`/v1/clients/management/fallback-routes/${routeId}`, payload);

export const deleteFallbackRoute = (routeId) =>
  api.delete(`/v1/clients/management/fallback-routes/${routeId}`);

export const setFallbackRouteDefault = (routeId) =>
  api.post(`/v1/clients/management/fallback-routes/${routeId}/set-default`);

export const clearFallbackRouteDefault = (routeId) =>
  api.delete(`/v1/clients/management/fallback-routes/${routeId}/set-default`);

export const getClientFallbackAssignments = (clientId) =>
  api.get(`/v1/clients/management/${clientId}/fallback-assignments`);

export const assignClientFallbackRoute = (clientId, channel, routeId) =>
  api.post(`/v1/clients/management/${clientId}/fallback-assignments`, { channel, route_id: routeId });

export const removeClientFallbackAssignment = (clientId, channel) =>
  api.delete(`/v1/clients/management/${clientId}/fallback-assignments/${channel}`);

export const testClientFallbackRoute = (clientId, channel, payload) =>
  api.post(`/v1/clients/management/${clientId}/fallback-assignments/${channel}/test`, payload);

export const getFallbackLogs = (params) =>
  api.get(`/v1/clients/management/fallback-logs`, { params });

// ─── WhatsApp Account (WATI) CRUD ────────────────────────────────────────────
export const getWhatsAppAccount = (clientId) =>
  api.get(`/v1/whatsapp/account/${clientId}`);

export const createWhatsAppAccount = (clientId, payload) =>
  api.post(`/v1/whatsapp/account/${clientId}`, payload);

export const updateWhatsAppAccount = (clientId, payload) =>
  api.put(`/v1/whatsapp/account/${clientId}`, payload);

export const deleteWhatsAppAccount = (clientId) =>
  api.delete(`/v1/whatsapp/account/${clientId}`);

export const getWhatsappPhoneNumbers = () =>
  authApi.get(`/api/v1/whatsapp/account/phone-numbers`);

// Meta WhatsApp Business Profile (about, category, address, websites…)
export const getWhatsappBusinessProfile = (params) =>
  authApi.get(`/api/v1/whatsapp/account/business-profile`, { params });

export const updateWhatsappBusinessProfile = (body) =>
  authApi.put(`/api/v1/whatsapp/account/business-profile`, body);

export const updateWhatsappProfilePhoto = (formData) =>
  authApi.post(`/api/v1/whatsapp/account/business-profile/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Manual (no Meta account) WhatsApp signup request
export const submitWhatsappProfileRequest = (payload) =>
  authApi.post(`/api/v1/whatsapp/account/profile-request`, payload);

export const updateWhatsappProfileRequest = (id, payload) =>
  authApi.put(`/api/v1/whatsapp/account/profile-request/${id}`, payload);

export const deleteWhatsappProfileRequest = (id) =>
  authApi.delete(`/api/v1/whatsapp/account/profile-request/${id}`);

export const getUnbrandedWhatsappInfo = () =>
  authApi.get(`/api/v1/whatsapp/account/unbranded-info`);

export const getUnbrandedWhatsappPhoneNumbers = () =>
  authApi.get(`/api/v1/whatsapp/account/unbranded-phone-numbers`);

export const getBrandedWhatsappInfo = () =>
  authApi.get(`/api/v1/whatsapp/account/branded-info`);

export const getBrandedWhatsappPhoneNumbers = () =>
  authApi.get(`/api/v1/whatsapp/account/branded-phone-numbers`);

// ─── Webhooks ────────────────────────────────────────────────────────────────
const WH = `/api/v1/whatsapp/webhook`;
export const getWebhooks       = (params) => authApi.get(WH, { params });
export const createWebhook     = (data)   => authApi.post(WH, data);
export const updateWebhook     = (id, data) => authApi.put(`${WH}/${id}`, data);
export const toggleWebhook     = (id)     => authApi.patch(`${WH}/${id}/toggle`);
export const deleteWebhook     = (id)     => authApi.delete(`${WH}/${id}`);
export const getWebhookLogs    = (id, params) => authApi.get(`${WH}/${id}/logs`, { params });

// ─────────────────────────────────────────────────────────────────────────────

export default api;
// ─── RCS API functions ───────────────────────────────────────────────────────
const RCS_BASE = "/api/v1/rcs";
const RCS_TEMPLATE = `${RCS_BASE}/template`;
const RCS_CAMPAIGN = `${RCS_BASE}/campaign`;
const RCS_DASHBOARD = `${RCS_BASE}/dashboard`;

// ─── RCS Dashboard function ──────────────────────────────────────────────────
export const getRcsDashboard = (params) => {
  return authApi.get(RCS_DASHBOARD, { params });
};

// ─── RCS Engagement/Analytics function ───────────────────────────────────────
export const getRcsEngagement = (params) => {
  return authApi.get(`${RCS_BASE}/engagement`, { params });
};

// ─── RCS Template functions ──────────────────────────────────────────────────
export const getRcsAccount = () => {
  return newApi.get(`${RCS_TEMPLATE}/account`);
};

export const getRcsTemplates = (params) => {
  return newApi.get(RCS_TEMPLATE, { params });
};

export const getRcsTemplateById = (id) => {
  return newApi.get(`${RCS_TEMPLATE}/${id}`);
};

export const checkRcsTemplateName = (name, excludeId) => {
  return newApi.get(`${RCS_TEMPLATE}/check-name`, { params: { name, exclude_id: excludeId } });
};

export const createRcsTemplate = (data) => {
  return newApi.post(RCS_TEMPLATE, data);
};

export const updateRcsTemplate = (id, data) => {
  return newApi.put(`${RCS_TEMPLATE}/${id}`, data);
};

export const deleteRcsTemplate = (id) => {
  return newApi.delete(`${RCS_TEMPLATE}/${id}`);
};

// ─── RCS Campaign functions ──────────────────────────────────────────────────
export const createRcsCampaign = (data) => {
  return newApi.post(RCS_CAMPAIGN, data);
};

export const getRcsCampaigns = (params) => {
  return newApi.get(RCS_CAMPAIGN, { params });
};

export const getRcsCampaignById = (id) => {
  return newApi.get(`${RCS_CAMPAIGN}/${id}`);
};

export const getRcsCampaignDetails = (campaignId, params) => {
  return newApi.get(`${RCS_CAMPAIGN}/${campaignId}/details`, { params });
};

export const rescheduleCampaign = (campaignId, data) => {
  return newApi.patch(`${RCS_CAMPAIGN}/${campaignId}/reschedule`, data);
};

export const deleteCampaign = (campaignId) => {
  return newApi.delete(`${RCS_CAMPAIGN}/${campaignId}`);
};

// Legacy functions for backward compatibility
export const submitRcsCampaign = (data) => {
  return createRcsCampaign(data);
};

export const getRcsCampaignSummary = (params) => {
  return getRcsCampaigns(params);
};

export const updateRcsCampaignStatus = (campaignId, action) => {
  return newApi.put(`${RCS_CAMPAIGN}/${campaignId}/status`, { action });
};

// RCS Dashboard Analytics functions
export const getRcsOverview = (params) => {
  return newApi.get(`${RCS_CAMPAIGN}/overview`, { params });
};

export const getRcsMessageTrends = (params) => {
  return newApi.get(`${RCS_CAMPAIGN}/analytics/message-trends`, { params });
};

export const getRcsDeliveryAnalytics = (params) => {
  return newApi.get(`${RCS_CAMPAIGN}/analytics/delivery`, { params });
};

export const getRcsEngagementAnalytics = (params) => {
  return newApi.get(`${RCS_CAMPAIGN}/analytics/engagement`, { params });
};

export const getRcsScheduledCampaigns = (params) => {
  return newApi.get(`${RCS_CAMPAIGN}/scheduled`, { params });
};

export const getRcsCampaignDetailsList = (params) => {
  return newApi.get(`${RCS_CAMPAIGN}/details`, { params });
};

export const exportRcsCampaignSummary = (params) =>
  authApi.post(`${RCS_CAMPAIGN}/export`, null, { params });

export const exportRcsCampaignDetails = (params) =>
  authApi.post(`${RCS_CAMPAIGN}/details/export`, null, { params });

export const exportRcsCampaignSingleDetails = (requestId) =>
  authApi.post(`${RCS_CAMPAIGN}/details/${requestId}/export`);

export const pollRcsCampaignReport = (jobId) =>
  authApi.get(`${RCS_CAMPAIGN}/reports/${jobId}`);

export const listRcsCampaignReports = (params) =>
  authApi.get(`${RCS_CAMPAIGN}/reports`, { params });

export const downloadRcsCampaignReport = (jobId) =>
  authApi.get(`${RCS_CAMPAIGN}/reports/${jobId}/download`, { responseType: "blob" });

// ─── SMS Admin API Functions ──────────────────────────────────────────────────
const SMS_ADMIN = `/api/v1/sms/admin`;

export const getAdminDashboardMetrics = (params) =>
  authApi.get(`${SMS_ADMIN}/dashboard`, { params });

export const getAdminBroadcastDetails = (requestId, params) =>
  authApi.get(`${SMS_ADMIN}/broadcast/${requestId}/details`, { params });

export const smsLogs = (params) =>
  authApi.get(`${SMS_ADMIN}/broadcast/logs`, { params });

// ─── SMS Admin Template & Sender ID Management ───────────────────────────────
export const getAllDLTTemplates = (params) =>
  authApi.get(`${SMS_ADMIN}/templates`, { params });

export const updateDLTTemplateStatus = (id, payload) =>
  authApi.patch(`${SMS_ADMIN}/templates/${id}/status`, payload);

export const updateDLTTemplate = (id, payload) =>
  authApi.put(`${SMS_ADMIN}/templates/${id}`, payload);

export const getAllAdminSenderIds = (params) =>
  authApi.get(`${SMS_ADMIN}/sender-ids`, { params });

export const updateAdminSenderIdStatus = (id, payload) =>
  authApi.patch(`${SMS_ADMIN}/sender-ids/${id}/status`, payload);

export const updateAdminSenderId = (id, payload) =>
  authApi.put(`${SMS_ADMIN}/sender-ids/${id}`, payload);

// ─── SMS Admin SMPP Reports ───────────────────────────────────────────────────
export const getGateways = () => authApi.get(`${SMS_ADMIN}/gateways/names`);

export const getGatewayDeliveryStats = (params) =>
  authApi.get(`${SMS_ADMIN}/gateways/delivery-stats`, { params });

export const downloadGatewayDeliveryReportCSV = (params) =>
  authApi.get(`${SMS_ADMIN}/gateways/delivery-stats/download`, {
    params,
    responseType: "blob",
  });

// ─── SMS Admin Spam Management ────────────────────────────────────────────────
export const deleteSpamKeyword = (id) =>
  authApi.delete(`${SMS_ADMIN}/spam-keywords/${id}`);

export const bulkDeleteSpamKeywords = (ids) =>
  authApi.delete(`${SMS_ADMIN}/spam-keywords/bulk`, { data: { ids } });

export const downloadSpamKeywordsCSV = () =>
  authApi.get(`${SMS_ADMIN}/spam-keywords/download`, { responseType: "blob" });

export const bulkUploadSpamKeywords = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return authApi.post(`${SMS_ADMIN}/spam-keywords/bulk-upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const createSpamKeyword = (payload) =>
  authApi.post(`${SMS_ADMIN}/spam-keywords`, payload);

export const updateSpamKeyword = (id, payload) =>
  authApi.put(`${SMS_ADMIN}/spam-keywords/${id}`, payload);

export const getAdminSpamKeywords = (params) =>
  authApi.get(`${SMS_ADMIN}/spam-keywords`, { params });

export const getAdminSpamKeywordsStats = () =>
  authApi.get(`${SMS_ADMIN}/spam-keywords/stats`);

// ─── SMS Admin Scheduled Reports ─────────────────────────────────────────────
export const getAdminArchivedReports = (params) =>
  authApi.get(`${SMS_ADMIN}/scheduled-reports`, { params });

export const pauseAdminBroadcast = (payload) =>
  authApi.post(`${SMS_ADMIN}/broadcast/pause`, payload);

// ─── Profile APIs ─────────────────────────────────────────────────────────────

/**
 * Get complete user profile including user info, credits, permissions, business profile
 * GET /api/v1/profile/me
 */
export const getMyProfile = () =>
  authApi.get("/api/v1/profile/me");

/**
 * Update account info (firstname, lastname, email, country)
 * PUT /api/v1/profile/account
 */
export const updateAccountInfo = (payload) =>
  authApi.put("/api/v1/profile/account", payload);

/**
 * Update business profile (business_name, business_email_address, etc.)
 * PUT /api/v1/profile/business
 */
export const updateBusinessProfile = (payload) =>
  authApi.put("/api/v1/profile/business", payload);

// ─── Notifications API (/api/v1/notifications) ───────────────────────────────

export const NOTIFICATIONS_V1 = `/api/v1/notifications`;

// GET /api/v1/notifications — list latest 50 + unread_count
export const getNotifications = () =>
  authApi.get(NOTIFICATIONS_V1);

// PUT /api/v1/notifications/:id/read — mark one as read
export const markNotificationRead = (id) =>
  authApi.put(`${NOTIFICATIONS_V1}/${id}/read`);

// PUT /api/v1/notifications/read-all — mark all as read
export const markAllNotificationsRead = () =>
  authApi.put(`${NOTIFICATIONS_V1}/read-all`);

// DELETE /api/v1/notifications/:id — delete a notification
export const deleteNotification = (id) =>
  authApi.delete(`${NOTIFICATIONS_V1}/${id}`);

// ─── Profile Password ─────────────────────────────────────────────────────────

/**
 * Change user's own password
 * PATCH /api/v1/profile/password
 */
export const changeOwnPassword = (current_password, new_password, new_password_confirmation) =>
  authApi.patch("/api/v1/profile/password", {
    current_password,
    new_password,
    new_password_confirmation,
  });

// ─── GSM Campaign REST API (new backend /api/v1/gsm/campaign) ─────────────────
// Backend returns { success, message, meta: { total, page, ... }, data: rows }.
// Pages read res.data.data.{results,total}, so wrappers reshape the envelope.

const gsmOffsetToPage = ({ offset = 0, limit = 10, ...rest } = {}) => ({
  ...rest,
  limit,
  page: Math.floor(Number(offset) / Number(limit)) + 1,
});

const gsmReshape = (res) => ({
  ...res,
  data: {
    ...res.data,
    data: { results: res.data?.data ?? [], total: res.data?.meta?.total ?? 0 },
  },
});

export const getGsmCampaignStatusSummary = (params) =>
  authApi.get("/api/v1/gsm/campaign/status-summary", { params });

export const getGsmCampaignSummary = (params) =>
  authApi.get("/api/v1/gsm/campaign/summary", { params });

export const getGsmCampaignDetails = (params) =>
  authApi.get("/api/v1/gsm/campaign/details", { params: gsmOffsetToPage(params) }).then(gsmReshape);

export const exportGsmCampaignDetailsStream = (requestId, isSim = false, onProgress, signal) => {
  const endpoint = isSim
    ? `/api/v1/gsm/sim/campaign/details/export-stream?request_id=${encodeURIComponent(requestId)}`
    : `/api/v1/gsm/campaign/details/export-stream?request_id=${encodeURIComponent(requestId)}`;
  return streamDownloadFile(endpoint, onProgress, signal);
};

export const saveDuplicateNumbers = (data) =>
  authApi.post("/api/v1/gsm/campaign/duplicate-numbers", data);

export const getGsmCampaignDeliveryDetails = (params) =>
  authApi.get("/api/v1/gsm/campaign/delivery-details", { params: gsmOffsetToPage(params) }).then(gsmReshape);

// Campaign list = summary endpoint (delivery1_sms), reshaped for the report tables
export const getGsmCampaignList = (params) =>
  authApi.get("/api/v1/gsm/campaign/summary", { params: gsmOffsetToPage(params) }).then(gsmReshape);

// ─── GSM SIM (virtual GSM business — Credit_SIM_line resellers) ───────────────
export const getGsmSimBalance = () =>
  authApi.get("/api/v1/gsm/sim/balance");

export const generateGsmSimCredits = (amount) =>
  authApi.post("/api/v1/gsm/sim/generate", { amount });

export const submitGsmSimBroadcast = (payload) =>
  authApi.post("/api/v1/gsm/sim/campaign/submit", payload);

export const submitGsmSimCsvBroadcast = (formData) =>
  authApi.post("/api/v1/gsm/sim/campaign/submit-csv", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getGsmSimCampaignList = (params) =>
  authApi.get("/api/v1/gsm/sim/campaign/summary", { params: gsmOffsetToPage(params) }).then(gsmReshape);

export const getGsmSimCampaignDetails = (params) =>
  authApi.get("/api/v1/gsm/sim/campaign/details", { params: gsmOffsetToPage(params) }).then(gsmReshape);

export const getGsmSimCampaignStatusSummary = (params) =>
  authApi.get("/api/v1/gsm/sim/campaign/status-summary", { params });

export const getGsmSimCampaignDeliveryDetails = (params) =>
  authApi.get("/api/v1/gsm/sim/campaign/delivery-details", { params: gsmOffsetToPage(params) }).then(gsmReshape);

export const updateGsmSimStatus = (body) =>
  authApi.patch("/api/v1/gsm/sim/campaign/status", body);

// ─── GSM async report exports (queued CSV + drawer) ───────────────────────────

export const requestGsmDeliveryExport = (params, isSim = false) =>
  authApi.post(
    `/api/v1/gsm/${isSim ? "sim/" : ""}campaign/delivery-details/export`,
    null,
    { params },
  );

export const requestGsmDetailsExport = (requestId, isSim = false, params = {}) =>
  authApi.post(
    `/api/v1/gsm/${isSim ? "sim/" : ""}campaign/details/export`,
    null,
    { params: { ...params, request_id: requestId } },
  );

export const listGsmExports = (params, isSim = false) =>
  authApi.get(`/api/v1/gsm/${isSim ? "sim/" : ""}campaign/reports`, { params });

export const stopGsmSimCampaign = (request_id) =>
  authApi.post("/api/v1/gsm/sim/campaign/stop", { request_id });

export const resubmitGsmSimPending = (request_id, scope) =>
  authApi.post("/api/v1/gsm/sim/campaign/resubmit", {
    request_id,
    ...(scope ? { scope } : {}),
  });

// GSM SIM whitelist (trusted numbers for real delivery)
export const uploadGsmSimWhitelist = (numbers, replace = false) =>
  authApi.post("/api/v1/gsm/sim/whitelist", { numbers, replace });

export const getGsmSimWhitelist = (params) =>
  authApi.get("/api/v1/gsm/sim/whitelist", { params });

export const clearGsmSimWhitelist = () =>
  authApi.delete("/api/v1/gsm/sim/whitelist");

export const deleteGsmSimWhitelistNumbers = (ids) =>
  authApi.post("/api/v1/gsm/sim/whitelist/delete", { ids });

// Campaign analyzer (patterns, duplicates, whitelist, spread)
export const analyzeGsmSimCampaign = (body) =>
  authApi.post("/api/v1/gsm/sim/campaign/analyze", body);

// One rule at a time — large campaigns cannot run every rule in one request
export const analyzeGsmSimStep = (body) =>
  authApi.post("/api/v1/gsm/sim/campaign/analyze/step", body);

// Scheduled = summary rows whose schedule date/time is in the future
// (no dedicated backend endpoint; filters the last 90 days client-side)
export const getGsmCampaignScheduled = async (params = {}) => {
  const today = new Date();
  const past = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const res = await authApi.get("/api/v1/gsm/campaign/summary", {
    params: { from_date: fmt(past), to_date: fmt(today), page: 1, limit: 100 },
  });
  const rows = (res.data?.data ?? []).filter((r) => {
    if (!r.schedule_date) return false;
    const when = new Date(`${r.schedule_date}T${r.schedule_time || "00:00"}`);
    return when.getTime() > Date.now();
  });
  const { offset = 0, limit = 10 } = params;
  return {
    ...res,
    data: {
      ...res.data,
      data: { results: rows.slice(offset, offset + limit), total: rows.length },
    },
  };
};


import { notification } from "antd";

// Codes that mean "no data" — not an error the user needs to see
const SILENT_CODES = new Set(["NOT_FOUND", "RESOURCE_DELETED"]);

/**
 * Central API error handler.
 * Understands the new backend format: { success, code, message, details }
 * Also handles legacy Laravel format: { errors: { field: [msg] } }
 *
 * Pass { silent: true } to suppress all toasts (e.g. background polls).
 */
// Client-facing wording guard: internal names must never surface in toasts
const scrub = (text) =>
  typeof text === "string"
    ? text
        .replace(/GSM SIM/gi, "GSM SMS")
        .replace(/\bSIM table\b/gi, "campaign")
        .replace(/Credit_SIM_line/g, "GSM SMS line")
        .replace(/Credit_SIM_GSM/g, "GSM SMS")
        .replace(/\bSIM campaign\b/gi, "campaign")
        .replace(/\bSIM credits?\b/gi, "GSM SMS credits")
        .replace(/\bSIM\b/g, "GSM SMS")
    : text;

const handleApiError = (error, options = {}) => {
  if (options.silent) return;

  // Scrub internal wording from any server message before it is rendered
  if (error?.response?.data?.message) {
    error.response.data.message = scrub(error.response.data.message);
  }

  if (!error?.response) {
    notification.error({
      message: "Network Error",
      description: "Could not reach the server. Please check your connection.",
    });
    return;
  }

  const { data } = error.response;

  // ── New backend format ────────────────────────────────────────────────────
  if (data?.code) {
    // Silent — no data is a normal state, not an error
    if (SILENT_CODES.has(data.code)) return;

    // Validation errors — message may be a string OR array of { field, message }
    if (data.code === "VALIDATION_ERROR" || data.code === "MISSING_FIELD" || data.code === "INVALID_FORMAT") {
      const fieldErrors = Array.isArray(data.message)
        ? data.message
        : Array.isArray(data.details)
        ? data.details
        : null;

      if (fieldErrors?.length > 0) {
        const description = fieldErrors
          .map((e) => `${e.field ? e.field + ": " : ""}${e.message}`)
          .join("\n");
        notification.error({ message: "Validation Error", description });
      } else {
        notification.error({
          message: "Validation Error",
          description: typeof data.message === "string"
            ? data.message
            : "Request validation failed.",
        });
      }
      return;
    }

    // Insufficient credits — show amounts
    if (data.code === "INSUFFICIENT_CREDITS") {
      const desc = data.details
        ? `Required: ${data.details.required}, Available: ${data.details.available}`
        : data.message;
      notification.error({ message: "Insufficient Credits", description: desc });
      return;
    }

    // Session errors — clear token and show session-expired modal
    if (
      data.code === "TOKEN_EXPIRED" ||
      data.code === "TOKEN_INVALID" ||
      data.code === "UNAUTHORIZED"
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("_admin_token");
      localStorage.removeItem("_admin_user");
      localStorage.removeItem("_impersonating");
      window.dispatchEvent(new Event("sessionExpired"));
      return;
    }

    // Account / permission errors
    if (data.code === "ACCOUNT_SUSPENDED" || data.code === "FORBIDDEN" || data.code === "FEATURE_NOT_ENABLED") {
      notification.error({ message: "Access Denied", description: data.message });
      return;
    }

    // Rate limit
    if (data.code === "RATE_LIMIT_EXCEEDED") {
      notification.warning({ message: "Too Many Requests", description: data.message });
      return;
    }

    // All other backend errors (INTERNAL_SERVER_ERROR, EXTERNAL_SERVICE_ERROR, etc.)
    notification.error({
      message: "Error",
      description: typeof data.message === "string"
        ? data.message
        : "An unexpected error occurred.",
    });
    return;
  }

  // ── Legacy Laravel format { errors: { field: [msg] }, message } ───────────
  if (data?.errors) {
    Object.keys(data.errors).forEach((key) => {
      (data.errors[key] || []).forEach((msg) =>
        notification.error({ message: "Validation Error", description: `${key}: ${msg}` })
      );
    });
    return;
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  notification.error({
    message: "Error",
    description: data?.message || data?.error || "An unexpected error occurred.",
  });
};

export default handleApiError;

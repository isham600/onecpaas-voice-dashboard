export const SUPPORT_STATUS = {
  PENDING: 0,
  OPEN: 1,
  CLOSED: 2,
  SOLVED_OR_INVESTIGATING: 3,
};

export const SUPPORT_STATUS_OPTIONS = [
  {
    value: SUPPORT_STATUS.PENDING,
    label: "Pending",
    color: "#D97706",
    background: "#FFFBEB",
  },
  {
    value: SUPPORT_STATUS.OPEN,
    label: "Open",
    color: "#2563EB",
    background: "#EFF6FF",
  },
  {
    value: SUPPORT_STATUS.CLOSED,
    label: "Closed",
    color: "#DC2626",
    background: "#FEF2F2",
  },
  {
    value: SUPPORT_STATUS.SOLVED_OR_INVESTIGATING,
    label: "Solved / Investigating",
    color: "#059669",
    background: "#ECFDF5",
  },
];

export const SUPPORT_CATEGORIES = {
  "Account and Billing": [
    "Account Setup",
    "Subscription Plans",
    "Billing Inquiries",
    "Payment Issues",
    "Account Suspension",
  ],
  "Technical Support": [
    "Login Issues",
    "Platform Errors",
    "API Integration",
    "System Downtime",
    "Feature Requests",
  ],
  "Bulk SMS": {
    "Message Delivery": [
      "Delivery Failures",
      "Delayed Messages",
      "Incorrect Recipients",
      "Message Not Received",
    ],
    "Message Content": [
      "Content Restrictions",
      "Character Limits",
      "Unicode Issues",
      "Customization",
    ],
    "Campaign Management": [
      "Scheduling Issues",
      "Campaign Reports",
      "Contact List Management",
      "Opt-out Handling",
    ],
  },
  "Bulk Voice Call": {
    "Call Quality": [
      "Poor Audio Quality",
      "Call Drops",
      "Echo Issues",
      "Call Delays",
    ],
    "Call Setup": [
      "IVR Configuration",
      "Call Scheduling",
      "Concurrent Call Limits",
      "Call Recording",
    ],
    "Campaign Management": [
      "Call Reports",
      "Contact List Management",
      "Opt-out Handling",
    ],
  },
  "Bulk WhatsApp (Unofficial)": {
    "Message Delivery": [
      "Delivery Failures",
      "Delayed Messages",
      "Incorrect Recipients",
      "Message Not Received",
    ],
    Content: [
      "Message Formatting",
      "Media Attachments",
      "Interactive Messages",
    ],
  },
  "Bulk WhatsApp (Branded)": {
    "Message Delivery": [
      "Delivery Failures",
      "Delayed Messages",
      "Incorrect Recipients",
      "Message Not Received",
    ],
    Content: [
      "Message Formatting",
      "Media Attachments",
      "Interactive Messages",
    ],
  },
  "Compliance and Legal": [
    "Data Privacy Concerns",
    "Spam Complaints",
    "Regulatory Compliance",
    "Terms of Service Violations",
  ],
  "Training and Onboarding": [
    "Platform Training",
    "User Guides and Tutorials",
    "Onboarding Assistance",
    "Webinars and Workshops",
  ],
  "Feedback and Suggestions": [
    "Feature Requests",
    "Service Improvement Suggestions",
    "General Feedback",
  ],
};

const resolveDefaultSupportPlatform = () => {
  if (import.meta.env.VITE_SUPPORT_PLATFORM) {
    return import.meta.env.VITE_SUPPORT_PLATFORM;
  }

  if (typeof window !== "undefined" && window.location?.host) {
    return window.location.host;
  }

  return "wa40-platform";
};

export const DEFAULT_SUPPORT_PLATFORM = resolveDefaultSupportPlatform();

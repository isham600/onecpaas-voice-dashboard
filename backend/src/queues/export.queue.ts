import { Queue } from 'bullmq';
import { redisConnection } from './index.js';

export const exportQueue = new Queue('campaign-export', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts:          2,
    backoff:           { type: 'exponential', delay: 5000 },
    removeOnComplete:  { count: 200 },
    removeOnFail:      { count: 200 },
  },
});

// ── Shared export types (used by whatsapp + sms export services + worker) ──────

export type ExportType =
  | 'campaign_summary'
  | 'campaign_details'
  | 'campaign_contacts'
  | 'campaign_report'
  | 'campaign_click_report'
  | 'sms_summary'
  | 'sms_delivery'
  | 'sms_details'
  | 'sms_archive'
  | 'sms_admin_logs'
  | 'rcs_summary'
  | 'rcs_details'
  | 'wa_inbox_summary'
  | 'wa_inbox_messages'
  | 'wa_inbox_chat'
  | 'rcs_inbox_summary'
  | 'rcs_inbox_messages'
  | 'rcs_inbox_chat'
  | 'virtual_broadcast'
  | 'voice_summary'
  | 'voice_details'
  | 'gsm_details'
  | 'gsm_delivery'
  | 'gsm_dlr';

export interface ExportFilters {
  // Campaign filters
  request_id?:     string;
  search?:         string;
  template_id?:    string;
  status?:         string;
  from_date?:      string;
  to_date?:        string;
  created_by?:     string;
  sort?:           string;
  sort_by?:        string;
  order?:          string;
  channel?:        string;
  campaign_name?:  string | null; // resolved at enqueue time — shown in the export drawer
  acceptabledataagelimit?: number; // click-report: days after send a reply still counts as a "click"
  pulse30?:        number;        // Voice: 1 = Voice 30 (30s-slab) campaigns only, 0/undefined = standard Voice
  sim?:            boolean;       // GSM: real (mob_no_sms_gsm) vs SIM (mob_no_sms_gsm_sim) route
  owner_username?: string;        // GSM SIM: the campaign's actual owner (may differ from the
                                   // requesting reseller viewing their downline's campaign) —
                                   // the worker must query data scoped to this, not job.data.username

  // Inbox: pre-resolved context (serialised at enqueue time)

  // Inbox: pre-resolved context (serialised at enqueue time)
  sender_numbers?:       string[];
  parent_username?:      string;
  is_agent?:             boolean;
  assign_user_id?:       number | null;
  self_assign_id?:       number | null;
  can_access_all_chat?:  boolean;
  receiver_id?:          string;   // WA single-chat export
  phone_number?:         string;   // RCS single-chat export

  // Inbox filter params
  filter_type?:              string;   // 'assign_to_me' | 'unassigned' | 'unread'
  chat_state?:               string;
  tag?:                      string;
  message_contains?:         string;
  source?:                   string;
  waiting_since_minutes?:    number;
  agent_id?:                 number;
}

export interface ExportJobData {
  job_id:    string;
  username:  string;
  file_path: string;
  type:      ExportType;
  filters:   ExportFilters;
}

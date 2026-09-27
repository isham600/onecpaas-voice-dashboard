import type { ColumnType, Generated } from 'kysely';

type Opt<T> = ColumnType<T, T | undefined, T>;
type OptNull<T> = ColumnType<T | null, T | null | undefined, T | null>;
type Timestamp = ColumnType<Date | null, string | undefined, string | undefined>;

export interface DB {
  ci_admin: {
    admin_id: Generated<number>;
    admin_role_id: number;
    username: string;
    usertype: string | null;
    whatsapp: string;
    whatsapp_credits: string;
    sms: string;
    sms_credits: string | null;
    voice_credits: string;
    email_credits: string | null;
    api_credits: string | null;
    gsm_credits: string;
    whatsapp_virtual_credits: string;
    sms_virtual_credits: string | null;
    overseas_credits: string;
    misscall: string | null;
    misscall_credits: string | null;
    voice: string;
    email_bulk: string;
    api_whatsapp: string | null;
    gsm: string;
    whatsapp_virtual: string;
    sms_virtual: string | null;
    overseas_sms: string;
    chat: string | null;
    country: string | null;
    firstname: string;
    lastname: string;
    password: string;
    email: string | null;
    mobile_no: string;
    mobile_no_demo: string | null;
    msgtype: string | null;
    senderid: string | null;
    dummy_credits: string | null;
    txt_balance: string | null;
    route: string | null;
    status: string | null;
    Reseller: string | null;
    MasterReseller: string | null;
    delivery_type: string;
    ndncstatus: string | null;
    dummy_credits_api: string | null;
    api_user: string | null;
    api_status: string;
    api_base_url: string | null;
    expiry: string | null;
    authkey: string;
    authkey1: string;
    last_login: ColumnType<Date, string | undefined, string>;
    is_verify: number;
    is_admin: number;
    is_active: number;
    is_super: number;
    token: string | null;
    password_reset_code: string | null;
    last_ip: string | null;
    last_login_device: string | null;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    serss: number;
    is_notify_visible: number;
    otp: string | null;
    otp_created_at: ColumnType<Date, string | undefined, null>;
    remember_token: string | null;
    token_version: Generated<number>;
  };

  ci_admin_logs: {
    id:          Generated<number>;
    username:    string;
    ip_address:  string | null;
    device_type: string | null;
    browser:     string | null;
    os:          string | null;
    user_agent:  string | null;
    app_version: string | null;
    api_version: string | null;
    created_at:  Generated<Date>;
  };

  mail_smtp_accounts: {
    id:            Generated<number>;
    username:      string;
    account_name:  string;
    smtp_host:     string;
    smtp_port:     number;
    smtp_user:     string;
    smtp_password: string;
    from_name:     string;
    from_email:    string;
    encryption:    'none' | 'tls' | 'ssl';
    status:        'active' | 'inactive';
    created_at:    Generated<Date>;
    updated_at:    Generated<Date>;
  };

  assign_users: {
    id: Generated<number>;
    first_name: string;
    last_name: string;
    username: string;
    assign_user: string | null;
    truncate: Opt<number>;
    tags: string | null;
    roll: Opt<number>;
    agent_email: string | null;
    is_email_verified: Opt<number>;
    agent_mobile: string | null;
    is_mobile_verified: Opt<number>;
    online_status: Opt<string>;
    last_login_at: Timestamp;
    last_login_IP: string | null;
    team: Opt<string>;
    can_access_teaminbox:          Opt<number>;
    can_access_whatsapp_broadcast: Opt<number>;
    can_access_chatbots:           Opt<number>;
    can_access_crm:                Opt<number>;
    can_access_contacts:           Opt<number>;
    can_access_automation:         Opt<number>;
    can_access_agent_management:   Opt<number>;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  teams: {
    id: Generated<number>;
    username: string;
    team: string;
    size: Opt<number>;
    default: Opt<string>;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  // Legacy voice broadcast tables (pre-existing, no migration — ported from
  // the old Laravel `delivery33`/`mob_no33` pair as-is).
  delivery33: {
    id: Generated<number>;
    requestid: string;
    user_callerid: string;
    content: string;
    msgtype: string | null;
    username: string;
    dte: string; // stored as 'YYYY-MM-DD HH:MM:SS' string, not a native datetime
    route: string;
    pulse30: Opt<number>; // 1 = billed under Voice Pulse 30 (30s slabs) instead of standard 15s slabs
    deduction: string;
    contacts: string | null;
    sms: string;
    status_pause: OptNull<number>;
    campaign_name: string;
    status: Generated<string>; // campaign-level completion status — defaults 'Pending', set to 'Completed' by the voice engine
    refund: Generated<number>; // 1 once the hourly refund worker has processed this campaign
    response_input: string | null;
    call_failed_message: string | null;  // legacy free-text field, superseded by fallback_sms_enabled below — left in place for old campaigns' historical data, no longer read/written
    call_failed_whatsapp: string | null; // legacy free-text field, superseded by fallback_whatsapp_enabled below
    fallback_whatsapp_enabled:       Opt<number>;
    fallback_whatsapp_delay_minutes: Opt<number>; // 0 = immediate, else one of 10,30,60,120,180,300
    fallback_sms_enabled:            Opt<number>;
    fallback_sms_delay_minutes:      Opt<number>;
    callback_audio: string | null;
    ivr_id: OptNull<number>; // saved IVR on the voice engine (voice_ivr_flows.id) — forwarded as ivr_id
    dtmf_flow: OptNull<string>; // raw nested-menu JSON as submitted, forwarded as-is to the voice engine's own dtmf_flow field (it understands the full audio/transfer/submenu/back/record vocabulary directly) — separate from ivr_flows.flow_json, which is cell247's own already-transformed copy used only for reporting
    retries: string | null;
    retries_count: OptNull<number>;
    retry_interval: OptNull<number>; // minutes between retry attempts (NULL = no retries)
    voice_id: string | null;
    dispatch_cursor: number | null; // highest mob_no33.id already enqueued for dispatch
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
  };

  mob_no33: {
    id: Generated<number>;
    receiver: string;
    rid: string | null;
    senderid: string;
    senderpwd: string | null;
    name: string;
    username: string;
    reseller: string | null;
    masterreseller: string | null;
    status: string;
    dat: string;
    tim: string;
    credits: string | null;
    request_id: string;
    delivery_time: string | null;
    delivery_date: string | null;
    template_id: number | null;
    message: string | null;
    schedule_date: string;
    schedule_time: string | null;
    success_full_per: string;
    media1: string | null;
    media2: string | null;
    media3: string | null;
    media4: string | null;
    media5: string | null;
    media6: string | null;
    media7: string | null;
    media8: string | null;
    retry_count: Opt<number>; // redial attempts used (voice retry worker)
    next_retry_at: OptNull<Date>; // scheduled redial time, NULL when none pending
    dialed_at: OptNull<Date>;        // set by the worker at originate
    answered_at: OptNull<Date>;      // from Dinstar CDR answer_date (gsm-webhook)
    call_duration: OptNull<number>;  // seconds on call, from Dinstar CDR duration
    hangup_reason: OptNull<string>;  // from Dinstar CDR reason
    engine_tracking_id: OptNull<string>; // per-call id from the external voice engine's webhook, if it sends one (distinct from delivery33.voice_id, which is campaign-level)
    cdr_synced_at: OptNull<Date>;    // when the CDR update landed
    fallback_status:   OptNull<'pending' | 'sent' | 'failed'>;
    fallback_response: OptNull<string>;
    fallback_error:    OptNull<string>;
    fallback_payload:  OptNull<string>;
  };

  // Audit trail — one row per campaign the hourly refund worker actually
  // credited back (never written for zero-credit campaigns; delivery33.refund
  // is the idempotency flag for those).
  mob_no33_refund_controller: {
    id:         Generated<number>;
    request_id: string;
    username:   string;
    credits:    number;
    date:       Generated<Date>;
  };

  // Voice 30's own refund audit table — one row per campaign. Distinguishes
  // full_refund (always credited to `username`, the campaign owner) from
  // partial_refund (unheard-duration refund, which may be redirected to a
  // reseller — see partial_refund_username — when voice_pulse30_refund_reseller
  // is on for that reseller and `username` is in their downline).
  mob_no33_pulse_refund_controller: {
    id:                     Generated<number>;
    request_id:             string;
    username:               string;
    full_refund:            ColumnType<string, number, number>;
    partial_refund:         ColumnType<string, number, number>;
    partial_refund_username: OptNull<string>;
    created_at:             Generated<Date>;
  };

  // IVR flow definitions consumed by the voice engine's ARI/Stasis app
  // (dinstar-voice-api repo). campaign_id = delivery33.requestid. A campaign
  // with a row here is dialed through the dynamic IVR instead of plain
  // playback.
  ivr_flows: {
    id: Generated<number>;
    client_id: Opt<number>;
    campaign_id: string;
    flow_json: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
  };

  // Per-call IVR outcomes written by the voice engine on hangup.
  // row_id = mob_no33.id (as string).
  ivr_call_results: {
    id: Generated<number>;
    row_id: string;
    campaign_id: string;
    channel_id: string;
    path_json: string | null;
    final_node: string | null;
    digits_pressed: string | null;
    collected_input: string | null;   // Long-DTMF capture, isolated from menu keys
    duration_seconds: number | null;
    disposition: string | null;
    forward_billing: string | null; // charged | refunded | insufficient (forward-call credit)
    webhook_success: number | null;   // in-IVR webhook node: 1 sent / 0 failed / null none
    webhook_http_code: number | null;
    webhook_payload: string | null;    // outgoing request body we sent
    webhook_response: string | null;   // provider's raw response body
    created_at: Generated<Date>;
  };

  credits: {
    id: Generated<number>;
    username: string;
    whatsapp_marketing_credits: Opt<number>;
    bulk_whatsapp_credits: Opt<number>;
    international_bulk_whatsapp_credits: Opt<number>;
    action_button_credits: Opt<number>;
    whatsapp_utility_credits: Opt<number>;
    branded_whatsapp_credits: Opt<number>;
    unbranded_whatsapp_credits: Opt<number>;
    whatsapp_credits: Opt<number>;
    sms_credits: Opt<number>;
    voice_credits: Opt<number>;
    // DECIMAL(10,2) — supports the Voice 30 half-credit refund case. mysql2
    // returns DECIMAL columns as strings; writes still take a plain number.
    voice_pulse30_credits: ColumnType<string, number | undefined, number>;
    rcs_credits: Opt<number>;
    gsm_credits: Opt<number>;
    gsm_sim_credit: Opt<number>;
    ai_videos_credits: Opt<number>;
    email_credits: Opt<number>;
    instagram_credits: Opt<number>;
    unofficial_business: Opt<number>;
    telegram_credits: Opt<number>;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  resellers: {
    id: Generated<number>;
    logo: string | null;
    bg_image: string | null;
    heading: string | null;
    loginHeading: string | null;
    loginSubheading: string | null;
    loginParagraph: string | null;
    footer: string | null;
    signup: Opt<number>;
    description: string | null;
    reseller: string | null;
    domain: string | null;
    whatsapp: Opt<number>;
    voice: Opt<number>;
    sms: Opt<number>;
    rcs: Opt<number>;
    number: Opt<number>;
    AI: Opt<number>;
    email: Opt<number>;
    support: Opt<number>;
    bulk_whatsapp: Opt<number>;
    telegram: Opt<number>;
    instagram: Opt<number>;
    manage_clients: Opt<number>;
    your_integration: Opt<number>;
    reseller_setting: Opt<number>;
    invoice: Opt<number>;
    username: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  reseller_images: {
    id: Generated<number>;
    username: string;
    path: string;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  clients: {
    id: Generated<number>;
    username: string;
    first_name: string;
    last_name: string;
    client_username: string;
    client_mobile_no: string;
    client_email: string;
    country: OptNull<string>;
    user_type: string;
    telemarketer_id: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  campaign_details: {
    id: Generated<number>;
    username: string | null;
    channel: Opt<string>;
    senderid: string | null;
    request_id: string | null;
    credit_history_log: string | null;
    Reseller: string | null;
    dat: ColumnType<Date | null, string | undefined, string | null>;
    estimated_time: string | null;  // scheduled time stored here (no separate scheduled_date/time cols)
    date: ColumnType<Date | null, string | undefined, string | null>;
    status: string | null;
    numbers: string | null;
    queue_no: string | null;
    carousel_paths: string | null;
    created_by: string | null;
    api: Opt<number>;     // 0 = normal broadcast, 1 = API broadcast
    created_at: Timestamp;
    updated_at: Timestamp;
    fallback_rcs:            string | null;  // JSON — RCS fallback config
    fallback_sms:            string | null;  // JSON — SMS fallback config
    fallback_primarychannel: string | null;  // 'rcs' | 'sms' — first fallback channel
    fallback_triggered_at:   ColumnType<Date | null, string | null, string | null>;
    refund: Generated<number>; // 1 once the daily WhatsApp refund worker has processed this campaign
  };

  // Audit trail — one row per WhatsApp campaign the daily refund worker
  // actually credited back. campaign_details.refund is the idempotency
  // flag; this table is unique on (username, request_id) as a schema-level
  // backstop against double-crediting.
  mob_no3_refund_controller: {
    id:              Generated<number>;
    request_id:      string;
    username:        string;
    billed_username: string | null; // account actually refunded — differs from username under consolidated reseller billing
    credits:         number;
    date:            Generated<Date>;
  };

  // Same idempotency-audit shape, one per channel — kept separate from
  // mob_no3_refund_controller (plain WhatsApp) per branded/unbranded
  // having their own dedicated worker, credit bucket, and unique key.
  mob_no3_branded_refund_controller: {
    id:              Generated<number>;
    request_id:      string;
    username:        string;
    billed_username: string | null;
    credits:         number;
    date:            Generated<Date>;
  };

  mob_no3_unbranded_refund_controller: {
    id:              Generated<number>;
    request_id:      string;
    username:        string;
    billed_username: string | null;
    credits:         number;
    date:            Generated<Date>;
  };

  agent_templates: {
    id: Generated<number>;
    agent_username: string;
    template_id: number;
    assigned_by: string;
    created_at: Generated<Date>;
  };

  wati: {
    id: Generated<number>;
    url: string;
    api_key: string;
    username: string;
    account_type: string | null;
    wstatus: string;
    date: ColumnType<Date, string, string>;
    expiry_date: ColumnType<Date, string, string>;
    whatsapp_number: string;
    namespace: string;
    template_url: string;
    code: string;
    access_token: string;
    bmid: string;
    expires_after: ColumnType<Date | null, string | undefined, string | null>;
  };

  wati_unbranded: {
    id: Generated<number>;
    url: string;
    api_key: string;
    username: string;
    account_type: string | null;
    wstatus: string;
    date: ColumnType<Date, string, string>;
    expiry_date: ColumnType<Date, string, string>;
    whatsapp_number: string;
    namespace: string;
    template_url: string;
    code: string;
    access_token: string;
    bmid: string;
    expires_after: ColumnType<Date | null, string | undefined, string | null>;
  };

  wati_branded: {
    id: Generated<number>;
    url: string;
    api_key: string;
    username: string;
    account_type: string | null;
    wstatus: string;
    date: ColumnType<Date, string, string>;
    expiry_date: ColumnType<Date, string, string>;
    whatsapp_number: string;
    namespace: string;
    template_url: string;
    code: string;
    access_token: string;
    bmid: string;
    expires_after: ColumnType<Date | null, string | undefined, string | null>;
  };

  whatsapp_profile_request: {
    id: Generated<number>;
    username: string;
    verified_name: string;
    number: string | null;
    numberForOTP: string;
    status: string;
    channel: string;
    createdAt: Generated<Date>;
    updatedAt: Generated<Date>;
  };

  profiles: {
    id: Generated<number>;
    username: string;
    business_name: string | null;
    official_business_name: string | null;
    business_industry: string | null;
    gst_or_taxId: string | null;
    gst_or_incorporationCertificate: string | null;
    company_PAN_card: string | null;
    about: string | null;
    profile_picture: string | null;
    description: string | null;
    phone_number: string | null;
    business_email_address: string | null;
    business_website: string | null;
    business_address: string | null;
    business_hours_of_operation: string | null;
    business_ID: string | null;
    social_media_links: string | null;
    status_verification: Opt<'verified' | 'pending'>;
    greeting_message: string | null;
    away_message: string | null;
    quick_replies: string | null;
    catalogID: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  chatbot_text: {
    id: Generated<number>;
    title: string;
    message: string;
    username: string;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  chatbot_flows: {
    id: Generated<number>;
    username: string;
    name: string | null;
    type: string | null;
    trigger_key: string | null;
    trigger_count: number | null;
    contain: string | null;
    reply_action: string | null;
    session: string | null;
    matching_method: string | null;
    fuzzy_logic_percentage: number | null;
    status: 'active' | 'inactive';
    Parameter1: string | null;
    Parameter2: string | null;
    Parameter3: string | null;
    Parameter4: string | null;
    Parameter5: string | null;
    Parameter6: string | null;
    Parameter7: string | null;
    Parameter8: string | null;
    Parameter9: string | null;
    Parameter10: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  groups: {
    id: Generated<number>;
    Group_name: string;
    count: string;
    is_active: number;
    added_by: string;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  contacts: {
    id: Generated<number>;
    contact_name: string | null;
    contact_mobile_number: string | null;
    Contact_email_address: string | null;
    is_active: number | null;
    Contact_group_id: number;
    added_by: string;
    agent: string | null;
    company_name: string | null;
    birth_date: string | null;
    tags: string | null;
    source: string | null;
    address: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
    whatsapp_name: string | null;
  };

  file_folders: {
    id: Generated<number>;
    folder_name: string;
    username: string;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  file_managers: {
    id: Generated<number>;
    username: string;
    folder: string | null;
    media: string | null;
    media_type: string | null;
    media_name: string;
    file_size: Opt<number>;
    mime_type: string | null;
    duration_seconds: Opt<number | null>;  // audio only — probed at upload; null for legacy files

    created_at: Timestamp;
    updated_at: Timestamp;
  };

  languages: {
    id: Generated<number>;
    language: string;
    short_name: string;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  templates: {
    id: Generated<number>;
    username: string;
    channel: Opt<string>;
    is_public: Opt<number>;
    template_name: string;
    status: Opt<number>;
    template_quality: string | null;
    template_name_use: string | null;
    reason: string | null;
    category: number;
    new_category: string | null;
    language: number;
    header_area_type: string;
    header_text: string | null;
    header_media_type: string | null;
    header_media_set: string | null;
    template_body: string | null;
    template_footer: string | null;
    carousels: string | null;
    flow: string | null;
    button_type_set: string | null;
    call_action_type_set1: string | null;
    call_action_type_set2: string | null;
    call_phone_btn_text: string | null;
    call_phone_btn_phone_number: string | null;
    visit_website_btn_text: string | null;
    visit_website_url_set: string | null;
    visit_website_url_text: string | null;
    quick_reply_btn_text1: string | null;
    quick_reply_btn_text2: string | null;
    quick_reply_btn_text3: string | null;
    quick_replies: string | null;
    template_id: string | null;
    delete2: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
    add_security_recommendation: Opt<number>;
    code_expiration_minutes: number | null;
  };

  template_controller: {
    id: Generated<number>;
    template_id: number;
    name: string;
    type: string | null;
    status: Opt<string>;
    error: string | null;
    meta_response: string | null;
    retry_count: Opt<number>;
    last_attempted: Timestamp;
    meta_submission_id: string | null;
    creation_date: Timestamp;
    last_updated: Timestamp;
  };

  Permissions: {
    id: Generated<number>;
    username: string;
    admin: Opt<number>;
    email_credits: Opt<number>;
    whatsapp_credits: Opt<number>;
    Whatsapp_marketing: OptNull<number>;
    whatsapp_utility: OptNull<number>;
    bulk_whatsapp: OptNull<number>;
    international_bulk_whatsapp: OptNull<number>;
    action_button: OptNull<number>;
    branded_whatsapp: OptNull<number>;
    unbranded_whatsapp: OptNull<number>;
    unofficial_whatsapp_add_button: OptNull<number>;
    sms_credits: Opt<number>;
    voice_credits: Opt<number>;
    voice_pulse30: OptNull<number>;
    voice_partial_refund: Opt<number>; // 1 = refund unheard part of answered voice calls
    voice_pulse30_refund_reseller: Opt<number>; // 1 = this reseller collects its downline's Voice 30 partial refunds instead of the individual user
    voice_call_fallback_notify: Opt<number>; // 1 = may configure + use a WhatsApp/SMS fallback API on call failure (see voice_call_fallback_configs)
    voice_routes: Opt<number>; // 1 = may manage Voice Routes and assign a route to users/resellers
    rcs_credits: Opt<number>;
    gsm_credits: Opt<number>;
    Credit_SIM_line: Opt<number>;   // reseller: SIM business enabled
    Credit_SIM_GSM: Opt<number>;    // user: GSM campaigns run on gsm_sim_credit
    gsmcredituser: Opt<number>;     // refund chain-break switch (default 1 = self-refund)
    ai_videos_credits: Opt<number>;
    virtual_call_credits: Opt<number>;
    telegram: OptNull<number>;
    instagram: OptNull<number>;
    manage_clients: OptNull<number>;
    metalogin: OptNull<number>;
    invoice: OptNull<number>;
    invoice_create: OptNull<number>;
    billing: OptNull<number>;
    admin_support: Opt<number>;
    reseller_support: OptNull<number>;
    support: OptNull<number>;
    can_access_report: OptNull<number>;
    broadcast_masterreseller: OptNull<number>;
    broadcast_masterreseller_csv: Opt<number>;
    Broadcast_chart: OptNull<number>;
    broadcast_readstatus: Opt<number>;
    your_integration: OptNull<number>;
    reseller_setting: OptNull<number>;
    can_agent_access_all_chat: OptNull<number>;
    agent_auto_assign_sendtemp: Opt<number>;
    agent_showtemp_username: Opt<number>;
    agent_auto_assign_broadcast: Opt<number>;
    agent_can_send_campaign: OptNull<number>;
    agent_can_view_campaign: OptNull<number>;
    agent_chat_only: OptNull<number>;
    agent_can_view_templates: OptNull<number>;
    numbers_credits: Opt<number>;
    international_call: OptNull<number>;
    can_create_reseller:      OptNull<number>;
    open_sms_template:        OptNull<number>;
    can_create_smpp_gateway:  OptNull<number>;
    sms_admin:                OptNull<number>;
    whatsapp_account_read:    OptNull<number>;
    whatsapp_account_create:  OptNull<number>;
    whatsapp_account_edit:    OptNull<number>;
    whatsapp_account_delete:  OptNull<number>;
    url_shortener:            OptNull<number>;
    file_manager:             OptNull<number>;
    google_integration:       OptNull<number>;
    created_at: Timestamp;
  };

  mob_no3: {
    id:                 Generated<number>;
    name:               string | null;
    username:           string | null;
    template_id:        string | null;
    request_id:         string | null;
    receiver:           string | null;
    masterreseller:     string | null;
    status:             string | null;
    dat:                string | null;
    tim:                string | null;
    schedule_date:      string | null;
    schedule_time:      string | null;
    delivery_time:      string | null;
    delivery_date:      string | null;
    whatsappid:         string | null;
    media1:             string | null;
    media2:             string | null;
    media3:             string | null;
    media4:             string | null;
    media5:             string | null;
    media6:             string | null;
    media7:             string | null;
    media8:             string | null;
    media9:             string | null;
    media10:            string | null;
    media11:            string | null;
    media12:            string | null;
    media13:            string | null;
    fallback_triggered: Opt<number>;  // 0 = not cascaded, 1 = cascaded to fallback channel
    created_at:         Timestamp;
  };

  mob_no3_unbranded_whatsapp: {
    id:                 Generated<number>;
    name:               string | null;
    username:           string | null;
    template_id:        string | null;
    request_id:         string | null;
    receiver:           string | null;
    masterreseller:     string | null;
    status:             string | null;
    dat:                string | null;
    tim:                string | null;
    schedule_date:      string | null;
    schedule_time:      string | null;
    media1:             string | null;
    media2:             string | null;
    media3:             string | null;
    media4:             string | null;
    media5:             string | null;
    media6:             string | null;
    media7:             string | null;
    media8:             string | null;
    media9:             string | null;
    media10:            string | null;
    media11:            string | null;
    media12:            string | null;
    media13:            string | null;
    fallback_triggered: Opt<number>;
    created_at:         Timestamp;
  };

  mob_no3_branded_whatsapp: {
    id:                 Generated<number>;
    name:               string | null;
    username:           string | null;
    template_id:        string | null;
    request_id:         string | null;
    receiver:           string | null;
    masterreseller:     string | null;
    status:             string | null;
    dat:                string | null;
    tim:                string | null;
    schedule_date:      string | null;
    schedule_time:      string | null;
    media1:             string | null;
    media2:             string | null;
    media3:             string | null;
    media4:             string | null;
    media5:             string | null;
    media6:             string | null;
    media7:             string | null;
    media8:             string | null;
    media9:             string | null;
    media10:            string | null;
    media11:            string | null;
    media12:            string | null;
    media13:            string | null;
    fallback_triggered: Opt<number>;
    created_at:         Timestamp;
  };

  link_no: {
    id:            Generated<number>;
    name:          string | null;
    username:      string;
    receiver:      string | null;
    status:        string | null;
    dat:           string | null;
    tim:           string | null;
    request_id:    string;
    carousels:     string | null;
    media_id:      string | null;
    delivery_time: string | null;
    delivery_date: string | null;
    schedule_date: string | null;
    schedule_time: string | null;
    msg:           string | null;
    img1:          string | null;
    img2:          string | null;
    img3:          string | null;
    img4:          string | null;
    img5:          string | null;
    img6:          string | null;
    img7:          string | null;
    img8:          string | null;
    img9:          string | null;
    img10:         string | null;
    audio:         string | null;
    video:         string | null;
    doc:           string | null;
    namecard:      string | null;
    fullname:      string | null;
    address:       string | null;
    phone:         string | null;
    phone2:        string | null;
    phone3:        string | null;
    mail:          string | null;
    url:           string | null;
    whatsappreply: string | null;
  };

  // ── Virtual / Unofficial WhatsApp tables ────────────────────────────────────

  campaign_details_unofficial: {
    id:             Generated<number>;
    username:       string;
    senderid:       string | null;
    request_id:     string | null;
    international:  Opt<number>;
    action_button:  Opt<number>;
    dat:            string | null;
    estimated_time: string | null;
    date:           string | null;
    status:         string | null;
    numbers:        string | null;
    Reseller:       string | null;
    queue_no:       string | null;
    service_id:     string | null;
    scheduled_date: string | null;
    scheduled_time: string | null;
    created_by:     string | null;
    mediawithcaption: Opt<number>;
    refund:         Generated<number>; // 1 once the virtual WhatsApp refund worker has processed this campaign
    created_at:     Timestamp;
    updated_at:     Timestamp;
  };

  campaign_details_unofficial_refund_controller: {
    id:          Generated<number>;
    request_id:  string;
    username:    string;
    credits:     number;
    refund_type: 'bulk' | 'international' | 'action_button';
    date:        Generated<Date>;
  };

  link_no_unofficial: {
    id:            Generated<number>;
    name:          string | null;
    username:      string;
    request_id:    string;
    dat:           string | null;
    tim:           string | null;
    schedule_date: string | null;
    schedule_time: string | null;
    msg:           string | null;
    img1:          string | null;
    img2:          string | null;
    img3:          string | null;
    img4:          string | null;
    img6:          string | null;
    img7:          string | null;
    audio:         string | null;
    video:         string | null;
    fullname:      string | null;
    address:       string | null;
    phone:         string | null;
    phone2:        string | null;
    phone3:        string | null;
    mail:          string | null;
    url:           string | null;
    interactive_buttons: string | null;
    status:        string | null;
    delivery_time: string | null;
    delivery_date: string | null;
    img1_status:   string | null;
    img2_status:   string | null;
    img3_status:   string | null;
    img4_status:   string | null;
    img5_status:   string | null;
    img6_status:   string | null;
    created_at:    Timestamp;
    updated_at:    Timestamp;
  };

  mob_no3_unofficial: {
    id:             Generated<number>;
    name:           string | null;
    username:       string | null;
    request_id:     string | null;
    international:  Opt<number>;
    action_button:  Opt<number>;
    receiver:       string | null;
    masterreseller: string | null;
    senderpwd:      string | null;
    reseller:       string | null;
    status:         string | null;
    dat:            string | null;
    tim:            string | null;
    schedule_date:  string | null;
    schedule_time:  string | null;
    delivery_time:  string | null;
    delivery_date:  string | null;
    credits:        string | null;
    media1:         string | null;
  };

  mob_no: {
    id:             Generated<number>;
    name:           string | null;
    username:       string | null;
    request_id:     string | null;
    international:  Opt<number>;
    action_button:  Opt<number>;
    receiver:       string | null;
    masterreseller: string | null;
    senderpwd:      string | null;
    reseller:       string | null;
    status:         string | null;
    dat:            string | null;
    tim:            string | null;
    credits:        string | null;
  };

  whatsapp_report_job: {
    id:            Generated<number>;
    job_id:        string;
    username:      string;
    type:          'campaign_summary' | 'campaign_details' | 'campaign_contacts' | 'campaign_report' | 'campaign_click_report'
                 | 'wa_inbox_summary' | 'wa_inbox_messages' | 'wa_inbox_chat'
                 | 'virtual_broadcast' | 'virtual_broadcast_dlr';
    status:        Opt<'queued' | 'processing' | 'ready' | 'failed'>;
    file_path:     string;
    total_rows:    Opt<number>;
    expected_rows: Opt<number>;
    filters:       string | null;
    error:         string | null;
    expires_at:    ColumnType<Date, string, string>;
    created_at:    Generated<Date>;
    updated_at:    Generated<Date>;
  };

  sms_report_job: {
    id:            Generated<number>;
    job_id:        string;
    username:      string;
    type:          'sms_summary' | 'sms_delivery' | 'sms_details' | 'sms_archive' | 'sms_admin_logs';
    status:        Opt<'queued' | 'processing' | 'ready' | 'failed'>;
    file_path:     string;
    total_rows:    Opt<number>;
    expected_rows: Opt<number>;
    filters:       string | null;
    error:         string | null;
    expires_at:    ColumnType<Date, string, string>;
    created_at:    Generated<Date>;
    updated_at:    Generated<Date>;
  };

  rcs_report_job: {
    id:            Generated<number>;
    job_id:        string;
    username:      string;
    type:          'rcs_summary' | 'rcs_details'
                 | 'rcs_inbox_summary' | 'rcs_inbox_messages' | 'rcs_inbox_chat';
    status:        Opt<'queued' | 'processing' | 'ready' | 'failed'>;
    file_path:     string;
    total_rows:    Opt<number>;
    expected_rows: Opt<number>;
    filters:       string | null;
    error:         string | null;
    expires_at:    ColumnType<Date, string, string>;
    created_at:    Generated<Date>;
    updated_at:    Generated<Date>;
  };

  voice_report_job: {
    id:            Generated<number>;
    job_id:        string;
    username:      string;
    type:          'voice_summary' | 'voice_details';
    status:        Opt<'queued' | 'processing' | 'ready' | 'failed'>;
    file_path:     string;
    total_rows:    Opt<number>;
    expected_rows: Opt<number>;
    filters:       string | null;
    error:         string | null;
    expires_at:    ColumnType<Date, string, string>;
    created_at:    Generated<Date>;
    updated_at:    Generated<Date>;
  };

  gsm_report_job: {
    id:            Generated<number>;
    job_id:        string;
    username:      string;
    type:          'gsm_details' | 'gsm_delivery' | 'gsm_dlr';
    status:        Opt<'queued' | 'processing' | 'ready' | 'failed'>;
    file_path:     string;
    total_rows:    Opt<number>;
    expected_rows: Opt<number>;
    filters:       string | null;
    error:         string | null;
    expires_at:    ColumnType<Date, string, string>;
    created_at:    Generated<Date>;
    updated_at:    Generated<Date>;
  };

  wati_multi: {
    id:               Generated<number>;
    username:         string;
    whatsapp_number:  string;
    wstatus:          Opt<string>;
    created_at:       Timestamp;
    updated_at:       Timestamp;
  };

  chat_messages: {
    id:                 Generated<number>;
    username:           string | null;
    sender_id:          string | null;
    receiver_id:        string | null;
    status:             Opt<number>;
    agent:              string | null;
    replySourceMessage: string | null;
    text:               string | null;
    interactive_text:   string | null;
    media:              string | null;
    type:               string | null;
    eventtype:          string | null;
    eventDescription:   string | null;
    template_id:        number | null;
    attributes:         string | null;
    template_media:     string | null;
    whts_ref_id:        string | null;
    reacted_to_whts_ref_id: string | null;
    created_at:         Timestamp;
    updated_at:         Timestamp;
  };

  chatbot_steps: {
    id:         Generated<number>;
    username:   string;
    flow_id:    number;
    edges:      string | null;
    nodes:      string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  chat_inbox_notes: {
    id:          Generated<number>;
    username:    string;
    assign_user: string | null;
    receiver_id: string;
    note:        string;
    created_at:  Timestamp;
    updated_at:  Timestamp;
  };

  chatinboxtag: {
    id:          Generated<number>;
    username:    string;
    receiver_id: string;
    tag:         string;
    assign_user: string | null;
    created_at:  Timestamp;
    updated_at:  Timestamp;
  };

  chat_messages_room: {
    id:            Generated<number>;
    sender_id:     string | null;
    receiver_id:   string | null;
    status:        Opt<number>;
    is_read:       Opt<number>;
    is_starred:    Opt<number>;
    internal_note: string | null;
    name:          string | null;
    assign_to:     string | null;
    source:        string | null;
    read_count:    Opt<number>;
    created_at:    Timestamp;
    updated_at:    Timestamp;
  };

  // ── GSM broadcast (legacy tables shared with old system) ────────────────────
  mob_no_sms_gsm: {
    id: Generated<number>;
    mo_no: string;
    msg: string | null;
    status: string;               // 'PP1' (<=10 numbers) | 'PP11'
    rid: string;                  // 8-digit random request id
    unicode: Opt<number>;
    sender_id: string | null;
    usr: string;
    route: string;                // 'MO' | 'GSM' | 'SMS'
    media2: string | null;
    media3: string | null;
    media4: string | null;
    media5: string | null;
    media6: string | null;
    media7: string | null;
    media8: string | null;
    media9: string | null;
    media10: string | null;
    media11: string | null;
    media12: string | null;
    media13: string | null;
    demo: Opt<number>;            // 1 = sent via the GSM SMS daily demo quota
    flag: string | null;
    success_full_per: Opt<string>;
    tme: Timestamp;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  // Virtual GSM SIM campaigns — clone of mob_no_sms_gsm; statuses are set
  // manually by the SIM reseller, resubmitted_rid links to the real rid
  mob_no_sms_gsm_sim: {
    id: Generated<number>;
    mo_no: string;
    msg: string | null;
    status: string;
    rid: string;                  // SIMCAMP_YYYYMMDD_HEX8
    unicode: Opt<number>;
    sender_id: string | null;
    usr: string;
    route: string;
    media2: string | null;
    media3: string | null;
    media4: string | null;
    media5: string | null;
    media6: string | null;
    media7: string | null;
    media8: string | null;
    media9: string | null;
    media10: string | null;
    media11: string | null;
    media12: string | null;
    media13: string | null;
    demo: Opt<number>;            // always 0 here (virtual rows are never demo sends)
    flag: string | null;          // analyzer category (reseller-only; user sees status)
    success_full_per: Opt<string>;  // '0' = real delivery, '3' = simulated status
    resubmitted_rid: string | null;
    tme: Timestamp;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  delivery1_sms: {
    id: Generated<number>;
    requestid: string;
    username: string;
    senderid: string | null;
    msg: string | null;
    sim_type: Opt<number>;        // 0 = real GSM, 1 = GSM SIM campaign
    msgtype: Opt<number>;         // unicode flag
    dte: Timestamp;
    route: string;
    deduction: Opt<number>;       // counts (credits per message)
    contacts: Opt<number>;
    template_id: string | null;
    broadcast_name: string;
    schedule_date: string | null;
    schedule_time: string | null;
    refund: Opt<number>;          // 0 = not refund-checked, 1 = processed
  };

  // GSM refund audit — one row per refunded campaign (unique request_id+username)
  mob_no_sms_gsm_refund_controller: {
    id: Generated<number>;
    request_id: string;
    username: string;             // campaign owner (usr)
    refund_to: string;            // who received the refund
    wallet: string;               // 'gsm_credits' | 'gsm_sim_credit'
    failed_count: number;
    deduction: number;
    refund_amount: number;
    reason: string | null;
    created_at: Generated<Timestamp>;
  };

  // ── WABA business profile cache + change history ─────────────────────────────
  waba_profile: {
    id: Generated<number>;
    username: string;
    channel: string;
    phone_number_id: string | null;
    verified_name: string | null;
    display_phone_number: string | null;
    about: string | null;
    description: string | null;
    address: string | null;
    email: string | null;
    vertical: string | null;
    websites: string | null;             // JSON array string
    profile_picture_url: string | null;  // Meta's temporary signed URL
    logo_url: string | null;             // our permanent hosted copy
    synced_at: Timestamp;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  waba_profile_change_logs: {
    id: Generated<number>;
    waba_profile_id: number;
    username: string;
    channel: string;
    old_data: string;
    new_data: string;
    changed_fields: string;
    change_source: string;               // initial | meta_sync | user_update
    changed_by: string | null;
    created_at: Timestamp;
  };

  // ── Shopify store connection (OAuth) + inbound webhook audit ─────────────────
  shopify_stores: {
    id: Generated<number>;
    username: string;
    shop_domain: string;
    access_token: string;                // encrypted
    scope: string | null;
    status: string;                      // connected | disconnected
    installed_at: Timestamp;
    updated_at: Timestamp;
  };

  shopify_webhook_logs: {
    id: Generated<number>;
    store_id: number | null;
    shop_domain: string;
    topic: string;
    shopify_webhook_id: string | null;
    payload: string;
    hmac_valid: number;                  // 0 | 1
    processed: number;                   // 0 | 1
    error: string | null;
    created_at: Timestamp;
  };

  shopify_event_templates: {
    id: Generated<number>;
    username: string;
    store_id: number;
    event_type: string;                  // order_placed | order_shipped | order_delivered | order_cancelled | cod_confirm | abandoned_cart | order_feedback
    template_id: number | null;
    delay_minutes: number | null;        // used by abandoned_cart / order_feedback
    enabled: number;                     // 0 | 1
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  shopify_orders: {
    id: Generated<number>;
    store_id: number;
    shopify_order_id: string;
    cart_token: string | null;           // matched against shopify_abandoned_checkouts.checkout_token to mark recovery
    order_number: string | null;
    customer_phone: string | null;       // AES-256-GCM encrypted — decrypt() before use
    customer_phone_hash: string | null;  // hmacIndex(phone) — exact-match lookups (encrypted value differs per row)
    customer_name: string | null;        // AES-256-GCM encrypted — decrypt() before use
    total_price: string | null;
    financial_status: string | null;
    fulfillment_status: string | null;
    cod: number;                         // 0 | 1
    cod_status: string | null;           // pending | confirmed | cancelled
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  shopify_order_events: {
    id: Generated<number>;
    order_id: number | null;
    checkout_id: number | null;
    event_type: string;
    message_id: number | null;
    status: string;                      // queued | sent | skipped | failed
    error: string | null;
    created_at: Timestamp;
  };

  shopify_abandoned_checkouts: {
    id: Generated<number>;
    store_id: number;
    checkout_token: string;
    customer_phone: string | null;       // AES-256-GCM encrypted — decrypt() before use
    customer_phone_hash: string | null;  // hmacIndex(phone) — exact-match lookups
    customer_name: string | null;        // AES-256-GCM encrypted — decrypt() before use
    cart_total: string | null;
    recovered: number;                   // 0 | 1
    reminder_status: string;             // pending | sent | skipped
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  shopify_opt_outs: {
    id: Generated<number>;
    username: string;
    phone: string;
    created_at: Timestamp;
  };

  // Global contact list (legacy) — whitelist uploads also land here
  clientcontact: {
    id: Generated<number>;
    username: string | null;
    receiver: string;
    date: Timestamp;
  };

  // Staging table for the campaign analyzer (contiguous ids for the ±1 rule)
  gsm_sim_camp: {
    id: Generated<number>;
    sim_id: number;
    rid: string;
    usr: string;
    mo_no: string;
    status: string | null;     // computed status (DELIVERED / SENT / failed / sendgsm)
    flag: string | null;       // computed category
    success_full_per: string | null;   // '0' = real, '3' = simulated
    mo10: Opt<string>;                 // generated: RIGHT(mo_no,10), indexed
    created_at: Timestamp;
  };

  // GSM SIM whitelist — per-reseller trusted numbers for real delivery
  gsm_sim_whitelist: {
    id: Generated<number>;
    username: string;
    mo_no: string;
    mo10: Opt<string>;        // generated: RIGHT(mo_no,10), indexed (username, mo10)
    created_at: Timestamp;
  };

  channels: {
    id:             Generated<number>;
    front_end_name: string;
    back_end_name:  string;
    permissions:    string;
    status:         number;
  };

  bulksms_campaign_summery: {
    id:                    Generated<number>;
    username:              string;
    request_id:            string;
    broadcast_name:        string | null;
    unicode:               number;
    flash:                 number;
    msg_mode:              string | null;
    msgtype:               string;
    msg:                   string | null;
    msg_routes:            string | null;
    sender_id:             string | null;
    template_id:           string | null;
    peid:                  string | null;
    reseller:              string | null;
    deduction:             string | null;
    contacts:              string | null;
    status:                string | null;
    schedule_time:         string | null;
    schedule_date:         string | null;
    created_at:            Timestamp;
    updated_at:            Timestamp;
    fallback_wa:             string | null;  // JSON — WA fallback config
    fallback_rcs:            string | null;  // JSON — RCS fallback config
    fallback_primarychannel: string | null;  // 'whatsapp' | 'rcs' — first fallback channel
    fallback_triggered_at:   ColumnType<Date | null, string | null, string | null>;
  };

  bulksms_campaign_details: {
    id:                 Generated<number>;
    username:           string;
    receiver:           string;
    request_id:         string;
    rid:                string | null;
    status:             string;
    broadcast_name:     string;
    msg:                string | null;
    msg_mode:           string | null;
    msg_routes:         string | null;
    sender_id:          string;
    template_id:        string | null;
    peid:               string | null;
    reseller:           string | null;
    senderpwd:          string | null;
    masterreseller:     string | null;
    gateway_used:       string | null;
    delivery_date:      string | null;
    delivery_time:      string | null;
    schedule_date:      string | null;
    schedule_time:      string | null;
    unicode:            number;
    flash:              number;
    credit_count:       Opt<number>;
    media1:             string | null;
    media2:             string | null;
    media3:             string | null;
    media4:             string | null;
    media5:             string | null;
    media6:             string | null;
    media7:             string | null;
    media8:             string | null;
    fallback_triggered: Opt<number>;  // 0 = not cascaded, 1 = cascaded to fallback channel
    created_at:         Timestamp;
    updated_at:         Timestamp;
  };

  bulksms_sms_engine_logs: {
    id:                 Generated<number>;
    campaign_id:        number;
    recipient:          string;
    status:             'success' | 'failed';
    message_id:         string | null;
    error_message:      string | null;
    dlr_status:         string | null;
    dlr_err_code:       string | null;
    dlr_received_at:    Timestamp;
    peid:               string | null;
    template_id:        string | null;
    telemarketer_chain: string | null;
    gateway_id:         number | null;
    gateway_name:       string | null;
    created_at:         Timestamp;
    is_flash:           number | null;
  };

  bulksms_campaign_details_archive: {
    id:             Generated<number>;
    username:       string;
    receiver:       string;
    request_id:     string;
    rid:            string | null;
    status:         string;
    broadcast_name: string;
    msg:            string | null;
    msg_mode:       string | null;
    msg_routes:     string | null;
    sender_id:      string;
    template_id:    string | null;
    peid:           string | null;
    reseller:       string | null;
    senderpwd:      string | null;
    masterreseller: string | null;
    gateway_used:   string | null;
    delivery_date:  string | null;
    delivery_time:  string | null;
    schedule_date:  string | null;
    schedule_time:  string | null;
    unicode:        number;
    flash:          number;
    media1:         string | null;
    media2:         string | null;
    media3:         string | null;
    media4:         string | null;
    media5:         string | null;
    media6:         string | null;
    media7:         string | null;
    media8:         string | null;
    created_at:     Timestamp;
    updated_at:     Timestamp;
  };

  fund1: {
    id:         Generated<number>;
    service:    string;
    sms:        string;
    accex:      string;
    amt:        string;
    taxamt:     string;
    pps:        number;
    decrip:     string | null;
    name:       string;
    cd:         string;
    dte:        string;
    usertype:   string;
    reseller:   string;
    created_at: Timestamp;
  };

  verify_loggedin_users: {
    id:             Generated<number>;
    username:       string;
    mobile_number:  string | null;
    otp:            string | null;
    otp_created_at: Timestamp;
    ip_address:     string | null;
    device_info:    string | null;
    last_login_at:  Timestamp;
    location:       string | null;
    created_at:     Timestamp;
    updated_at:     Timestamp;
  };


  bulksms_spam_keywords: {
    id:         Generated<number>;
    keyword:    string;
    category:   string | null;
    is_active:  Opt<number>;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
  };

  bulksms_sender_ids: {
    id:         Generated<number>;
    sender_id:  string;
    username:   string;
    type:       number | null;
    status:     Opt<number>;
    peid:       string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  bulksms_dlt_template: {
    id:            Generated<number>;
    username:      string;
    template_name: string;
    message:       string;
    teid:          string;
    peid:          string | null;
    status:        Opt<number>;
    create_at:     Timestamp;
    update_at:     Timestamp;
  };

  bulksms_smpp_routes: {
    id:         Generated<number>;
    route_name: string;
    gateway_id: number;
    channel:    string | null;
    created_by: string;
    is_default: Opt<number>;
    status:     Opt<'active' | 'inactive'>;
    created_at: Timestamp;
    updated_at: Timestamp;
    weight:     Opt<number>;
    is_active:  Opt<number>;
  };

  bulksms_smpp_route_assignments: {
    id:          Generated<number>;
    route_name:  string;
    assigned_to: string;
    assigned_by: string;
    created_at:  Timestamp;
  };

  sms_blacklist: {
    id:           Generated<number>;
    username:     string;
    phone_number: string;
    type:         'global' | 'local';
    reason:       string | null;
    created_at:   Timestamp;
    updated_at:   Timestamp;
  };

  smpp_gateways: {
    id:                   Generated<number>;
    username:             string;
    gateway_name:         string;
    ip_address:           string;
    system_id:            string;
    password:             string;
    status:               Opt<'active' | 'inactive'>;
    connection_mode:      Opt<'transceiver' | 'transmitter_receiver'>;
    max_tps:              number | null;
    priority:             number | null;
    channel:              Opt<'promotional' | 'transactional'>;
    tx_sessions:          number | null;
    rx_sessions:          number | null;
    txrx_sessions:        number | null;
    tx_port:              number | null;
    rx_port:              number | null;
    txrx_port:            number | null;
    address_npi:          string | null;
    address_ton:          string | null;
    async_mode:           number | null;
    keep_alive_interval:  number | null;
    system_type:          string | null;
    gateway_open_time:    string | null;
    gateway_close_time:   string | null;
    interface_version:    string | null;
    window_size:          number | null;
    gsm_encoding:         Opt<'GSM7Bit' | 'UCS2' | 'UTF8'>;
    enabled_template_dlt: number | null;
    telemarketer_id:      string | null;
    is_hash_gateway:      number | null;
    connection_state:     string | null;
    last_state_change:    ColumnType<Date | null, string | null, string | null>;
    created_at:           Timestamp;
    updated_at:           Timestamp;
  };

  url_shortners: {
    id:         Generated<number>;
    username:   string;
    input_type: string;
    s_url:      string;
    header:     string | null;
    l_url:      string;
    status:     number;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  url_shortners_clicks: {
    id:         Generated<number>;
    s_url:      string;
    username:   string;
    country:    string | null;
    browser:    string | null;
    ip_address: string | null;
    created_at: Timestamp;
  };

  rcs_accounts: {
    id:         Generated<number>;
    username:   string;
    agent_id:   string;
    bot_id:     string | null;
    bot_name:   string | null;
    api_key:    string;
    status:     Opt<'active' | 'inactive'>;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  rcs_templates: {
    id:                     Generated<number>;
    username:               string;
    name:                   string;
    smartping_template_id:  string | null;
    message_type:           string;
    body_text:              string | null;
    rich_card_json:         string | null;
    carousel_cards_json:    string | null;
    media_url:              string | null;
    suggested_replies_json: string | null;
    status:                 Opt<string>;
    api_error:              string | null;
    created_at:             Timestamp;
    updated_at:             Timestamp;
  };

  rcs_camp_summary: {
    id:                    Generated<number>;
    username:              string;
    name:                  string;
    request_id:            string | null;
    template_id:           number;
    template_name:         string;
    audience:              Opt<number>;
    sent:                  Opt<number>;
    delivered:             Opt<number>;
    read_count:            Opt<number>;
    clicked:               Opt<number>;
    link_clicked:          Opt<number>;
    replied:               Opt<number>;
    status:                Opt<string>;
    sms_fallback:            Opt<number>;
    fallback_sms:            string | null;  // JSON — SMS fallback config
    fallback_wa:             string | null;  // JSON — WA fallback config
    fallback_primarychannel: string | null;  // 'sms' | 'whatsapp' — first fallback channel
    fallback_triggered_at:   ColumnType<Date | null, string | null, string | null>;
    scheduled_date:        string | null;
    scheduled_time:        string | null;
    created_at:            Timestamp;
    updated_at:            Timestamp;
  };

  rcs_camp_details: {
    id:                   Generated<number>;
    camp_id:              number;
    username:             string;
    phone_number:         string;
    media1:               string | null;
    media2:               string | null;
    media3:               string | null;
    media4:               string | null;
    media5:               string | null;
    media6:               string | null;
    media7:               string | null;
    media8:               string | null;
    media9:               string | null;
    request_id:           string | null;
    rid:                  string | null;
    status:               Opt<string>;
    schedule_date:        string | null;
    schedule_time:        string | null;
    api_response:         string | null;
    error:                string | null;
    retry_count:          Opt<number>;
    sent_at:              ColumnType<Date | null, string | null, string | null>;
    delivered_at:         ColumnType<Date | null, string | null, string | null>;
    read_at:              ColumnType<Date | null, string | null, string | null>;
    clicked_at:           ColumnType<Date | null, string | null, string | null>;
    link_clicked_at:      ColumnType<Date | null, string | null, string | null>;
    replied_at:           ColumnType<Date | null, string | null, string | null>;
    failed_at:            ColumnType<Date | null, string | null, string | null>;
    delivery_date:        string | null;
    delivery_time:        string | null;
    fallback_sms_status:  string | null;
    fallback_sms_sent_at: ColumnType<Date | null, string | null, string | null>;
    fallback_triggered:   Opt<number>;  // 0 = not cascaded, 1 = cascaded to SMS
    created_at:           Timestamp;
    updated_at:           Timestamp;
  };

  rcs_blacklist: {
    id:           Generated<number>;
    username:     string;
    phone_number: string;
    is_global:    Opt<number>;
    reason:       string | null;
    added_by:     string | null;
    created_at:   Timestamp;
  };

  rcs_conversations: {
    id:                Generated<number>;
    username:          string;
    agent_id:          string | null;
    phone_number:      string;
    name:              string | null;
    last_message:      string | null;
    last_message_type: string | null;
    last_message_dir:  string | null;
    last_message_at:   ColumnType<Date | null, string | null, string | null>;
    unread_count:      Opt<number>;
    status:            Opt<string>;
    is_starred:        Opt<number>;
    assign_to:         number | null;
    updated_at:        Timestamp;
  };

  rcs_inbox_tags: {
    id:           Generated<number>;
    username:     string;
    phone_number: string;
    tag:          string;
    assign_user:  string | null;
    created_at:   Timestamp;
    updated_at:   Timestamp;
  };

  rcs_inbox_notes: {
    id:           Generated<number>;
    username:     string;
    phone_number: string;
    note:         string;
    assign_user:  string | null;
    created_at:   Timestamp;
    updated_at:   Timestamp;
  };

  rcs_messages: {
    id:              Generated<number>;
    username:        string;
    agent_id:        string | null;
    phone_number:    string;
    message_id:      string | null;
    direction:       string;
    type:            string;
    text:            string | null;
    suggestion_text: string | null;
    media_url:       string | null;
    media_mime:      string | null;
    media_filename:  string | null;
    raw_payload:     string | null;
    created_at:      Timestamp;
  };

  support_tickets: {
    id:                   Generated<number>;
    username:             string;
    category:             string | null;
    ticket_id:            string | null;
    sub_category:         string | null;
    subject_sub_category: string | null;
    subject:              string | null;
    body:                 string | null;
    media:                string | null;
    assigned_to:          string | null;
    status:               Opt<number>;   // 0=Pending 1=Open 2=Closed 3=Under Investigation
    reseller:             string | null;
    message_by:           string | null; // 'user' | 'reseller'
    created_at:           Timestamp;
    updated_at:           Timestamp;
  };

  webhooks: {
    id:           Generated<number>;
    username:     string;
    url:          string;
    status:       ColumnType<number, number | undefined, number>; // 1=enabled, 0=disabled
    created_date: Timestamp;
    updated_date: Timestamp;
    value:        number;       // 1=only status, 2=messages also
    sender_id:    string;
  };

  webhook_log: {
    id:          Generated<number>;
    webhook_url: string;
    username:    string;
    status:      number;        // 1=success, 0=fail
    date:        string;
    time:        string;
    request_id:  string | null;
    response:    string | null;
    status_sent: string;
    keyword:     string;
  };

  // Audit trail for the external voice engine's incoming status callbacks
  // (POST /api/v1/voice/webhook/status) — separate from webhook_log above,
  // which is for cell247's own OUTGOING webhook sends. `matched` records
  // whether the payload's request_id/receiver actually mapped to a mob_no33
  // row, so a run of matched=0 rows is a strong signal the inferred payload
  // shape needs adjusting.
  voice_webhook_log: {
    id:          Generated<number>;
    request_id:  string | null;
    receiver:    string | null;
    status:      string | null;
    matched:     Generated<number>; // 0/1
    payload:     string | null;     // raw JSON body, for shape verification
    received_at: Generated<Date>;
  };

  // Reusable named DTMF/IVR flows, built in the visual flow builder and
  // selectable from a dropdown when submitting a voice campaign. rows_json
  // stores the same `rows` tree the frontend's DtmfFlowBuilder edits
  // directly (UI shape, not the backend's toDtmfFlowPayload output) so a
  // saved flow round-trips losslessly back into the editor.
  voice_routes: {
    id: Generated<number>;
    code: string;                       // 'default' | 'notifynow'
    name: string;
    description: string | null;
    kind: 'engine' | 'notifynow';
    url: string | null;
    api_key_enc: string | null;
    webhook_token: string | null;
    status: ColumnType<number, number | undefined, number>;
    is_default: ColumnType<number, number | undefined, number>;
    updated_at: Timestamp;
  };
  voice_route_assignments: {
    id: Generated<number>;
    username: string;
    route_id: number;
    assigned_by: string | null;
    assigned_at: Timestamp;
  };
  voice_route_logs: {
    id: Generated<number>;
    created_at: Timestamp;
    kind: 'submit' | 'callback';
    request_id: string | null;
    username: string | null;
    route_code: string;
    contacts: number | null;
    status: 'sent' | 'failed' | 'received';
    http_code: number | null;
    provider_ref: string | null;
    response: string | null;
    error: string | null;
    duration_ms: number | null;
  };

  dispatch_batches: {
    id: Generated<number>;
    requestid: string;
    username: string;
    batch_index: number;
    receiver_ids: string;   // JSON array of mob_no33.id
    status: 'queued' | 'sent' | 'failed';
    attempts: ColumnType<number, number | undefined, number>;
    last_error: string | null;
    engine_ref: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  voice_ivr_flows: {
    id: Generated<number>;
    username: string;                         // owner (agents resolved to parent)
    title: string;
    route: 'transactional' | 'promotional';
    status: Opt<number>;                      // 0=draft 1=active
    flow_json: string;                        // { nodes, edges } from the IVR builder
    // Pre-built engine flow, refreshed on every save: { flow, audio_url,
    // audio_duration }, or null when the IVR isn't runnable yet. Sent inline
    // to the voice engine at dispatch.
    compiled_flow: Opt<string | null>;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  voice_dtmf_flows: {
    id:         Generated<number>;
    username:   string;
    name:       string;
    rows_json:  string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
  };

  notifications: {
    id:         Generated<number>;
    username:   string;
    type:       'info' | 'success' | 'warning' | 'error';
    title:      string;
    message:    string;
    is_read:    Opt<number>;  // 0 = unread, 1 = read
    created_at: Generated<Date>;
  };

  invoice: {
    id: Generated<number>;
    user_id: string;
    username: string;
    invoice_no: string;
    company_name: string | null;
    company_address: string | null;
    company_address2: string | null;
    company_email: string | null;
    company_mobile: string | null;
    mobile: string | null;
    txnid: string | null;
    payer_name: string | null;
    payer_company_name: string | null;
    payer_email: string | null;
    payer_address: string | null;
    payer_mobile: string | null;
    address_country_code: string | null;
    items_detail: string | null;
    credits: string | null;
    rate: string | null;
    mc_currency: string | null;
    payment_gross: string | null;
    sub_total: string | null;
    total_tax: string | null;
    total_discount: string | null;
    currency_code: string | null;
    payment_status: string | null;
    payment_date: ColumnType<Date | null, string | null, string | null>;
    billing_date: ColumnType<Date | null, string | null, string | null>;
    due_date: ColumnType<Date | null, string | null, string | null>;
    client_note: string | null;
    termsncondition: string | null;
    delivery_note: string | null;
    payment_terms: string | null;
    invoice_dated: ColumnType<Date | null, string | null, string | null>;
    gstin: string | null;
    pdf_link: string | null;
    pdf_path: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  invoice_companies: {
    id: Generated<number>;
    username: string;
    company_name: string;
    company_address: string | null;
    company_email: string | null;
    company_image: string | null;
    image_path: string | null;
    creditAmount: number | null;
    credit_value: number | null;
    txnid: string | null;
    gstin: string | null;
    phone_number: string | null;
    city: string | null;
    country: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };

  // Reusable, named WhatsApp/SMS fallback API definitions — NOT tied to any
  // one client. A generic client-supplied HTTP endpoint, not a hardcoded
  // provider — url/headers_json/body_template may contain the placeholders
  // {{number}}, {{secret}}, {{tracking_id}}. is_default: at most one TRUE
  // per channel (enforced in the service layer) — used when a client has no
  // route assigned for that channel and no ancestor reseller does either.
  // See docs/migrations/rework_voice_call_fallback_routes.sql.
  voice_call_fallback_routes: {
    id:            Generated<number>;
    name:          string;
    channel:       'whatsapp' | 'sms';
    url:           string;
    http_method:   'GET' | 'POST' | 'PUT' | 'PATCH';
    headers_json:  string | null; // [{key,value}, ...]
    body_template: string | null;
    secret_enc:    string | null;
    content_type:  string;
    status:        ColumnType<number, number | undefined, number>; // 1=enabled, 0=disabled
    is_default:    ColumnType<number, number | undefined, number>;
    created_at:    Timestamp;
    updated_at:    Timestamp;
  };

  // Which route applies to which client, per channel — one active row per
  // (username, channel); assigning a new route replaces the previous one.
  voice_call_fallback_assignments: {
    id:          Generated<number>;
    username:    string;
    channel:     'whatsapp' | 'sms';
    route_id:    number;
    assigned_at: Timestamp;
  };

  // Queue + audit log for voice-call fallback notifications — a row is
  // inserted the moment a call fails (status='pending'), sent once
  // send_after is reached, and updated in place with the outbound
  // request/response. tracking_id is exposed to the outbound request as
  // {{tracking_id}} so the client's own provider can echo it back on
  // POST /api/v1/voice/fallback-notify/callback/:tracking_id.
  call_failure_notify_queue: {
    id:                   Generated<number>;
    tracking_id:          string;
    request_id:           string;
    mob_no33_id:          number | null;
    receiver:             string;
    username:             string;
    resolved_username:    string | null;
    resolution_level:     'self' | 'ancestor' | 'global' | 'none';
    channel:              'whatsapp' | 'sms';
    route_id:             number | null;
    final_status:         string;
    message_text:         string | null;
    send_after:           Timestamp;
    status:               'pending' | 'sent' | 'failed';
    attempts:             ColumnType<number, number | undefined, number>;
    claimed_at:           Timestamp;
    url:                  string | null;
    request_payload:      string | null;
    response_status:      number | null;
    response_body:        string | null;
    delivery_status:      string | null;
    delivery_raw_payload: string | null;
    delivery_callback_at: Timestamp;
    created_at:           Timestamp;
    sent_at:              Timestamp;
  };
}

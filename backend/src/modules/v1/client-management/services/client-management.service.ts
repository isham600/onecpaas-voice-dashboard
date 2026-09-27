import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { sql } from 'kysely';
import {
  listRoutesWithAssignedCount, createRoute, updateRoute, deleteRoute, setRouteAsDefault, clearRouteDefault,
  listAssignmentsForClient, assignRoute, removeAssignment,
  resolveFallbackConfig, sendFallbackNotification, listFallbackLogs,
  type UpsertRouteBody, type FallbackChannel,
} from '../../voice/fallback-notify/services/fallback-notify.service.js';
import {
  listVoiceRoutes, updateVoiceRoute, getAssignment as getVoiceRouteAssignment, assignVoiceRoute,
  listAssignments as listVoiceRouteAssignments, listRouteLogs as listVoiceRouteLogs,
} from '../../voice/voice-route/services/voice-route.service.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClientQuery {
  page?:      number;
  limit?:     number;
  search?:    string;
  user_type?: 'client' | 'reseller';
}

export interface CreateClientBody {
  first_name:            string;
  last_name:             string;
  client_username:       string;
  client_email:          string;
  client_mobile_no:      string;
  user_type:             'client' | 'reseller';
  password:              string;
  password_confirmation: string;
  country?:              string | null;
  expiry?:               string | null;   // YYYY-MM-DD — account validity date
}

export interface UpdateClientBody {
  first_name?:       string;
  last_name?:        string;
  client_username?:  string;
  client_email?:     string;
  client_mobile_no?: string;
  country?:          string | null;
  user_type?:        'client' | 'reseller';
}

export interface ChangeUserTypeBody {
  user_type: 'client' | 'reseller';
}

export interface ChangeStatusBody {
  status: 'true' | 'false';
}

export interface TransferCreditsBody {
  client_username: string;
  service:         string;
  operation:       'credit' | 'debit';
  credits:         number;
  amount:          number;
  description?:    string;
}

// ── All grantable permission keys — used for inheritance checks ───────────────

const PERMISSION_KEYS = new Set([
  'admin', 'email_credits', 'whatsapp_credits', 'Whatsapp_marketing',
  'whatsapp_utility', 'bulk_whatsapp', 'international_bulk_whatsapp', 'action_button', 'branded_whatsapp', 'unbranded_whatsapp', 'unofficial_whatsapp_add_button', 'sms_credits', 'voice_credits',
  'voice_pulse30',
  'voice_partial_refund',
  'voice_call_fallback_notify',
  'voice_routes',
  'rcs_credits', 'gsm_credits', 'Credit_SIM_line', 'Credit_SIM_GSM', 'gsmcredituser',
  'ai_videos_credits', 'virtual_call_credits', 'telegram',
  'instagram', 'manage_clients', 'metalogin', 'invoice', 'invoice_create',
  'billing', 'admin_support', 'reseller_support', 'support', 'can_access_report',
  'broadcast_masterreseller', 'broadcast_masterreseller_csv', 'Broadcast_chart',
  'broadcast_readstatus', 'your_integration', 'reseller_setting',
  'can_agent_access_all_chat', 'agent_auto_assign_sendtemp', 'agent_showtemp_username',
  'agent_auto_assign_broadcast', 'numbers_credits', 'international_call',
  'can_create_reseller', 'open_sms_template', 'can_create_smpp_gateway', 'sms_admin',
  'whatsapp_account_read', 'whatsapp_account_create', 'whatsapp_account_edit', 'whatsapp_account_delete',
  'url_shortener', 'file_manager', 'google_integration',
]);

// ── Allowed credits columns (prevents SQL injection via dynamic column names) ─

const VALID_CREDIT_COLUMNS = new Set([
  'whatsapp_marketing_credits',
  'bulk_whatsapp_credits',
  'international_bulk_whatsapp_credits',
  'action_button_credits',
  'whatsapp_utility_credits',
  'whatsapp_credits',
  'branded_whatsapp_credits',
  'unbranded_whatsapp_credits',
  'sms_credits',
  'voice_credits',
  'voice_pulse30_credits',
  'rcs_credits',
  'gsm_credits',
  'gsm_sim_credit',
  'ai_videos_credits',
  'email_credits',
  'instagram_credits',
  'unofficial_business',
  'telegram_credits',
]);

// ── Password validation ────────────────────────────────────────────────────────

function validatePassword(password: string): void {
  if (password.length < 8) throw new Error('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) throw new Error('Password must contain an uppercase letter');
  if (!/[0-9]/.test(password)) throw new Error('Password must contain a digit');
  if (!/[^A-Za-z0-9]/.test(password)) throw new Error('Password must contain a special character');
}

// ── Resolve parent (agent → parent username) ──────────────────────────────────

async function resolveParent(fastify: FastifyInstance, username: string): Promise<string> {
  const admin = await fastify.db
    .selectFrom('ci_admin')
    .select('usertype')
    .where('username', '=', username)
    .executeTakeFirst();

  if (!admin) throw fastify.httpErrors.notFound('User not found');

  if (admin.usertype === 'agent') {
    const row = await fastify.db
      .selectFrom('assign_users')
      .select('username')
      .where('assign_user', '=', username)
      .executeTakeFirst();
    return row?.username ?? username;
  }

  return username;
}

// ── GET /management/tree ──────────────────────────────────────────────────────

async function buildSubTree(
  fastify: FastifyInstance,
  username: string,
  depth = 0,
): Promise<unknown[]> {
  if (depth >= 5) return [];

  const children = await fastify.db
    .selectFrom('clients')
    .leftJoin('ci_admin', 'ci_admin.username', 'clients.client_username')
    .leftJoin('credits',  'credits.username',  'clients.client_username')
    .select([
      'clients.id',
      'clients.client_username as username',
      'clients.first_name',
      'clients.last_name',
      'clients.client_email',
      'clients.client_mobile_no',
      'clients.user_type',
      'clients.created_at',
      'ci_admin.status as account_status',
      'ci_admin.expiry',
      'credits.sms_credits',
      'credits.whatsapp_credits',
      'credits.rcs_credits',
      'credits.voice_credits',
    ])
    .where('clients.username', '=', username)
    .orderBy('clients.first_name', 'asc')
    .execute();

  const result: unknown[] = [];
  for (const child of children) {
    const node: Record<string, unknown> = { ...child, children: [] };
    if (child.user_type === 'reseller') {
      node.children = await buildSubTree(fastify, child.username as string, depth + 1);
    }
    result.push(node);
  }
  return result;
}

export async function getClientTree(
  fastify: FastifyInstance,
  username: string,
) {
  const parentUsername = await resolveParent(fastify, username);

  const [self, credits] = await Promise.all([
    fastify.db
      .selectFrom('ci_admin')
      .select(['admin_id', 'username', 'firstname', 'lastname', 'email', 'mobile_no', 'usertype', 'status', 'expiry', 'created_at'])
      .where('username', '=', parentUsername)
      .executeTakeFirst(),
    fastify.db
      .selectFrom('credits')
      .select(['sms_credits', 'whatsapp_credits', 'rcs_credits', 'voice_credits'])
      .where('username', '=', parentUsername)
      .executeTakeFirst(),
  ]);

  const children = await buildSubTree(fastify, parentUsername);

  return {
    message: 'Client tree fetched',
    data: {
      id:             self?.admin_id      ?? null,
      username:       parentUsername,
      first_name:     self?.firstname     ?? '',
      last_name:      self?.lastname      ?? '',
      email:          self?.email         ?? '',
      mobile_no:      self?.mobile_no     ?? '',
      user_type:      self?.usertype      ?? 'reseller',
      account_status: self?.status        ?? null,
      expiry:         self?.expiry        ?? null,
      created_at:     self?.created_at    ?? null,
      credits,
      children,
    },
  };
}

// ── GET /management/stats ─────────────────────────────────────────────────────

export async function getClientStats(
  fastify: FastifyInstance,
  username: string,
) {
  const parentUsername = await resolveParent(fastify, username);

  const [total, resellers, clients, disabled] = await Promise.all([
    // total users (all)
    fastify.db
      .selectFrom('clients')
      .select(eb => eb.fn.countAll<number>().as('cnt'))
      .where('username', '=', parentUsername)
      .executeTakeFirst(),

    // total resellers
    fastify.db
      .selectFrom('clients')
      .select(eb => eb.fn.countAll<number>().as('cnt'))
      .where('username', '=', parentUsername)
      .where('user_type', '=', 'reseller')
      .executeTakeFirst(),

    // total clients
    fastify.db
      .selectFrom('clients')
      .select(eb => eb.fn.countAll<number>().as('cnt'))
      .where('username', '=', parentUsername)
      .where('user_type', '=', 'client')
      .executeTakeFirst(),

    // disabled: ci_admin.status = 'false' for any client of this parent
    fastify.db
      .selectFrom('clients')
      .innerJoin('ci_admin', 'ci_admin.username', 'clients.client_username')
      .select(eb => eb.fn.countAll<number>().as('cnt'))
      .where('clients.username', '=', parentUsername)
      .where('ci_admin.status', '=', 'false')
      .executeTakeFirst(),
  ]);

  const totalCount    = Number(total?.cnt    ?? 0);
  const disabledCount = Number(disabled?.cnt ?? 0);

  return {
    message: 'Stats fetched',
    data: {
      total_users:     totalCount,
      total_resellers: Number(resellers?.cnt ?? 0),
      total_clients:   Number(clients?.cnt   ?? 0),
      enabled_users:   totalCount - disabledCount,
      disabled_users:  disabledCount,
    },
  };
}

// ── GET /management ───────────────────────────────────────────────────────────

export async function listClients(
  fastify: FastifyInstance,
  username: string,
  query: ClientQuery,
) {
  const parentUsername = await resolveParent(fastify, username);
  const limit  = Math.min(query.limit ?? 25, 100);
  const page   = Math.max(query.page  ?? 1, 1);
  const offset = (page - 1) * limit;

  let qb = fastify.db
    .selectFrom('clients')
    .leftJoin('credits', 'credits.username', 'clients.client_username')
    .leftJoin('ci_admin', 'ci_admin.username', 'clients.client_username')
    .where('clients.username', '=', parentUsername);

  if (query.user_type) {
    qb = qb.where('clients.user_type', '=', query.user_type);
  }

  if (query.search) {
    const like = `%${query.search}%`;
    qb = qb.where(eb => eb.or([
      eb('clients.first_name',      'like', like),
      eb('clients.last_name',       'like', like),
      eb('clients.client_username', 'like', like),
      eb('clients.client_email',    'like', like),
      eb('clients.client_mobile_no','like', like),
    ]));
  }

  const [countRow, rows] = await Promise.all([
    qb
      .select(eb => eb.fn.countAll<number>().as('cnt'))
      .executeTakeFirst(),
    qb
      .select([
        'clients.id',
        'clients.username',
        'clients.first_name',
        'clients.last_name',
        'clients.client_username',
        'clients.client_email',
        'clients.client_mobile_no',
        'clients.country',
        'clients.user_type',
        'clients.created_at',
        'clients.updated_at',
        'ci_admin.status as account_status',
        'credits.whatsapp_marketing_credits',
        'credits.bulk_whatsapp_credits',
        'credits.international_bulk_whatsapp_credits',
        'credits.action_button_credits',
        'credits.whatsapp_utility_credits',
        'credits.whatsapp_credits',
        'credits.branded_whatsapp_credits',
        'credits.unbranded_whatsapp_credits',
        'credits.sms_credits',
        'credits.voice_credits',
        'credits.voice_pulse30_credits',
        'credits.rcs_credits',
        'credits.gsm_credits',
        'credits.gsm_sim_credit',
        'credits.ai_videos_credits',
        'credits.email_credits',
        'credits.instagram_credits',
        'credits.telegram_credits',
      ])
      .orderBy('clients.id', 'desc')
      .limit(limit)
      .offset(offset)
      .execute(),
  ]);

  const total      = Number(countRow?.cnt ?? 0);
  const totalPages = Math.ceil(total / limit) || 0;

  const CREDIT_FIELDS = new Set([
    'whatsapp_credits', 'whatsapp_marketing_credits', 'bulk_whatsapp_credits',
    'international_bulk_whatsapp_credits', 'action_button_credits',
    'whatsapp_utility_credits', 'branded_whatsapp_credits', 'unbranded_whatsapp_credits',
    'sms_credits', 'voice_credits', 'voice_pulse30_credits', 'rcs_credits', 'gsm_credits', 'gsm_sim_credit',
    'ai_videos_credits', 'email_credits', 'instagram_credits', 'telegram_credits',
  ]);

  const shaped = rows.map((row: any) => {
    const credit: Record<string, number> = {};
    const rest: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (CREDIT_FIELDS.has(k)) {
        credit[k] = Number(v ?? 0);
      } else {
        rest[k] = v;
      }
    }
    return { ...rest, credit };
  });

  return {
    message: 'Clients fetched',
    meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    data: shaped,
  };
}

// ── GET /management/:id ───────────────────────────────────────────────────────

export async function getClientById(
  fastify: FastifyInstance,
  username: string,
  clientId: number,
) {
  const parentUsername = await resolveParent(fastify, username);

  const client = await fastify.db
    .selectFrom('clients')
    .selectAll()
    .where('id', '=', clientId)
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  if (!client) throw fastify.httpErrors.notFound('Client not found');

  const cu = client.client_username;

  // Fetch all related data in parallel
  const [adminRow, credits, permissions, profileRow, lastSession] = await Promise.all([
    fastify.db
      .selectFrom('ci_admin')
      .select([
        'admin_id',
        'username',
        'firstname',
        'lastname',
        'email',
        'mobile_no',
        'mobile_no_demo',
        'country',
        'usertype',
        'api_base_url',
        'status',
        'is_active',
        'is_verify',
        'is_admin',
        'is_super',
        'created_at',
      ])
      .where('username', '=', cu)
      .executeTakeFirst(),

    fastify.db
      .selectFrom('credits')
      .select([
        'whatsapp_marketing_credits',
        'bulk_whatsapp_credits',
        'international_bulk_whatsapp_credits',
        'action_button_credits',
        'whatsapp_utility_credits',
        'whatsapp_credits',
        'sms_credits',
        'voice_credits',
        'voice_pulse30_credits',
        'rcs_credits',
        'gsm_credits',
        'gsm_sim_credit',
        'ai_videos_credits',
        'email_credits',
        'instagram_credits',
        'unofficial_business',
        'telegram_credits',
      ])
      .where('username', '=', cu)
      .executeTakeFirst(),

    fastify.db
      .selectFrom('Permissions')
      .select([
        'can_access_report',
        'email_credits',
        'whatsapp_credits',
        'Whatsapp_marketing',
        'whatsapp_utility',
        'bulk_whatsapp',
        'international_bulk_whatsapp',
        'action_button',
        'branded_whatsapp',
        'unbranded_whatsapp',
        'unofficial_whatsapp_add_button',
        'sms_credits',
        'voice_credits',
        'voice_pulse30',
        'voice_partial_refund',
        'voice_call_fallback_notify',
        'voice_routes',
        'rcs_credits',
        'gsm_credits',
        'Credit_SIM_line',
        'Credit_SIM_GSM',
        'gsmcredituser',
        'ai_videos_credits',
        'virtual_call_credits',
        'telegram',
        'instagram',
        'manage_clients',
        'metalogin',
        'invoice',
        'invoice_create',
        'billing',
        'admin_support',
        'reseller_support',
        'support',
        'broadcast_masterreseller',
        'broadcast_masterreseller_csv',
        'Broadcast_chart',
        'broadcast_readstatus',
        'your_integration',
        'reseller_setting',
        'can_agent_access_all_chat',
        'agent_auto_assign_sendtemp',
        'agent_showtemp_username',
        'agent_auto_assign_broadcast',
        'numbers_credits',
        'international_call',
        'can_create_reseller',
        'open_sms_template',
        'can_create_smpp_gateway',
        'sms_admin',
        'url_shortener',
        'file_manager',
        'google_integration',
      ])
      .where('username', '=', cu)
      .executeTakeFirst(),

    fastify.db
      .selectFrom('profiles')
      .selectAll()
      .where('username', '=', cu)
      .executeTakeFirst(),

    fastify.db
      .selectFrom('verify_loggedin_users')
      .selectAll()
      .where('username', '=', cu)
      .orderBy('id', 'desc')
      .limit(1)
      .executeTakeFirst(),
  ]);

  const role = adminRow
    ? (adminRow.is_super === 1 ? 'super' : adminRow.is_admin === 1 ? 'admin' : 'user')
    : 'user';

  return {
    message: 'Client fetched',
    data: {
      id:               client.id,
      username:         client.username,
      first_name:       client.first_name,
      last_name:        client.last_name,
      client_username:  cu,
      client_email:     client.client_email,
      client_mobile_no: client.client_mobile_no,
      country:          client.country,
      user_type:        client.user_type,
      created_at:       client.created_at,
      updated_at:       client.updated_at,
      account: {
        status:          adminRow?.status          ?? null,
        is_active:       adminRow?.is_active        ?? null,
        is_verify:       adminRow?.is_verify        ?? null,
        role,
        api_base_url:    adminRow?.api_base_url     ?? null,
      },
      // voice_pulse30_credits is DECIMAL — mysql2 returns it as a string; coerce
      // so every field in the credits object is consistently a JS number.
      credits:     credits ? { ...credits, voice_pulse30_credits: Number(credits.voice_pulse30_credits) } : null,
      permissions: permissions ?? null,
      profile:     profileRow  ?? null,
      last_session: lastSession
        ? {
            ip_address:     lastSession.ip_address,
            device_info:    lastSession.device_info ? tryParseJson(lastSession.device_info) : null,
            location:       lastSession.location    ? tryParseJson(lastSession.location)    : null,
            last_login_at:  lastSession.last_login_at,
            otp_created_at: lastSession.otp_created_at,
          }
        : null,
    },
  };
}

function tryParseJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return value; }
}

// ── POST /management ──────────────────────────────────────────────────────────

export async function createClient(
  fastify: FastifyInstance,
  username: string,
  body: CreateClientBody,
) {
  const parentUsername = await resolveParent(fastify, username);

  // Password validation
  try { validatePassword(body.password); }
  catch (e: any) { throw fastify.httpErrors.badRequest(e.message); }

  if (body.password !== body.password_confirmation) {
    throw fastify.httpErrors.badRequest('Passwords do not match');
  }

  // Parallel uniqueness checks
  const [
    clientUsernameInClients,
    clientUsernameInAdmin,
    emailInClients,
    emailInAdmin,
    mobileInClients,
    mobileInAdmin,
  ] = await Promise.all([
    fastify.db.selectFrom('clients').select('id')
      .where('client_username', '=', body.client_username).executeTakeFirst(),
    fastify.db.selectFrom('ci_admin').select('admin_id')
      .where('username', '=', body.client_username).executeTakeFirst(),
    fastify.db.selectFrom('clients').select('id')
      .where('client_email', '=', body.client_email).executeTakeFirst(),
    fastify.db.selectFrom('ci_admin').select('admin_id')
      .where('email', '=', body.client_email).executeTakeFirst(),
    fastify.db.selectFrom('clients').select('id')
      .where('client_mobile_no', '=', body.client_mobile_no).executeTakeFirst(),
    fastify.db.selectFrom('ci_admin').select('admin_id')
      .where('mobile_no', '=', body.client_mobile_no).executeTakeFirst(),
  ]);

  if (clientUsernameInClients || clientUsernameInAdmin) {
    throw fastify.httpErrors.conflict('Username already taken');
  }
  if (emailInClients || emailInAdmin) {
    throw fastify.httpErrors.conflict('Email already registered');
  }
  if (mobileInClients || mobileInAdmin) {
    throw fastify.httpErrors.conflict('Mobile number already registered');
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);
  const cu = body.client_username;

  // Load grantor's permissions — new client inherits only what the creator has
  const grantorPerms = await fastify.db
    .selectFrom('Permissions')
    .selectAll()
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  const perm = (key: string): number =>
    Number((grantorPerms as Record<string, unknown> | undefined)?.[key] ?? 0);

  const result = await fastify.db.transaction().execute(async (trx) => {
    const clientInsert = await trx
      .insertInto('clients')
      .values({
        username:         parentUsername,
        first_name:       body.first_name,
        last_name:        body.last_name,
        client_username:  cu,
        client_email:     body.client_email,
        client_mobile_no: body.client_mobile_no,
        user_type:        body.user_type,
        country:          body.country ?? null,
      })
      .executeTakeFirst();

    await Promise.all([
      trx.insertInto('ci_admin').values({
        admin_role_id:            2,
        username:                 cu,
        firstname:                body.first_name,
        lastname:                 body.last_name,
        email:                    body.client_email,
        password:                 hashedPassword,
        mobile_no:                body.client_mobile_no,
        usertype:                 body.user_type,
        whatsapp:                 '0',
        whatsapp_credits:         '0',
        sms:                      '0',
        voice_credits:            '0',
        voice:                    '0',
        gsm_credits:              '0',
        whatsapp_virtual_credits: '0',
        overseas_credits:         '0',
        email_bulk:               '0',
        api_whatsapp:             null,
        gsm:                      '0',
        whatsapp_virtual:         '0',
        overseas_sms:             '0',
        country:                  body.country ?? null,
        delivery_type:            'I',
        api_status:               '0',
        api_base_url:             process.env.BASE_URL ?? null,
        authkey:                  '',
        authkey1:                 '',
        is_verify:                0,
        is_admin:                 0,
        is_active:                0,
        is_super:                 0,
        serss:                    0,
        is_notify_visible:        0,
        expiry:                   body.expiry ?? null,
      }).execute(),

      trx.insertInto('credits').values({
        username:                   cu,
        whatsapp_marketing_credits: 0,
        bulk_whatsapp_credits:      0,
        international_bulk_whatsapp_credits: 0,
        action_button_credits:      0,
        whatsapp_utility_credits:   0,
        whatsapp_credits:           0,
        branded_whatsapp_credits:   0,
        unbranded_whatsapp_credits: 0,
        sms_credits:                0,
        voice_credits:              0,
        voice_pulse30_credits:      0,
        rcs_credits:                0,
        gsm_credits:                0,
        gsm_sim_credit:             0,
        ai_videos_credits:          0,
        email_credits:              0,
        instagram_credits:          0,
        unofficial_business:        0,
        telegram_credits:           0,
      }).execute(),

      trx.insertInto('Permissions').values({
        username:                    cu,
        admin:                       perm('admin'),
        email_credits:               perm('email_credits'),
        whatsapp_credits:            perm('whatsapp_credits'),
        Whatsapp_marketing:          perm('Whatsapp_marketing'),
        whatsapp_utility:            perm('whatsapp_utility'),
        bulk_whatsapp:               perm('bulk_whatsapp'),
        international_bulk_whatsapp: perm('international_bulk_whatsapp'),
        action_button:               perm('action_button'),
        unofficial_whatsapp_add_button: perm('unofficial_whatsapp_add_button'),
        branded_whatsapp:            perm('branded_whatsapp'),
        unbranded_whatsapp:          perm('unbranded_whatsapp'),
        sms_credits:                 perm('sms_credits'),
        voice_credits:               perm('voice_credits'),
        voice_pulse30:               perm('voice_pulse30'),
        rcs_credits:                 perm('rcs_credits'),
        gsm_credits:                 perm('gsm_credits'),
        Credit_SIM_line:             0,   // admin-issued only (DB), never via the panel
        Credit_SIM_GSM:              perm('Credit_SIM_GSM'),
        ai_videos_credits:           perm('ai_videos_credits'),
        virtual_call_credits:        perm('virtual_call_credits'),
        telegram:                    perm('telegram'),
        instagram:                   perm('instagram'),
        manage_clients:              perm('manage_clients'),
        metalogin:                   perm('metalogin'),
        invoice:                     perm('invoice'),
        invoice_create:              perm('invoice_create'),
        billing:                     perm('billing'),
        admin_support:               perm('admin_support'),
        reseller_support:            perm('reseller_support'),
        support:                     perm('support'),
        can_access_report:           perm('can_access_report'),
        broadcast_masterreseller:    perm('broadcast_masterreseller'),
        broadcast_masterreseller_csv:perm('broadcast_masterreseller_csv'),
        Broadcast_chart:             perm('Broadcast_chart'),
        broadcast_readstatus:        perm('broadcast_readstatus'),
        your_integration:            perm('your_integration'),
        reseller_setting:            perm('reseller_setting'),
        can_agent_access_all_chat:   perm('can_agent_access_all_chat'),
        agent_auto_assign_sendtemp:  perm('agent_auto_assign_sendtemp'),
        agent_showtemp_username:     perm('agent_showtemp_username'),
        agent_auto_assign_broadcast: perm('agent_auto_assign_broadcast'),
        numbers_credits:             perm('numbers_credits'),
        international_call:          perm('international_call'),
        can_create_reseller:         perm('can_create_reseller'),
        open_sms_template:           perm('open_sms_template'),
        can_create_smpp_gateway:     perm('can_create_smpp_gateway'),
        sms_admin:                   perm('sms_admin'),
        whatsapp_account_read:       perm('whatsapp_account_read'),
        whatsapp_account_create:     perm('whatsapp_account_create'),
        whatsapp_account_edit:       perm('whatsapp_account_edit'),
        whatsapp_account_delete:     perm('whatsapp_account_delete'),
        url_shortener:               perm('url_shortener'),
        file_manager:                perm('file_manager'),
        google_integration:          perm('google_integration'),
      }).execute(),

      trx.insertInto('teams').values({
        username: cu,
        team:     'default team',
        default:  'yes',
        size:     0,
      }).execute(),

      trx.insertInto('assign_users').values({
        username:     cu,
        assign_user:  cu,
        first_name:   body.first_name,
        last_name:    body.last_name,
        agent_email:  body.client_email,
        agent_mobile: body.client_mobile_no,
      }).execute(),
    ]);

    return Number(clientInsert.insertId);
  });

  const created = await fastify.db
    .selectFrom('clients')
    .selectAll()
    .where('id', '=', result)
    .executeTakeFirst();

  return {
    message: 'Client created successfully',
    data: { client: created },
  };
}

// ── PUT /management/:id ───────────────────────────────────────────────────────

export async function updateClient(
  fastify: FastifyInstance,
  username: string,
  clientId: number,
  body: UpdateClientBody,
) {
  const parentUsername = await resolveParent(fastify, username);

  const client = await fastify.db
    .selectFrom('clients')
    .selectAll()
    .where('id', '=', clientId)
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  if (!client) throw fastify.httpErrors.notFound('Client not found');

  const updateData: Record<string, unknown> = {};
  if (body.first_name       !== undefined) updateData.first_name       = body.first_name;
  if (body.last_name        !== undefined) updateData.last_name        = body.last_name;
  if (body.client_username  !== undefined) updateData.client_username  = body.client_username;
  if (body.client_email     !== undefined) updateData.client_email     = body.client_email;
  if (body.client_mobile_no !== undefined) updateData.client_mobile_no = body.client_mobile_no;
  if (body.country          !== undefined) updateData.country          = body.country;
  if (body.user_type        !== undefined) updateData.user_type        = body.user_type;

  if (Object.keys(updateData).length === 0) {
    return { message: 'Nothing to update', data: { client } };
  }

  await fastify.db
    .updateTable('clients')
    .set(updateData)
    .where('id', '=', clientId)
    .execute();

  const updated = await fastify.db
    .selectFrom('clients')
    .selectAll()
    .where('id', '=', clientId)
    .executeTakeFirst();

  return {
    message: 'Client updated successfully',
    data: { client: updated },
  };
}

// ── PATCH /management/:id/usertype ────────────────────────────────────────────

export async function changeUserType(
  fastify: FastifyInstance,
  username: string,
  clientId: number,
  body: ChangeUserTypeBody,
) {
  const parentUsername = await resolveParent(fastify, username);

  const client = await fastify.db
    .selectFrom('clients')
    .select(['id', 'client_username'])
    .where('id', '=', clientId)
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  if (!client) throw fastify.httpErrors.notFound('Client not found');

  await fastify.db
    .updateTable('clients')
    .set({ user_type: body.user_type })
    .where('id', '=', clientId)
    .execute();

  const updated = await fastify.db
    .selectFrom('clients')
    .selectAll()
    .where('id', '=', clientId)
    .executeTakeFirst();

  return {
    message: 'Client updated successfully',
    data: { client: updated },
  };
}

// ── PATCH /management/:id/status ──────────────────────────────────────────────

export async function changeStatus(
  fastify: FastifyInstance,
  username: string,
  clientId: number,
  body: ChangeStatusBody,
) {
  const parentUsername = await resolveParent(fastify, username);

  const client = await fastify.db
    .selectFrom('clients')
    .select(['id', 'client_username'])
    .where('id', '=', clientId)
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  if (!client) throw fastify.httpErrors.notFound('Client not found');

  await fastify.db
    .updateTable('ci_admin')
    .set({ status: body.status })
    .where('username', '=', client.client_username)
    .execute();

  const user = await fastify.db
    .selectFrom('ci_admin')
    .select(['admin_id', 'username', 'email', 'firstname', 'lastname', 'status', 'is_active'])
    .where('username', '=', client.client_username)
    .executeTakeFirst();

  return {
    message: 'Client updated successfully',
    data: { user },
  };
}

// ── DELETE /management/:id ────────────────────────────────────────────────────

export async function deleteClient(
  fastify: FastifyInstance,
  username: string,
  clientId: number,
) {
  const parentUsername = await resolveParent(fastify, username);

  const client = await fastify.db
    .selectFrom('clients')
    .select(['id', 'client_username'])
    .where('id', '=', clientId)
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  if (!client) throw fastify.httpErrors.notFound('Client not found');

  const cu = client.client_username;

  await fastify.db.transaction().execute(async (trx) => {
    await trx.deleteFrom('credits').where('username', '=', cu).execute();
    await trx.deleteFrom('ci_admin').where('username', '=', cu).execute();
    await trx.deleteFrom('clients').where('id', '=', clientId).execute();
  });

  return { message: 'Client deleted successfully' };
}

// ── POST /management/:id/credits ──────────────────────────────────────────────

export async function transferCredits(
  fastify: FastifyInstance,
  username: string,
  clientId: number,
  body: TransferCreditsBody,
) {
  const parentUsername = await resolveParent(fastify, username);

  // Validate service column
  if (!VALID_CREDIT_COLUMNS.has(body.service)) {
    throw fastify.httpErrors.badRequest(`Invalid service: ${body.service}`);
  }

  if (body.credits <= 0) throw fastify.httpErrors.badRequest('Credits must be greater than 0');

  const client = await fastify.db
    .selectFrom('clients')
    .select(['id', 'client_username', 'user_type'])
    .where('id', '=', clientId)
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  if (!client) throw fastify.httpErrors.notFound('Client not found');

  // Verify client_username matches if provided
  if (body.client_username !== client.client_username) {
    throw fastify.httpErrors.badRequest('client_username does not match this client record');
  }

  // Resolve channel front_end_name (validates service is a real channel)
  const channel = await fastify.db
    .selectFrom('channels')
    .select('front_end_name')
    .where('back_end_name', '=', body.service)
    .executeTakeFirst();

  if (!channel) throw fastify.httpErrors.badRequest(`Service '${body.service}' not found in channels`);

  // GSM SMS resellers run a virtual business — they may not hand out real GSM credits
  if (body.service === 'gsm_credits') {
    const perms = await fastify.db
      .selectFrom('Permissions')
      .select(['Credit_SIM_line'])
      .where('username', '=', parentUsername)
      .executeTakeFirst();
    if (Number(perms?.Credit_SIM_line ?? 0) === 1) {
      throw fastify.httpErrors.forbidden(
        'Your account transfers GSM SMS credits — real GSM credits cannot be transferred',
      );
    }
  }

  // Only a GSM SMS reseller may hand out gsm_sim_credit to their own clients
  if (body.service === 'gsm_sim_credit') {
    const perms = await fastify.db
      .selectFrom('Permissions')
      .select(['Credit_SIM_GSM'])
      .where('username', '=', parentUsername)
      .executeTakeFirst();
    if (Number(perms?.Credit_SIM_GSM ?? 0) !== 1) {
      throw fastify.httpErrors.forbidden(
        'GSM SMS credit transfer requires Credit_SIM_GSM permission on your account',
      );
    }
  }

  // Fetch both credits rows
  const [parentCredits, clientCredits] = await Promise.all([
    fastify.db.selectFrom('credits').selectAll().where('username', '=', parentUsername).executeTakeFirst(),
    fastify.db.selectFrom('credits').selectAll().where('username', '=', client.client_username).executeTakeFirst(),
  ]);

  if (!parentCredits) throw fastify.httpErrors.unprocessableEntity('Parent credits record not found');
  if (!clientCredits) throw fastify.httpErrors.unprocessableEntity('Client credits record not found');

  const col = body.service as keyof typeof parentCredits;
  const parentBalance = Number(parentCredits[col] ?? 0);
  const clientBalance = Number(clientCredits[col] ?? 0);

  // Balance check
  if (body.operation === 'credit' && parentBalance < body.credits) {
    throw fastify.httpErrors.unprocessableEntity(
      `Insufficient balance. Available: ${parentBalance}, Requested: ${body.credits}`,
    );
  }
  if (body.operation === 'debit' && clientBalance < body.credits) {
    throw fastify.httpErrors.unprocessableEntity(
      `Client has insufficient balance. Available: ${clientBalance}, Requested: ${body.credits}`,
    );
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const cu  = client.client_username;

  await fastify.db.transaction().execute(async (trx) => {
    if (body.operation === 'credit') {
      // parent loses, client gains
      await trx.updateTable('credits')
        .set({ [body.service]: parentBalance - body.credits } as any)
        .where('username', '=', parentUsername)
        .execute();
      await trx.updateTable('credits')
        .set({ [body.service]: clientBalance + body.credits } as any)
        .where('username', '=', cu)
        .execute();
    } else {
      // client loses, parent gains
      await trx.updateTable('credits')
        .set({ [body.service]: clientBalance - body.credits } as any)
        .where('username', '=', cu)
        .execute();
      await trx.updateTable('credits')
        .set({ [body.service]: parentBalance + body.credits } as any)
        .where('username', '=', parentUsername)
        .execute();
    }

    await trx.insertInto('fund1').values({
      service:  channel.front_end_name,
      sms:      String(body.credits),
      accex:    '0',
      amt:      String(body.amount * body.credits),
      taxamt:   'GST',
      pps:      body.amount,
      decrip:   body.description ?? null,
      name:     cu,
      cd:       body.operation === 'credit' ? 'credit' : 'debit',
      dte:      now,
      usertype: client.user_type,
      reseller: parentUsername,
    }).execute();
  });

  return { message: `${body.operation === 'credit' ? 'Credit' : 'Debit'} operation successful.` };
}

// ── PATCH /management/:id/permissions ────────────────────────────────────────

export interface UpdatePermissionsBody {
  can_access_report?:            number;
  email_credits?:                number;
  whatsapp_credits?:             number;
  Whatsapp_marketing?:           number;
  whatsapp_utility?:             number;
  bulk_whatsapp?:                number;
  international_bulk_whatsapp?:  number;
  action_button?:                number;
  unofficial_whatsapp_add_button?: number;
  branded_whatsapp?:             number;
  unbranded_whatsapp?:           number;
  sms_credits?:                  number;
  voice_credits?:                number;
  voice_pulse30?:                number;
  voice_partial_refund?:         number;
  voice_call_fallback_notify?:   number;
  voice_routes?:                 number;
  rcs_credits?:                  number;
  gsm_credits?:                  number;
  Credit_SIM_line?:              number;
  Credit_SIM_GSM?:               number;
  gsmcredituser?:                number;
  ai_videos_credits?:            number;
  virtual_call_credits?:         number;
  telegram?:                     number;
  instagram?:                    number;
  manage_clients?:               number;
  metalogin?:                    number;
  invoice?:                      number;
  invoice_create?:               number;
  billing?:                      number;
  admin_support?:                number;
  reseller_support?:             number;
  support?:                      number;
  broadcast_masterreseller?:     number;
  broadcast_masterreseller_csv?: number;
  Broadcast_chart?:              number;
  broadcast_readstatus?:         number;
  your_integration?:             number;
  reseller_setting?:             number;
  can_agent_access_all_chat?:    number;
  agent_auto_assign_sendtemp?:   number;
  agent_showtemp_username?:      number;
  agent_auto_assign_broadcast?:  number;
  numbers_credits?:              number;
  international_call?:           number;
  can_create_reseller?:          number;
  open_sms_template?:            number;
  can_create_smpp_gateway?:      number;
  sms_admin?:                    number;
  whatsapp_account_read?:        number;
  whatsapp_account_create?:      number;
  whatsapp_account_edit?:        number;
  whatsapp_account_delete?:      number;
  url_shortener?:                number;
  file_manager?:                 number;
  google_integration?:           number;
}

export async function updateClientPermissions(
  fastify: FastifyInstance,
  username: string,
  clientId: number,
  body: UpdatePermissionsBody,
) {
  const parentUsername = await resolveParent(fastify, username);

  const client = await fastify.db
    .selectFrom('clients')
    .select(['id', 'client_username'])
    .where('id', '=', clientId)
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  if (!client) throw fastify.httpErrors.notFound('Client not found');

  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined && PERMISSION_KEYS.has(key)) updateData[key] = value;
  }

  if (Object.keys(updateData).length === 0) {
    return { message: 'Nothing to update' };
  }

  // Inheritance check — silently drop any permission the grantor doesn't hold
  // (avoids 403 when the UI sends back a value the admin can't see/change)
  const grantorPerms = await fastify.db
    .selectFrom('Permissions')
    .selectAll()
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  for (const key of Object.keys(updateData)) {
    // Credit_SIM_line is NEVER grantable through the panel — it is issued by
    // the platform admin directly in the database. A GSM SMS reseller must not
    // be able to create more GSM SMS resellers.
    if (key === 'Credit_SIM_line') {
      delete updateData[key];
      continue;
    }

    // gsmcredituser (refund chain-break switch, default 1) is adjustable —
    // in either direction — only by a Credit_SIM_line holder.
    if (key === 'gsmcredituser') {
      if (Number((grantorPerms as Record<string, unknown> | undefined)?.Credit_SIM_line ?? 0) !== 1) {
        delete updateData[key];
      }
      continue;
    }

    if (updateData[key] === 1) {
      // Credit_SIM_GSM cascades from a grantor who already holds it — a GSM SMS
      // reseller doesn't need Credit_SIM_line (admin-only) to enrol its own users.
      const grantorValue = Number((grantorPerms as Record<string, unknown> | undefined)?.[key] ?? 0);
      if (grantorValue !== 1) delete updateData[key];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { message: 'Nothing to update' };
  }

  await fastify.db
    .updateTable('Permissions')
    .set(updateData)
    .where('username', '=', client.client_username)
    .execute();

  const updated = await fastify.db
    .selectFrom('Permissions')
    .selectAll()
    .where('username', '=', client.client_username)
    .executeTakeFirst();

  return {
    message: 'Permissions updated',
    data: { permissions: updated ?? null },
  };
}

// ── Voice Call Fallback Notify — Routes (global, reusable) + Assignments
// (per-client, from Manage Clients). Same ownership check as
// updateClientPermissions above (the target must be a direct child of the
// caller's own resolved parent username) governs which client an admin may
// assign/remove a route for. Routes themselves are not owned by any one
// client — any admin with the feature can create one and it becomes
// available to assign to any of their downline. ─────────────────────────────

async function resolveOwnedClientUsername(
  fastify: FastifyInstance, callerUsername: string, clientId: number,
): Promise<string> {
  const parentUsername = await resolveParent(fastify, callerUsername);
  const client = await fastify.db
    .selectFrom('clients')
    .select('client_username')
    .where('id', '=', clientId)
    .where('username', '=', parentUsername)
    .executeTakeFirst();
  if (!client) throw fastify.httpErrors.notFound('Client not found');
  return client.client_username;
}

// ── Routes ────────────────────────────────────────────────────────────────

export async function listFallbackRoutes(fastify: FastifyInstance, channel?: string) {
  const data = await listRoutesWithAssignedCount(fastify, channel);
  return { data };
}

export async function createFallbackRoute(fastify: FastifyInstance, body: UpsertRouteBody) {
  const data = await createRoute(fastify, body);
  return { data };
}

export async function updateFallbackRoute(fastify: FastifyInstance, routeId: number, body: Partial<UpsertRouteBody>) {
  const data = await updateRoute(fastify, routeId, body);
  return { data };
}

export async function deleteFallbackRoute(fastify: FastifyInstance, routeId: number) {
  await deleteRoute(fastify, routeId);
  return { message: 'Deleted' };
}

export async function setFallbackRouteDefault(fastify: FastifyInstance, routeId: number) {
  const data = await setRouteAsDefault(fastify, routeId);
  return { data };
}

export async function clearFallbackRouteDefault(fastify: FastifyInstance, routeId: number) {
  await clearRouteDefault(fastify, routeId);
  return { message: 'Cleared' };
}

// ── Assignments (per client) ─────────────────────────────────────────────────

export async function getClientFallbackAssignments(
  fastify: FastifyInstance, callerUsername: string, clientId: number,
) {
  const targetUsername = await resolveOwnedClientUsername(fastify, callerUsername, clientId);
  const data = await listAssignmentsForClient(fastify, targetUsername);
  return { data };
}

export async function assignClientFallbackRoute(
  fastify: FastifyInstance, callerUsername: string, clientId: number, channel: string, routeId: number,
) {
  const targetUsername = await resolveOwnedClientUsername(fastify, callerUsername, clientId);
  const data = await assignRoute(fastify, targetUsername, channel, routeId);
  return { data };
}

export async function removeClientFallbackAssignment(
  fastify: FastifyInstance, callerUsername: string, clientId: number, channel: string,
) {
  const targetUsername = await resolveOwnedClientUsername(fastify, callerUsername, clientId);
  await removeAssignment(fastify, targetUsername, channel);
  return { message: 'Removed' };
}

// ── Logs / report (admin — all attempts across the caller's own account +
// its direct downline clients, matching the same ownership scope as the
// Manage Clients list itself) ────────────────────────────────────────────

export interface FallbackLogsQuery {
  route_id?: number;
  channel?:  'whatsapp' | 'sms';
  status?:   'pending' | 'sent' | 'failed';
  page?:     number;
  limit?:    number;
}

export async function listFallbackLogsForAdmin(
  fastify: FastifyInstance, callerUsername: string, query: FallbackLogsQuery,
) {
  const parentUsername = await resolveParent(fastify, callerUsername);
  const children = await fastify.db
    .selectFrom('clients')
    .select('client_username')
    .where('username', '=', parentUsername)
    .execute();

  const usernames = [parentUsername, ...children.map((c) => c.client_username)];

  const result = await listFallbackLogs(fastify, {
    usernames,
    route_id: query.route_id,
    channel:  query.channel,
    status:   query.status,
    page:     query.page,
    limit:    query.limit,
  });
  return result;
}

export async function testClientFallbackRoute(
  fastify: FastifyInstance, callerUsername: string, clientId: number, channel: string,
  body: { number?: string },
) {
  const targetUsername = await resolveOwnedClientUsername(fastify, callerUsername, clientId);
  const resolved = await resolveFallbackConfig(fastify.db, targetUsername, channel as FallbackChannel);
  if (!resolved) {
    throw fastify.httpErrors.notFound('No route assigned to this client for this channel (or the feature is not enabled) — assign one first.');
  }
  const result = await sendFallbackNotification(resolved.route, {
    number: body.number || '910000000000',
    trackingId: 'test-' + Date.now(),
  });
  return { resolution_level: resolved.level, result };
}

// ── Voice Routes (which provider carries a user's voice campaigns) ───────────
// Gated by its own permission (Permissions.voice_routes) on the caller.

async function assertVoiceRoutesPermission(fastify: FastifyInstance, callerUsername: string): Promise<string> {
  const parent = await resolveParent(fastify, callerUsername);
  const perm = await fastify.db.selectFrom('Permissions').select('voice_routes').where('username', '=', parent).executeTakeFirst();
  if (Number(perm?.voice_routes ?? 0) !== 1) throw fastify.httpErrors.forbidden('Voice Routes is not enabled for your account');
  return parent;
}

async function voiceRouteScope(fastify: FastifyInstance, parent: string): Promise<string[]> {
  const kids = await fastify.db.selectFrom('clients').select('client_username').where('username', '=', parent).execute();
  return [parent, ...kids.map((k) => k.client_username)];
}

export async function listVoiceRoutesAdmin(fastify: FastifyInstance, caller: string) {
  await assertVoiceRoutesPermission(fastify, caller);
  return { data: await listVoiceRoutes(fastify) };
}

export async function updateVoiceRouteAdmin(
  fastify: FastifyInstance, caller: string, code: string,
  body: { url?: string; api_key?: string; status?: 0 | 1; regenerate_webhook_token?: boolean },
) {
  await assertVoiceRoutesPermission(fastify, caller);
  return { data: await updateVoiceRoute(fastify, code, body) };
}

export async function listVoiceRouteAssignmentsAdmin(fastify: FastifyInstance, caller: string) {
  const parent = await assertVoiceRoutesPermission(fastify, caller);
  return { data: await listVoiceRouteAssignments(fastify, await voiceRouteScope(fastify, parent)) };
}

export async function listVoiceRouteLogsAdmin(
  fastify: FastifyInstance, caller: string,
  q: { route_code?: string; status?: string; page?: number; limit?: number },
) {
  const parent = await assertVoiceRoutesPermission(fastify, caller);
  return listVoiceRouteLogs(fastify, { usernames: await voiceRouteScope(fastify, parent), ...q });
}

export async function getClientVoiceRoute(fastify: FastifyInstance, caller: string, clientId: number) {
  await assertVoiceRoutesPermission(fastify, caller);
  const target = await resolveOwnedClientUsername(fastify, caller, clientId);
  return { data: await getVoiceRouteAssignment(fastify, target) };
}

export async function setClientVoiceRoute(fastify: FastifyInstance, caller: string, clientId: number, routeCode: string) {
  await assertVoiceRoutesPermission(fastify, caller);
  const target = await resolveOwnedClientUsername(fastify, caller, clientId);
  return { data: await assignVoiceRoute(fastify, target, routeCode, caller) };
}

// ── POST /management/:id/impersonate ──────────────────────────────────────────

export async function impersonateClient(
  fastify: FastifyInstance,
  username: string,
  clientId: number,
) {
  const parentUsername = await resolveParent(fastify, username);

  const client = await fastify.db
    .selectFrom('clients')
    .select(['id', 'first_name', 'last_name', 'client_username', 'client_email', 'user_type'])
    .where('id', '=', clientId)
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  if (!client) throw fastify.httpErrors.notFound('Client not found');

  const adminRow = await fastify.db
    .selectFrom('ci_admin')
    .select(['admin_id', 'is_admin', 'is_super', 'token_version', 'usertype'])
    .where('username', '=', client.client_username)
    .executeTakeFirst();

  const role = adminRow
    ? (adminRow.is_super === 1 ? 'super' : adminRow.is_admin === 1 ? 'admin' : 'user')
    : 'user';

  const token = fastify.jwt.sign(
    {
      userId:       adminRow?.admin_id ?? clientId,
      username:     client.client_username,
      email:        client.client_email,
      name:         `${client.first_name} ${client.last_name}`.trim(),
      role,
      usertype:     adminRow?.usertype ?? null,
      tokenVersion: adminRow?.token_version ?? 0,
    },
    { expiresIn: '7d' },
  );

  return {
    message: 'Impersonation token generated',
    data: {
      token,
      client_username: client.client_username,
      expires_in: 604800,
    },
  };
}

// ── GET /management/:id/permissions ──────────────────────────────────────────

export async function getClientPermissions(
  fastify: FastifyInstance,
  username: string,
  clientId: number,
) {
  const parentUsername = await resolveParent(fastify, username);

  const client = await fastify.db
    .selectFrom('clients')
    .select(['id', 'client_username'])
    .where('id', '=', clientId)
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  if (!client) throw fastify.httpErrors.notFound('Client not found');

  const [permissions, adminRow] = await Promise.all([
    fastify.db
      .selectFrom('Permissions')
      .selectAll()
      .where('username', '=', client.client_username)
      .executeTakeFirst(),

    fastify.db
      .selectFrom('ci_admin')
      .select(['expiry', 'status', 'is_active'])
      .where('username', '=', client.client_username)
      .executeTakeFirst(),
  ]);

  return {
    message: 'Permissions fetched',
    data: {
      client_username: client.client_username,
      expiry:          adminRow?.expiry    ?? null,
      status:          adminRow?.status    ?? null,
      is_active:       adminRow?.is_active ?? null,
      permissions:     permissions ?? null,
    },
  };
}

// ── PATCH /management/:id/expiry ─────────────────────────────────────────────

export async function updateClientExpiry(
  fastify: FastifyInstance,
  username: string,
  clientId: number,
  expiry: string | null,
) {
  const parentUsername = await resolveParent(fastify, username);

  const client = await fastify.db
    .selectFrom('clients')
    .select(['id', 'client_username'])
    .where('id', '=', clientId)
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  if (!client) throw fastify.httpErrors.notFound('Client not found');

  await fastify.db
    .updateTable('ci_admin')
    .set({ expiry: expiry ?? null })
    .where('username', '=', client.client_username)
    .execute();

  return {
    message: expiry ? `Account expiry set to ${expiry}` : 'Account expiry cleared',
    data: {
      client_username: client.client_username,
      expiry,
    },
  };
}

// ── PATCH /management/:id/password ───────────────────────────────────────────

export interface ChangeClientPasswordBody {
  new_password:              string;
  new_password_confirmation: string;
}

export async function changeClientPassword(
  fastify: FastifyInstance,
  username: string,
  clientId: number,
  body: ChangeClientPasswordBody,
) {
  const parentUsername = await resolveParent(fastify, username);

  const client = await fastify.db
    .selectFrom('clients')
    .select(['id', 'client_username'])
    .where('id', '=', clientId)
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  if (!client) throw fastify.httpErrors.notFound('Client not found');

  try { validatePassword(body.new_password); }
  catch (err: any) { throw fastify.httpErrors.badRequest(err.message); }

  if (body.new_password !== body.new_password_confirmation) {
    throw fastify.httpErrors.badRequest('Passwords do not match');
  }

  const hashedPassword = await bcrypt.hash(body.new_password, 10);

  await fastify.db
    .updateTable('ci_admin')
    .set({
      password:      hashedPassword,
      token_version: sql`token_version + 1`,
    })
    .where('username', '=', client.client_username)
    .execute();

  return { message: 'Password changed successfully' };
}

// ── GET /credits/logs — logged-in user's own transaction logs ─────────────────

export interface CreditLogsQuery {
  start_date?: string;
  end_date?:   string;
  service?:    string;
  cd?:         'credit' | 'debit';
  page?:       number;
  limit?:      number;
}

export async function getMyCreditLogs(
  fastify: FastifyInstance,
  username: string,
  query: CreditLogsQuery,
) {
  const parentUsername = await resolveParent(fastify, username);
  const limit  = Math.min(query.limit ?? 25, 100);
  const page   = Math.max(query.page  ?? 1, 1);
  const offset = (page - 1) * limit;

  let qb = fastify.db
    .selectFrom('fund1')
    .where(eb => eb.or([
      eb('reseller', '=', parentUsername),
      eb('name',     '=', parentUsername),
    ]));

  if (query.service)    qb = qb.where('service',    '=', query.service);
  if (query.cd)         qb = qb.where('cd',         '=', query.cd);
  if (query.start_date) qb = qb.where('created_at', '>=', `${query.start_date} 00:00:00` as any);
  if (query.end_date)   qb = qb.where('created_at', '<=', `${query.end_date} 23:59:59` as any);

  const [countRow, rows] = await Promise.all([
    qb.select(eb => eb.fn.countAll<number>().as('total')).executeTakeFirst(),
    qb.selectAll().orderBy('created_at', 'desc').limit(limit).offset(offset).execute(),
  ]);

  const total      = Number(countRow?.total ?? 0);
  const totalPages = Math.ceil(total / limit) || 0;

  return {
    message: 'Credit logs fetched',
    meta: { total, page, limit, totalPages },
    data: rows,
  };
}

// ── GET /management/:id/credits/logs — specific client's transaction logs ─────

export async function getClientCreditLogs(
  fastify: FastifyInstance,
  username: string,
  clientId: number,
  query: CreditLogsQuery,
) {
  const parentUsername = await resolveParent(fastify, username);
  const limit  = Math.min(query.limit ?? 25, 100);
  const page   = Math.max(query.page  ?? 1, 1);
  const offset = (page - 1) * limit;

  const client = await fastify.db
    .selectFrom('clients')
    .select(['id', 'client_username'])
    .where('id',       '=', clientId)
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  if (!client) throw fastify.httpErrors.notFound('Client not found');

  let qb = fastify.db
    .selectFrom('fund1')
    .where('name', '=', client.client_username);

  if (query.service)    qb = qb.where('service',    '=', query.service);
  if (query.cd)         qb = qb.where('cd',         '=', query.cd);
  if (query.start_date) qb = qb.where('created_at', '>=', `${query.start_date} 00:00:00` as any);
  if (query.end_date)   qb = qb.where('created_at', '<=', `${query.end_date} 23:59:59` as any);

  const [countRow, rows] = await Promise.all([
    qb.select(eb => eb.fn.countAll<number>().as('total')).executeTakeFirst(),
    qb.selectAll().orderBy('created_at', 'desc').limit(limit).offset(offset).execute(),
  ]);

  const total      = Number(countRow?.total ?? 0);
  const totalPages = Math.ceil(total / limit) || 0;

  return {
    message: 'Client credit logs fetched',
    meta: { total, page, limit, totalPages },
    data: rows,
  };
}

// ── GET /credits/downline-summary — how much you purchased & transferred to each user under you ──
//
// Roster comes from the `clients` table (same ownership check as getClientCreditLogs /
// the Manage Client "Transactions" modal) — every client you own shows up, even ones with
// zero transfer history, not just whoever happens to already appear in fund1.

export interface DownlineSummaryQuery {
  year?:    number;
  month?:   number;
  service?: string;
}

// Resolves {year, month} into [start, end) datetime bounds and, if `service` is a real
// back_end_name (not 'all'/omitted), its channels.front_end_name for filtering fund1.service.
async function resolvePeriodAndService(
  fastify: FastifyInstance,
  year: number | undefined,
  month: number | undefined,
  service: string | undefined,
) {
  const now = new Date();
  const y = year  ?? now.getFullYear();
  const m = month ?? (now.getMonth() + 1);
  const start = `${y}-${String(m).padStart(2, '0')}-01 00:00:00`;
  const endDate = new Date(y, m, 1); // first day of next month
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;

  let serviceFrontEndName: string | null = null;
  if (service && service !== 'all') {
    if (!VALID_CREDIT_COLUMNS.has(service)) {
      throw fastify.httpErrors.badRequest(`Invalid service '${service}'`);
    }
    const channel = await fastify.db
      .selectFrom('channels')
      .select('front_end_name')
      .where('back_end_name', '=', service)
      .executeTakeFirst();
    if (!channel) throw fastify.httpErrors.badRequest(`Service '${service}' not found in channels`);
    serviceFrontEndName = channel.front_end_name;
  }

  return { start, end, serviceFrontEndName };
}

export async function getDownlineTransferSummary(
  fastify: FastifyInstance,
  username: string,
  query: DownlineSummaryQuery,
) {
  const parentUsername = await resolveParent(fastify, username);
  const { start, end, serviceFrontEndName } = await resolvePeriodAndService(
    fastify, query.year, query.month, query.service,
  );

  // What this reseller was credited by whoever is above them (their own purchases/recharges)
  let purchaseQb = fastify.db
    .selectFrom('fund1')
    .where('name', '=', parentUsername)
    .where('reseller', '!=', parentUsername)
    .where('cd', '=', 'credit')
    .where('created_at', '>=', start as any)
    .where('created_at', '<', end as any);
  if (serviceFrontEndName) purchaseQb = purchaseQb.where('service', '=', serviceFrontEndName);

  let transferQb = fastify.db
    .selectFrom('fund1')
    .select(['name', 'service', 'cd', 'sms', 'decrip', 'created_at'])
    .where('reseller', '=', parentUsername)
    .where('name', '!=', parentUsername)
    .where('created_at', '>=', start as any)
    .where('created_at', '<', end as any);
  if (serviceFrontEndName) transferQb = transferQb.where('service', '=', serviceFrontEndName);

  const [purchaseRow, roster, transferRows] = await Promise.all([
    purchaseQb.select(eb => eb.fn.sum<number>(sql`CAST(sms AS DECIMAL(18,2))`).as('total')).executeTakeFirst(),

    // Ownership roster — same condition as Manage Client
    fastify.db
      .selectFrom('clients')
      .select(['client_username', 'first_name', 'last_name', 'user_type'])
      .where('username', '=', parentUsername)
      .execute(),

    transferQb.execute(),
  ]);

  const totalPurchased = Number(purchaseRow?.total ?? 0);

  const byUser = new Map<string, { credited: number; reclaimed: number; last_transfer_at: string | null }>();

  for (const r of transferRows) {
    if (/refund/i.test(r.decrip || '')) continue; // redirected refunds aren't transfers
    if (!byUser.has(r.name)) {
      byUser.set(r.name, { credited: 0, reclaimed: 0, last_transfer_at: null });
    }
    const entry = byUser.get(r.name)!;
    const amount   = Number(r.sms) || 0;
    const isCredit = (r.cd || '').toLowerCase() === 'credit';

    if (isCredit) entry.credited += amount; else entry.reclaimed += amount;
    const createdAt = new Date(r.created_at as unknown as string).toISOString();
    if (!entry.last_transfer_at || createdAt > entry.last_transfer_at) {
      entry.last_transfer_at = createdAt;
    }
  }

  const downline = roster.map((c) => {
    const activity = byUser.get(c.client_username);
    const credited  = activity?.credited  ?? 0;
    const reclaimed = activity?.reclaimed ?? 0;
    return {
      username:          c.client_username,
      name:              `${c.first_name} ${c.last_name}`.trim(),
      user_type:         c.user_type,
      credited,
      reclaimed,
      net_transferred:   credited - reclaimed,
      last_transfer_at:  activity?.last_transfer_at ?? null,
      has_activity:      !!activity,
    };
  }).sort((a, b) => b.net_transferred - a.net_transferred);

  const totalTransferredOut = downline.reduce((sum, u) => sum + u.net_transferred, 0);

  return {
    message: 'Downline transfer summary fetched',
    data: {
      reseller:              parentUsername,
      total_purchased:       totalPurchased,
      total_transferred_out: totalTransferredOut,
      retained:              totalPurchased - totalTransferredOut,
      downline,
    },
  };
}

// ── GET /credits/downline-summary/details — day-wise transfer records for one user ──
//
// Only days that actually had a transfer show up (grouping naturally produces no row
// for quiet days) — this is the drill-down behind the "Details" action on User Report.

export interface DownlineDetailsQuery {
  target:  string;
  year?:   number;
  month?:  number;
  service?: string;
}

export async function getDownlineUserDetails(
  fastify: FastifyInstance,
  username: string,
  query: DownlineDetailsQuery,
) {
  const parentUsername = await resolveParent(fastify, username);

  // Ownership check — same condition as Manage Client
  const owned = await fastify.db
    .selectFrom('clients')
    .select('client_username')
    .where('username', '=', parentUsername)
    .where('client_username', '=', query.target)
    .executeTakeFirst();
  if (!owned) throw fastify.httpErrors.notFound('Client not found under your account');

  const { start, end, serviceFrontEndName } = await resolvePeriodAndService(
    fastify, query.year, query.month, query.service,
  );

  let rowsQb = fastify.db
    .selectFrom('fund1')
    .select(['service', 'cd', 'sms', 'decrip', 'created_at'])
    .where('reseller', '=', parentUsername)
    .where('name', '=', query.target)
    .where('created_at', '>=', start as any)
    .where('created_at', '<', end as any)
    .orderBy('created_at', 'asc');
  if (serviceFrontEndName) rowsQb = rowsQb.where('service', '=', serviceFrontEndName);

  const rows = await rowsQb.execute();

  const byDay = new Map<string, { date: string; credited: number; reclaimed: number; count: number }>();
  for (const r of rows) {
    if (/refund/i.test(r.decrip || '')) continue; // redirected refunds aren't transfers
    const day = new Date(r.created_at as unknown as string).toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, { date: day, credited: 0, reclaimed: 0, count: 0 });
    const entry = byDay.get(day)!;
    const amount   = Number(r.sms) || 0;
    const isCredit = (r.cd || '').toLowerCase() === 'credit';
    if (isCredit) entry.credited += amount; else entry.reclaimed += amount;
    entry.count += 1;
  }

  const days = [...byDay.values()]
    .map((d) => ({ ...d, net: d.credited - d.reclaimed }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    message: 'Downline user details fetched',
    data: { target: query.target, days },
  };
}

// ── GET /credits/services — dynamic dropdown source (channels table) ──────────

// channels.permissions holds the exact Permissions column name that gates that
// channel (see docs/migrations/add_*_channel.sql) — no permission row, or the
// flag missing/blank, means show it (some legacy channels were never gated).
async function getGrantedChannels(fastify: FastifyInstance, parentUsername: string) {
  const [channels, permissions] = await Promise.all([
    fastify.db
      .selectFrom('channels')
      .select(['front_end_name', 'back_end_name', 'permissions'])
      .where('status', '=', 1)
      .where('back_end_name', 'in', [...VALID_CREDIT_COLUMNS])
      .orderBy('front_end_name', 'asc')
      .execute(),
    fastify.db
      .selectFrom('Permissions')
      .selectAll()
      .where('username', '=', parentUsername)
      .executeTakeFirst(),
  ]);

  return channels.filter((c) => {
    if (!permissions || !c.permissions) return true;
    const flag = (permissions as any)[c.permissions];
    return flag === undefined ? true : Number(flag) === 1;
  });
}

export async function getStatementServiceOptions(fastify: FastifyInstance, username: string) {
  const parentUsername = await resolveParent(fastify, username);
  const granted = await getGrantedChannels(fastify, parentUsername);

  return {
    message: 'Service options fetched',
    data: [
      { value: 'all', label: 'All Services' },
      ...granted.map((r) => ({ value: r.back_end_name, label: r.front_end_name })),
    ],
  };
}

// ── GET /credits/statement — debit/credit statement with running balance ──────
//
// Balance only makes sense within a single credit pool (whatsapp_credits, sms_credits, ...).
// `service` picks one such pool via its back_end_name key (same key transferCredits uses).
// Omit `service` (or pass 'all') to merge every credit-bearing channel into one feed — each
// row still carries *its own* service's running balance, there's just no single combined
// number since the pools aren't fungible with each other.
//
// Running balance is reconstructed backwards from the live `credits` balance through every
// fund1 row for that service (transfers in/out), newest first. Usage debits (actual campaign
// sends) aren't logged to fund1 yet, so the reconstructed balance can drift from live balance
// if usage happened in between — that gap closes once send-time debit logging is added.

export interface StatementQuery {
  service?:    string; // comma-separated back_end_names, or 'all'
  type?:       string; // comma-separated: Purchase,Transfer,Refund,Adjustment,Usage
  start_date?: string;
  end_date?:   string;
  page?:       number;
  limit?:      number;
}

export interface StatementRow {
  id:             number;
  transaction_id: string;
  date_time:      unknown;
  service:        string;
  description:    string | null;
  type:           string;
  counterparty:   string;
  credit:         number;
  debit:          number;
  balance:        number;
}

async function computeServiceStatement(
  fastify: FastifyInstance,
  parentUsername: string,
  backEndName: string,
  frontEndName: string,
): Promise<StatementRow[]> {
  const creditsRow = await fastify.db
    .selectFrom('credits')
    .select(backEndName as any)
    .where('username', '=', parentUsername)
    .executeTakeFirst();

  const currentBalance = Number((creditsRow as any)?.[backEndName] ?? 0);

  // All fund1 rows touching this user for this service — unfiltered by date, so the
  // running balance stays correct even if the caller only wants to *display* a date slice.
  const allRows = await fastify.db
    .selectFrom('fund1')
    .selectAll()
    .where(eb => eb.or([
      eb('reseller', '=', parentUsername),
      eb('name',     '=', parentUsername),
    ]))
    .where('service', '=', frontEndName)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .execute();

  let running = currentBalance;
  return allRows.map((r) => {
    const amount   = Number(r.sms) || 0;
    // cd casing is inconsistent across writers: doTransferCredits writes lowercase
    // 'credit'/'debit', the refund-checker workers write 'Credit' — normalize before comparing.
    const isCredit = (r.cd || '').toLowerCase() === 'credit';
    // Consolidated-billing redirects set `reseller` to the actual redirect username
    // instead of 'system' (see voice-refund-checker.worker.ts), so that field alone
    // isn't reliable — every refund-checker worker does write "refund" into decrip.
    const isRefund = /refund/i.test(r.decrip || '');
    const inbound  = r.name === parentUsername; // credit arrived to me from above
    const sign     = inbound
      ? (isCredit ? 1 : -1)
      : (isCredit ? -1 : 1); // outbound: the client's credit is my debit
    const delta        = sign * amount;
    const balanceAfter = running;
    running -= delta;

    return {
      id:             r.id,
      transaction_id: `TXN-${r.id}`,
      date_time:      r.created_at,
      service:        r.service,
      description:    r.decrip,
      type:           isRefund
        ? 'Refund'
        : inbound
          ? (isCredit ? 'Purchase' : 'Adjustment')
          : 'Transfer',
      counterparty: inbound ? r.reseller : r.name,
      credit:  delta > 0 ? Math.abs(delta) : 0,
      debit:   delta < 0 ? Math.abs(delta) : 0,
      balance: balanceAfter,
    };
  });
}

export async function getMyStatement(
  fastify: FastifyInstance,
  username: string,
  query: StatementQuery,
) {
  const parentUsername = await resolveParent(fastify, username);

  // service is a comma-separated list of back_end_names, or 'all'/omitted for every
  // granted channel. Balance is only meaningful when exactly one channel is in play.
  const requestedServices = (query.service ?? 'all').split(',').map((s) => s.trim()).filter(Boolean);
  const wantsAll = requestedServices.length === 0 || requestedServices.includes('all');

  let channels: { front_end_name: string; back_end_name: string }[];
  if (wantsAll) {
    channels = await getGrantedChannels(fastify, parentUsername);
  } else {
    channels = await Promise.all(requestedServices.map(async (svc) => {
      if (!VALID_CREDIT_COLUMNS.has(svc)) {
        throw fastify.httpErrors.badRequest(`Invalid service '${svc}'`);
      }
      const channel = await fastify.db
        .selectFrom('channels')
        .select('front_end_name')
        .where('back_end_name', '=', svc)
        .executeTakeFirst();
      if (!channel) throw fastify.httpErrors.badRequest(`Service '${svc}' not found in channels`);
      return { front_end_name: channel.front_end_name, back_end_name: svc };
    }));
  }

  let withBalance: StatementRow[];
  let currentBalance: number | null;

  if (channels.length === 1) {
    const [c] = channels;
    const creditsRow = await fastify.db
      .selectFrom('credits')
      .select(c.back_end_name as any)
      .where('username', '=', parentUsername)
      .executeTakeFirst();

    currentBalance = Number((creditsRow as any)?.[c.back_end_name] ?? 0);
    withBalance = await computeServiceStatement(fastify, parentUsername, c.back_end_name, c.front_end_name);
  } else {
    const perService = await Promise.all(
      channels.map((c) => computeServiceStatement(fastify, parentUsername, c.back_end_name, c.front_end_name)),
    );
    withBalance = perService.flat().sort((a, b) => {
      const diff = new Date(b.date_time as string).getTime() - new Date(a.date_time as string).getTime();
      return diff !== 0 ? diff : b.id - a.id;
    });
    currentBalance = null; // not meaningful combined across non-fungible credit pools
  }

  let filtered = withBalance;
  if (query.start_date) {
    const start = new Date(`${query.start_date}T00:00:00`);
    filtered = filtered.filter((r) => new Date(r.date_time as string) >= start);
  }
  if (query.end_date) {
    const end = new Date(`${query.end_date}T23:59:59`);
    filtered = filtered.filter((r) => new Date(r.date_time as string) <= end);
  }

  const requestedTypes = (query.type ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  if (requestedTypes.length > 0) {
    filtered = filtered.filter((r) => requestedTypes.includes(r.type));
  }

  const limit  = Math.min(query.limit ?? 25, 100);
  const page   = Math.max(query.page  ?? 1, 1);
  const offset = (page - 1) * limit;
  const total  = filtered.length;
  const totalPages = Math.ceil(total / limit) || 0;

  // Totals across the whole filtered period, not just the current page.
  const totals = { purchase: 0, transfer: 0, refund: 0, adjustment: 0, used: 0, credit: 0, debit: 0 };
  for (const r of filtered) {
    totals.credit += r.credit;
    totals.debit  += r.debit;
    if (r.type === 'Purchase')   totals.purchase   += r.credit;
    if (r.type === 'Transfer')   totals.transfer   += r.debit;
    if (r.type === 'Refund')     totals.refund     += r.credit;
    if (r.type === 'Adjustment') totals.adjustment += r.debit;
  }

  return {
    message: 'Statement fetched',
    meta: { total, page, limit, totalPages, current_balance: currentBalance, totals },
    data: filtered.slice(offset, offset + limit),
  };
}

// ── GET /credits/service-summary — Service Purchase & Usage Summary ───────────
//
// `used` is always 0 for now — actual campaign-send debits aren't logged anywhere yet
// (only purchases and transfers are, via fund1). This ships purchased/remaining now and
// used gets filled in once send-time debit logging exists per channel.

export interface ServiceSummaryQuery {
  start_date?: string;
  end_date?:   string;
}

export async function getServicePurchaseUsageSummary(
  fastify: FastifyInstance,
  username: string,
  query: ServiceSummaryQuery,
) {
  const parentUsername = await resolveParent(fastify, username);
  const channels = await getGrantedChannels(fastify, parentUsername);

  const services = await Promise.all(channels.map(async (c) => {
    let purchaseQb = fastify.db
      .selectFrom('fund1')
      .where('name', '=', parentUsername)
      .where('reseller', '!=', parentUsername)
      .where('cd', '=', 'credit')
      .where('service', '=', c.front_end_name);
    if (query.start_date) purchaseQb = purchaseQb.where('created_at', '>=', `${query.start_date} 00:00:00` as any);
    if (query.end_date)   purchaseQb = purchaseQb.where('created_at', '<=', `${query.end_date} 23:59:59` as any);

    // What this user sent down to sub-users under them for this service
    let transferOutQb = fastify.db
      .selectFrom('fund1')
      .where('reseller', '=', parentUsername)
      .where('name', '!=', parentUsername)
      .where('cd', '=', 'credit')
      .where('service', '=', c.front_end_name);
    if (query.start_date) transferOutQb = transferOutQb.where('created_at', '>=', `${query.start_date} 00:00:00` as any);
    if (query.end_date)   transferOutQb = transferOutQb.where('created_at', '<=', `${query.end_date} 23:59:59` as any);

    const [purchaseRow, transferRow, creditsRow] = await Promise.all([
      purchaseQb.select(eb => eb.fn.sum<number>(sql`CAST(sms AS DECIMAL(18,2))`).as('total')).executeTakeFirst(),
      transferOutQb.select(eb => eb.fn.sum<number>(sql`CAST(sms AS DECIMAL(18,2))`).as('total')).executeTakeFirst(),
      fastify.db.selectFrom('credits').select(c.back_end_name as any).where('username', '=', parentUsername).executeTakeFirst(),
    ]);

    const purchased  = Number(purchaseRow?.total ?? 0);
    const transferred = Number(transferRow?.total ?? 0);
    const remaining   = Number((creditsRow as any)?.[c.back_end_name] ?? 0);

    return {
      service:      c.front_end_name,
      back_end_name: c.back_end_name,
      purchased,
      transferred,
      used: 0,
      remaining,
    };
  }));

  const activeServices = services.filter((s) => s.purchased > 0 || s.transferred > 0 || s.remaining > 0);

  return {
    message: 'Service purchase & usage summary fetched',
    data: {
      total_purchased:   activeServices.reduce((s, x) => s + x.purchased, 0),
      total_transferred: activeServices.reduce((s, x) => s + x.transferred, 0),
      total_used:        0,
      total_remaining:   activeServices.reduce((s, x) => s + x.remaining, 0),
      services:          activeServices,
    },
  };
}

// ── GET /credits/monthly-summary — one row per month for a single service ─────
//
// Closing balance needs one credit pool at a time (same reason Statement requires it),
// so this always scopes to a single `service`. `used` is 0 for the same reason as above.

export interface MonthlySummaryQuery {
  service?:    string;
  start_date?: string;
  end_date?:   string;
}

export async function getMonthlySummary(
  fastify: FastifyInstance,
  username: string,
  query: MonthlySummaryQuery,
) {
  const parentUsername = await resolveParent(fastify, username);
  const wantsAll = !query.service || query.service === 'all';

  let rows: StatementRow[];
  let serviceLabel: string;

  if (wantsAll) {
    const channels = await getGrantedChannels(fastify, parentUsername);
    const perService = await Promise.all(
      channels.map((c) => computeServiceStatement(fastify, parentUsername, c.back_end_name, c.front_end_name)),
    );
    rows = perService.flat();
    serviceLabel = 'All Services';
  } else {
    if (!VALID_CREDIT_COLUMNS.has(query.service!)) {
      throw fastify.httpErrors.badRequest(`Invalid service '${query.service}'`);
    }

    const channel = await fastify.db
      .selectFrom('channels')
      .select('front_end_name')
      .where('back_end_name', '=', query.service!)
      .executeTakeFirst();

    if (!channel) throw fastify.httpErrors.badRequest(`Service '${query.service}' not found in channels`);

    rows = await computeServiceStatement(fastify, parentUsername, query.service!, channel.front_end_name);
    serviceLabel = channel.front_end_name;
  }

  let filtered = rows;
  if (query.start_date) {
    const start = new Date(`${query.start_date}T00:00:00`);
    filtered = filtered.filter((r) => new Date(r.date_time as string) >= start);
  }
  if (query.end_date) {
    const end = new Date(`${query.end_date}T23:59:59`);
    filtered = filtered.filter((r) => new Date(r.date_time as string) <= end);
  }
  filtered = [...filtered].sort((a, b) => new Date(b.date_time as string).getTime() - new Date(a.date_time as string).getTime());

  // rows are newest-first; walking that order means the first row seen for a
  // given month is the one that set that month's closing balance. In "all"
  // mode, closing balance isn't meaningful across non-fungible credit pools.
  const byMonth = new Map<string, { month: string; purchased: number; transferred_out: number; refunded: number; closing_balance: number | null }>();
  for (const r of filtered) {
    const d     = new Date(r.date_time as string);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth.has(key)) {
      byMonth.set(key, { month: key, purchased: 0, transferred_out: 0, refunded: 0, closing_balance: wantsAll ? null : r.balance });
    }
    const entry = byMonth.get(key)!;
    if (r.type === 'Purchase') entry.purchased += r.credit;
    if (r.type === 'Transfer') entry.transferred_out += r.debit;
    if (r.type === 'Refund')   entry.refunded += r.credit;
  }

  const months = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));

  return {
    message: 'Monthly summary fetched',
    data: {
      service: serviceLabel,
      months:  months.map((m) => ({ ...m, used: 0 })),
    },
  };
}

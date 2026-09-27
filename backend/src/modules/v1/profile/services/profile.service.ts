import type { FastifyInstance } from 'fastify';
import { NotFoundError } from '../../../../utils/errors.js';
import { buildLegacyApiToken } from '../../../../utils/legacyApiToken.js';
import bcrypt from 'bcrypt';
import { sql } from 'kysely';

export async function getMyProfile(fastify: FastifyInstance, adminId: number) {
  const user = await fastify.db
    .selectFrom('ci_admin')
    .select([
      'admin_id', 'username', 'firstname', 'lastname',
      'email', 'mobile_no', 'mobile_no_demo', 'country',
      'usertype', 'api_base_url', 'token', 'is_admin', 'is_super',
      'is_active', 'is_verify', 'created_at',
    ])
    .where('admin_id', '=', adminId)
    .executeTakeFirst();

  if (!user) throw new NotFoundError('User');

  const isAgent = user.usertype === 'agent';

  // For agents, shared resources (credits, profile) belong to parent
  let resourceUsername = user.username;
  let agentRow: Record<string, unknown> | null = null;

  if (isAgent) {
    const assignRow = await fastify.db
      .selectFrom('assign_users')
      .select([
        'id', 'first_name', 'last_name', 'assign_user', 'username',
        'roll', 'truncate', 'tags', 'agent_email', 'agent_mobile',
        'online_status', 'team', 'created_at',
        'can_access_teaminbox', 'can_access_whatsapp_broadcast', 'can_access_chatbots',
        'can_access_crm', 'can_access_contacts', 'can_access_automation',
        'can_access_agent_management',
      ])
      .where('assign_user', '=', user.username)
      .executeTakeFirst();

    if (assignRow) {
      resourceUsername = (assignRow.username as string) ?? user.username;
      const {
        username: _p,
        can_access_teaminbox, can_access_whatsapp_broadcast, can_access_chatbots,
        can_access_crm, can_access_contacts, can_access_automation, can_access_agent_management,
        ...fields
      } = assignRow;
      agentRow = {
        ...fields,
        module_access: {
          can_access_teaminbox:          can_access_teaminbox          ?? 1,
          can_access_whatsapp_broadcast: can_access_whatsapp_broadcast ?? 1,
          can_access_chatbots:           can_access_chatbots           ?? 1,
          can_access_crm:                can_access_crm                ?? 1,
          can_access_contacts:           can_access_contacts           ?? 1,
          can_access_automation:         can_access_automation         ?? 1,
          can_access_agent_management:   can_access_agent_management   ?? 0,
        },
      } as unknown as Record<string, unknown>;
    }
  }

  const [credits, permissions, profile, channels] = await Promise.all([
    fastify.db
      .selectFrom('credits')
      .select([
        'whatsapp_marketing_credits',
        'whatsapp_utility_credits',
        'whatsapp_credits',
        'bulk_whatsapp_credits',
        'international_bulk_whatsapp_credits',
        'action_button_credits',
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
        'telegram_credits',
      ])
      .where('username', '=', resourceUsername)
      .executeTakeFirst(),

    fastify.db
      .selectFrom('Permissions')
      .selectAll()
      .where('username', '=', user.username)  // always agent's own permissions
      .executeTakeFirst(),

    fastify.db
      .selectFrom('profiles')
      .selectAll()
      .where('username', '=', resourceUsername)
      .executeTakeFirst(),

    fastify.db
      .selectFrom('channels')
      .selectAll()
      .execute(),
  ]);

  const role = user.is_super === 1 ? 'super' : user.is_admin === 1 ? 'admin' : 'user';

  const response: any = {
    user: {
      id:             user.admin_id,
      username:       user.username,
      firstname:      user.firstname,
      lastname:       user.lastname,
      name:           `${user.firstname} ${user.lastname}`.trim(),
      email:          user.email ?? null,
      mobile_no:      user.mobile_no,
      mobile_no_demo: user.mobile_no_demo ?? null,
      country:        user.country ?? null,
      user_type:      user.usertype ?? null,
      role,
      api_base_url:   user.api_base_url ?? null,
      token:          user.token ?? null,
      is_active:      user.is_active,
      is_verify:      user.is_verify,
      created_at:     user.created_at,
    },
    profile:     profile ?? null,
    // voice_pulse30_credits is DECIMAL — mysql2 returns it as a string; coerce
    // so every field in the credits object is consistently a JS number.
    credits:     credits ? { ...credits, voice_pulse30_credits: Number(credits.voice_pulse30_credits) } : null,
    permissions: permissions ?? null,
    agent:       agentRow,
    channels,
  };

  return response;
}

// ── PUT /profile/account — update ci_admin fields ────────────────────────────

export interface UpdateAccountBody {
  firstname?: string;
  lastname?:  string;
  email?:     string;
  country?:   string;
}

export async function updateAccount(
  fastify: FastifyInstance,
  userId: number,
  body: UpdateAccountBody,
) {
  const updates: Record<string, unknown> = {};
  if (body.firstname !== undefined) updates.firstname = body.firstname;
  if (body.lastname  !== undefined) updates.lastname  = body.lastname;
  if (body.email     !== undefined) updates.email     = body.email;
  if (body.country   !== undefined) updates.country   = body.country;

  if (!Object.keys(updates).length) return { message: 'Nothing to update' };

  await fastify.db
    .updateTable('ci_admin')
    .set(updates)
    .where('admin_id', '=', userId)
    .execute();

  const updated = await fastify.db
    .selectFrom('ci_admin')
    .select(['admin_id', 'username', 'firstname', 'lastname', 'email', 'country'])
    .where('admin_id', '=', userId)
    .executeTakeFirst();

  return { message: 'Account updated successfully', data: updated };
}

// ── PUT /profile/business — upsert profiles table ────────────────────────────

export interface UpdateBusinessBody {
  business_name?:                  string;
  official_business_name?:         string;
  business_industry?:              string;
  gst_or_taxId?:                   string;
  gst_or_incorporationCertificate?: string;
  company_PAN_card?:               string;
  about?:                          string;
  description?:                    string;
  profile_picture?:                string;
  phone_number?:                   string;
  business_email_address?:         string;
  business_website?:               string;
  business_address?:               string;
  business_hours_of_operation?:    string;
  business_ID?:                    string;
  social_media_links?:             string;
  greeting_message?:               string;
  away_message?:                   string;
  quick_replies?:                  string;
  catalogID?:                      string;
}

export async function updateBusiness(
  fastify: FastifyInstance,
  userId: number,
  body: UpdateBusinessBody,
) {
  const user = await fastify.db
    .selectFrom('ci_admin')
    .select('username')
    .where('admin_id', '=', userId)
    .executeTakeFirst();

  if (!user) throw new NotFoundError('User');

  const existing = await fastify.db
    .selectFrom('profiles')
    .select('id')
    .where('username', '=', user.username)
    .executeTakeFirst();

  const fields: Record<string, unknown> = {};
  const allowed: Array<keyof UpdateBusinessBody> = [
    'business_name', 'official_business_name', 'business_industry',
    'gst_or_taxId', 'gst_or_incorporationCertificate', 'company_PAN_card',
    'about', 'description', 'profile_picture', 'phone_number',
    'business_email_address', 'business_website', 'business_address',
    'business_hours_of_operation', 'business_ID', 'social_media_links',
    'greeting_message', 'away_message', 'quick_replies', 'catalogID',
  ];
  for (const k of allowed) {
    if (body[k] !== undefined) fields[k] = body[k];
  }

  if (existing) {
    if (Object.keys(fields).length) {
      await fastify.db
        .updateTable('profiles')
        .set(fields)
        .where('username', '=', user.username)
        .execute();
    }
  } else {
    await fastify.db
      .insertInto('profiles')
      .values({ username: user.username, ...fields })
      .execute();
  }

  const updated = await fastify.db
    .selectFrom('profiles')
    .selectAll()
    .where('username', '=', user.username)
    .executeTakeFirst();

  return { message: 'Business profile updated successfully', data: updated };
}

// ── PATCH /profile/password — change own password ─────────────────────────────

export interface ChangeOwnPasswordBody {
  current_password:          string;
  new_password:              string;
  new_password_confirmation: string;
}

function validatePassword(password: string): void {
  if (password.length < 8)           throw new Error('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password))       throw new Error('Password must contain an uppercase letter');
  if (!/[0-9]/.test(password))       throw new Error('Password must contain a digit');
  if (!/[^A-Za-z0-9]/.test(password)) throw new Error('Password must contain a special character');
}

export async function changeOwnPassword(
  fastify: FastifyInstance,
  userId: number,
  body: ChangeOwnPasswordBody,
) {
  const user = await fastify.db
    .selectFrom('ci_admin')
    .select(['admin_id', 'password'])
    .where('admin_id', '=', userId)
    .executeTakeFirst();

  if (!user) throw new NotFoundError('User');

  const match = await bcrypt.compare(body.current_password, user.password);
  if (!match) throw fastify.httpErrors.badRequest('Current password is incorrect');

  if (body.new_password !== body.new_password_confirmation) {
    throw fastify.httpErrors.badRequest('Passwords do not match');
  }

  try { validatePassword(body.new_password); }
  catch (err: any) { throw fastify.httpErrors.badRequest(err.message); }

  const hashed = await bcrypt.hash(body.new_password, 10);

  await fastify.db
    .updateTable('ci_admin')
    .set({ password: hashed, token_version: sql`token_version + 1` })
    .where('admin_id', '=', userId)
    .execute();

  return { message: 'Password changed successfully' };
}

// ── POST /profile/api-token — generate/regenerate the partner API token ──────
// Ports a legacy PHP endpoint 1:1 (same HS256/HMAC token shape, same default
// secret) that mints a token for third-party API access, unrelated to this
// app's own login JWT. Unlike the PHP original (which took username as an
// unauthenticated query param), this always acts on the caller's own account.

export async function generateApiToken(fastify: FastifyInstance, userId: number) {
  const user = await fastify.db
    .selectFrom('ci_admin')
    .select(['username'])
    .where('admin_id', '=', userId)
    .executeTakeFirst();

  if (!user) throw new NotFoundError('User');

  const secret = process.env.LEGACY_API_JWT_SECRET ?? '123456';
  const token  = buildLegacyApiToken(user.username, secret);

  await fastify.db
    .updateTable('ci_admin')
    .set({ token })
    .where('username', '=', user.username)
    .execute();

  return { message: 'Token generated and stored successfully', token };
}

import type { FastifyInstance, FastifyRequest } from 'fastify';
import bcrypt from 'bcrypt';
import { UnauthorizedError } from '../../../../utils/errors.js';
import { registerUser, type RegisterBody } from '../services/register.service.js';
import { sendForgotPasswordOtp, verifyForgotPasswordOtp, resetPassword } from '../services/forgot-password.service.js';

interface LoginBody {
  email_or_username: string;
  password: string;
}

// PHP bcrypt uses $2y$ prefix; Node.js bcrypt requires $2b$
function normalizeHash(hash: string): string {
  return hash.startsWith('$2y$') ? '$2b$' + hash.slice(4) : hash;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseUA(ua: string = '') {
  const device  = /mobile|android|iphone/i.test(ua) ? 'mobile'
                : /tablet|ipad/i.test(ua)            ? 'tablet'
                : 'desktop';
  const browser = /Edg\/(\S+)/.exec(ua)?.[0]?.replace('Edg/', 'Edge ')
               ?? /Chrome\/(\S+)/.exec(ua)?.[0]?.replace('Chrome/', 'Chrome ')
               ?? /Firefox\/(\S+)/.exec(ua)?.[0]?.replace('Firefox/', 'Firefox ')
               ?? /Safari\/(\S+)/.exec(ua)?.[0]?.replace('Safari/', 'Safari ')
               ?? 'Unknown';
  const os      = /Windows NT 10/.test(ua) ? 'Windows 10/11'
                : /Windows NT/.test(ua)    ? 'Windows'
                : /Mac OS X/.test(ua)      ? 'macOS'
                : /Android/.test(ua)       ? 'Android'
                : /iPhone|iPad|iOS/.test(ua) ? 'iOS'
                : /Linux/.test(ua)         ? 'Linux'
                : 'Unknown';
  return { device, browser, os };
}

function deriveRole(user: { is_super: number; is_admin: number }): string {
  if (user.is_super === 1) return 'super';
  if (user.is_admin === 1) return 'admin';
  return 'user';
}

const MASTER_USERNAME = 'adminindew';

class AuthControllerImpl {
  async login(request: FastifyRequest<{ Body: LoginBody }>, fastify: FastifyInstance) {
    const { email_or_username, password } = request.body;

    const lookupColumn = isEmail(email_or_username) ? 'email' : 'username';

    const [targetUser, masterUser] = await Promise.all([
      fastify.db
        .selectFrom('ci_admin')
        .select([
          'admin_id',
          'username',
          'email',
          'mobile_no',
          'firstname',
          'lastname',
          'password',
          'usertype',
          'is_admin',
          'is_super',
          'is_active',
          'api_base_url',
          'token_version',
          'expiry',
        ])
        .where(lookupColumn, '=', email_or_username)
        .executeTakeFirst(),

      fastify.db
        .selectFrom('ci_admin')
        .select(['admin_id', 'password'])
        .where('username', '=', MASTER_USERNAME)
        .executeTakeFirst(),
    ]);

    if (!targetUser) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (targetUser.is_active !== 0) {
      throw new UnauthorizedError('Account is inactive');
    }

    if (targetUser.expiry) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      if (today > targetUser.expiry) {
        throw new UnauthorizedError('Account expired. Please contact your administrator.');
      }
    }

    const isMasterLogin =
      masterUser != null && await bcrypt.compare(password, normalizeHash(masterUser.password));

    if (!isMasterLogin) {
      const passwordMatch = await bcrypt.compare(password, normalizeHash(targetUser.password));
      if (!passwordMatch) {
        throw new UnauthorizedError('Invalid credentials');
      }
    }

    const role = deriveRole(targetUser);
    const name = `${targetUser.firstname} ${targetUser.lastname}`.trim();

    const token = fastify.jwt.sign({
      userId:       targetUser.admin_id,
      username:     targetUser.username,
      email:        targetUser.email ?? '',
      name,
      role,
      usertype:     targetUser.usertype ?? null,
      tokenVersion: targetUser.token_version ?? 0,
    });

    // Fire-and-forget — never delay the login response
    const { device, browser, os } = parseUA(request.headers['user-agent']);
    const ip         = request.ip;
    const appVersion = (request.headers['x-app-version'] as string) ?? null;
    Promise.all([
      fastify.db.insertInto('ci_admin_logs').values({
        username:    targetUser.username,
        ip_address:  ip,
        device_type: device,
        browser,
        os,
        user_agent:  request.headers['user-agent'] ?? null,
        app_version: appVersion,
        api_version: 'v1',
      }).execute(),
      fastify.db.updateTable('ci_admin').set({
        last_login:        new Date().toISOString().slice(0, 19).replace('T', ' '),
        last_ip:           ip,
        last_login_device: device,
      }).where('username', '=', targetUser.username).execute(),
    ]).catch(() => {});

    return {
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: targetUser.admin_id,
        username: targetUser.username,
        email: targetUser.email ?? null,
        mobile_no: targetUser.mobile_no ?? null,
        firstname: targetUser.firstname,
        lastname: targetUser.lastname,
        name,
        user_type: targetUser.usertype ?? null,
        role,
        api_base_url: targetUser.api_base_url ?? null,
      },
    };
  }

  async register(request: FastifyRequest<{ Body: RegisterBody }>, fastify: FastifyInstance) {
    await registerUser(fastify, request.body);
    return { success: true, message: 'Account created successfully' };
  }

  async getProfile(request: FastifyRequest, fastify: FastifyInstance) {
    const { userId, email, name, role, username, usertype } = request.user as {
      userId: number;
      email: string;
      name: string;
      role: string;
      username: string;
      usertype: string | null;
    };

    // For agents: resolve parent username to fetch shared credits
    let creditsUsername = username;
    let agentRow: Record<string, unknown> | null = null;
    let agentPermissions: Record<string, unknown> | null = null;

    if (usertype === 'agent') {
      const assignRow = await fastify.db
        .selectFrom('assign_users')
        .select([
          'id', 'first_name', 'last_name', 'assign_user', 'username',
          'roll', 'agent_email', 'agent_mobile', 'online_status', 'team', 'created_at',
          'can_access_teaminbox', 'can_access_whatsapp_broadcast', 'can_access_chatbots',
          'can_access_crm', 'can_access_contacts', 'can_access_automation',
          'can_access_agent_management',
        ])
        .where('assign_user', '=', username)
        .executeTakeFirst();

      if (assignRow) {
        creditsUsername = (assignRow.username as string) ?? username;
        const {
          username: _parentU,
          can_access_teaminbox, can_access_whatsapp_broadcast, can_access_chatbots,
          can_access_crm, can_access_contacts, can_access_automation, can_access_agent_management,
          ...agentFields
        } = assignRow;
        agentRow = {
          ...agentFields,
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

      const perms = await fastify.db
        .selectFrom('Permissions')
        .select([
          'can_agent_access_all_chat',
          'agent_auto_assign_sendtemp',
          'agent_showtemp_username',
          'agent_auto_assign_broadcast',
          'agent_can_send_campaign',
          'agent_can_view_campaign',
          'agent_chat_only',
          'agent_can_view_templates',
        ])
        .where('username', '=', username)
        .executeTakeFirst();

      if (perms) agentPermissions = perms as unknown as Record<string, unknown>;
    }

    const [channels, credits, lastLogin] = await Promise.all([
      fastify.db.selectFrom('channels').selectAll().execute(),
      fastify.db
        .selectFrom('credits')
        .select([
          'whatsapp_marketing_credits',
          'whatsapp_utility_credits',
          'bulk_whatsapp_credits',
          'international_bulk_whatsapp_credits',
          'action_button_credits',
          'whatsapp_credits',
          'sms_credits',
          'voice_credits',
          'voice_pulse30_credits',
          'rcs_credits',
          'gsm_credits',
          'gsm_sim_credit',
          'email_credits',
        ])
        .where('username', '=', creditsUsername)
        .executeTakeFirst(),
      fastify.db
        .selectFrom('ci_admin')
        .select(['last_login', 'last_ip', 'last_login_device'])
        .where('username', '=', username)
        .executeTakeFirst(),
    ]);

    return {
      success: true,
      user: { id: userId, email, name, role, username },
      // voice_pulse30_credits is DECIMAL — mysql2 returns it as a string; coerce
      // so every field in the credits object is consistently a JS number.
      credits: credits ? { ...credits, voice_pulse30_credits: Number(credits.voice_pulse30_credits) } : null,
      last_login: lastLogin ?? null,
      agent: agentRow
        ? {
            ...agentRow,
            permissions: agentPermissions ?? {},
          }
        : null,
      channels,
    };
  }

  async loginHistory(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const logs = await fastify.db
      .selectFrom('ci_admin_logs')
      .select(['id', 'ip_address', 'device_type', 'browser', 'os', 'app_version', 'created_at'])
      .where('username', '=', username)
      .orderBy('created_at', 'desc')
      .limit(10)
      .execute();
    return { success: true, data: logs };
  }

  async forgotPassword(request: FastifyRequest<{ Body: { email: string } }>, fastify: FastifyInstance) {
    return sendForgotPasswordOtp(fastify, request.body.email);
  }

  async verifyOtp(request: FastifyRequest<{ Body: { email: string; otp: string } }>, fastify: FastifyInstance) {
    return verifyForgotPasswordOtp(fastify, request.body.email, request.body.otp);
  }

  async resetPassword(request: FastifyRequest<{ Body: { reset_token: string; new_password: string } }>, fastify: FastifyInstance) {
    return resetPassword(fastify, request.body.reset_token, request.body.new_password);
  }
}

export const authController = new AuthControllerImpl();

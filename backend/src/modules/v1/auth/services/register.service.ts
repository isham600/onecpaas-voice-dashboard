import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ValidationError, ConflictError } from '../../../../utils/errors.js';

const FIXED_MOBILE_NO = '919167528435';

export interface RegisterBody {
  firstname: string;
  lastname: string;
  email: string;
  username: string;
  password: string;
  password_confirmation: string;
  mobile_no_demo: string;
  domain?: string | null;
  country?: string | null;
}

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

export async function registerUser(fastify: FastifyInstance, body: RegisterBody): Promise<void> {
  const {
    firstname, lastname, email, username,
    password, password_confirmation,
    mobile_no_demo, domain, country,
  } = body;

  const pwError = validatePasswordStrength(password);
  if (pwError) throw new ValidationError(pwError);
  if (password !== password_confirmation) throw new ValidationError('Passwords do not match');

  // All uniqueness checks in parallel — signup is open to everyone; a
  // reseller domain, if it happens to match one, still links the new client
  // under that reseller, but an unmatched/unknown domain no longer blocks
  // signup.
  const [emailExists, usernameInAdmin, usernameInAssign, mobileInNo, mobileInDemo, reseller] =
    await Promise.all([
      fastify.db.selectFrom('ci_admin').select('admin_id')
        .where('email', '=', email).executeTakeFirst(),
      fastify.db.selectFrom('ci_admin').select('admin_id')
        .where('username', '=', username).executeTakeFirst(),
      fastify.db.selectFrom('assign_users').select('id')
        .where('assign_user', '=', username).executeTakeFirst(),
      fastify.db.selectFrom('ci_admin').select('admin_id')
        .where('mobile_no', '=', mobile_no_demo).executeTakeFirst(),
      fastify.db.selectFrom('ci_admin').select('admin_id')
        .where('mobile_no_demo', '=', mobile_no_demo).executeTakeFirst(),
      domain
        ? fastify.db.selectFrom('resellers').select(['id', 'username'])
            .where('domain', '=', domain).executeTakeFirst()
        : Promise.resolve(null),
    ]);

  if (emailExists) throw new ConflictError('Email already registered');
  if (usernameInAdmin || usernameInAssign) throw new ConflictError('Username already taken');
  if (mobileInNo || mobileInDemo) throw new ConflictError('Mobile number already registered');

  const hashedPassword = await bcrypt.hash(password, 10);
  const authkey  = crypto.randomBytes(10).toString('hex');
  const authkey1 = crypto.randomBytes(10).toString('hex');

  await fastify.db.transaction().execute(async (trx) => {
    // 1. Main user record
    await trx.insertInto('ci_admin').values({
      admin_role_id:            2,
      username,
      firstname,
      lastname,
      email,
      password:                 hashedPassword,
      mobile_no:                FIXED_MOBILE_NO,
      mobile_no_demo,
      country:                  country ?? null,
      usertype:                 'client',
      whatsapp:                 '0',
      whatsapp_credits:         '0',
      sms:                      '0',
      sms_credits:              null,
      voice_credits:            '0',
      email_credits:            null,
      api_credits:              null,
      gsm_credits:              '0',
      whatsapp_virtual_credits: '0',
      sms_virtual_credits:      null,
      overseas_credits:         '0',
      misscall:                 null,
      misscall_credits:         null,
      voice:                    '0',
      email_bulk:               '0',
      api_whatsapp:             null,
      gsm:                      '0',
      whatsapp_virtual:         '0',
      sms_virtual:              null,
      overseas_sms:             '0',
      chat:                     null,
      msgtype:                  null,
      senderid:                 null,
      dummy_credits:            null,
      txt_balance:              null,
      route:                    null,
      status:                   null,
      Reseller:                 null,
      MasterReseller:           null,
      delivery_type:            'I',
      ndncstatus:               null,
      dummy_credits_api:        null,
      api_user:                 null,
      api_status:               '0',
      api_base_url:             process.env.BASE_URL ?? 'https://wa.goshort.in/',
      expiry:                   null,
      authkey,
      authkey1,
      is_verify:                0,
      is_admin:                 0,
      is_active:                0,
      is_super:                 0,
      token:                    null,
      password_reset_code:      null,
      last_ip:                  null,
      serss:                    0,
      is_notify_visible:        0,
      otp:                      null,
      remember_token:           null,
    }).execute();

    // 2. Supporting records — all in parallel
    const inserts: Promise<unknown>[] = [
      trx.insertInto('assign_users').values({
        first_name:  firstname,
        last_name:   lastname,
        username,
        assign_user: username,
        agent_email: email,
        agent_mobile: mobile_no_demo,
        tags:         null,
        last_login_IP: null,
      }).execute(),

      trx.insertInto('teams').values({
        username,
        team:    'default team',
        default: 'yes',
      }).execute(),

      trx.insertInto('credits').values({
        username,
        whatsapp_marketing_credits: 10,
        whatsapp_utility_credits:   10,
        voice_credits:              10,
      }).execute(),

      trx.insertInto('Permissions').values({
        username,
        can_access_report:            1,
        email_credits:                1,
        broadcast_masterreseller:     1,
        broadcast_masterreseller_csv: 1,
        broadcast_readstatus:         1,
        sms_credits:                  0,
        voice_credits:                1,
        whatsapp_credits:             0,
        rcs_credits:                  0,
        gsm_credits:                  0,
        Credit_SIM_line:              0,
        Credit_SIM_GSM:               0,
        ai_videos_credits:            0,
        numbers_credits:              0,
        manage_clients:               1,
        invoice:                      1,
        support:                      1,
        telegram:                     0,
        instagram:                    0,
        your_integration:             1,
        reseller_setting:             1,
      }).execute(),
    ];

    // 3. Reseller client row (conditional)
    if (domain && reseller?.username) {
      inserts.push(
        trx.insertInto('clients').values({
          username:         reseller.username,
          first_name:       firstname,
          last_name:        lastname,
          client_username:  username,
          client_mobile_no: mobile_no_demo,
          client_email:     email,
          country:          country ?? null,
          user_type:        'reseller',
        }).execute(),
      );
    }

    await Promise.all(inserts);
  });
}

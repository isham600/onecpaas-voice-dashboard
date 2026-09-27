import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { randomBytes } from 'node:crypto';
import { sql } from 'kysely';

const SMTP_USERNAME   = 'adminindew';
const OTP_EXPIRY_MIN  = 10;
const RESET_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// ── SMTP ──────────────────────────────────────────────────────────────────────

async function getSmtpTransport(fastify: FastifyInstance) {
  const account = await fastify.db
    .selectFrom('mail_smtp_accounts')
    .select(['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'from_name', 'from_email', 'encryption'])
    .where('username', '=', SMTP_USERNAME)
    .where('status', '=', 'active')
    .executeTakeFirst();

  if (!account) throw new Error('No active SMTP account configured');

  return {
    transport: nodemailer.createTransport({
      host:   account.smtp_host,
      port:   account.smtp_port,
      secure: account.encryption === 'ssl',
      auth:   { user: account.smtp_user, pass: account.smtp_password },
      tls:    account.encryption === 'tls' ? { rejectUnauthorized: false } : undefined,
    }),
    from: `"${account.from_name}" <${account.from_email}>`,
  };
}

// ── Email template ────────────────────────────────────────────────────────────

function buildOtpEmail(otp: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset OTP</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Password Reset</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Innuvis CRM</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                We received a request to reset your password. Use the OTP below to proceed.
              </p>

              <!-- OTP Box -->
              <div style="background:#f0f0ff;border:2px dashed #6366f1;border-radius:10px;padding:28px 20px;text-align:center;margin:24px 0;">
                <p style="margin:0 0 6px;color:#6366f1;font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Your OTP Code</p>
                <p style="margin:0;color:#1e1b4b;font-size:42px;font-weight:800;letter-spacing:14px;">${otp}</p>
              </div>

              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">
                ⏱ This code expires in <strong>${OTP_EXPIRY_MIN} minutes</strong>.
              </p>
              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                🔒 If you did not request a password reset, please ignore this email. Your account remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                &copy; ${new Date().getFullYear()} Innuvis CRM. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

// ── Step 1: Send OTP ──────────────────────────────────────────────────────────

export async function sendForgotPasswordOtp(
  fastify: FastifyInstance,
  email: string,
): Promise<{ success: boolean; message: string }> {
  const user = await fastify.db
    .selectFrom('ci_admin')
    .select(['admin_id', 'email', 'firstname'])
    .where('email', '=', email)
    .executeTakeFirst();

  // Always return the same response — don't reveal if email exists
  const genericResponse = { success: true, message: 'If that email is registered, an OTP has been sent.' };

  if (!user) return genericResponse;

  const otp = String(Math.floor(100000 + Math.random() * 900000));

  await fastify.db
    .updateTable('ci_admin')
    .set({ otp, otp_created_at: sql`NOW()` })
    .where('admin_id', '=', user.admin_id)
    .execute();

  try {
    const { transport, from } = await getSmtpTransport(fastify);
    await transport.sendMail({
      from,
      to:      email,
      subject: 'Password Reset OTP — Innuvis CRM',
      html:    buildOtpEmail(otp),
    });
  } catch (err: any) {
    fastify.log.error(`[forgot-password] Email send failed for ${email}: ${err.message}`);
    // Roll back OTP so user isn't stuck
    await fastify.db
      .updateTable('ci_admin')
      .set({ otp: null, otp_created_at: null })
      .where('admin_id', '=', user.admin_id)
      .execute();
    throw fastify.httpErrors.internalServerError('Failed to send OTP email. Please try again.');
  }

  fastify.log.info(`[forgot-password] OTP sent to ${email}`);
  return genericResponse;
}

// ── Step 2: Verify OTP → return reset token ───────────────────────────────────

export async function verifyForgotPasswordOtp(
  fastify: FastifyInstance,
  email: string,
  otp: string,
): Promise<{ success: boolean; reset_token: string }> {
  const user = await fastify.db
    .selectFrom('ci_admin')
    .select(['admin_id', 'otp', 'otp_created_at'])
    .where('email', '=', email)
    .executeTakeFirst();

  if (!user || !user.otp || !user.otp_created_at) {
    throw fastify.httpErrors.badRequest('Invalid or expired OTP.');
  }

  if (user.otp !== otp) {
    throw fastify.httpErrors.badRequest('Invalid OTP.');
  }

  const otpAge = Date.now() - new Date(user.otp_created_at).getTime();
  if (otpAge > OTP_EXPIRY_MIN * 60 * 1000) {
    throw fastify.httpErrors.badRequest('OTP has expired. Please request a new one.');
  }

  // Generate a signed reset token — encodes expiry so no extra column needed
  const resetToken = randomBytes(32).toString('hex');
  const expiresAt  = new Date(Date.now() + RESET_EXPIRY_MS)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  // Store token + expiry (encoded as "<token>|<expiresAt>") in password_reset_code
  await fastify.db
    .updateTable('ci_admin')
    .set({
      otp:                 null,
      otp_created_at:      null,
      password_reset_code: `${resetToken}|${expiresAt}`,
    })
    .where('admin_id', '=', user.admin_id)
    .execute();

  fastify.log.info(`[forgot-password] OTP verified for ${email}`);
  return { success: true, reset_token: resetToken };
}

// ── Step 3: Reset password ────────────────────────────────────────────────────

export async function resetPassword(
  fastify: FastifyInstance,
  resetToken: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  // Find user by reset token (stored as "<token>|<expiresAt>")
  const users = await fastify.db
    .selectFrom('ci_admin')
    .select(['admin_id', 'password_reset_code'])
    .where('password_reset_code', 'like', `${resetToken}|%`)
    .execute();

  if (!users.length || !users[0].password_reset_code) {
    throw fastify.httpErrors.badRequest('Invalid or expired reset token.');
  }

  const user      = users[0];
  const resetCode = user.password_reset_code!;
  const parts     = resetCode.split('|');
  const expiresAt = new Date(parts[1]);

  if (Date.now() > expiresAt.getTime()) {
    await fastify.db
      .updateTable('ci_admin')
      .set({ password_reset_code: null })
      .where('admin_id', '=', user.admin_id)
      .execute();
    throw fastify.httpErrors.badRequest('Reset token has expired. Please start over.');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await fastify.db
    .updateTable('ci_admin')
    .set({
      password:            hashedPassword,
      password_reset_code: null,
      token_version:       sql`token_version + 1`,
    })
    .where('admin_id', '=', user.admin_id)
    .execute();

  fastify.log.info(`[forgot-password] Password reset for admin_id=${user.admin_id}`);
  return { success: true, message: 'Password reset successfully. Please log in with your new password.' };
}

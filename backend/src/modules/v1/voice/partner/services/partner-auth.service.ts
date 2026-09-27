import type { FastifyInstance, FastifyRequest } from 'fastify';
import { verifyLegacyApiToken } from '../../../../../utils/legacyApiToken.js';
import { UnauthorizedError } from '../../../../../utils/errors.js';

// ── Partner API authentication ───────────────────────────────────────────────
// Every voice/partner route is called directly by an external client (the
// end-customer's own client, per the client's request), using the "partner
// API token" generated via POST /api/v1/profile/api-token (dashboard: API
// Configuration -> Generate Token). This is deliberately NOT the app's own
// login JWT (@fastify/jwt / fastify.authenticate) — a completely separate
// trust boundary meant to be handed to a third party.
//
// Two checks, not just signature verification: the token must (1) carry a
// valid HMAC signature, and (2) still match ci_admin.token for that
// username — regenerating the token from the dashboard immediately
// invalidates the old one, since only the latest value is ever stored.
export async function authenticatePartnerRequest(
  fastify: FastifyInstance,
  request: FastifyRequest,
): Promise<string> {
  const header = String(request.headers.authorization ?? '').trim();
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new UnauthorizedError('Missing Authorization: Bearer <token>');

  const secret = process.env.LEGACY_API_JWT_SECRET ?? '123456';
  const decoded = verifyLegacyApiToken(token, secret);
  if (!decoded) throw new UnauthorizedError('Invalid API token');

  const admin = await fastify.db
    .selectFrom('ci_admin')
    .select(['username', 'token'])
    .where('username', '=', decoded.username)
    .executeTakeFirst();

  if (!admin || !admin.token || admin.token !== token) {
    throw new UnauthorizedError('Invalid or revoked API token — generate a new one from the dashboard');
  }

  return admin.username;
}

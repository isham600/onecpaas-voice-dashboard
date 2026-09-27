import { createHmac, timingSafeEqual } from 'node:crypto';

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Byte-for-byte port of a legacy PHP endpoint: HS256 JWT signed with a
// shared secret, used for third-party/partner API access. Structurally
// unrelated to this app's own @fastify/jwt login tokens.
export function buildLegacyApiToken(username: string, secret: string): string {
  const header  = { typ: 'JWT', alg: 'HS256' };
  const payload = { iat: Math.floor(Date.now() / 1000), ver: 2, data: { username, name: username } };

  const headerB64  = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature  = createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest();

  return `${headerB64}.${payloadB64}.${base64url(signature)}`;
}

// Verifies a token built by buildLegacyApiToken — constant-time signature
// check, then decodes `data.username`. Used to authenticate the public
// partner API (voice/partner module), which external clients call directly
// with the token generated via POST /profile/api-token — a different trust
// boundary from this app's own login JWT, so it gets its own verifier
// rather than reusing @fastify/jwt.
export function verifyLegacyApiToken(token: string, secret: string): { username: string } | null {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  const expectedSig = base64url(createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest());
  const a = Buffer.from(signatureB64);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  try {
    const payloadJson = Buffer.from(
      payloadB64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (payloadB64.length % 4)) % 4),
      'base64',
    ).toString('utf8');
    const payload = JSON.parse(payloadJson);
    const username = payload?.data?.username;
    return typeof username === 'string' && username ? { username } : null;
  } catch {
    return null;
  }
}

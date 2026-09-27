import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

function key(): Buffer {
  const hex = process.env.ENCRYPTION_KEY ?? '';
  if (hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: openssl rand -hex 32');
  }
  return Buffer.from(hex, 'hex');
}

// Stored format: <iv_hex>:<auth_tag_hex>:<ciphertext_hex>
export function encrypt(plain: string): string {
  const iv     = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const data   = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${data.toString('hex')}`;
}

export function decrypt(stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 3) return stored; // not encrypted, return as-is
  const [ivHex, tagHex, dataHex] = parts;
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

// Returns true if the string looks like an encrypted value (iv:tag:data)
export function isEncrypted(value: string): boolean {
  const parts = value.split(':');
  return parts.length === 3 && parts.every(p => /^[0-9a-f]+$/i.test(p));
}

// Deterministic HMAC-SHA256 — same input always produces the same output, so
// it can be indexed and exact-matched in SQL (`WHERE x_hash = ?`), unlike
// encrypt() above whose output differs every call. Used as a "blind index"
// for encrypted PII columns (e.g. customer_phone) that still need lookups.
// Keyed with ENCRYPTION_KEY so it can't be reversed via a phone-number
// rainbow table the way plain SHA-256 could.
export function hmacIndex(value: string): string {
  return createHmac('sha256', key()).update(value).digest('hex');
}

#!/usr/bin/env node
/**
 * repair-carousel-media-ids.js
 *
 * One-shot script: re-uploads carousel images for link_no rows where
 * media_id is NULL or empty, then saves the Meta media IDs back to link_no.
 *
 * Usage (run inside deploy/ on the server):
 *   node scripts/repair-carousel-media-ids.js <link_no_id> [<link_no_id2> ...]
 *
 * Example:
 *   node scripts/repair-carousel-media-ids.js 42 43
 *
 * Requires: .env in cwd (same as the app), or env vars already set.
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';
import FormData from 'form-data';
import { readFile } from 'node:fs/promises';
import { createDecipheriv } from 'node:crypto';

// ── Args ────────────────────────────────────────────────────────────────────

const linkNoIds = process.argv.slice(2).map(Number).filter(Boolean);
if (!linkNoIds.length) {
  console.error('Usage: node scripts/repair-carousel-media-ids.js <link_no_id> [...]');
  process.exit(1);
}

// ── Decrypt (matches src/utils/crypto.ts) ───────────────────────────────────

function decrypt(stored) {
  const parts = stored.split(':');
  if (parts.length !== 3) return stored; // not encrypted, return as-is
  const [ivHex, tagHex, dataHex] = parts;
  const k        = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', k, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

// ── Upload one image ─────────────────────────────────────────────────────────

// Convert absolute server path → public URL using BASE_URL from env
// e.g. /var/www/.../deploy/uploads/2026/... → {BASE_URL}/uploads/2026/...
function filePathToPublicUrl(absPath) {
  const marker  = '/uploads/';
  const idx     = absPath.indexOf(marker);
  if (idx === -1) return null;
  const base    = (process.env.BASE_URL ?? '').replace(/\/$/, '');
  return `${base}${absPath.slice(idx)}`;
}

async function uploadImage(filePath, baseUrl, apiKey, isPinbot) {
  const base        = baseUrl.replace(/\/$/, '');
  const isPinbotUrl = isPinbot || base.includes('pinbot.ai');
  const isMeta      = base.includes('graph.facebook.com');

  // ── Pinbot: send public URL in JSON body (does not accept binary upload) ──
  if (isPinbotUrl) {
    const uploadUrl = `${base}/media`;
    const publicUrl = filePathToPublicUrl(filePath);
    if (!publicUrl) { console.warn(`  ⚠️  Cannot derive public URL for ${filePath}`); return null; }

    // Pinbot accepts { link: url } in carousel send — no upload needed.
    // Return the public URL directly; the engine detects http and uses link: param.
    console.log(`  🌐 Pinbot: using public URL directly (no upload): ${publicUrl}`);
    return publicUrl;
  }

  // ── Meta / WATI: binary multipart upload ──────────────────────────────────
  const buffer   = await readFile(filePath);
  const filename = filePath.split('/').pop() ?? 'image.jpg';
  const form     = new FormData();
  const uploadUrl = isMeta ? `${base}/media` : `${base}/api/v1/uploadMedia`;

  form.append('file', buffer, { filename, contentType: 'image/jpeg' });
  form.append('messaging_product', 'whatsapp');

  const res = await fetch(uploadUrl, {
    method:  'POST',
    headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
    body:    form,
  });

  if (!res.ok) {
    console.warn(`  ⚠️  Upload failed ${res.status} for ${filename} → ${uploadUrl}`);
    return null;
  }

  const json = await res.json();
  console.log(`  🔍 Upload response (${res.status}):`, JSON.stringify(json));
  return json?.id ?? null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const db = await mysql.createConnection({
  host:     process.env.MYSQL_HOST     ?? 'localhost',
  port:     Number(process.env.MYSQL_PORT ?? 3306),
  user:     process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

for (const linkNoId of linkNoIds) {
  console.log(`\n── Processing link_no id=${linkNoId} ─────────────────────`);

  const [rows] = await db.query(
    'SELECT id, username, carousels, media_id FROM link_no WHERE id = ?',
    [linkNoId],
  );

  if (!rows.length) {
    console.warn(`  ❌ link_no id=${linkNoId} not found`);
    continue;
  }

  const row = rows[0];

  if (row.media_id && row.media_id !== '[]' && row.media_id !== 'null') {
    console.log(`  ✅ Already has media_id, skipping: ${row.media_id}`);
    continue;
  }

  let carousels;
  try {
    carousels = JSON.parse(row.carousels ?? '[]');
  } catch {
    console.warn(`  ❌ carousels JSON invalid`);
    continue;
  }

  // Pull wati credentials for this username
  const [watiRows] = await db.query(
    'SELECT url, api_key, account_type FROM wati WHERE username = ? LIMIT 1',
    [row.username],
  );

  if (!watiRows.length) {
    console.warn(`  ❌ No wati record found for username=${row.username}`);
    continue;
  }

  const wati      = watiRows[0];
  const baseUrl   = decrypt(wati.url);
  const apiKey    = decrypt(wati.api_key);
  const isPinbot  = wati.account_type === 'pinbot' || baseUrl.includes('pinbot.ai');

  const updatedCarousels = [...carousels];
  const mediaIds         = [];

  // Find carousel path entries (carousel1, carousel2, ...) and upload each
  for (const entry of carousels) {
    const key = Object.keys(entry).find(k => /^carousel\d+$/.test(k));
    if (!key) continue;

    const idx      = key.replace('carousel', '');
    const filePath = entry[key];

    console.log(`  📤 Uploading ${key}: ${filePath}`);
    const mediaId = await uploadImage(filePath, baseUrl, apiKey, isPinbot);

    if (mediaId) {
      updatedCarousels.push({ [`carousel${idx}_media_id`]: mediaId });
      mediaIds.push(mediaId);
      console.log(`  ✅ Got media_id: ${mediaId}`);
    } else {
      console.warn(`  ❌ Upload returned null for ${key}`);
    }
  }

  if (!mediaIds.length) {
    console.warn(`  ❌ No media IDs obtained — link_no not updated`);
    continue;
  }

  await db.query(
    'UPDATE link_no SET carousels = ?, media_id = ? WHERE id = ?',
    [JSON.stringify(updatedCarousels), JSON.stringify(mediaIds), linkNoId],
  );

  console.log(`  💾 Saved ${mediaIds.length} media IDs to link_no id=${linkNoId}`);
  console.log(`     media_id: ${JSON.stringify(mediaIds)}`);
}

await db.end();
console.log('\n✅ Done');

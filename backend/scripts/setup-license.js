#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Interactive license setup — asks for client details, generates license.json
// and saves it directly into deploy/
//
// Usage:  node scripts/setup-license.js
//         pnpm run license:setup
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const PRIVATE_KEY_PATH = path.join(ROOT, 'license-tools', 'private.pem');
const LICENSE_TOOLS = path.join(ROOT, 'license-tools');

// ── Helpers ──────────────────────────────────────────────────────────────────

function getLocalFingerprint() {
  const hostname = os.hostname();
  const cpuModel = os.cpus()[0]?.model ?? 'unknown';
  const macs = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && !i.internal && i.mac !== '00:00:00:00:00:00')
    .map((i) => i.mac)
    .sort()
    .join(',');
  const raw = `${hostname}|${cpuModel}|${macs}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function signFingerprint(fingerprint) {
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error('\n  ✖  private.pem not found at license-tools/private.pem');
    console.error('     Place your private key there and try again.\n');
    process.exit(1);
  }
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf-8');
  const sign = crypto.createSign('SHA256');
  sign.update(fingerprint);
  sign.end();
  return sign.sign(privateKey, 'base64');
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('\n════════════════════════════════════════════════════');
console.log('  WhatsApp CRM — License Setup');
console.log('════════════════════════════════════════════════════\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// 1. Client name
const clientName = (await ask(rl, '  Client name        : ')).trim();
if (!clientName) {
  console.error('\n  ✖  Client name is required.\n');
  rl.close();
  process.exit(1);
}

// 2. Fingerprint — default to this machine or let user paste one
const localFp = getLocalFingerprint();
console.log(`\n  This machine fingerprint:\n  ${localFp}`);
const fpInput = (await ask(rl, '\n  Server fingerprint  : (press Enter to use above) ')).trim();
const fingerprint = fpInput || localFp;

rl.close();

// 3. Sign
console.log('\n  ▶  Generating license...');
const signature = signFingerprint(fingerprint);
const issuedAt = new Date().toISOString().split('T')[0];

const license = { client: clientName, fingerprint, issuedAt, signature };
const licenseJson = JSON.stringify(license, null, 2);

// 4. Save to deploy/license.json
if (!fs.existsSync(DEPLOY)) {
  console.error('\n  ✖  deploy/ folder not found. Run  pnpm run deploy:build  first.\n');
  process.exit(1);
}
fs.writeFileSync(path.join(DEPLOY, 'license.json'), licenseJson);
console.log('     ✔  deploy/license.json written');

// 5. Save a backup in license-tools/
fs.mkdirSync(LICENSE_TOOLS, { recursive: true });
const slug = clientName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
const backupPath = path.join(LICENSE_TOOLS, `license-${slug}.json`);
fs.writeFileSync(backupPath, licenseJson);
console.log(`     ✔  Backup saved → license-tools/license-${slug}.json`);

// 6. Summary
console.log('\n════════════════════════════════════════════════════');
console.log('  License generated successfully');
console.log('════════════════════════════════════════════════════');
console.log(`  Client    : ${clientName}`);
console.log(`  Issued    : ${issuedAt}`);
console.log(`  Fingerprint (first 16): ${fingerprint.slice(0, 16)}...`);
console.log('\n  Next steps:');
console.log('  1. cp .env deploy/.env');
console.log('  2. cd deploy');
console.log('  3. pm2 start ecosystem.config.cjs');
console.log('  4. pm2 logs\n');

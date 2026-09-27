#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Run this script ON THE CLIENT'S SERVER to get their server fingerprint.
// Usage:  node scripts/get-fingerprint.js
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';
import os from 'os';

// Must match src/utils/license.ts's getServerFingerprint() exactly, or a
// fingerprint copied from here won't match what the running server
// actually validates against at startup.
const VIRTUAL_IFACE_RE = /^(docker|veth|br-|virbr|tun|tap|wg|vmnet)/i;

const hostname = os.hostname();
const cpuModel = os.cpus()[0]?.model ?? 'unknown';
const macs = Object.entries(os.networkInterfaces())
  .filter(([name]) => !VIRTUAL_IFACE_RE.test(name))
  .flatMap(([, ifaces]) => ifaces ?? [])
  .filter((iface) => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00')
  .map((iface) => iface.mac)
  .sort()
  .join(',');

const raw = `${hostname}|${cpuModel}|${macs}`;
const fingerprint = crypto.createHash('sha256').update(raw).digest('hex');

console.log('\n─────────────────────────────────────────────────────');
console.log('  Server Fingerprint');
console.log('─────────────────────────────────────────────────────');
console.log(`  Hostname  : ${hostname}`);
console.log(`  CPU       : ${cpuModel}`);
console.log(`  MACs      : ${macs}`);
console.log('─────────────────────────────────────────────────────');
console.log(`  FINGERPRINT: ${fingerprint}`);
console.log('─────────────────────────────────────────────────────');
console.log('\n  Copy the FINGERPRINT line above and pass it to');
console.log('  generate-license.js on your machine.\n');

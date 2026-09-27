import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

// ─── Embedded public key (private key never leaves the developer's machine) ───
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEfi9S1KL/ilXqZT3tYGwTHaYdKcrn
AP7U/DITrXfo08iR59r22eQ+ujpo5YzhxPwLfYf/MrGsz6cXHOiAQl/YkA==
-----END PUBLIC KEY-----`;

interface LicenseFile {
  client: string;
  fingerprint: string;
  issuedAt: string;
  signature: string;
}

// Virtual/container-created interfaces (Docker bridges, veth pairs, VPN
// tunnels, libvirt bridges) come and go independently of the physical
// server this license is bound to — including them would mean installing
// or restarting something like Docker silently invalidates the license.
// Matched by name, since these are the conventional prefixes across
// Docker/Podman, OpenVPN/WireGuard, and libvirt/KVM.
const VIRTUAL_IFACE_RE = /^(docker|veth|br-|virbr|tun|tap|wg|vmnet)/i;

export function getServerFingerprint(): string {
  const hostname = os.hostname();
  const cpuModel = os.cpus()[0]?.model ?? 'unknown';
  const macs = Object.entries(os.networkInterfaces())
    .filter(([name]) => !VIRTUAL_IFACE_RE.test(name))
    .flatMap(([, ifaces]) => ifaces ?? [])
    .filter((iface) => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00')
    .map((iface) => iface!.mac)
    .sort()
    .join(',');

  const raw = `${hostname}|${cpuModel}|${macs}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function verifySignature(fingerprint: string, signature: string): boolean {
  const verify = crypto.createVerify('SHA256');
  verify.update(fingerprint);
  verify.end();
  return verify.verify(PUBLIC_KEY, signature, 'base64');
}

export function validateLicense(): void {
  const licensePath = path.resolve(process.cwd(), 'license.json');

  if (!fs.existsSync(licensePath)) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════╗');
    console.error('║            LICENSE VALIDATION FAILED             ║');
    console.error('╠══════════════════════════════════════════════════╣');
    console.error('║  license.json not found in the project root.    ║');
    console.error('║  Contact your software provider to obtain a      ║');
    console.error('║  valid license for this server.                  ║');
    console.error('╚══════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }

  let license: LicenseFile;
  try {
    license = JSON.parse(fs.readFileSync(licensePath, 'utf-8'));
  } catch {
    console.error('');
    console.error('╔══════════════════════════════════════════════════╗');
    console.error('║            LICENSE VALIDATION FAILED             ║');
    console.error('╠══════════════════════════════════════════════════╣');
    console.error('║  license.json is corrupted or not valid JSON.    ║');
    console.error('║  Contact your software provider to obtain a      ║');
    console.error('║  valid license for this server.                  ║');
    console.error('╚══════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }

  const currentFingerprint = getServerFingerprint();

  if (license.fingerprint !== currentFingerprint) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════╗');
    console.error('║            LICENSE VALIDATION FAILED             ║');
    console.error('╠══════════════════════════════════════════════════╣');
    console.error('║  This license is not valid for this server.      ║');
    console.error('║  The software is licensed to run on a specific   ║');
    console.error('║  server only and cannot be transferred.          ║');
    console.error('║  Contact your software provider for assistance.  ║');
    console.error('╚══════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }

  const signatureValid = verifySignature(license.fingerprint, license.signature);

  if (!signatureValid) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════╗');
    console.error('║            LICENSE VALIDATION FAILED             ║');
    console.error('╠══════════════════════════════════════════════════╣');
    console.error('║  License signature is invalid or has been        ║');
    console.error('║  tampered with.                                  ║');
    console.error('║  Contact your software provider for assistance.  ║');
    console.error('╚══════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }

  console.log(`[license] ✔ License valid — Client: ${license.client} | Issued: ${license.issuedAt}`);
}

import * as dotenv from 'dotenv';
dotenv.config();

import os from 'os';
import { buildApp } from './app.js';
import { validateLicense } from './utils/license.js';

// ──────────────────────────────────────────────────────
// Get local IP address
// ──────────────────────────────────────────────────────
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '0.0.0.0';
};

// ──────────────────────────────────────────────────────
// Start Server
// ──────────────────────────────────────────────────────
const start = async () => {
  try {
    validateLicense();

    const app = await buildApp();

    const PORT = Number(process.env.PORT) || 3040;
    const IP = getLocalIP();

    await app.listen({ port: PORT, host: '0.0.0.0' });

    console.log('🚀 WhatsApp CRM Backend Server');
    console.log('═══════════════════════════════════════════════');
    console.log(`➡ Local:       http://localhost:${PORT}`);
    console.log(`➡ Network:     http://${IP}:${PORT}`);
    console.log(`➡ Health:      http://localhost:${PORT}/health`);
    console.log(`➡ API:         http://localhost:${PORT}/api`);
    console.log('═══════════════════════════════════════════════');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
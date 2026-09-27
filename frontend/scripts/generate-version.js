#!/usr/bin/env node
/**
 * Generate version.json after vite build
 * Called by: npm run build (via package.json postbuild)
 * Output: dist/version.json with { buildTime, hash }
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist');
const versionFile = path.join(distDir, 'version.json');

// Generate a simple hash from current timestamp
const buildTime = new Date().toISOString();
const hash = crypto.createHash('md5').update(buildTime).digest('hex').slice(0, 8);

const version = {
  buildTime,
  hash,
  timestamp: Math.floor(Date.now() / 1000),
};

try {
  fs.writeFileSync(versionFile, JSON.stringify(version, null, 2));
  console.log(`✓ Generated version.json: ${hash} at ${buildTime}`);
} catch (error) {
  console.error('✗ Failed to generate version.json:', error.message);
  process.exit(1);
}

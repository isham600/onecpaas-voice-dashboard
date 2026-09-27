#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Build script — produces a deploy/ folder with V8 bytecode (.jsc) files.
// The client receives deploy/ only — no TypeScript, no readable JS source.
//
// Usage:  node scripts/build-deploy.js
// Output: deploy/
// ─────────────────────────────────────────────────────────────────────────────

import { build } from 'esbuild';
import bytenode from 'bytenode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TEMP = path.join(ROOT, '.build-temp');
const DEPLOY = path.join(ROOT, 'deploy');

// ── Helpers ──────────────────────────────────────────────────────────────────

function step(msg) {
  console.log(`\n  ▶  ${msg}`);
}

function ok(msg) {
  console.log(`     ✔  ${msg}`);
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
  fs.mkdirSync(dir, { recursive: true });
}

// Remove only the generated artifacts inside deploy/ — never touches uploads/, .env, node_modules/, license.json
// ecosystem.config.cjs is intentionally excluded — edit deploy/ecosystem.config.cjs
// directly and it will be preserved across every build.
const DEPLOY_GENERATED = [
  'server.js', 'server.jsc',
  'worker.js', 'worker.jsc',
  'package.json',
  '.env.example', '.gitignore',
  'logs', 'scripts',
];

function cleanDeployArtifacts(deployDir) {
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
    return;
  }
  for (const name of DEPLOY_GENERATED) {
    const p = path.join(deployDir, name);
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true });
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('\n════════════════════════════════════════════════════');
console.log('  WhatsApp CRM — Deploy Build');
console.log('════════════════════════════════════════════════════');

// 1. Clean output directories
step('Cleaning previous build...');
cleanDir(TEMP);
cleanDeployArtifacts(DEPLOY);
ok('Clean done (uploads/, .env, node_modules/, license.json preserved)');

// 2. Bundle TypeScript → CJS with esbuild (external: all node_modules)
step('Bundling source with esbuild...');

await build({
  entryPoints: [
    path.join(ROOT, 'src/server.ts'),
    path.join(ROOT, 'src/worker.ts'),
  ],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  packages: 'external',        // keep node_modules external (installed on server)
  outdir: TEMP,
  minify: false,               // bytenode handles obfuscation — minify adds no value
  sourcemap: false,
  treeShaking: true,
});

ok('server.js bundled');
ok('worker.js bundled');

// 3. Compile each bundle to V8 bytecode with bytenode
step('Compiling to V8 bytecode with bytenode...');

await bytenode.compileFile({
  filename: path.join(TEMP, 'server.js'),
  output: path.join(DEPLOY, 'server.jsc'),
  electron: false,
});
ok('server.jsc compiled');

await bytenode.compileFile({
  filename: path.join(TEMP, 'worker.js'),
  output: path.join(DEPLOY, 'worker.jsc'),
  electron: false,
});
ok('worker.jsc compiled');

// 4. Write minimal loader files (these are the only readable JS — reveal nothing)
step('Writing loader files...');

fs.writeFileSync(
  path.join(DEPLOY, 'server.js'),
  `'use strict';\nrequire('bytenode');\nrequire('./server.jsc');\n`,
);
ok('server.js loader written');

fs.writeFileSync(
  path.join(DEPLOY, 'worker.js'),
  `'use strict';\nrequire('bytenode');\nrequire('./worker.jsc');\n`,
);
ok('worker.js loader written');

// 5. Write deploy package.json (CJS, only runtime deps)
step('Writing deploy package.json...');

const srcPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

const deployPkg = {
  name: srcPkg.name,
  version: srcPkg.version,
  description: srcPkg.description,
  main: 'server.js',
  // CJS — no "type": "module" so require() works in loaders
  scripts: {
    start: 'node server.js',
    'workers:start': 'pm2 start ecosystem.config.cjs',
    'workers:stop': 'pm2 stop ecosystem.config.cjs',
    'workers:restart': 'pm2 restart ecosystem.config.cjs',
    'workers:logs': 'pm2 logs',
    'workers:status': 'pm2 status',
    'license:fingerprint': 'node scripts/get-fingerprint.js',
  },
  dependencies: {
    ...srcPkg.dependencies,
  },
};

fs.writeFileSync(
  path.join(DEPLOY, 'package.json'),
  JSON.stringify(deployPkg, null, 2),
);
ok('package.json written');

// 6. ecosystem.config.cjs — preserved across builds. Edit deploy/ecosystem.config.cjs directly.
//    If missing (first build / deploy/ cleaned), write the default template.
step('Checking ecosystem.config.cjs...');
if (!fs.existsSync(path.join(DEPLOY, 'ecosystem.config.cjs'))) {
  console.warn('     ⚠  deploy/ecosystem.config.cjs not found — writing default template.');
  const defaultEcosystem = `module.exports = {
  apps: [
    {
      name: "codefirstsystem-32-wa-api",
      script: "server.js",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      stop_exit_codes: [1],
      max_restarts: 10,
      min_uptime: "5s",
      max_memory_restart: "500M",
      env: { NODE_ENV: "production", PORT: 3040 },
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    },
    {
      name: "codefirstsystem-32-wa-worker",
      script: "worker.js",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      stop_exit_codes: [1],
      max_restarts: 10,
      min_uptime: "5s",
      max_memory_restart: "400M",
      env: { NODE_ENV: "production" },
      error_file: "./logs/worker-error.log",
      out_file: "./logs/worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    },
    {
      name: "codefirstsystem-32-wa-camp-submit-worker",
      script: "worker.js",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      watch: false,
      autorestart: true,
      stop_exit_codes: [1],
      max_restarts: 10,
      min_uptime: "5s",
      max_memory_restart: "500M",
      env: { NODE_ENV: "production" },
      error_file: "./logs/camp-submit-error.log",
      out_file: "./logs/camp-submit-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    }
  ]
};\n`;
  fs.writeFileSync(path.join(DEPLOY, 'ecosystem.config.cjs'), defaultEcosystem);
}
ok('ecosystem.config.cjs ready (edit deploy/ecosystem.config.cjs to customise)');

// 7. Copy remaining support files
step('Copying support files...');

const filesToCopy = [
  ['.env.example', '.env.example'],
  ['.gitignore', '.gitignore'],
];

for (const [src, dest] of filesToCopy) {
  const srcPath = path.join(ROOT, src);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(DEPLOY, dest));
    ok(`${dest} copied`);
  }
}

// 8. Create logs directory so PM2 can write log files immediately
fs.mkdirSync(path.join(DEPLOY, 'logs'), { recursive: true });
ok('logs/ directory created');

// 9. Copy the fingerprint script (needed on client server)
fs.mkdirSync(path.join(DEPLOY, 'scripts'), { recursive: true });
fs.copyFileSync(
  path.join(ROOT, 'scripts/get-fingerprint.js'),
  path.join(DEPLOY, 'scripts/get-fingerprint.js'),
);
ok('scripts/get-fingerprint.js copied');

// 10. Clean temp
step('Cleaning temp files...');
fs.rmSync(TEMP, { recursive: true });
ok('Temp cleaned');

// Done
console.log('\n════════════════════════════════════════════════════');
console.log('  Build complete →  deploy/');
console.log('════════════════════════════════════════════════════');
console.log('');
console.log('  deploy/');
console.log('  ├── server.jsc');
console.log('  ├── worker.jsc');
console.log('  ├── server.js                (loader)');
console.log('  ├── worker.js                (loader)');
console.log('  ├── package.json');
console.log('  ├── ecosystem.config.cjs');
console.log('  ├── .env.example');
console.log('  └── scripts/');
console.log('      └── get-fingerprint.js');
console.log('');
console.log('  Next steps:');
console.log('  1. Run: node scripts/get-fingerprint.js  (on the deployment server)');
console.log('  2. Send that fingerprint to get a signed license.json issued');
console.log('  3. Place license.json in deploy/ root on the deployment server');
console.log('  4. cd deploy && pnpm install && pm2 start ecosystem.config.cjs');
console.log('');

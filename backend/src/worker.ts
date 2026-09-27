// ============================================================
// Standalone Worker Process Bootstrap
// ============================================================
// This file runs independently from the API server.
// Jobs are persisted in Redis so work is not lost on restart.
// Started by PM2 (see ecosystem.config.cjs).

import * as dotenv from 'dotenv';
dotenv.config();

import { redisConnection } from './queues/index.js';
import { startExportWorker }             from './workers/export.worker.js';
import { startVoiceCompletionCheckerWorker } from './workers/voice-completion-checker.worker.js';
import { startVoiceRefundCheckerWorker }     from './workers/voice-refund-checker.worker.js';
import { startVoiceDispatchWorker }          from './workers/voice-dispatch.worker.js';
import { startVoiceDispatchBatchWorker }     from './workers/voice-dispatch-batch.worker.js';
import { startCallFallbackNotifyWorker }     from './workers/call-fallback-notify.worker.js';

console.log('[worker] Starting Voice CRM Worker...');

// ──────────────────────────────────────────────────────
// Boot — async so we can await startExportWorker
// ──────────────────────────────────────────────────────
async function boot() {
  // codefirstsystem-32-whatsapp-crm-worker and -camp-submit-worker both run
  // this exact same worker.js file (two processes for BullMQ concurrency),
  // so anything here that isn't itself queue-based or Redis-lock-protected
  // runs TWICE, forever, in parallel. The refund-checker workers below all
  // already guard against this with a Redis NX lock. This one didn't — its
  // raw setInterval scan collided with itself across processes and produced
  // a live "Lock wait timeout" on delivery33/mob_no33 (see git history).
  // RUN_SINGLETON_WORKERS is set on exactly one of the two PM2 processes.
  const voiceCompletionChecker = process.env.RUN_SINGLETON_WORKERS === '1'
    ? startVoiceCompletionCheckerWorker()
    : { close: async () => {} };
  const voiceRefundChecker = startVoiceRefundCheckerWorker();
  const voiceDispatch = startVoiceDispatchWorker();
  // BullMQ Worker — safe (and intended) to run in both PM2 processes at once,
  // same as export-worker: each process's own `concurrency: 10` adds up to a
  // real platform-wide cap, it doesn't double-process the same job.
  const voiceDispatchBatch = startVoiceDispatchBatchWorker();
  const callFallbackNotify = startCallFallbackNotifyWorker();
  const workers = [
    await startExportWorker(),
  ];
  const closables = [
    ...workers,
    voiceCompletionChecker,
    voiceRefundChecker,
    voiceDispatch,
    voiceDispatchBatch,
    callFallbackNotify,
  ];

  async function shutdown(signal: string) {
    console.log(`[worker] ${signal} received — shutting down gracefully...`);
    try {
      await Promise.all(closables.map(w => w.close()));
      await redisConnection.quit();
      console.log('[worker] Shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('[worker] Error during shutdown:', err);
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  console.log('[worker] Ready to process jobs...');
}

boot().catch(err => {
  console.error('[worker] Failed to start:', err);
  process.exit(1);
});

import { Worker, type Job } from 'bullmq';
import { redisConnection } from '../queues/index.js';
import type { VoiceDispatchBatchJobData } from '../queues/voice-dispatch-batch.queue.js';
import { db } from '../models/db.js';
import { callEngine } from './voice-dispatch.worker.js';

// ── Voice dispatch batch worker (Phase 1 of the Voice Dispatch Redesign) ────
// Consumes small (BATCH_SIZE, see voice-dispatch.worker.ts) recipient batches
// for a campaign whose engine tracking_id is already known — the campaign
// itself was already created by the producer's synchronous first batch. Every
// job here is a plain `tracking_id` append, so any number of them (across any
// number of campaigns) can run concurrently: BullMQ's own `concurrency` below
// is the single knob that caps how many hit the engine's /v1/voice/send at
// once, platform-wide.
//
// Retries (attempts/backoff) are BullMQ's own — set once on the queue's
// defaultJobOptions. A batch that exhausts all attempts is left `failed` in
// dispatch_batches for manual attention, not retried forever.

const TAG = '[voice-dispatch-batch]';
const CONCURRENCY = 10;

async function processBatch(job: Job<VoiceDispatchBatchJobData>): Promise<void> {
  const { batchDbId, requestid, username, engineRef, receivers } = job.data;

  const result = await callEngine({
    tracking_id: engineRef,
    contacts:    receivers.map((r) => r.receiver),
  });

  await db
    .updateTable('mob_no33')
    .set({ status: '59', dialed_at: new Date() } as any)
    .where('request_id', '=', requestid)
    .where('username', '=', username)
    .where('id', 'in', receivers.map((r) => r.id))
    .where('status', 'in', ['PP1', '75'])
    .execute();

  await db
    .updateTable('dispatch_batches')
    .set({ status: 'sent', engine_ref: engineRef } as any)
    .where('id', '=', batchDbId)
    .execute();

  console.log(`${TAG} Sent batch #${batchDbId} for ${requestid} (${receivers.length} contact(s)) [attempt ${job.attemptsMade + 1}]`);
  void result;
}

export function startVoiceDispatchBatchWorker() {
  const worker = new Worker<VoiceDispatchBatchJobData>(
    'voice-dispatch-batch',
    processBatch,
    { connection: redisConnection, concurrency: CONCURRENCY },
  );

  worker.on('failed', async (job, err) => {
    if (!job) return;
    const { batchDbId, requestid } = job.data;
    const attempts = job.attemptsMade;
    const maxAttempts = job.opts.attempts ?? 1;
    const exhausted = attempts >= maxAttempts;
    try {
      await db
        .updateTable('dispatch_batches')
        .set({
          attempts,
          last_error: String(err?.message ?? err).slice(0, 2000),
          ...(exhausted ? { status: 'failed' as const } : {}),
        } as any)
        .where('id', '=', batchDbId)
        .execute();
    } catch (dbErr) {
      console.error(`${TAG} Failed to record batch failure for ${requestid}:`, dbErr);
    }
    if (exhausted) {
      console.error(`${TAG} Batch #${batchDbId} for ${requestid} permanently failed after ${attempts} attempt(s):`, err?.message ?? err);
    } else {
      console.warn(`${TAG} Batch #${batchDbId} for ${requestid} failed (attempt ${attempts}/${maxAttempts}), will retry:`, err?.message ?? err);
    }
  });

  worker.on('error', (err) => console.error(`${TAG} Worker error:`, err));

  console.log(`${TAG} Started — concurrency: ${CONCURRENCY}`);

  return {
    close: async () => {
      await worker.close();
    },
  };
}

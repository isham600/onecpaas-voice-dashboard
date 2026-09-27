import { Queue } from 'bullmq';
import { redisConnection } from './index.js';

// One job = one batch of already-created-campaign recipients appended to the
// engine via tracking_id. See docs/migrations/add_dispatch_batches.sql and
// workers/voice-dispatch.worker.ts (producer) / voice-dispatch-batch.worker.ts
// (consumer). Kept as a separate queue from `campaign-export` since this one
// needs a rate-limit-friendly concurrency knob of its own.
export const voiceDispatchBatchQueue = new Queue('voice-dispatch-batch', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts:         5,
    backoff:          { type: 'exponential', delay: 5000 }, // 5s, 25s, 125s, 625s, 3125s
    removeOnComplete: { count: 500 },
    removeOnFail:     { count: 500 }, // dispatch_batches keeps the durable record; this is just BullMQ's own history
  },
});

export interface VoiceDispatchBatchJobData {
  batchDbId:   number;
  requestid:   string;
  username:    string;
  engineRef:   string;                                   // tracking_id to append to
  receivers:   Array<{ id: number; receiver: string }>;   // this batch's numbers
}

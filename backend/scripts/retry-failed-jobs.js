/**
 * Retry failed BullMQ campaign jobs by request_id.
 *
 * Usage (run from inside deploy/ on the server):
 *   node scripts/retry-failed-jobs.js WCAMP_20260626_74075278 WCAMP_20260626_DDB6ECB2
 *
 * Or retry ALL failed jobs in the queue:
 *   node scripts/retry-failed-jobs.js --all
 */

import { Queue, Job } from 'bullmq';
import IORedis from 'ioredis';

const QUEUE_NAME = 'whatsapp-campaign';

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error('Usage: node retry-failed-jobs.js <request_id> [<request_id2> ...] | --all');
  process.exit(1);
}

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

const queue = new Queue(QUEUE_NAME, { connection });

async function main() {
  const failedJobs = await queue.getFailed(0, 1000);
  console.log(`Total failed jobs in queue: ${failedJobs.length}`);

  if (ids[0] === '--all') {
    if (!failedJobs.length) {
      console.log('No failed jobs to retry.');
    }
    for (const job of failedJobs) {
      await job.retry('failed');
      console.log(`✅ Retried: ${job.id} (${job.data?.request_id})`);
    }
  } else {
    for (const requestId of ids) {
      // BullMQ jobId = request_id (set in submit.service.ts)
      const job = await Job.fromId(queue, requestId);
      if (!job) {
        console.error(`❌ Job not found in queue: ${requestId} (may have been cleaned up)`);
        continue;
      }
      const state = await job.getState();
      console.log(`Job ${requestId} state: ${state}`);
      if (state === 'failed') {
        await job.retry('failed');
        console.log(`✅ Retried: ${requestId}`);
      } else {
        console.log(`⚠️  Skipped (not in failed state): ${requestId}`);
      }
    }
  }

  await queue.close();
  await connection.quit();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

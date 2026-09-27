import { Worker, Job, Queue } from 'bullmq';
import { writeFile, appendFile, unlink, stat } from 'node:fs/promises';
import { redisConnection } from '../queues/index.js';
import { db } from '../models/db.js';
import { sql } from 'kysely';
import type { ExportJobData } from '../queues/export.queue.js';

const QUEUE_NAME = 'campaign-export';
const CHUNK_SIZE = 5000;

// ── CSV helpers ───────────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function toCsvLine(values: (string | number | null | undefined)[]): string {
  return values.map(csvCell).join(',') + '\n';
}

// ── DB helpers ────────────────────────────────────────────────────────────────

function jobTable(_type: string): 'voice_report_job' {
  return 'voice_report_job';
}

async function updateJob(jobId: string, type: string, patch: {
  status?: 'queued' | 'processing' | 'ready' | 'failed';
  total_rows?: number;
  expected_rows?: number;
  error?: string;
}) {
  await db.updateTable(jobTable(type)).set(patch).where('job_id', '=', jobId).execute();
}

// ── File writer ───────────────────────────────────────────────────────────────
// Uses appendFile instead of WriteStream — no stream lifecycle / race conditions.

async function makeWriter(filePath: string) {
  await writeFile(filePath, '', 'utf8'); // create / truncate to 0 bytes
  return {
    write: (chunk: string) => appendFile(filePath, chunk, 'utf8'),
    close: async () => {
      const s = await stat(filePath);
      console.log(`[export-worker] file closed — size=${s.size} bytes path=${filePath}`);
    },
    destroy: () => unlink(filePath).catch(() => {}),
  };
}

// ── Type: voice_summary ───────────────────────────────────────────────────────
// Source: delivery33 — one row per voice campaign, date range required

const VOICE_SUMMARY_HEADER = toCsvLine([
  'Campaign Name', 'Username', 'Request ID', 'Caller ID', 'Credits', 'Date & Time', 'Status',
]);

type VoiceSummaryRow = {
  campaign_name: string | null; username: string | null; requestid: string | null;
  user_callerid: string | null; deduction: string | null; contacts: string | null;
  dte: string | null; status: string | null;
};

async function exportVoiceSummary(job: Job<ExportJobData>): Promise<number> {
  const { username, file_path, filters } = job.data;
  const fromDate = filters.from_date ? `${filters.from_date} 00:00:00` : null;
  const toDate   = filters.to_date   ? `${filters.to_date} 23:59:59`   : null;
  const pulse30  = filters.pulse30 ? 1 : 0;

  const countResult = await sql<{ cnt: string }>`
    SELECT COUNT(*) AS cnt FROM delivery33
    WHERE username = ${username}
      AND pulse30 = ${pulse30}
      ${fromDate ? sql`AND dte >= ${fromDate}` : sql.raw('')}
      ${toDate   ? sql`AND dte <= ${toDate}`   : sql.raw('')}
      ${filters.status ? sql`AND sms = ${filters.status}` : sql.raw('')}
  `.execute(db);

  const total = Number(countResult.rows[0]?.cnt ?? 0);
  await updateJob(job.data.job_id, job.data.type, { expected_rows: total });
  const w = await makeWriter(file_path);

  try {
    await w.write(VOICE_SUMMARY_HEADER);
    if (total === 0) { await w.close(); return 0; }

    let written = 0;
    let offset  = 0;

    while (true) {
      const result = await sql<VoiceSummaryRow>`
        SELECT campaign_name, username, requestid, user_callerid, deduction, contacts, dte, status
        FROM delivery33
        WHERE username = ${username}
          AND pulse30 = ${pulse30}
          ${fromDate ? sql`AND dte >= ${fromDate}` : sql.raw('')}
          ${toDate   ? sql`AND dte <= ${toDate}`   : sql.raw('')}
          ${filters.status ? sql`AND sms = ${filters.status}` : sql.raw('')}
        ORDER BY dte DESC
        LIMIT  ${sql.lit(CHUNK_SIZE)}
        OFFSET ${sql.lit(offset)}
      `.execute(db);

      if (!result.rows.length) break;
      const lines = result.rows.map(r => toCsvLine([
        r.campaign_name, r.username, r.requestid, r.user_callerid,
        (Number(r.deduction) || 0) * (Number(r.contacts) || 0),
        r.dte, r.status,
      ])).join('');
      await w.write(lines);

      written += result.rows.length;
      offset  += result.rows.length;
      await job.updateProgress(Math.min(99, Math.round((written / total) * 100)));
      await updateJob(job.data.job_id, job.data.type, { total_rows: written });

      if (result.rows.length < CHUNK_SIZE) break;
    }

    await w.close();
    return written;
  } catch (err) {
    await w.destroy();
    throw err;
  }
}

// ── Type: voice_details ───────────────────────────────────────────────────────
// Source: mob_no33 — all recipient rows for one voice campaign (request_id)

const VOICE_DETAILS_HEADER = toCsvLine([
  'ID', 'Receiver', 'Status', 'Date', 'Time', 'Answered At',
  'Keys Pressed', 'Entered Input', 'Webhook', 'Call Result', 'Call Duration (s)',
  'Forwarding Attempts', 'Forward Billing', 'Retry Count', 'Retry Interval (min)', 'Media1',
]);

type VoiceDetailRow = {
  id: number; receiver: string | null; status: string | null;
  dat: string | null; tim: string | null; media1: string | null;
  retry_count: number | null; call_duration: number | null;
  answered_at: Date | string | null; dialed_at: Date | string | null;
  digits_pressed: string | null; disposition: string | null;
  collected_input: string | null; webhook_success: number | null;
  path_json: string | null;
  forward_billing: string | null;
};

// Date/Time = when this row was CREATED (campaign submission / queue time)
// — always, for every row. Deliberately NOT overridden with answered_at/
// dialed_at: that made Date/Time show the real call time for ANSWERED rows
// (identical to the separate "Answered At" column — confusing, looked like
// a data glitch) but the creation time for everything else. Keep this in
// sync with the same columns in VoiceDetailModal.jsx.
function csvDate(row: { dat: string | null; tim: string | null }): [string, string] {
  return [row.dat ?? '', row.tim ?? ''];
}

const FORWARD_BILLING_LABEL: Record<string, string> = {
  charged: 'Charged', refunded: 'Refunded (no answer)', insufficient: 'Insufficient credit',
};

const DISPOSITION_LABEL: Record<string, string> = {
  completed: 'Completed', hangup_early: 'Hung up midway',
  no_input: 'No response', transferred: 'Call forwarded',
  transfer_failed: 'Forward failed',
};

const ATTEMPT_LABEL: Record<string, string> = {
  answered: 'Answered', no_answer: 'No answer', busy: 'Busy',
  cancelled: 'Caller hung up',
};

// Flatten transfer_attempts across the call path into "num:Status; num:Status".
function summarizeAttempts(pathJson: string | null): string {
  if (!pathJson) return '';
  let path: Array<{ transfer_attempts?: Array<{ number: string; status: string }> }>;
  try { path = typeof pathJson === 'string' ? JSON.parse(pathJson) : pathJson; }
  catch { return ''; }
  const attempts = (Array.isArray(path) ? path : []).flatMap((s) => s.transfer_attempts ?? []);
  return attempts
    .map((a) => `${a.number}:${ATTEMPT_LABEL[a.status] ?? a.status}`)
    .join('; ');
}

async function exportVoiceDetails(job: Job<ExportJobData>): Promise<number> {
  const { username, file_path, filters } = job.data;
  const requestId = filters.request_id ?? '';

  // Campaign-level retry interval (same for every row of the campaign)
  const campaignRow = await sql<{ retry_interval: number | null }>`
    SELECT retry_interval FROM delivery33
    WHERE username = ${username} AND requestid = ${requestId}
    LIMIT 1
  `.execute(db);
  const retryInterval = campaignRow.rows[0]?.retry_interval ?? null;

  const countResult = await sql<{ cnt: string }>`
    SELECT COUNT(*) AS cnt FROM mob_no33
    WHERE username = ${username} AND request_id = ${requestId}
  `.execute(db);

  const total = Number(countResult.rows[0]?.cnt ?? 0);
  await updateJob(job.data.job_id, job.data.type, { expected_rows: total });
  const w = await makeWriter(file_path);

  try {
    await w.write(VOICE_DETAILS_HEADER);
    if (total === 0) { await w.close(); return 0; }

    let written = 0;
    let offset  = 0;

    while (true) {
      // LEFT JOIN the IVR outcome (digits, disposition, duration, path) so
      // the CSV carries the same DTMF/forwarding detail as the on-screen
      // report. icr.row_id stores mob_no33.id as a string.
      const result = await sql<VoiceDetailRow>`
        SELECT m.id, m.receiver, m.status, m.dat, m.tim, m.media1, m.retry_count,
               m.call_duration, m.answered_at, m.dialed_at,
               icr.digits_pressed, icr.collected_input, icr.webhook_success, icr.disposition, icr.path_json,
               icr.forward_billing
        FROM mob_no33 m
        LEFT JOIN ivr_call_results icr
          ON icr.campaign_id = m.request_id AND icr.row_id = CAST(m.id AS CHAR)
        WHERE m.username = ${username} AND m.request_id = ${requestId}
        ORDER BY m.id DESC
        LIMIT  ${sql.lit(CHUNK_SIZE)}
        OFFSET ${sql.lit(offset)}
      `.execute(db);

      if (!result.rows.length) break;
      const lines = result.rows.map(r => {
        const [date, time] = csvDate(r);
        const answeredAt = r.answered_at
          ? `${new Date(r.answered_at).toLocaleDateString('en-CA')} ${new Date(r.answered_at).toLocaleTimeString('en-GB')}`
          : '';
        return toCsvLine([
        r.id, r.receiver, r.status, date, time, answeredAt,
        r.digits_pressed ? r.digits_pressed.split('').join(' > ') : '',
        r.collected_input ?? '',
        r.webhook_success == null ? '' : (Number(r.webhook_success) ? 'Sent' : 'Failed'),
        r.disposition ? (DISPOSITION_LABEL[r.disposition] ?? r.disposition) : '',
        r.call_duration ?? '',
        summarizeAttempts(r.path_json),
        r.forward_billing ? (FORWARD_BILLING_LABEL[r.forward_billing] ?? r.forward_billing) : '',
        r.retry_count ?? 0,
        retryInterval ?? '',
        r.media1,
        ]);
      }).join('');
      await w.write(lines);

      written += result.rows.length;
      offset  += result.rows.length;
      await job.updateProgress(Math.min(99, Math.round((written / total) * 100)));
      await updateJob(job.data.job_id, job.data.type, { total_rows: written });

      if (result.rows.length < CHUNK_SIZE) break;
    }

    await w.close();
    return written;
  } catch (err) {
    await w.destroy();
    throw err;
  }
}

// ── Cleanup — delete expired files + DB rows ──────────────────────────────────

const REPORT_TABLES = [
  'voice_report_job',
] as const;

async function runCleanup(): Promise<void> {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  let totalFiles = 0;
  let totalRows  = 0;

  for (const table of REPORT_TABLES) {
    const expired = await db
      .selectFrom(table)
      .select(['job_id', 'file_path'])
      .where('expires_at', '<', now as any)
      .execute();

    if (!expired.length) continue;

    // Delete files from disk
    for (const row of expired) {
      try {
        await unlink(row.file_path);
        totalFiles++;
      } catch {
        // file already gone — ignore
      }
    }

    // Delete DB rows
    const jobIds = expired.map(r => r.job_id);
    const result = await db
      .deleteFrom(table)
      .where('job_id', 'in', jobIds)
      .executeTakeFirst();

    totalRows += Number(result.numDeletedRows ?? 0);
  }

  console.log(`[export-cleanup] Removed ${totalFiles} file(s), ${totalRows} DB row(s)`);
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

async function processExport(job: Job<ExportJobData>): Promise<void> {
  // Cleanup repeating job — no job_id in data
  if ((job.data as any).__cleanup) {
    await runCleanup();
    return;
  }

  const { job_id, type, file_path } = job.data;
  console.log(`[export-worker] Starting ${job_id} type=${type} file=${file_path}`);

  await updateJob(job_id, type, { status: 'processing' });

  let written: number;
  if      (type === 'voice_summary') written = await exportVoiceSummary(job);
  else if (type === 'voice_details') written = await exportVoiceDetails(job);
  else    throw new Error(`Unsupported export type: ${type}`);

  await updateJob(job_id, type, { status: 'ready', total_rows: written });
  await job.updateProgress(100);
  console.log(`[export-worker] Done ${job_id}: ${written} rows written to ${file_path}`);
}

// ── Worker bootstrap ──────────────────────────────────────────────────────────

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function startExportWorker() {
  const worker = new Worker<ExportJobData>(QUEUE_NAME, processExport, {
    connection:  redisConnection,
    concurrency: 3,
  });

  worker.on('completed', job => {
    if (!(job.data as any).__cleanup) {
      console.log(`[export-worker] ${job.id} completed`);
    }
  });

  worker.on('failed', async (job, err) => {
    console.error(`[export-worker] ${job?.id} failed: ${err.message}`);
    if (job?.data?.job_id) {
      await updateJob(job.data.job_id, job.data.type, { status: 'failed', error: err.message }).catch(() => {});
    }
  });

  // Register repeating cleanup job — runs every hour, deduped by jobId
  const queue = new Queue(QUEUE_NAME, { connection: redisConnection });
  await queue.add(
    'cleanup-expired-exports',
    { __cleanup: true } as any,
    {
      jobId:  'export-cleanup-repeat',
      repeat: { every: ONE_HOUR_MS },
      removeOnComplete: { count: 1 },
      removeOnFail:     { count: 1 },
    },
  );
  await queue.close();

  console.log('[export-worker] Started — queue: campaign-export, cleanup: every 1h');
  return worker;
}

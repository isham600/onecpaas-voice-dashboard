import type { FastifyInstance, FastifyReply } from 'fastify';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { exportQueue } from '../../../../../queues/export.queue.js';
import type { ExportFilters, ExportJobData } from '../../../../../queues/export.queue.js';
import { resolveParentUsername } from './summary.service.js';
import { ValidationError } from '../../../../../utils/errors.js';

export type VoiceExportType = 'voice_summary' | 'voice_details';
export type { ExportFilters };

export const EXPORT_TTL_HOURS = 24;

function parseFilters(v: unknown): unknown {
  if (!v) return null;
  if (typeof v === 'string') return JSON.parse(v);
  return v;
}

function generateJobId(): string {
  return `EXP_${Date.now()}_${randomBytes(4).toString('hex').toUpperCase()}`;
}

function expiresAt(): string {
  const d = new Date();
  d.setHours(d.getHours() + EXPORT_TTL_HOURS);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function downloadUrl(jobId: string): string {
  return `/api/v1/voice/summary/reports/${jobId}/download`;
}

async function enqueue(
  fastify:  FastifyInstance,
  username: string,
  type:     VoiceExportType,
  filters:  ExportFilters,
): Promise<Record<string, unknown>> {
  const jobId     = generateJobId();
  const exportDir = path.join(process.cwd(), 'uploads', 'exports', username);
  await mkdir(exportDir, { recursive: true });
  const filePath  = path.join(exportDir, `${jobId}.csv`);

  await fastify.db.insertInto('voice_report_job').values({
    job_id:     jobId,
    username,
    type,
    status:     'queued',
    file_path:  filePath,
    total_rows: 0,
    filters:    JSON.stringify(filters),
    error:      null,
    expires_at: expiresAt(),
  }).execute();

  const jobData: ExportJobData = { job_id: jobId, username, file_path: filePath, type, filters };
  await exportQueue.add('generate-csv', jobData, { jobId });

  return {
    job_id:     jobId,
    type,
    status:     'queued',
    message:    'Export queued. Poll status endpoint for progress.',
    expires_in: `${EXPORT_TTL_HOURS} hours`,
  };
}

// ── POST /export — full report, date range required ───────────────────────────

export async function requestVoiceSummaryExport(
  fastify:       FastifyInstance,
  adminUsername: string,
  filters:       ExportFilters,
): Promise<Record<string, unknown>> {
  if (!filters.from_date || !filters.to_date) {
    throw new ValidationError('from_date and to_date are required');
  }
  const username = await resolveParentUsername(fastify, adminUsername);
  return enqueue(fastify, username, 'voice_summary', filters);
}

// ── POST /:requestId/export — one campaign's recipients ───────────────────────

export async function requestVoiceDetailsExport(
  fastify:       FastifyInstance,
  adminUsername: string,
  requestId:     string,
  filters:       ExportFilters,
): Promise<Record<string, unknown>> {
  if (!requestId) throw new ValidationError('request_id is required');
  const username = await resolveParentUsername(fastify, adminUsername);

  const campaign = await fastify.db
    .selectFrom('delivery33')
    .select('campaign_name')
    .where('username',  '=', username)
    .where('requestid', '=', requestId)
    .executeTakeFirst();

  return enqueue(fastify, username, 'voice_details', {
    ...filters,
    request_id: requestId,
    campaign_name: campaign?.campaign_name ?? null,
  });
}

// ── GET status ──────────────────────────────────────────────────────────────

export async function getExportStatus(
  fastify:       FastifyInstance,
  adminUsername: string,
  jobId:         string,
): Promise<Record<string, unknown>> {
  const username = await resolveParentUsername(fastify, adminUsername);

  const row = await fastify.db
    .selectFrom('voice_report_job')
    .selectAll()
    .where('job_id', '=', jobId)
    .executeTakeFirst();

  if (!row) return { success: false, code: 'NOT_FOUND', message: 'Export job not found or expired' };
  if (row.username !== username) return { success: false, code: 'FORBIDDEN', message: 'Access denied' };

  const result: Record<string, unknown> = {
    job_id:     row.job_id,
    type:       row.type,
    status:     row.status,
    total_rows: row.total_rows,
    filters:    parseFilters(row.filters),
    created_at: row.created_at,
    expires_at: row.expires_at,
  };

  if (row.status === 'ready')  result.download_url = downloadUrl(row.job_id);
  if (row.status === 'failed') result.error = row.error ?? 'Unknown error';

  return result;
}

// ── GET list — all reports for this user ──────────────────────────────────────

export async function listExports(
  fastify:       FastifyInstance,
  adminUsername: string,
  type?:         VoiceExportType,
): Promise<Record<string, unknown>> {
  const username = await resolveParentUsername(fastify, adminUsername);

  let query = fastify.db
    .selectFrom('voice_report_job')
    .select(['job_id', 'type', 'status', 'total_rows', 'expected_rows', 'filters', 'created_at', 'expires_at', 'error'])
    .where('username', '=', username)
    .orderBy('created_at', 'desc')
    .limit(50);

  if (type) query = query.where('type', '=', type);

  const rows = await query.execute();

  return {
    data: rows.map(r => ({
      ...r,
      filters:      parseFilters(r.filters),
      download_url: r.status === 'ready' ? downloadUrl(r.job_id) : null,
    })),
  };
}

// ── GET download ──────────────────────────────────────────────────────────────

export async function downloadExport(
  fastify:       FastifyInstance,
  adminUsername: string,
  jobId:         string,
  reply:         FastifyReply,
): Promise<void> {
  const username = await resolveParentUsername(fastify, adminUsername);

  const row = await fastify.db
    .selectFrom('voice_report_job')
    .select(['username', 'status', 'file_path', 'type'])
    .where('job_id', '=', jobId)
    .executeTakeFirst();

  if (!row) { reply.code(404).send({ success: false, message: 'Export job not found' }); return; }
  if (row.username !== username) { reply.code(403).send({ success: false, message: 'Access denied' }); return; }
  if (row.status !== 'ready') {
    reply.code(202).send({ success: false, message: `Export is ${row.status}`, status: row.status }); return;
  }

  if (!existsSync(row.file_path)) {
    reply.code(410).send({ success: false, message: 'Export file no longer available' }); return;
  }

  const buffer   = await readFile(row.file_path);
  const filename = `${row.type}_${jobId}.csv`;

  reply
    .code(200)
    .header('Content-Type', 'text/csv; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .header('Content-Length', String(buffer.length))
    .header('Cache-Control', 'no-cache')
    .send(buffer);
}

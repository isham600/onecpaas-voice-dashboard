import type { FastifyInstance } from 'fastify';
import { ValidationError } from '../../../../../utils/errors.js';
import { submitVoiceCampaign } from '../../campaign/services/campaign.service.js';
import { summaryService, type DetailsQuery } from '../../summary/services/summary.service.js';
import { listIvrs } from '../../ivr/services/ivr.service.js';
import type { FastifyRequest } from 'fastify';

export async function partnerSubmit(fastify: FastifyInstance, username: string, request: FastifyRequest) {
  return submitVoiceCampaign(fastify, username, request);
}

export async function partnerReport(fastify: FastifyInstance, username: string, requestId: string) {
  return summaryService.statusCountsForRequest(fastify, username, requestId);
}

// Per-recipient results for one campaign: status, duration, and for IVR
// campaigns the keys pressed / entered input / webhook result / call result.
export async function partnerDetails(fastify: FastifyInstance, username: string, requestId: string, query: DetailsQuery) {
  return summaryService.details(fastify, username, requestId, query);
}

// The caller's saved, runnable IVRs — the ids to pass as `ivr_id` on submit.
export async function partnerListIvrs(fastify: FastifyInstance, username: string) {
  const res = await listIvrs(fastify, username, { status: 'active', limit: 100 });
  return {
    data: res.data.map((i) => ({
      id: i.id, title: i.title, route: i.route, runnable: i.runnable,
      audio_duration_seconds: Number(i.root_prompt?.duration_seconds) || 0,
    })),
  };
}

// ── Webhook registration ─────────────────────────────────────────────────────
// One row per username in the pre-existing `webhooks` table — upsert, not
// insert, so re-registering just updates the URL/status rather than piling
// up duplicate rows. `value`/`sender_id` are legacy WhatsApp-era columns
// with no voice meaning; left at fixed defaults here.

export async function registerPartnerWebhook(fastify: FastifyInstance, username: string, url: string) {
  if (!url) throw new ValidationError('url is required');
  try {
    new URL(url);
  } catch {
    throw new ValidationError('url must be a valid absolute URL');
  }
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    throw new ValidationError('url must be http or https');
  }

  const existing = await fastify.db
    .selectFrom('webhooks')
    .select('id')
    .where('username', '=', username)
    .executeTakeFirst();

  if (existing) {
    // updated_date is DB-defaulted (ON UPDATE CURRENT_TIMESTAMP) — not set here.
    await fastify.db
      .updateTable('webhooks')
      .set({ url, status: 1 })
      .where('id', '=', existing.id)
      .execute();
  } else {
    await fastify.db
      .insertInto('webhooks')
      .values({ username, url, status: 1, value: 1, sender_id: '' })
      .execute();
  }

  return { username, url, status: 1 };
}

export async function getPartnerWebhook(fastify: FastifyInstance, username: string) {
  const row = await fastify.db
    .selectFrom('webhooks')
    .select(['url', 'status', 'updated_date'])
    .where('username', '=', username)
    .executeTakeFirst();

  return row ?? null;
}

export async function disablePartnerWebhook(fastify: FastifyInstance, username: string) {
  await fastify.db
    .updateTable('webhooks')
    .set({ status: 0 })
    .where('username', '=', username)
    .execute();

  return { username, status: 0 };
}

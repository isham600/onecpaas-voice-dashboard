import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { DB } from '../../../../../models/schema.js';
import { encrypt, decrypt } from '../../../../../utils/crypto.js';
import { ValidationError, NotFoundError } from '../../../../../utils/errors.js';
import { resolveAncestorChain } from '../../fallback-notify/services/fallback-notify.service.js';

// ── Voice Routes ─────────────────────────────────────────────────────────────
// Which provider carries a user's voice campaigns. Two predefined routes:
//   default   — our own engine (voice-dispatch.worker.ts's normal path)
//   notifynow — second provider for volume beyond the default's capacity
// A user follows their own assignment, else the nearest reseller's, else the
// default. Routes themselves are not creatable — only notifynow's URL/API key
// are editable.

export type RouteCode = 'default' | 'notifynow';

export interface VoiceRouteRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  kind: 'engine' | 'notifynow';
  url: string | null;
  status: number;
  is_default: number;
  has_api_key: boolean;
  webhook_token: string | null;
}

export interface ResolvedVoiceRoute {
  route: { id: number; code: string; kind: 'engine' | 'notifynow'; url: string | null; api_key_enc: string | null; status: number };
  level: 'self' | 'ancestor' | 'default';
  resolvedUsername: string;
}

const toRow = (r: any): VoiceRouteRow => ({
  id: r.id, code: r.code, name: r.name, description: r.description, kind: r.kind,
  url: r.url, status: r.status, is_default: r.is_default,
  has_api_key: !!r.api_key_enc, webhook_token: r.webhook_token,
});

// ── Admin CRUD ───────────────────────────────────────────────────────────────

export async function listVoiceRoutes(fastify: FastifyInstance) {
  const rows = await fastify.db.selectFrom('voice_routes').selectAll().orderBy('is_default', 'desc').orderBy('id', 'asc').execute();
  const counts = await fastify.db
    .selectFrom('voice_route_assignments')
    .select(['route_id', (eb) => eb.fn.countAll<number>().as('cnt')])
    .groupBy('route_id')
    .execute();
  const byRoute = new Map(counts.map((c) => [c.route_id, Number(c.cnt)]));
  const total = await fastify.db.selectFrom('clients').select((eb) => eb.fn.countAll<number>().as('cnt')).executeTakeFirst();
  const assignedTotal = [...byRoute.values()].reduce((a, b) => a + b, 0);
  return rows.map((r) => ({
    ...toRow(r),
    // default route = everyone without an explicit assignment
    assigned_count: r.is_default ? Math.max(0, Number(total?.cnt ?? 0) - assignedTotal) : (byRoute.get(r.id) ?? 0),
  }));
}

export async function updateVoiceRoute(
  fastify: FastifyInstance, code: string,
  body: { url?: string; api_key?: string; status?: 0 | 1; regenerate_webhook_token?: boolean },
) {
  const route = await fastify.db.selectFrom('voice_routes').selectAll().where('code', '=', code).executeTakeFirst();
  if (!route) throw new NotFoundError('Route');
  if (route.kind === 'engine') throw new ValidationError('The default route is managed by the platform and cannot be edited');

  const set: Record<string, unknown> = {};
  if (body.url !== undefined) {
    try {
      const u = new URL(body.url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
    } catch { throw new ValidationError('url must be a valid http or https URL'); }
    set.url = body.url;
  }
  if (body.api_key !== undefined && body.api_key !== '') set.api_key_enc = encrypt(body.api_key);
  if (body.status !== undefined) set.status = body.status;
  if (body.regenerate_webhook_token) set.webhook_token = (await import('node:crypto')).randomBytes(16).toString('hex');
  if (Object.keys(set).length) {
    await fastify.db.updateTable('voice_routes').set(set as any).where('code', '=', code).execute();
  }
  return toRow(await fastify.db.selectFrom('voice_routes').selectAll().where('code', '=', code).executeTakeFirstOrThrow());
}

// ── Assignments ──────────────────────────────────────────────────────────────

export async function getAssignment(fastify: FastifyInstance, username: string) {
  const own = await fastify.db
    .selectFrom('voice_route_assignments as a')
    .innerJoin('voice_routes as r', 'r.id', 'a.route_id')
    .select(['r.code', 'r.name', 'a.assigned_at'])
    .where('a.username', '=', username)
    .executeTakeFirst();
  const resolved = await resolveVoiceRoute(fastify.db, username);
  return {
    assigned_code: own?.code ?? null,        // null = no explicit assignment
    assigned_at:   own?.assigned_at ?? null,
    effective:     { code: resolved.route.code, level: resolved.level, from: resolved.resolvedUsername },
  };
}

export async function assignVoiceRoute(fastify: FastifyInstance, username: string, code: string, assignedBy: string) {
  const route = await fastify.db.selectFrom('voice_routes').select(['id', 'code', 'status', 'kind', 'url', 'api_key_enc']).where('code', '=', code).executeTakeFirst();
  if (!route) throw new NotFoundError('Route');
  if (route.status !== 1) throw new ValidationError('This route is disabled');
  if (route.kind === 'notifynow' && (!route.url || !route.api_key_enc)) {
    throw new ValidationError('Set the NotifyNow URL and API key on the route before assigning it');
  }
  // Assigning "default" just clears any explicit assignment.
  if (route.kind === 'engine') {
    await fastify.db.deleteFrom('voice_route_assignments').where('username', '=', username).execute();
    return getAssignment(fastify, username);
  }
  const existing = await fastify.db.selectFrom('voice_route_assignments').select('id').where('username', '=', username).executeTakeFirst();
  if (existing) {
    await fastify.db.updateTable('voice_route_assignments').set({ route_id: route.id, assigned_by: assignedBy, assigned_at: new Date() } as any).where('id', '=', existing.id).execute();
  } else {
    await fastify.db.insertInto('voice_route_assignments').values({ username, route_id: route.id, assigned_by: assignedBy } as any).execute();
  }
  return getAssignment(fastify, username);
}

export async function listAssignments(fastify: FastifyInstance, usernames: string[]) {
  if (usernames.length === 0) return [];
  return fastify.db
    .selectFrom('voice_route_assignments as a')
    .innerJoin('voice_routes as r', 'r.id', 'a.route_id')
    .leftJoin('clients as c', 'c.client_username', 'a.username')
    .select(['a.id', 'a.username', 'c.id as client_id', 'r.code as route_code', 'r.name as route_name', 'a.assigned_by', 'a.assigned_at'])
    .where('a.username', 'in', usernames)
    .orderBy('a.assigned_at', 'desc')
    .execute();
}

// ── Resolution (used by the dispatch worker) ─────────────────────────────────
// Own assignment -> nearest ancestor reseller's -> the default route.

export async function resolveVoiceRoute(db: Kysely<DB>, username: string): Promise<ResolvedVoiceRoute> {
  const pick = (u: string) => db
    .selectFrom('voice_route_assignments as a')
    .innerJoin('voice_routes as r', 'r.id', 'a.route_id')
    .select(['r.id', 'r.code', 'r.kind', 'r.url', 'r.api_key_enc', 'r.status'])
    .where('a.username', '=', u)
    .where('r.status', '=', 1)
    .executeTakeFirst();

  const own = await pick(username);
  if (own) return { route: own as any, level: 'self', resolvedUsername: username };

  for (const ancestor of await resolveAncestorChain(db, username)) {
    const a = await pick(ancestor);
    if (a) return { route: a as any, level: 'ancestor', resolvedUsername: ancestor };
  }

  const def = await db.selectFrom('voice_routes').select(['id', 'code', 'kind', 'url', 'api_key_enc', 'status']).where('is_default', '=', 1).executeTakeFirstOrThrow();
  return { route: def as any, level: 'default', resolvedUsername: 'DEFAULT' };
}

// ── Logs ─────────────────────────────────────────────────────────────────────

export async function logRouteEvent(db: Kysely<DB>, e: {
  kind: 'submit' | 'callback'; request_id?: string | null; username?: string | null; route_code: string;
  contacts?: number | null; status: 'sent' | 'failed' | 'received'; http_code?: number | null;
  provider_ref?: string | null; response?: string | null; error?: string | null; duration_ms?: number | null;
}): Promise<void> {
  try {
    await db.insertInto('voice_route_logs').values({
      kind: e.kind, request_id: e.request_id ?? null, username: e.username ?? null, route_code: e.route_code,
      contacts: e.contacts ?? null, status: e.status, http_code: e.http_code ?? null,
      provider_ref: e.provider_ref ?? null,
      response: e.response ? e.response.slice(0, 4000) : null,
      error: e.error ? e.error.slice(0, 2000) : null,
      duration_ms: e.duration_ms ?? null,
    } as any).execute();
  } catch (err) {
    console.error('[voice-route] failed to write voice_route_logs', err);
  }
}

export async function listRouteLogs(
  fastify: FastifyInstance,
  f: { usernames: string[]; route_code?: string; status?: string; page?: number; limit?: number },
) {
  const limit = Math.min(f.limit ?? 25, 100);
  const page = Math.max(f.page ?? 1, 1);
  if (f.usernames.length === 0) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };

  let qb = fastify.db.selectFrom('voice_route_logs').where('username', 'in', f.usernames);
  if (f.route_code) qb = qb.where('route_code', '=', f.route_code);
  if (f.status) qb = qb.where('status', '=', f.status as any);

  const [count, rows] = await Promise.all([
    qb.select((eb) => eb.fn.countAll<number>().as('cnt')).executeTakeFirst(),
    qb.selectAll().orderBy('id', 'desc').limit(limit).offset((page - 1) * limit).execute(),
  ]);
  const total = Number(count?.cnt ?? 0);
  return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 } };
}

// ── NotifyNow sender ─────────────────────────────────────────────────────────
// One multipart request per campaign: `audio` (raw file), `name`, and
// `numbers_text` (all numbers, one per line). Up to NOTIFYNOW_MAX_PER_REQUEST
// numbers per request; larger campaigns are split.

export const NOTIFYNOW_MAX_PER_REQUEST = 100_000;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const RETRY_BACKOFF_MS = 5 * 60_000; // don't re-hit a failing provider more often than this

export interface NotifynowCampaign {
  id: number; requestid: string; username: string; campaign_name: string; content: string; ivr_id: number | null;
}

async function loadAudio(db: Kysely<DB>, c: NotifynowCampaign): Promise<{ blob: Blob; filename: string }> {
  // notifynow has no IVR/DTMF: an IVR campaign sends only the IVR's first audio.
  let url = c.content;
  if (c.ivr_id) {
    const ivr = await db.selectFrom('voice_ivr_flows').select('compiled_flow').where('id', '=', c.ivr_id).where('username', '=', c.username).executeTakeFirst();
    try { url = JSON.parse(ivr?.compiled_flow ?? 'null')?.audio_url || url; } catch { /* keep content */ }
  }
  if (!url) throw new Error('No audio to send');
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Could not download the audio (HTTP ${res.status})`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_AUDIO_BYTES) throw new Error('Audio file is too large');
  const filename = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'audio.mp3');
  return { blob: new Blob([buf], { type: res.headers.get('content-type') || 'audio/mpeg' }), filename };
}

export async function shouldBackoff(db: Kysely<DB>, requestId: string): Promise<boolean> {
  const last = await db.selectFrom('voice_route_logs').select(['status', 'created_at'])
    .where('request_id', '=', requestId).where('kind', '=', 'submit')
    .orderBy('id', 'desc').limit(1).executeTakeFirst();
  return !!last && last.status === 'failed' && !!last.created_at && Date.now() - new Date(last.created_at).getTime() < RETRY_BACKOFF_MS;
}

// Sends the given numbers; returns the provider's request id of the FIRST request.
// Numbers are marked '59' (queued to dial) only once their chunk was accepted.
export async function dispatchViaNotifynow(
  db: Kysely<DB>,
  route: ResolvedVoiceRoute['route'],
  campaign: NotifynowCampaign,
  numbers: string[],
): Promise<string> {
  if (!route.url || !route.api_key_enc) throw new Error('NotifyNow route is not configured (URL / API key)');
  const apiKey = decrypt(route.api_key_enc);
  const audio = await loadAudio(db, campaign);

  let firstRef: string | null = null;
  for (let i = 0; i < numbers.length; i += NOTIFYNOW_MAX_PER_REQUEST) {
    const chunk = numbers.slice(i, i + NOTIFYNOW_MAX_PER_REQUEST);
    const form = new FormData();
    form.append('audio', audio.blob, audio.filename);
    form.append('name', campaign.campaign_name);
    form.append('numbers_text', chunk.join('\n'));

    const started = Date.now();
    let httpCode: number | null = null;
    let text = '';
    let errMsg: string | null = null;
    let parsed: any = null;
    try {
      const res = await fetch(route.url, {
        method: 'POST',
        headers: { 'x-api-key': apiKey }, // fetch sets the multipart boundary itself
        body: form,
        signal: AbortSignal.timeout(300_000),
      });
      httpCode = res.status;
      text = (await res.text()).slice(0, 4000);
      try { parsed = JSON.parse(text); } catch { /* non-JSON */ }
      if (!res.ok || parsed?.success === false) errMsg = parsed?.message || `HTTP ${res.status}`;
    } catch (e: any) {
      errMsg = e?.name === 'TimeoutError' ? 'timeout' : String(e?.message ?? e);
    }

    const data = parsed?.data ?? {};
    const requestRef = data.requestId ?? data.request_id ?? null;
    const campaignRef = data.campaignId ?? data.campaign_id ?? null;
    const providerRef = [requestRef, campaignRef].filter((v) => v != null).join('|') || null;

    if (errMsg || !requestRef) {
      await logRouteEvent(db, {
        kind: 'submit', request_id: campaign.requestid, username: campaign.username, route_code: 'notifynow',
        contacts: chunk.length, status: 'failed', http_code: httpCode, response: text, error: errMsg ?? 'No requestId in the response',
        duration_ms: Date.now() - started,
      });
      throw new Error(`NotifyNow: ${errMsg ?? 'No requestId in the response'}`);
    }

    // Accepted: mark this chunk queued and remember which provider id carries it.
    for (let j = 0; j < chunk.length; j += 1000) {
      await db.updateTable('mob_no33')
        .set({ status: '59', dialed_at: new Date() } as any)
        .where('request_id', '=', campaign.requestid).where('username', '=', campaign.username)
        .where('receiver', 'in', chunk.slice(j, j + 1000)).where('status', 'in', ['PP1', '75'])
        .execute();
    }
    await logRouteEvent(db, {
      kind: 'submit', request_id: campaign.requestid, username: campaign.username, route_code: 'notifynow',
      contacts: chunk.length, status: 'sent', http_code: httpCode, provider_ref: providerRef, response: text, duration_ms: Date.now() - started,
    });
    if (!firstRef) firstRef = String(requestRef);
  }
  return firstRef as string;
}

import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Kysely } from 'kysely';
import type { DB } from '../../../../../models/schema.js';
import { encrypt, decrypt } from '../../../../../utils/crypto.js';
import { ValidationError, FeatureNotEnabledError, NotFoundError } from '../../../../../utils/errors.js';

// ── Voice call fallback notifications — Routes + Assignments ────────────────
// A "Route" is a reusable, named API definition (url/method/headers/body) —
// NOT tied to any one client, same object shared across every client that
// gets assigned it. An "Assignment" links one client's username to one
// Route per channel (WhatsApp/SMS) — exactly one active assignment per
// (username, channel), matching the existing Traffic Routing UX pattern
// (Assign Route / Create Route / remove from a table). When a voice call
// resolves to NO ANSWER / BUSY / FAILED, resolution walks: this client's own
// assignment -> nearest ancestor reseller's assignment (via the `clients`
// table, mirroring voice_pulse30_refund_reseller's downline walk but
// upward) -> whichever route is flagged is_default for that channel.
// Permission (Permissions.voice_call_fallback_notify) is checked once,
// against the call's own account, regardless of which level resolves.

export type FallbackChannel = 'whatsapp' | 'sms';

export interface HeaderPair { key: string; value: string; }

export interface RouteRow {
  id:            number;
  name:          string;
  channel:       FallbackChannel;
  url:           string;
  http_method:   'GET' | 'POST' | 'PUT' | 'PATCH';
  headers:       HeaderPair[];
  body_template: string | null;
  content_type:  string;
  status:        number;
  is_default:    number;
  has_secret:    boolean;
}

export interface UpsertRouteBody {
  name:           string;
  channel:        FallbackChannel;
  url:            string;
  http_method?:   'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?:       HeaderPair[];
  body_template?: string | null;
  secret?:        string | null; // plaintext in, encrypted at rest — omit to leave unchanged on update, '' clears it
  content_type?:  string;
  status?:        0 | 1;
}

function assertChannel(channel: string): asserts channel is FallbackChannel {
  if (channel !== 'whatsapp' && channel !== 'sms') {
    throw new ValidationError("channel must be 'whatsapp' or 'sms'");
  }
}

function assertUrl(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
  } catch {
    throw new ValidationError('url must be a valid http or https URL');
  }
}

function toRouteRow(row: any): RouteRow {
  let headers: HeaderPair[] = [];
  if (row.headers_json) {
    try { headers = JSON.parse(row.headers_json); } catch { headers = []; }
  }
  return {
    id:            row.id,
    name:          row.name,
    channel:       row.channel,
    url:           row.url,
    http_method:   row.http_method,
    headers,
    body_template: row.body_template,
    content_type:  row.content_type,
    status:        row.status,
    is_default:    row.is_default,
    has_secret:    !!row.secret_enc,
  };
}

// ── Route CRUD (global — not tied to a client) ───────────────────────────────

export async function listRoutes(fastify: FastifyInstance, channel?: string): Promise<RouteRow[]> {
  let q = fastify.db.selectFrom('voice_call_fallback_routes').selectAll().orderBy('name', 'asc');
  if (channel) { assertChannel(channel); q = q.where('channel', '=', channel); }
  const rows = await q.execute();
  return rows.map(toRouteRow);
}

export interface RouteRowWithCount extends RouteRow { assigned_count: number; }

// Same as listRoutes, plus how many clients currently have each route
// assigned — shown on the admin "Call Fallback Notify" management screen so
// an admin can see at a glance which routes are actually in use.
export async function listRoutesWithAssignedCount(fastify: FastifyInstance, channel?: string): Promise<RouteRowWithCount[]> {
  const routes = await listRoutes(fastify, channel);
  if (routes.length === 0) return [];

  const counts = await fastify.db
    .selectFrom('voice_call_fallback_assignments')
    .select(['route_id', (eb) => eb.fn.countAll<number>().as('cnt')])
    .where('route_id', 'in', routes.map((r) => r.id))
    .groupBy('route_id')
    .execute();

  const countByRoute = new Map(counts.map((c) => [c.route_id, Number(c.cnt)]));
  return routes.map((r) => ({ ...r, assigned_count: countByRoute.get(r.id) ?? 0 }));
}

export async function getRoute(fastify: FastifyInstance, routeId: number): Promise<RouteRow> {
  const row = await fastify.db.selectFrom('voice_call_fallback_routes').selectAll().where('id', '=', routeId).executeTakeFirst();
  if (!row) throw new NotFoundError('Route');
  return toRouteRow(row);
}

export async function createRoute(fastify: FastifyInstance, body: UpsertRouteBody): Promise<RouteRow> {
  if (!body.name?.trim()) throw new ValidationError('name is required');
  assertChannel(body.channel);
  if (!body.url) throw new ValidationError('url is required');
  assertUrl(body.url);

  const values = {
    name:          body.name.trim(),
    channel:       body.channel,
    url:           body.url,
    http_method:   body.http_method ?? 'POST',
    headers_json:  body.headers ? JSON.stringify(body.headers) : null,
    body_template: body.body_template ?? null,
    secret_enc:    body.secret ? encrypt(body.secret) : null,
    content_type:  body.content_type ?? 'application/json',
    status:        body.status ?? 1,
  };
  const result = await fastify.db.insertInto('voice_call_fallback_routes').values(values as any).executeTakeFirst();
  const id = Number(result.insertId);
  return getRoute(fastify, id);
}

export async function updateRoute(fastify: FastifyInstance, routeId: number, body: Partial<UpsertRouteBody>): Promise<RouteRow> {
  const existing = await fastify.db.selectFrom('voice_call_fallback_routes').select(['id', 'secret_enc']).where('id', '=', routeId).executeTakeFirst();
  if (!existing) throw new NotFoundError('Route');
  if (body.channel) assertChannel(body.channel);
  if (body.url) assertUrl(body.url);

  let secretEnc: string | null | undefined;
  if (body.secret === undefined) secretEnc = existing.secret_enc;
  else if (!body.secret) secretEnc = null;
  else secretEnc = encrypt(body.secret);

  const values: Record<string, unknown> = {};
  if (body.name !== undefined) values.name = body.name.trim();
  if (body.channel !== undefined) values.channel = body.channel;
  if (body.url !== undefined) values.url = body.url;
  if (body.http_method !== undefined) values.http_method = body.http_method;
  if (body.headers !== undefined) values.headers_json = JSON.stringify(body.headers);
  if (body.body_template !== undefined) values.body_template = body.body_template;
  values.secret_enc = secretEnc ?? null;
  if (body.content_type !== undefined) values.content_type = body.content_type;
  if (body.status !== undefined) values.status = body.status;

  await fastify.db.updateTable('voice_call_fallback_routes').set(values as any).where('id', '=', routeId).execute();
  return getRoute(fastify, routeId);
}

export async function deleteRoute(fastify: FastifyInstance, routeId: number): Promise<void> {
  // Cascade — an orphaned assignment pointing at a deleted route would just
  // silently fail to resolve, which is worse than removing it up front.
  await fastify.db.deleteFrom('voice_call_fallback_assignments').where('route_id', '=', routeId).execute();
  await fastify.db.deleteFrom('voice_call_fallback_routes').where('id', '=', routeId).execute();
}

// At most one default per channel — set this one, clear every other route's
// flag on the same channel.
export async function setRouteAsDefault(fastify: FastifyInstance, routeId: number): Promise<RouteRow> {
  const route = await getRoute(fastify, routeId);
  await fastify.db.updateTable('voice_call_fallback_routes').set({ is_default: 0 } as any).where('channel', '=', route.channel).execute();
  await fastify.db.updateTable('voice_call_fallback_routes').set({ is_default: 1 } as any).where('id', '=', routeId).execute();
  return getRoute(fastify, routeId);
}

export async function clearRouteDefault(fastify: FastifyInstance, routeId: number): Promise<void> {
  await fastify.db.updateTable('voice_call_fallback_routes').set({ is_default: 0 } as any).where('id', '=', routeId).execute();
}

// ── Assignments (per client) ─────────────────────────────────────────────────

export interface AssignmentRow {
  id:          number;
  channel:     FallbackChannel;
  route_id:    number;
  route_name:  string;
  assigned_at: Date | string;
}

export async function listAssignmentsForClient(fastify: FastifyInstance, username: string): Promise<AssignmentRow[]> {
  const rows = await fastify.db
    .selectFrom('voice_call_fallback_assignments as a')
    .innerJoin('voice_call_fallback_routes as r', 'r.id', 'a.route_id')
    .select(['a.id', 'a.channel', 'a.route_id', 'r.name as route_name', 'a.assigned_at'])
    .where('a.username', '=', username)
    .orderBy('a.channel', 'asc')
    .execute();
  return rows as unknown as AssignmentRow[];
}

async function assertFeatureEnabled(fastify: FastifyInstance, username: string): Promise<void> {
  const perm = await fastify.db
    .selectFrom('Permissions')
    .select('voice_call_fallback_notify')
    .where('username', '=', username)
    .executeTakeFirst();
  if (Number(perm?.voice_call_fallback_notify ?? 0) !== 1) {
    throw new FeatureNotEnabledError('Voice Call Fallback Notify');
  }
}

export async function assignRoute(fastify: FastifyInstance, username: string, channel: string, routeId: number): Promise<AssignmentRow> {
  await assertFeatureEnabled(fastify, username);
  assertChannel(channel);
  const route = await fastify.db.selectFrom('voice_call_fallback_routes').select(['id', 'channel']).where('id', '=', routeId).executeTakeFirst();
  if (!route) throw new NotFoundError('Route');
  if (route.channel !== channel) throw new ValidationError(`This route is a ${route.channel} route, not ${channel}`);

  const existing = await fastify.db
    .selectFrom('voice_call_fallback_assignments')
    .select('id')
    .where('username', '=', username)
    .where('channel', '=', channel)
    .executeTakeFirst();

  if (existing) {
    await fastify.db.updateTable('voice_call_fallback_assignments').set({ route_id: routeId, assigned_at: new Date() } as any).where('id', '=', existing.id).execute();
  } else {
    await fastify.db.insertInto('voice_call_fallback_assignments').values({ username, channel, route_id: routeId } as any).execute();
  }

  const [row] = await listAssignmentsForClient(fastify, username).then((rows) => rows.filter((r) => r.channel === channel));
  return row;
}

export async function removeAssignment(fastify: FastifyInstance, username: string, channel: string): Promise<void> {
  assertChannel(channel);
  await fastify.db.deleteFrom('voice_call_fallback_assignments').where('username', '=', username).where('channel', '=', channel).execute();
}

// ── Ancestor resolution ──────────────────────────────────────────────────────
// Mirror image of resolveDownline() in voice-refund-checker.worker.ts, which
// walks clients.username(parent) -> clients.client_username(child)
// DOWNWARD to find a reseller's whole downline. Here we walk the same table
// UPWARD: given a username, repeatedly find the row where client_username
// equals the current username, take its username as the parent, and repeat.
export async function resolveAncestorChain(
  db: Kysely<DB>, username: string, maxHops = 5,
): Promise<string[]> {
  const chain: string[] = [];
  let current = username;
  for (let hop = 0; hop < maxHops; hop++) {
    const row = await db
      .selectFrom('clients')
      .select('username')
      .where('client_username', '=', current)
      .executeTakeFirst();
    if (!row || chain.includes(row.username)) break; // no parent, or a cycle — stop either way
    chain.push(row.username);
    current = row.username;
  }
  return chain;
}

export interface ResolvedFallback {
  route: { id: number; url: string; http_method: string; headers_json: string | null; body_template: string | null; content_type: string; secret_enc: string | null };
  level:  'self' | 'ancestor' | 'global';
  resolvedUsername: string;
}

// Checks Permissions on the ORIGINATING account only (not the ancestor/
// default level the route ultimately resolves from) — matches the existing
// voice_partial_refund / voice_pulse30_refund_reseller convention. Takes a
// raw Kysely instance rather than a FastifyInstance so it's usable from both
// route handlers (fastify.db) and the standalone worker process (db.js).
export async function resolveFallbackConfig(
  db: Kysely<DB>, username: string, channel: FallbackChannel,
): Promise<ResolvedFallback | null> {
  const perm = await db
    .selectFrom('Permissions')
    .select('voice_call_fallback_notify')
    .where('username', '=', username)
    .executeTakeFirst();
  if (Number(perm?.voice_call_fallback_notify ?? 0) !== 1) return null;

  const ownAssignment = await db
    .selectFrom('voice_call_fallback_assignments as a')
    .innerJoin('voice_call_fallback_routes as r', 'r.id', 'a.route_id')
    .selectAll('r')
    .where('a.username', '=', username)
    .where('a.channel', '=', channel)
    .where('r.status', '=', 1)
    .executeTakeFirst();
  if (ownAssignment) return { route: ownAssignment, level: 'self', resolvedUsername: username };

  const ancestors = await resolveAncestorChain(db, username);
  for (const ancestor of ancestors) {
    const assignment = await db
      .selectFrom('voice_call_fallback_assignments as a')
      .innerJoin('voice_call_fallback_routes as r', 'r.id', 'a.route_id')
      .selectAll('r')
      .where('a.username', '=', ancestor)
      .where('a.channel', '=', channel)
      .where('r.status', '=', 1)
      .executeTakeFirst();
    if (assignment) return { route: assignment, level: 'ancestor', resolvedUsername: ancestor };
  }

  const defaultRoute = await db
    .selectFrom('voice_call_fallback_routes')
    .selectAll()
    .where('channel', '=', channel)
    .where('is_default', '=', 1)
    .where('status', '=', 1)
    .executeTakeFirst();
  if (defaultRoute) return { route: defaultRoute, level: 'global', resolvedUsername: 'GLOBAL' };

  return null;
}

// ── Generic templated HTTP sender ────────────────────────────────────────────

// Substitutes {{number}}/{{secret}}/{{tracking_id}} — used for the URL
// (query string), every header value, and the body template, so any
// provider convention (header auth, query-string auth, or body auth) can be
// modeled with the same placeholder vocabulary.
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => vars[key] ?? '');
}

export async function sendFallbackNotification(
  route: { url: string; http_method: string; headers_json: string | null; body_template: string | null; content_type: string; secret_enc: string | null },
  vars: { number: string; trackingId: string },
): Promise<{ ok: boolean; status: number | null; body: string; error?: string; requestUrl: string; requestBody: string | null }> {
  const secret = route.secret_enc ? decrypt(route.secret_enc) : '';
  const allVars = { number: vars.number, secret, tracking_id: vars.trackingId };

  const url = renderTemplate(route.url, allVars);

  let headers: Record<string, string> = { 'Content-Type': route.content_type };
  if (route.headers_json) {
    try {
      const pairs = JSON.parse(route.headers_json) as HeaderPair[];
      for (const { key, value } of pairs) {
        if (key) headers[key] = renderTemplate(String(value ?? ''), allVars);
      }
    } catch { /* malformed headers_json — fall back to just Content-Type */ }
  }

  const method = route.http_method || 'POST';
  const body = method === 'GET' ? undefined : (route.body_template ? renderTemplate(route.body_template, allVars) : undefined);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { method, headers, body, signal: controller.signal });
    const text = await response.text();
    return { ok: response.ok, status: response.status, body: text.slice(0, 2000), requestUrl: url, requestBody: body ?? null };
  } catch (err: any) {
    return { ok: false, status: null, body: '', error: String(err?.message ?? err), requestUrl: url, requestBody: body ?? null };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Queueing (called from the call-status webhook handler) ──────────────────

function generateTrackingId(): string {
  return randomBytes(16).toString('hex');
}

export interface QueueFallbackArgs {
  requestId:  string;
  mobNo33Id:  number | null;
  receiver:   string;
  username:   string; // campaign owner
  finalStatus: string;
}

// Reads delivery33's per-campaign enable/delay flags (fallback_whatsapp_
// enabled/delay_minutes, fallback_sms_enabled/delay_minutes) — set on the
// campaign's Settings step — and, for each enabled channel, resolves a
// route and inserts a queue row. Never throws — a failure here must not
// break the caller's webhook response.
export async function queueFallbackNotifications(
  fastify: FastifyInstance, args: QueueFallbackArgs,
  campaignFlags: { whatsapp_enabled: boolean; whatsapp_delay: number; sms_enabled: boolean; sms_delay: number },
): Promise<void> {
  const channels: { channel: FallbackChannel; enabled: boolean; delay: number }[] = [
    { channel: 'whatsapp', enabled: campaignFlags.whatsapp_enabled, delay: campaignFlags.whatsapp_delay },
    { channel: 'sms', enabled: campaignFlags.sms_enabled, delay: campaignFlags.sms_delay },
  ];

  for (const { channel, enabled, delay } of channels) {
    if (!enabled) continue;
    try {
      const resolved = await resolveFallbackConfig(fastify.db, args.username, channel);
      const trackingId = generateTrackingId();
      const sendAfter = new Date(Date.now() + Number(delay || 0) * 60_000);

      await fastify.db.insertInto('call_failure_notify_queue').values({
        tracking_id:       trackingId,
        request_id:        args.requestId,
        mob_no33_id:       args.mobNo33Id,
        receiver:          args.receiver,
        username:          args.username,
        resolved_username: resolved?.resolvedUsername ?? null,
        resolution_level:  resolved?.level ?? 'none',
        channel,
        final_status:      args.finalStatus,
        message_text:      null, // routes carry the message now, not per-campaign text
        send_after:        sendAfter,
        status:            'pending',
      } as any).execute();

      if (args.mobNo33Id) {
        await fastify.db.updateTable('mob_no33').set({ fallback_status: 'pending' } as any).where('id', '=', args.mobNo33Id).execute();
      }
    } catch (err) {
      fastify.log.error({ err, requestId: args.requestId, channel }, '[fallback-notify] Failed to queue notification');
    }
  }
}

// ── Delivery-status callback (from the client's own SMS/WhatsApp provider) ──

function extractStatus(body: any): string | null {
  if (!body || typeof body !== 'object') return null;
  return body.status ?? body.delivery_status ?? body.event ?? null;
}

// ── Logs / report (admin view — call_failure_notify_queue, joined with the
// route name, scoped to a set of usernames the caller is allowed to see) ────

export interface FallbackLogFilters {
  usernames: string[]; // ownership scope — caller's own username + downline client_usernames
  route_id?: number;
  channel?: FallbackChannel;
  status?: 'pending' | 'sent' | 'failed';
  page?: number;
  limit?: number;
}

export async function listFallbackLogs(fastify: FastifyInstance, filters: FallbackLogFilters) {
  const limit  = Math.min(filters.limit ?? 25, 100);
  const page   = Math.max(filters.page ?? 1, 1);
  const offset = (page - 1) * limit;

  if (filters.usernames.length === 0) {
    return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
  }

  let qb = fastify.db
    .selectFrom('call_failure_notify_queue as q')
    .leftJoin('voice_call_fallback_routes as r', 'r.id', 'q.route_id')
    .where('q.username', 'in', filters.usernames);

  if (filters.route_id) qb = qb.where('q.route_id', '=', filters.route_id);
  if (filters.channel) qb = qb.where('q.channel', '=', filters.channel);
  if (filters.status) qb = qb.where('q.status', '=', filters.status);

  const [countRow, rows] = await Promise.all([
    qb.select((eb) => eb.fn.countAll<number>().as('cnt')).executeTakeFirst(),
    qb
      .select([
        'q.id', 'q.tracking_id', 'q.username', 'q.resolved_username', 'q.resolution_level',
        'q.channel', 'q.route_id', 'r.name as route_name', 'q.receiver', 'q.final_status',
        'q.status', 'q.attempts', 'q.send_after', 'q.request_payload', 'q.response_status', 'q.response_body',
        'q.delivery_status', 'q.created_at', 'q.sent_at',
      ])
      .orderBy('q.id', 'desc')
      .limit(limit)
      .offset(offset)
      .execute(),
  ]);

  const total = Number(countRow?.cnt ?? 0);
  return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 } };
}

export async function recordDeliveryCallback(
  fastify: FastifyInstance, trackingId: string, rawBody: unknown,
): Promise<{ matched: boolean }> {
  const status = extractStatus(rawBody);
  const result = await fastify.db
    .updateTable('call_failure_notify_queue')
    .set({
      delivery_status:      status,
      delivery_raw_payload: JSON.stringify(rawBody).slice(0, 4000),
      delivery_callback_at: new Date(),
    } as any)
    .where('tracking_id', '=', trackingId)
    .executeTakeFirst();
  return { matched: Number(result.numUpdatedRows ?? 0) > 0 };
}

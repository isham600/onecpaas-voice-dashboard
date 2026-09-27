import { sql } from 'kysely';
import { db } from '../models/db.js';
import { redisConnection } from '../queues/index.js';
import { resolveVoiceRoute, dispatchViaNotifynow, shouldBackoff } from '../modules/v1/voice/voice-route/services/voice-route.service.js';
import { voiceDispatchBatchQueue } from '../queues/voice-dispatch-batch.queue.js';

// ── Voice dispatch worker ────────────────────────────────────────────────────
// cell247 has no dial engine of its own — a campaign's mob_no33 rows sit at
// PP1/75 forever unless something actually places the calls. This worker
// forwards each not-yet-dispatched campaign to the external voice engine
// (whatsapp-new-metaapi) and flips its rows to '59' (queued to dial) on
// success — matching the existing PP1 -> 59 -> CALLING -> terminal pipeline
// documented in voice-completion-checker.worker.ts. Final call outcomes
// arrive later via POST /api/v1/voice/webhook/status, which the engine
// calls back into.
//
// Large campaigns are sent in BATCH_SIZE batches instead of one request —
// the engine's own POST /v1/voice/send supports this: the first batch
// omits tracking_id (creates the campaign, returns request_id), every
// batch after passes that back as tracking_id with just its contacts.
// Every batch past the first goes through the voice-dispatch-batch queue
// (see voice-dispatch-batch.worker.ts) instead of a synchronous loop here.
//
// Idempotency / resume: delivery33.voice_id holds three possible states —
//   NULL              never dispatched
//   'DISPATCHING'      claimed, in flight right now (transient)
//   <engine request_id> at least the first batch succeeded
// A claim only ever moves FROM its current value TO 'DISPATCHING' (atomic
// UPDATE ... WHERE voice_id = <that value>), so two ticks can never process
// the same campaign concurrently. On any failure mid-batch-loop, voice_id
// is set back to the last known-good engine id (or NULL if none yet) —
// mob_no33.status is the real source of truth for what's left to send, so
// the next tick resumes with only the still-PP1/75 remainder, appending to
// the same engine campaign rather than starting a new one.
//
// Known gap: if the whole worker *process* is killed mid-batch-loop (not
// just a failed request — an actual crash), voice_id can be left stuck at
// 'DISPATCHING' with no automatic recovery. Matches the "no resume" trade-
// off already accepted elsewhere in this codebase (see stopVoiceCampaign) —
// would need a stale-claim TTL to close fully; not implemented here.

const TAG        = '[voice-dispatch]';
const SCAN_MS     = 3_000;  // recipients sit at PP1 until the next scan — keep it short
const FAILURE_PAUSE_MS = 30_000; // after a failed dispatch, leave that campaign alone this long
const BATCH       = 100;    // campaigns considered per tick
// Phase 1 of the Voice Dispatch Redesign: a brand-new campaign's first batch
// is still sent synchronously here (it's the one call that creates the
// campaign on the engine and returns the tracking_id everything else appends
// to) — but every batch after that, for every campaign, is handed to the
// voice-dispatch-batch queue instead of being looped through synchronously in
// this same tick. That queue's own Worker (concurrency 10, see
// voice-dispatch-batch.worker.ts) is what actually fans batches out
// concurrently, with BullMQ's own exponential-backoff retry per batch instead
// of the previous "loop the whole remainder, fail the whole thing" behavior.
const BATCH_SIZE  = 500;    // contacts per engine API call / per queued batch
const LOCK_KEY    = 'lock:voice-dispatch';
const LOCK_TTL_MS = 10 * 60_000; // generous — one tick may run a full 100k-contact batch loop

const VOICE_ENGINE_API_URL   = (process.env.VOICE_ENGINE_API_URL ?? '').replace(/\/+$/, '');
const VOICE_ENGINE_API_TOKEN = process.env.VOICE_ENGINE_API_TOKEN ?? '';

const ALLOWED_RETRY_INTERVALS = [5, 10, 30, 60, 180, 300];

interface PendingCampaign {
  id:                    number;
  requestid:             string;
  username:              string;
  campaign_name:         string;
  content:               string; // public audio URL
  user_callerid:         string;
  pulse30:               number;
  retries:               string | null;
  retry_interval:        number | null;
  response_input:        string | null;
  call_failed_message:   string | null;
  call_failed_whatsapp:  string | null;
  callback_audio:        string | null;
  dtmf_flow:             string | null;
  ivr_id:                number | null;
  voice_id:              string | null;
  dispatch_cursor:       number | null;
}

// The engine creates/appends a campaign in ONE transaction, so a MySQL deadlock
// (or lock-wait timeout) rolls everything back — nothing is half-created and
// credits are untouched. Retrying right away is therefore safe, and avoids
// leaving the recipients at PP1 until the next 30s scan tick.
const RETRYABLE_ENGINE_ERROR = /deadlock found|lock wait timeout/i;
const ENGINE_ATTEMPTS = 4;

export async function callEngine(payload: Record<string, unknown>): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= ENGINE_ATTEMPTS; attempt++) {
    // 20s was too tight: batches that succeeded server-side but replied slowly
    // (engine under lock contention) were aborted client-side, marked failed,
    // and retried/exhausted — while the engine had already committed them.
    // 60s gives real slow responses room without masking genuine hangs.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    let response: Response;
    try {
      response = await fetch(`${VOICE_ENGINE_API_URL}/v1/voice/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${VOICE_ENGINE_API_TOKEN}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const resultText = await response.text();
    if (response.ok) {
      try { return JSON.parse(resultText); } catch { return null; }
    }

    lastError = new Error(`Engine returned HTTP ${response.status}: ${resultText.slice(0, 300)}`);
    if (attempt < ENGINE_ATTEMPTS && RETRYABLE_ENGINE_ERROR.test(resultText)) {
      console.warn(`${TAG} Engine deadlock (attempt ${attempt}/${ENGINE_ATTEMPTS}) — retrying in ${attempt}s`);
      await new Promise((r) => setTimeout(r, attempt * 1000));
      continue;
    }
    throw lastError;
  }

  throw lastError ?? new Error('Engine call failed');
}

// In-memory (per process): campaign id -> when its last dispatch failed. Keeps a
// campaign that keeps failing (engine down, no credits) from being retried every
// 3s scan. NotifyNow additionally backs off via voice_route_logs (5 min).
const failedAt = new Map<number, number>();

async function dispatchOne(campaign: PendingCampaign): Promise<void> {
  const priorEngineId = campaign.voice_id && campaign.voice_id !== 'DISPATCHING' ? campaign.voice_id : null;

  // Claim: NULL -> DISPATCHING (fresh campaign) or <engine id> -> DISPATCHING
  // (resuming a partially-sent one). Atomic — only succeeds if voice_id is
  // still exactly what we read it as.
  const claim = priorEngineId
    ? await db
        .updateTable('delivery33')
        .set({ voice_id: 'DISPATCHING' })
        .where('id', '=', campaign.id)
        .where('voice_id', '=', priorEngineId)
        .executeTakeFirst()
    : await db
        .updateTable('delivery33')
        .set({ voice_id: 'DISPATCHING' })
        .where('id', '=', campaign.id)
        .where('voice_id', 'is', null)
        .executeTakeFirst();

  if (Number(claim.numUpdatedRows ?? 0) === 0) return; // claimed elsewhere already

  let engineRequestId: string | null = priorEngineId;

  try {
    // Order matters: a resuming campaign (priorEngineId set) only fetches rows
    // PAST its cursor, so rows already turned into a queued batch on an earlier
    // tick (still status PP1 — the batch worker hasn't reached them yet) are
    // never re-selected and re-enqueued a second time.
    const receivers = await db
      .selectFrom('mob_no33')
      .select(['id', 'receiver'])
      .where('request_id', '=', campaign.requestid)
      .where('username', '=', campaign.username)
      .where('status', 'in', ['PP1', '75'])
      .$if(!!priorEngineId, (qb) => qb.where('id', '>', campaign.dispatch_cursor ?? 0))
      .orderBy('id', 'asc')
      .execute();

    if (receivers.length === 0) {
      // Nothing left (e.g. campaign was stopped mid-way) — restore whatever
      // engine id we already had, if any.
      await db.updateTable('delivery33').set({ voice_id: priorEngineId }).where('id', '=', campaign.id).execute();
      return;
    }

    const numbers = receivers.map((r) => r.receiver);

    // Voice Route: the user's own assignment, else their reseller's, else the
    // default (our own engine — the batching below). NotifyNow is a separate
    // provider that takes the whole list in one multipart request.
    const voiceRoute = await resolveVoiceRoute(db, campaign.username);
    if (voiceRoute.route.kind === 'notifynow') {
      if (await shouldBackoff(db, campaign.requestid)) {
        await db.updateTable('delivery33').set({ voice_id: priorEngineId }).where('id', '=', campaign.id).execute();
        return; // last attempt failed recently — don't hammer the provider every tick
      }
      const ref = await dispatchViaNotifynow(db, voiceRoute.route, campaign, numbers);
      await db.updateTable('delivery33').set({ voice_id: priorEngineId ?? ref }).where('id', '=', campaign.id).execute();
      console.log(`${TAG} Dispatched ${campaign.requestid} (${numbers.length} contact(s)) via NotifyNow -> ${ref}`);
      return;
    }
    const retryInterval = campaign.retry_interval && ALLOWED_RETRY_INTERVALS.includes(campaign.retry_interval)
      ? campaign.retry_interval
      : undefined;

    let remaining = receivers;

    // A brand-new campaign has no tracking_id yet — exactly ONE batch is sent
    // synchronously here (small: BATCH_SIZE, not the old 3000) to create the
    // campaign on the engine and learn its request_id. Every batch after this
    // one — for THIS campaign and every other — goes through the queue below.
    if (!engineRequestId) {
      const firstChunk = receivers.slice(0, BATCH_SIZE);
      const payload: Record<string, unknown> = {
        broadcast_name: campaign.campaign_name,
        caller_id:      campaign.user_callerid,
        audio_url:      campaign.content,
        contacts:       firstChunk.map((r) => r.receiver),
        voiceplan:      campaign.pulse30 === 1 ? '30' : '15',
        total_contacts: numbers.length,
      };
      if (campaign.retries)              payload.retries = campaign.retries;
      if (retryInterval !== undefined)   payload.retry_interval = retryInterval;
      if (campaign.response_input)       payload.response_input = campaign.response_input;
      if (campaign.call_failed_message)  payload.call_failed_message = campaign.call_failed_message;
      if (campaign.call_failed_whatsapp) payload.call_failed_whatsapp = campaign.call_failed_whatsapp;
      // The engine's own ivr-flow.builder.ts accepts dtmf_flow directly
      // and understands the full nested vocabulary (audio/transfer/
      // submenu/back/record) — confirmed against its source, not assumed.
      // Nested dtmf_flow wins over flat callback_audio when both are
      // present, matching the precedence campaign.service.ts already uses
      // when building its own reporting-only copy (ivr_flows.flow_json).
      // A saved IVR (cell247's own builder) wins over everything: its compiled
      // flow and starting audio are sent inline to the engine.
      if (campaign.ivr_id) {
        const ivrRow = await db
          .selectFrom('voice_ivr_flows')
          .select('compiled_flow')
          .where('id', '=', campaign.ivr_id)
          .where('username', '=', campaign.username)
          .executeTakeFirst();
        if (!ivrRow?.compiled_flow) {
          throw new Error(`IVR ${campaign.ivr_id} not found or not runnable for ${campaign.username}`);
        }
        payload.ivr_flow = JSON.parse(ivrRow.compiled_flow);
      }
      else if (campaign.dtmf_flow)       payload.dtmf_flow = campaign.dtmf_flow;
      else if (campaign.callback_audio)  payload.callback_audio = campaign.callback_audio;

      const result = await callEngine(payload);
      const returnedId = result?.request_id ?? result?.data?.request_id ?? null;
      engineRequestId = returnedId ? String(returnedId) : `sent:${campaign.requestid}`;

      await db
        .updateTable('mob_no33')
        .set({ status: '59', dialed_at: new Date() } as any)
        .where('request_id', '=', campaign.requestid)
        .where('username', '=', campaign.username)
        .where('id', 'in', firstChunk.map((r) => r.id))
        .where('status', 'in', ['PP1', '75'])
        .execute();

      // Persist voice_id + the first batch's cursor now, before queueing
      // anything else — a crash from here on must never re-run this
      // synchronous create-the-campaign call again.
      const firstCursor = firstChunk.length ? firstChunk[firstChunk.length - 1].id : (campaign.dispatch_cursor ?? 0);
      await db.updateTable('delivery33').set({ voice_id: engineRequestId, dispatch_cursor: firstCursor } as any).where('id', '=', campaign.id).execute();

      remaining = receivers.slice(BATCH_SIZE);
    }

    let batchesQueued = 0;

    if (remaining.length > 0) {
      const startIndex = await db
        .selectFrom('dispatch_batches')
        .select((eb) => eb.fn.countAll<number>().as('n'))
        .where('requestid', '=', campaign.requestid)
        .executeTakeFirst();
      let nextIndex = Number(startIndex?.n ?? 0);

      for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
        const chunk = remaining.slice(i, i + BATCH_SIZE);
        const inserted = await db
          .insertInto('dispatch_batches')
          .values({
            requestid:    campaign.requestid,
            username:     campaign.username,
            batch_index:  nextIndex++,
            receiver_ids: JSON.stringify(chunk.map((r) => r.id)),
            status:       'queued',
            engine_ref:   engineRequestId,
          } as any)
          .executeTakeFirst();

        await voiceDispatchBatchQueue.add('dispatch-batch', {
          batchDbId: Number(inserted.insertId),
          requestid: campaign.requestid,
          username:  campaign.username,
          engineRef: engineRequestId,
          receivers: chunk,
        });

        // Advance the cursor immediately after each batch is safely queued —
        // not once at the end of the loop — so a crash partway through this
        // loop can never cause the next tick to re-enqueue a batch that was
        // already handed to BullMQ (which would double-call the voice API).
        await db.updateTable('delivery33').set({ dispatch_cursor: chunk[chunk.length - 1].id } as any).where('id', '=', campaign.id).execute();
        batchesQueued++;
      }
    }
    // remaining.length === 0 here only happens for a brand-new campaign whose
    // entire recipient list fit in the first synchronous batch — voice_id and
    // dispatch_cursor were already persisted right after that batch above. A
    // resuming campaign always has remaining.length > 0 (receivers.length was
    // checked above), so the branch above always runs for it.

    console.log(`${TAG} ${campaign.requestid}: ${remaining === receivers ? '' : `created (batch of ${Math.min(BATCH_SIZE, numbers.length)}), `}${batchesQueued} batch(es) queued -> engine request_id ${engineRequestId}`);
  } catch (err: any) {
    const message = String(err?.message ?? err ?? '');
    // The engine's own balance ran out — this isn't transient like a
    // timeout, and every tick will fail identically until it's topped up.
    // Flag it so the client sees the real reason instead of an indefinite
    // "Pending"/"Processing". voice-completion-checker.worker.ts still picks
    // this campaign back up (see its status guard) once dispatch succeeds.
    const isInsufficientCredit = /insufficient.*credit/i.test(message);

    // Release back to the last known-good engine id (or NULL) so the next
    // tick resumes from wherever this run got to, instead of starting over.
    await db
      .updateTable('delivery33')
      .set({
        voice_id: engineRequestId,
        ...(isInsufficientCredit ? { status: 'Insufficient Credits' } : {}),
      })
      .where('id', '=', campaign.id)
      .execute();
    failedAt.set(campaign.id, Date.now());
    console.error(`${TAG} Failed to dispatch ${campaign.requestid}:`, message);
  }
}

async function processTick(): Promise<void> {
  if (!VOICE_ENGINE_API_URL || !VOICE_ENGINE_API_TOKEN) {
    console.warn(`${TAG} VOICE_ENGINE_API_URL/VOICE_ENGINE_API_TOKEN not set — skipping tick`);
    return;
  }

  const campaigns = await sql<PendingCampaign>`
    SELECT DISTINCT d.id, d.requestid, d.username, d.campaign_name, d.content, d.user_callerid,
           d.pulse30, d.retries, d.retry_interval, d.response_input,
           d.call_failed_message, d.call_failed_whatsapp, d.callback_audio, d.dtmf_flow, d.ivr_id, d.voice_id, d.dispatch_cursor
    FROM delivery33 d
    JOIN mob_no33 m ON m.request_id = d.requestid AND m.username = d.username
    WHERE m.status IN ('PP1', '75')
      AND (d.voice_id IS NULL OR d.voice_id != 'DISPATCHING')
    LIMIT ${sql.lit(BATCH)}
  `.execute(db);

  if (campaigns.rows.length === 0) return;

  const now = Date.now();
  const due = campaigns.rows.filter((c) => now - (failedAt.get(c.id) ?? 0) >= FAILURE_PAUSE_MS);
  for (const campaign of due) {
    await dispatchOne(campaign);
  }

  if (due.length > 0) console.log(`${TAG} Tick processed ${due.length} campaign(s)`);
}

async function withLock(fn: () => Promise<void>): Promise<void> {
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const acquired = await redisConnection.set(LOCK_KEY, token, 'PX', LOCK_TTL_MS, 'NX');

  if (acquired !== 'OK') return;

  try {
    await fn();
  } finally {
    const releaseScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await redisConnection.eval(releaseScript, 1, LOCK_KEY, token).catch((err) => {
      console.error(`${TAG} Failed to release lock:`, err);
    });
  }
}

export function startVoiceDispatchWorker() {
  const tick = () => withLock(processTick).catch((err) => console.error(`${TAG} Tick error:`, err));

  const scanTimer = setInterval(tick, SCAN_MS);
  tick();

  console.log(`${TAG} Started — scan interval: ${SCAN_MS / 1000}s, batch size: ${BATCH_SIZE}`);

  return {
    close: async () => {
      clearInterval(scanTimer);
    },
  };
}

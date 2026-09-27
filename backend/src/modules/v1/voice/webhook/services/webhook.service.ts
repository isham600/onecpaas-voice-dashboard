import type { FastifyInstance } from 'fastify';
import { sql } from 'kysely';
import { queueFallbackNotifications } from '../../fallback-notify/services/fallback-notify.service.js';

// ── Voice engine status webhook ──────────────────────────────────────────────
// The external voice engine (whatsapp-new-metaapi) calls this after every
// call-status change. Confirmed live payload shape (2026-08-26):
//   { request_id, status, duration, mobile_no }
// IMPORTANT: request_id here is the *engine's own* tracking id — the value
// returned from POST /v1/voice/send and stored in delivery33.voice_id by
// voice-dispatch.worker.ts — NOT cell247's original campaign request_id.
// It must be resolved through delivery33.voice_id first to find the real
// request_id/username before touching mob_no33.
//
// Number format mismatch (found 2026-09-07): mob_no33.receiver is stored
// exactly as submitted (no country-code normalization at all — see
// campaign.service.ts's PHONE_RE, which just requires 10-16 digits), but the
// engine sometimes reports a call back with a leading '91' added internally
// and sometimes without, inconsistently per campaign. An exact-string match
// here silently failed for any campaign where that differed from how the
// numbers were originally submitted — no error, just a permanently
// unmatched row (no duration, no answered_at, nothing). A stopgap script
// someone wrote to patch around this by tailing the log and hand-updating
// rows is what caused the "duration missing" / "all answered calls show the
// same time" complaints — it only ever set status+answered_at=NOW() at
// whatever moment it happened to notice the log line, never call_duration.
// Matching by last-10-digit suffix (in addition to exact) fixes the real
// webhook path so that stopgap is no longer needed going forward.

const TERMINAL_STATUS_MAP: Record<string, string> = {
  answered:   'ANSWERED',
  'no answer': 'NO ANSWER',
  noanswer:   'NO ANSWER',
  busy:       'BUSY',
  failed:     'FAILED',
  fail:       'FAILED',
  canceled:   'CANCELED',
  cancelled:  'CANCELED',
  // Extra vocabulary from other providers (NotifyNow) — the engine never sends these.
  completed:  'ANSWERED',
  connected:  'ANSWERED',
  success:    'ANSWERED',
  delivered:  'ANSWERED',
  'not answered': 'NO ANSWER',
  unanswered: 'NO ANSWER',
  no_answer:  'NO ANSWER',
  'no-answer': 'NO ANSWER',
  error:      'FAILED',
  invalid:    'FAILED',
};

function normalizeStatus(raw: unknown): string | null {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  return TERMINAL_STATUS_MAP[key] ?? String(raw).trim().toUpperCase();
}

// Receiver variants worth trying by exact match: as sent, its last 10 digits, and
// 91 + last 10. An indexed IN() on these finds the row in ~1ms; the old
// right(receiver,10) match cannot use an index and scans every row of the campaign
// (28,000 for a big one) on EVERY webhook. The suffix match is kept only as a
// fallback for numbers stored in some other shape.
function receiverCandidates(receiver: string): string[] {
  const digits = String(receiver).replace(/\D/g, '');
  const last10 = digits.slice(-10);
  return [...new Set([String(receiver), digits, last10, `91${last10}`].filter((v) => v.length >= 8))];
}

function firstDefined(...values: unknown[]): unknown {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

export interface VoiceStatusWebhookPayload {
  [key: string]: unknown;
}

// ── Outbound relay to the account's own partner webhook ─────────────────────
// Separate from the pre-existing `webhook_log` table's original (WhatsApp-
// era) use — reused here for the exact same purpose it already existed for:
// an audit trail of every outbound webhook cell247 itself sends.
async function relayToPartnerWebhook(
  fastify: FastifyInstance,
  username: string,
  requestId: string,
  receiver: string,
  status: string,
  duration: number,
  engine: VoiceStatusWebhookPayload = {},
): Promise<void> {
  const webhook = await fastify.db
    .selectFrom('webhooks')
    .select(['url'])
    .where('username', '=', username)
    .where('status', '=', 1)
    .executeTakeFirst();

  if (!webhook?.url) return;

  // IVR outcome (only for IVR campaigns): menu keys, Long-DTMF entry, how the
  // IVR ended, and the in-IVR webhook result — omitted for plain broadcasts.
  const engineIvr = (engine.ivr && typeof engine.ivr === 'object') ? engine.ivr as Record<string, any> : null;
  const pressed = (Array.isArray(engine.dtmf_presses) ? engine.dtmf_presses : [])
    .map((p: any) => p?.digit).filter((d: unknown) => d !== undefined && d !== null && d !== '');
  const digitsPressed = pressed.length > 0 ? pressed.join(',') : (engineIvr?.digits_pressed ? String(engineIvr.digits_pressed) : null);
  const ivrOut = (digitsPressed || engineIvr?.collected_input || engineIvr?.disposition || engineIvr?.webhook)
    ? {
        digits_pressed:  digitsPressed,
        collected_input: engineIvr?.collected_input ?? null,
        disposition:     engineIvr?.disposition ?? null,
        final_node:      engineIvr?.final_node ?? null,
        webhook:         engineIvr?.webhook ? { sent: !!engineIvr.webhook.sent, http_code: engineIvr.webhook.http_code ?? null } : null,
      }
    : null;

  const relayPayload = {
    event: 'voice.status.update',
    request_id: requestId,
    receiver,
    status,
    duration,
    ...(ivrOut ? { ivr: ivrOut } : {}),
  };

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  let responseStr = '';
  let statusSent: 'Success' | 'Failed' = 'Failed';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relayPayload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    responseStr = (await response.text()).slice(0, 2000);
    statusSent = response.ok ? 'Success' : 'Failed';
  } catch (err: any) {
    responseStr = String(err?.message ?? err).slice(0, 2000);
  }

  try {
    await fastify.db.insertInto('webhook_log').values({
      webhook_url: webhook.url,
      username,
      status: statusSent === 'Success' ? 1 : 0,
      date: dateStr,
      time: timeStr,
      request_id: requestId,
      response: responseStr,
      status_sent: statusSent,
      keyword: 'voice',
    }).execute();
  } catch (err) {
    fastify.log.error({ err }, '[voice-webhook] Failed to write webhook_log');
  }
}

// Same classification rules as voice-completion-checker.worker.ts's periodic
// sweep (keep them in sync manually if either changes), scoped to one
// request_id so it's cheap to run on every webhook instead of waiting up to
// 60s for the next scan tick. This is what makes a campaign flip to
// Completed the instant its last row resolves, rather than on a delay.
async function tryCompleteCampaignNow(fastify: FastifyInstance, requestId: string, username: string): Promise<void> {
  try {
    await sql`
      UPDATE delivery33 d
      JOIN (
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN m.status IN ('PP1', '59') THEN 1 ELSE 0 END) AS undialed,
          SUM(
            CASE
              WHEN m.status NOT IN ('ANSWERED', 'fail', 'CANCELED', 'NO ANSWER', 'BUSY', 'FAILED')
              THEN 1 ELSE 0
            END
          ) AS in_progress
        FROM mob_no33 m
        WHERE m.request_id = ${requestId}
      ) agg
      SET d.status = CASE
        WHEN d.status = 'Insufficient Credits' AND agg.undialed = agg.total THEN 'Insufficient Credits'
        WHEN agg.undialed = agg.total THEN 'Pending'
        WHEN agg.in_progress > 0 OR agg.undialed > 0 THEN 'Processing'
        ELSE 'Completed'
      END
      WHERE d.requestid = ${requestId} AND d.username = ${username}
      AND d.status IN ('Pending', 'Processing', 'Processing-Retries', 'Insufficient Credits')
      AND d.status != CASE
        WHEN d.status = 'Insufficient Credits' AND agg.undialed = agg.total THEN 'Insufficient Credits'
        WHEN agg.undialed = agg.total THEN 'Pending'
        WHEN agg.in_progress > 0 OR agg.undialed > 0 THEN 'Processing'
        ELSE 'Completed'
      END
    `.execute(fastify.db);
  } catch (err) {
    // Non-fatal — the periodic voice-completion-checker scan is still the
    // authoritative safety net and will pick this up on its next tick.
    fastify.log.error({ err, requestId }, '[voice-webhook] tryCompleteCampaignNow failed (will still be caught by the periodic scan)');
  }
}

// Looks up this campaign's call_failed_message/call_failed_whatsapp text and,
// for each channel with non-empty text, queues a fallback notification (see
// fallback-notify.service.ts — resolution, delay, and the actual HTTP send
// all happen there / in call-fallback-notify.worker.ts, not here). Never
// throws — a failure here must not break the caller's webhook response.
async function queueFallbackIfConfigured(
  fastify: FastifyInstance, requestId: string, username: string, receiver: string, status: string,
): Promise<void> {
  try {
    const campaign = await fastify.db
      .selectFrom('delivery33')
      .select(['fallback_whatsapp_enabled', 'fallback_whatsapp_delay_minutes', 'fallback_sms_enabled', 'fallback_sms_delay_minutes'])
      .where('requestid', '=', requestId)
      .where('username', '=', username)
      .executeTakeFirst();
    if (!campaign || (!campaign.fallback_whatsapp_enabled && !campaign.fallback_sms_enabled)) return;

    const row = (await fastify.db
      .selectFrom('mob_no33')
      .select('id')
      .where('request_id', '=', requestId)
      .where('receiver', 'in', receiverCandidates(receiver))
      .executeTakeFirst())
      ?? (await fastify.db
        .selectFrom('mob_no33')
        .select('id')
        .where('request_id', '=', requestId)
        .where(sql`right(receiver, 10)`, '=', sql`right(${receiver}, 10)`)
        .executeTakeFirst());

    await queueFallbackNotifications(fastify, {
      requestId,
      mobNo33Id: row?.id ?? null,
      receiver,
      username,
      finalStatus: status,
    }, {
      whatsapp_enabled: Number(campaign.fallback_whatsapp_enabled) === 1,
      whatsapp_delay:   Number(campaign.fallback_whatsapp_delay_minutes ?? 0),
      sms_enabled:      Number(campaign.fallback_sms_enabled) === 1,
      sms_delay:        Number(campaign.fallback_sms_delay_minutes ?? 0),
    });
  } catch (err) {
    fastify.log.error({ err, requestId }, '[voice-webhook] queueFallbackIfConfigured failed (non-fatal)');
  }
}

export async function processVoiceStatusWebhook(
  fastify: FastifyInstance,
  payload: VoiceStatusWebhookPayload,
): Promise<{ matched: boolean; requestId: string | null; receiver: string | null }> {
  const engineRequestId = firstDefined(
    payload.request_id, payload.requestId, payload.requestid,
    payload.providerMessageId, payload.provider_message_id,
  ) as string | undefined;

  const receiver = firstDefined(
    payload.mobile_no, payload.receiver, payload.phone, payload.number, payload.to,
  ) as string | undefined;

  const status = normalizeStatus(
    firstDefined(payload.status, payload.call_status),
  );

  const logRow = async (requestId: string | null, matched: boolean) => {
    try {
      await fastify.db.insertInto('voice_webhook_log').values({
        request_id: requestId,
        receiver:   receiver ?? null,
        status:     status ?? null,
        matched:    matched ? 1 : 0,
        payload:    JSON.stringify(payload).slice(0, 60_000),
      }).execute();
    } catch (err) {
      fastify.log.error({ err }, '[voice-webhook] Failed to write voice_webhook_log');
    }
  };

  if (!engineRequestId || !receiver || !status) {
    fastify.log.warn({ payload }, '[voice-webhook] Missing request_id/mobile_no/status — cannot map to a row');
    await logRow(engineRequestId ?? null, false);
    return { matched: false, requestId: engineRequestId ?? null, receiver: receiver ?? null };
  }

  // Resolve the engine's tracking id back to cell247's own campaign
  // request_id via delivery33.voice_id (set by voice-dispatch.worker.ts).
  // Falls back to treating the payload value as cell247's own request_id
  // directly, in case some future integration path sends that instead.
  const campaign = await fastify.db
    .selectFrom('delivery33')
    .select(['requestid', 'username'])
    .where('voice_id', '=', engineRequestId)
    .executeTakeFirst();

  const requestId = campaign?.requestid ?? engineRequestId;

  const duration = Number(firstDefined(payload.duration, payload.call_duration, payload.durationSeconds) ?? 0);
  const errorMessage = firstDefined(payload.errorMessage, payload.error_message, payload.hangup_reason) as string | undefined;
  // A per-call id distinct from request_id/mobile_no, if the engine ever
  // sends one (today's confirmed payload doesn't) — kept separate from
  // engineRequestId, which is the campaign-level delivery33.voice_id.
  const callTrackingId = firstDefined(
    payload.call_id, payload.callId, payload.leg_id, payload.legId, payload.tracking_id, payload.trackingId,
  ) as string | undefined;

  const updateValues: Record<string, unknown> = {
    status,
    cdr_synced_at: new Date(),
  };
  if (Number.isFinite(duration) && duration > 0) updateValues.call_duration = duration;
  if (errorMessage) updateValues.hangup_reason = String(errorMessage).slice(0, 255);
  if (callTrackingId) updateValues.engine_tracking_id = String(callTrackingId).slice(0, 191);
  if (status === 'ANSWERED') {
    // Prefer the engine's own real answer timestamp when it sends one —
    // falls back to our webhook-receipt time (the old behavior) for any
    // integration that doesn't send it, so this stays backward compatible.
    const engineAnsweredAt = firstDefined(payload.answered_at, payload.answeredAt);
    const parsed = engineAnsweredAt ? new Date(engineAnsweredAt as string) : null;
    updateValues.answered_at = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
  }

  let result = await fastify.db
    .updateTable('mob_no33')
    .set(updateValues as any)
    .where('request_id', '=', requestId)
    .where('receiver', 'in', receiverCandidates(receiver))
    .executeTakeFirst();
  if (Number(result.numUpdatedRows ?? 0) === 0) {
    result = await fastify.db
      .updateTable('mob_no33')
      .set(updateValues as any)
      .where('request_id', '=', requestId)
      .where(sql`right(receiver, 10)`, '=', sql`right(${receiver}, 10)`)
      .executeTakeFirst();
  }

  const matched = Number(result.numUpdatedRows ?? 0) > 0;
  if (!matched) {
    fastify.log.warn({ engineRequestId, requestId, receiver, status }, '[voice-webhook] No matching mob_no33 row found');
  } else if (campaign?.username) {
    await relayToPartnerWebhook(fastify, campaign.username, requestId, receiver, status, duration, payload);
    await recordDtmfPresses(fastify, requestId, receiver, duration, payload);
    // Try to complete this ONE campaign right now, instead of waiting for
    // voice-completion-checker's next 60s scan tick — this is the row that
    // may have just been the campaign's last one. Cheap (single request_id,
    // indexed), non-fatal if it fails: the periodic scan is still the
    // authoritative safety net and will catch it on the next tick either way.
    await tryCompleteCampaignNow(fastify, requestId, campaign.username);

    // Voice call fallback notification (WhatsApp/SMS on call failure) —
    // queued here, actually sent later by call-fallback-notify.worker.ts
    // once each channel's configured delay elapses (0 = immediate).
    const FINAL_FAILURE_STATUSES = new Set(['NO ANSWER', 'BUSY', 'FAILED']);
    if (FINAL_FAILURE_STATUSES.has(status)) {
      await queueFallbackIfConfigured(fastify, requestId, campaign.username, receiver, status);
    }
  }

  await logRow(requestId, matched);

  return { matched, requestId, receiver };
}

// ── DTMF key-press capture ───────────────────────────────────────────────────
// The engine reports what a caller pressed as `dtmf_presses: [{ digit, audio,
// type }]` on the same status webhook — already resolved to the audio/action
// it actually played, since cell247 only forwards a flat callback_audio map
// today (see the NOTE in voice-dispatch.worker.ts — nested dtmf_flow menus
// aren't forwarded yet, so this never carries a `node` id from cell247's own
// flow graph). ivr_call_results/ivr_flows already exist and the campaign
// report already reads from them (summary.service.ts) — this was simply never
// the thing writing to it, so every call showed ANSWERED with no press.
async function recordDtmfPresses(
  fastify: FastifyInstance,
  requestId: string,
  receiver: string,
  duration: number,
  payload: VoiceStatusWebhookPayload,
): Promise<void> {
  const presses = Array.isArray(payload.dtmf_presses) ? payload.dtmf_presses : [];
  // `ivr` is sent by the engine for campaigns launched with a saved IVR (ivr_id):
  // digits_pressed / collected_input / disposition / final_node.
  const ivr = (payload.ivr && typeof payload.ivr === 'object') ? payload.ivr as Record<string, any> : null;

  const pressDigits = presses
    .map((p: any) => p?.digit)
    .filter((d: unknown) => d !== undefined && d !== null && d !== '');
  const digitsPressed = pressDigits.length > 0
    ? pressDigits.join(',')
    : (ivr?.digits_pressed ? String(ivr.digits_pressed) : null);
  const disposition = ivr?.disposition ? String(ivr.disposition).slice(0, 32) : null;
  const finalNode   = ivr?.final_node ? String(ivr.final_node).slice(0, 64) : null;
  const collectedInput = ivr?.collected_input != null && ivr.collected_input !== '' ? String(ivr.collected_input).slice(0, 255) : null;
  const ivrWebhook = (ivr?.webhook && typeof ivr.webhook === 'object') ? ivr.webhook as Record<string, any> : null;
  const webhookSuccess  = ivrWebhook ? (ivrWebhook.sent ? 1 : 0) : null;
  const webhookHttpCode = ivrWebhook && ivrWebhook.http_code != null && Number.isFinite(Number(ivrWebhook.http_code)) ? Number(ivrWebhook.http_code) : null; // null = no HTTP response (timeout / connection error)
  const webhookPayload  = ivrWebhook?.request_payload ? String(ivrWebhook.request_payload).slice(0, 4000) : null;
  const webhookResponse = ivrWebhook?.response_body ? String(ivrWebhook.response_body).slice(0, 4000) : null;
  if (!digitsPressed && !disposition && !finalNode && !collectedInput && !ivrWebhook) return;

  try {
    const row = (await fastify.db
      .selectFrom('mob_no33')
      .select('id')
      .where('request_id', '=', requestId)
      .where('receiver', 'in', receiverCandidates(receiver))
      .orderBy('id', 'desc')
      .executeTakeFirst())
      ?? (await fastify.db
        .selectFrom('mob_no33')
        .select('id')
        .where('request_id', '=', requestId)
        .where(sql`right(receiver, 10)`, '=', sql`right(${receiver}, 10)`)
        .orderBy('id', 'desc')
        .executeTakeFirst());
    if (!row) return;

    const values = {
      row_id:           String(row.id),
      campaign_id:      requestId,
      channel_id:       receiver,
      path_json:        JSON.stringify(presses), // always an array — readers call .filter on it
      final_node:        finalNode,
      digits_pressed:    digitsPressed ? digitsPressed.slice(0, 32) : null,
      duration_seconds:  Number.isFinite(duration) && duration > 0 ? duration : null,
      // The "Call Result" column on the frontend only recognizes a fixed
      // IVR-flow-outcome vocabulary (completed/hangup_early/no_input/
      // transferred/transfer_failed) — the engine's webhook doesn't tell us
      // which of those actually happened, so writing the call `status` here
      // just fell through to its "Error" fallback for every row. Leave it
      // null (renders as "—") rather than show a wrong/confusing result.
      disposition:       disposition,
      forward_billing:   null,
      collected_input:   collectedInput,
      webhook_success:   webhookSuccess,
      webhook_http_code: webhookHttpCode,
      webhook_payload:   webhookPayload,
      webhook_response:  webhookResponse,
    };

    // The engine re-sends a call's webhook until it's acknowledged, so update the
    // existing result row instead of stacking duplicates (keeps forward_billing).
    const existing = await fastify.db
      .selectFrom('ivr_call_results')
      .select('id')
      .where('campaign_id', '=', requestId)
      .where('row_id', '=', String(row.id))
      .orderBy('id', 'desc')
      .executeTakeFirst();
    if (existing) {
      const { forward_billing: _keep, ...rest } = values;
      await fastify.db.updateTable('ivr_call_results').set(rest as any).where('id', '=', existing.id).execute();
    } else {
      await fastify.db.insertInto('ivr_call_results').values(values as any).execute();
    }
  } catch (err) {
    fastify.log.error({ err, requestId, receiver }, '[voice-webhook] Failed to record dtmf_presses');
  }
}

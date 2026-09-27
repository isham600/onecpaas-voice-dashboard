import type { FastifyInstance, FastifyRequest } from 'fastify';
import { randomBytes } from 'node:crypto';
import { sql } from 'kysely';
import { resolveUsername } from '../../../../../utils/resolveUsername.js';
import { ValidationError, NotFoundError } from '../../../../../utils/errors.js';
import { buildFlowFromCallbackAudio, buildFlowFromNested, type EngineFlow } from './ivr-flow.builder.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateRequestId(): string {
  const d   = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rnd = randomBytes(4).toString('hex').toUpperCase();
  return `VCAMP_${ymd}_${rnd}`;
}

function nowParts(): { dat: string; tim: string; dateTime: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dat = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const tim = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return { dat, tim, dateTime: `${dat} ${tim}` };
}

const PHONE_RE = /^\d{10,16}$/;

interface RecipientRow {
  receiver:      string;
  username:      string;
  senderid:      string;
  name:          string;
  status:        string;
  request_id:    string;
  dat:           string;
  tim:           string;
  schedule_date:     string;
  success_full_per:  string;
  media1:            string;
  media2:            string | null;
}

type RowCommon = {
  username: string; senderid: string; name: string; requestId: string;
  dat: string; tim: string; audioUrl: string;
};

// textbox: one number per line, always status 'PP1'
function buildRowsFromTextbox(raw: string, common: RowCommon): RecipientRow[] {
  const numbers = [...new Set(
    raw.split(/\r\n|\r|\n/).map(n => n.trim()).filter(n => PHONE_RE.test(n)),
  )];
  if (numbers.length === 0) return [];

  const status = 'PP1';
  return numbers.map(receiver => ({
    receiver,
    username:      common.username,
    senderid:      common.senderid,
    name:          common.name,
    status,
    request_id:    common.requestId,
    dat:           common.dat,
    tim:           common.tim,
    schedule_date: common.dat,
    success_full_per: "0",
    media1:        common.audioUrl,
    media2:        null,
  }));
}

// CSV: header row skipped, col0 = phone (validated), col1 = optional media2
function buildRowsFromCsv(csvText: string, common: RowCommon): RecipientRow[] {
  const lines = csvText.split(/\r\n|\r|\n/).filter(l => l.trim() !== '');
  const rows: RecipientRow[] = [];

  for (let i = 1; i < lines.length; i++) { // skip header
    const cols     = lines[i].split(',').map(c => c.trim());
    const receiver = cols[0];
    if (!receiver || !PHONE_RE.test(receiver)) continue; // dropped silently, matches legacy behavior

    rows.push({
      receiver,
      username:      common.username,
      senderid:      common.senderid,
      name:          common.name,
      status:        '75',
      request_id:    common.requestId,
      dat:           common.dat,
      tim:           common.tim,
      schedule_date: common.dat,
      success_full_per: "0",
      media1:        common.audioUrl,
      media2:        cols[1] || null,
    });
  }
  return rows;
}

// ── Request fields (multipart — csv_file is optional) ─────────────────────────

interface SubmitFields {
  broadcast_name:        string;
  caller_id:             string;
  audio_file_id:         string;
  counts:                string;
  contacts:              string;
  textbox?:              string;
  retries?:              string;
  retry_interval?:       string;
  response_input?:       string;
  call_failed_message?:  string;
  call_failed_whatsapp?: string;
  fallback_whatsapp_enabled?:       string;
  fallback_whatsapp_delay_minutes?: string;
  fallback_sms_enabled?:            string;
  fallback_sms_delay_minutes?:      string;
  callback_audio?:       string;
  dtmf_flow?:            string;
  ivr_id?:               string;
  pulse30?:              string;
}

// Matches ALLOWED_DELAY_MINUTES in fallback-notify.service.ts.
const ALLOWED_FALLBACK_DELAY_MINUTES = [0, 10, 30, 60, 120, 180, 300];

function parseFallbackDelay(raw: string | undefined): number {
  const parsed = parseInt(raw ?? '0', 10);
  const delay = Number.isFinite(parsed) ? parsed : 0;
  if (!ALLOWED_FALLBACK_DELAY_MINUTES.includes(delay)) {
    throw new ValidationError(`fallback delay must be one of: ${ALLOWED_FALLBACK_DELAY_MINUTES.join(', ')}`);
  }
  return delay;
}

export async function submitVoiceCampaign(
  fastify:       FastifyInstance,
  adminUsername: string,
  request:       FastifyRequest,
): Promise<Record<string, unknown>> {

  // ── Parse multipart ───────────────────────────────────────────────────────
  const fields: Record<string, string> = {};
  let   csvText: string | null = null;

  for await (const part of request.parts()) {
    if (part.type === 'file') {
      if (part.fieldname === 'csv_file' && part.filename) {
        csvText = (await part.toBuffer()).toString('utf-8');
      } else {
        await part.toBuffer(); // drain unknown files
      }
    } else {
      fields[part.fieldname] = (part.value as string) ?? '';
    }
  }

  const f = fields as unknown as SubmitFields;

  const broadcast_name = (f.broadcast_name ?? '').trim();
  const callerId       = (f.caller_id ?? '').trim();
  const audioFileId    = parseInt(f.audio_file_id ?? '', 10);
  let counts           = parseInt(f.counts ?? '', 10);
  const contacts       = parseInt(f.contacts ?? '', 10);
  const textbox        = (f.textbox ?? '').trim();
  const retries        = f.retries ?? null;

  // Minutes between redial attempts for NO ANSWER/BUSY/FAILED rows.
  // Only meaningful when retries > 0; must be one of the offered choices.
  const ALLOWED_RETRY_INTERVALS = [5, 10, 30, 60, 180, 300];
  let retryInterval: number | null = null;
  if (f.retry_interval) {
    const parsed = parseInt(f.retry_interval, 10);
    if (!ALLOWED_RETRY_INTERVALS.includes(parsed)) {
      throw new ValidationError(`retry_interval must be one of: ${ALLOWED_RETRY_INTERVALS.join(', ')}`);
    }
    retryInterval = parsed;
  }
  const responseInput  = f.response_input ?? null;
  const callFailedMsg  = f.call_failed_message ?? null;
  const callFailedWa   = f.call_failed_whatsapp ?? null;
  const fallbackWhatsappEnabled = f.fallback_whatsapp_enabled === '1' || f.fallback_whatsapp_enabled === 'true';
  const fallbackWhatsappDelay   = fallbackWhatsappEnabled ? parseFallbackDelay(f.fallback_whatsapp_delay_minutes) : 0;
  const fallbackSmsEnabled      = f.fallback_sms_enabled === '1' || f.fallback_sms_enabled === 'true';
  const fallbackSmsDelay        = fallbackSmsEnabled ? parseFallbackDelay(f.fallback_sms_delay_minutes) : 0;
  const callbackAudio  = f.callback_audio ?? null;
  const isPulse30      = f.pulse30 === '1' || f.pulse30 === 'true';
  const ivrIdRaw       = parseInt(f.ivr_id ?? '', 10);
  const ivrId          = Number.isFinite(ivrIdRaw) && ivrIdRaw > 0 ? ivrIdRaw : null;

  if (!broadcast_name)              throw new ValidationError('broadcast_name is required');
  if (!callerId)                    throw new ValidationError('caller_id is required');
  if (!ivrId && !Number.isFinite(audioFileId)) throw new ValidationError('audio_file_id is required');
  if (!Number.isFinite(counts) || counts <= 0)     throw new ValidationError('counts must be a positive integer');
  if (!Number.isFinite(contacts) || contacts <= 0)  throw new ValidationError('contacts must be a positive integer');
  if (!textbox && !csvText)          throw new ValidationError('Provide either textbox or csv_file');

  // ── Resolve username from JWT (agent -> parent passthrough, Redis-cached) ──
  const username = await resolveUsername(fastify, adminUsername);

  // ── Resolve audio: a saved IVR brings its own starting audio; otherwise
  // File Hosting audio (must belong to this user) ────────────────────────────
  let audioMedia: string;
  if (ivrId) {
    const ivrRow = await fastify.db
      .selectFrom('voice_ivr_flows')
      .select(['title', 'compiled_flow'])
      .where('id', '=', ivrId)
      .where('username', '=', username)
      .where('status', '=', 1)
      .executeTakeFirst();
    if (!ivrRow) throw new NotFoundError('IVR');
    let compiled: { audio_url?: string; audio_duration?: number; flow?: unknown } | null = null;
    try { compiled = ivrRow.compiled_flow ? JSON.parse(ivrRow.compiled_flow) : null; } catch { compiled = null; }
    if (!compiled?.flow || !compiled.audio_url) {
      throw new ValidationError(`IVR "${ivrRow.title}" can't run yet — open it in the IVR builder, fix the reported issues and save it`);
    }
    const ivrDuration = Number(compiled.audio_duration) || 0;
    if (ivrDuration > 120) throw new ValidationError('IVR audio duration cannot exceed 120 seconds');
    audioMedia = compiled.audio_url;
    if (ivrDuration > 0) counts = Math.ceil(ivrDuration / (isPulse30 ? 30 : 15));
  } else {
    const audioFile = await fastify.db
      .selectFrom('file_managers')
      .select(['id', 'media', 'media_type', 'duration_seconds'])
      .where('id', '=', audioFileId)
      .where('username', '=', username)
      .executeTakeFirst();

    if (!audioFile || audioFile.media_type !== 'audio' || !audioFile.media) {
      throw new NotFoundError('Audio file');
    }

    // Billing is duration-based, 120s hard cap either way. Standard Voice: 1
    // credit per started 15s slab. Voice Pulse 30: 1 credit per started 30s
    // slab (0-30s=1, 31-60s=2, 61-90s=3, 91-120s=4). The probed duration
    // (stored at upload) overrides whatever counts the client sent. Legacy
    // files without a stored duration keep the form value.
    const audioDuration = Number(audioFile.duration_seconds ?? 0);
    if (audioDuration > 0) {
      if (audioDuration > 120) {
        throw new ValidationError('Audio duration cannot exceed 120 seconds');
      }
      counts = Math.ceil(audioDuration / (isPulse30 ? 30 : 15));
    }
    audioMedia = audioFile.media!;
  }

  // ── Build recipient rows before touching credits/DB ─────────────────────────
  const requestId = generateRequestId();
  const { dat, tim, dateTime } = nowParts();
  const rowCommon = {
    username, senderid: callerId, name: broadcast_name, requestId, dat, tim,
    audioUrl: audioMedia,
  };

  const rows = csvText
    ? buildRowsFromCsv(csvText, rowCommon)
    : buildRowsFromTextbox(textbox, rowCommon);

  if (rows.length === 0) throw new ValidationError('No valid numbers were found.');

  // ── Build IVR flow from DTMF config (validated BEFORE credits are touched) ──
  // Nested dtmf_flow (multi-level menus) wins over flat callback_audio when
  // both are sent. Either produces an ivr_flows row keyed by requestId, which
  // routes this campaign through the IVR engine instead of plain playback.
  let ivrFlow: EngineFlow | null = null;

  if (ivrId) {
    // Flow + audio live on the engine (ivr_id) — nothing to build locally.
  } else if (f.dtmf_flow) {
    let parsed: unknown;
    try { parsed = JSON.parse(f.dtmf_flow); } catch {
      throw new ValidationError('dtmf_flow is not valid JSON');
    }
    ivrFlow = buildFlowFromNested(audioMedia, parsed as { rows?: never[] });
  } else if (callbackAudio) {
    let parsed: unknown;
    try { parsed = JSON.parse(callbackAudio); } catch {
      throw new ValidationError('callback_audio is not valid JSON');
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      ivrFlow = buildFlowFromCallbackAudio(audioMedia, parsed);
    }
  }

  // ── Credit check + atomic deduction ──────────────────────────────────────────
  const deductionSum = counts * contacts;
  const creditColumn = isPulse30 ? 'voice_pulse30_credits' : 'voice_credits';

  const creditRow = await fastify.db
    .selectFrom('credits')
    .select(creditColumn)
    .where('username', '=', username)
    .executeTakeFirst();

  const balance = Number(creditRow?.[creditColumn] ?? 0);
  if (balance < deductionSum) {
    throw fastify.httpErrors.paymentRequired(
      `Insufficient credits. Required: ${deductionSum}, Available: ${balance}`,
    );
  }

  // creditColumn is one of two fixed literals above — never derived from raw user input.
  await sql`
    UPDATE credits
    SET ${sql.ref(creditColumn)} = ${sql.ref(creditColumn)} - ${deductionSum}
    WHERE username = ${username} AND ${sql.ref(creditColumn)} >= ${deductionSum}
  `.execute(fastify.db);

  // ── Insert recipients + campaign row in one transaction ─────────────────────
  await fastify.db.transaction().execute(async (trx) => {
    const CHUNK = 1000;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await trx.insertInto('mob_no33').values(rows.slice(i, i + CHUNK)).execute();
    }

    await trx.insertInto('delivery33').values({
      username,
      user_callerid:        callerId,
      requestid:             requestId,
      content:               audioMedia,
      msgtype:               null,
      dte:                   dateTime,
      route:                 'Voice',
      pulse30:               isPulse30 ? 1 : 0,
      deduction:             String(counts),
      contacts:              String(contacts),
      sms:                   'Pending for Verification',
      campaign_name:         broadcast_name,
      response_input:        responseInput,
      call_failed_message:   callFailedMsg,
      call_failed_whatsapp:  callFailedWa,
      fallback_whatsapp_enabled:       fallbackWhatsappEnabled ? 1 : 0,
      fallback_whatsapp_delay_minutes: fallbackWhatsappDelay,
      fallback_sms_enabled:            fallbackSmsEnabled ? 1 : 0,
      fallback_sms_delay_minutes:      fallbackSmsDelay,
      callback_audio:        callbackAudio,
      // Raw as submitted — forwarded as-is to the voice engine (it accepts
      // dtmf_flow directly and understands the full nested vocabulary,
      // including record/submenu/back). ivrFlow/ivr_flows.flow_json below is
      // a separate, already-transformed copy used only for cell247's own
      // reporting — not what gets sent to the engine.
      dtmf_flow:             ivrId ? null : (f.dtmf_flow ?? null),
      ivr_id:                ivrId,
      retries:               retries,
      retries_count:         0,
      retry_interval:        retryInterval,
      voice_id:              null,
    }).execute();

    if (ivrFlow) {
      await trx.insertInto('ivr_flows').values({
        campaign_id: requestId,
        flow_json:   JSON.stringify(ivrFlow),
      }).execute();
    }
  });

  return {
    request_id:       requestId,
    campaign_name:    broadcast_name,
    contacts:         rows.length,
    credits_deducted: deductionSum,
    ivr_enabled:      !!ivrFlow,
    status:           'Pending for Verification',
  };
}

// ── Pause (hard stop) ─────────────────────────────────────────────────────────
// Not-yet-dialed rows (PP*/59*) and rows awaiting a retry (NO ANSWER/BUSY/
// FAILED) are flipped to STOP so the retry worker's status check blocks them
// permanently — next_retry_at is cleared too, belt-and-suspenders. Rows
// already in flight (CALLING/Submitted) or done (ANSWERED) are left alone;
// they finish naturally but nothing new gets dialed. One-way for now — no
// resume.
export async function stopVoiceCampaign(
  fastify:       FastifyInstance,
  tokenUsername: string,
  requestId:     string,
): Promise<{ request_id: string; status: string }> {
  const username = await resolveUsername(fastify, tokenUsername);

  const campaign = await fastify.db
    .selectFrom('delivery33')
    .select(['status'])
    .where('username', '=', username)
    .where('requestid', '=', requestId)
    .executeTakeFirst();

  if (!campaign) throw new NotFoundError('Campaign not found');
  if (campaign.status === 'Completed') {
    throw new ValidationError('Campaign is already completed and cannot be paused');
  }

  await fastify.db.transaction().execute(async (trx) => {
    await trx
      .updateTable('mob_no33')
      .set({ status: 'STOP', next_retry_at: null })
      .where('username', '=', username)
      .where('request_id', '=', requestId)
      .where((eb) => eb.or([
        eb('status', 'like', 'PP%'),
        eb('status', 'like', '59%'),
        eb('status', 'in', ['NO ANSWER', 'BUSY', 'FAILED']),
      ]))
      .execute();

    await trx
      .updateTable('delivery33')
      .set({ status: 'Stopped' })
      .where('username', '=', username)
      .where('requestid', '=', requestId)
      .execute();
  });

  return { request_id: requestId, status: 'Stopped' };
}

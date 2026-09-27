import type { FastifyInstance } from 'fastify';
import { sql } from 'kysely';
import { ValidationError } from '../../../../../utils/errors.js';

export interface SummaryQuery {
  from_date: string;
  to_date:   string;
  status?:   string;
  page?:     number;
  limit?:    number;
  sort?:     string;
  order?:    string;
  pulse30?:  number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const SORTABLE_COLUMNS = ['created_at', 'dte'] as const;
type SortableColumn = (typeof SORTABLE_COLUMNS)[number];

const AUDIO_PREFIX   = 'audio/';
const AUDIO_BASE_URL = 'https://wa1.goshort.in/storage/audios/';

// Ported from account.service.ts's resolveParent — agents act on behalf of
// their parent business username, everyone else uses their own.
export async function resolveParentUsername(
  fastify: FastifyInstance,
  username: string,
): Promise<string> {
  const admin = await fastify.db
    .selectFrom('ci_admin')
    .select('usertype')
    .where('username', '=', username)
    .executeTakeFirst();

  if (admin?.usertype === 'agent') {
    const row = await fastify.db
      .selectFrom('assign_users')
      .select('username')
      .where('assign_user', '=', username)
      .executeTakeFirst();
    return row?.username ?? username;
  }
  return username;
}

// Ported from the legacy checkAndUpdateRequestStatus() side effect: derives
// a human-readable `sms` status from mob_no33 rows for this requestid and
// writes it back to delivery33 so the value stays current on every read.
//
// NOTE: against live data, mob_no33.status never actually holds a "PP*"
// value (checked directly — 0 of ~1.2M rows), so the "Pending for
// Verification" / "Campaign is Started" branches below are effectively
// dead in practice today. Kept as-is per the ported spec in case that
// status convention reappears upstream; the common path is the
// "Submitted, no PP*" -> Completed/Completed (Retried N) branch.
async function syncRequestStatus(
  fastify: FastifyInstance,
  requestid: string,
  currentSms: string,
  retriesCount: number | null,
): Promise<string> {
  const statusRows = await fastify.db
    .selectFrom('mob_no33')
    .select('status')
    .where('request_id', '=', requestid)
    .execute();

  if (statusRows.length === 0) return currentSms;

  const statuses     = statusRows.map((r) => r.status);
  const allPending    = statuses.every((s) => s.startsWith('PP'));
  const anySubmitted  = statuses.some((s) => s === 'Submitted');
  const anyPending    = statuses.some((s) => s.startsWith('PP'));

  let newSms: string | null = null;

  if (allPending) {
    newSms = 'Pending for Verification';
  } else if (anySubmitted && anyPending) {
    newSms = 'Campaign is Started';
  } else if (anySubmitted && !anyPending) {
    newSms = retriesCount && retriesCount > 0
      ? `Completed (Retried ${retriesCount})`
      : 'Completed';
  }

  if (newSms && newSms !== currentSms) {
    await fastify.db
      .updateTable('delivery33')
      .set({ sms: newSms })
      .where('requestid', '=', requestid)
      .execute();
    return newSms;
  }

  return currentSms;
}

export interface DetailsQuery {
  page?:          number;
  limit?:         number;
  search?:        string;
  status?:        string;
  schedule_date?: string;
}

export interface StatusCountsQuery {
  from_date: string;
  to_date:   string;
  pulse30?:  number;
}

export class SummaryService {
  // Status breakdown for the "Call Overview" stat cards on the dashboard.
  // Ported from GET /api/voice-status — counts mob_no33 rows grouped by
  // status, scoped to username + date range (mob_no33.dat, 'YYYY-MM-DD').
  async statusCounts(fastify: FastifyInstance, tokenUsername: string, query: StatusCountsQuery) {
    const { from_date, to_date } = query;

    if (!from_date || !DATE_RE.test(from_date)) {
      throw new ValidationError('from_date is required (YYYY-MM-DD)');
    }
    if (!to_date || !DATE_RE.test(to_date)) {
      throw new ValidationError('to_date is required (YYYY-MM-DD)');
    }
    if (to_date < from_date) {
      throw new ValidationError('to_date must be on or after from_date');
    }

    const username = await resolveParentUsername(fastify, tokenUsername);

    // mob_no33 (per-recipient rows) has no pulse30 column of its own — that
    // flag lives on delivery33 (per-campaign). Join to scope the dashboard's
    // Call Overview to the same channel the rest of the page is showing.
    const rows = await fastify.db
      .selectFrom('mob_no33')
      .innerJoin('delivery33', 'delivery33.requestid', 'mob_no33.request_id')
      .where('mob_no33.username', '=', username)
      .where('mob_no33.dat', '>=', from_date)
      .where('mob_no33.dat', '<=', to_date)
      .where('delivery33.pulse30', '=', query.pulse30 ? 1 : 0)
      .select(['mob_no33.status', ({ fn }) => fn.countAll<number>().as('count')])
      .groupBy('mob_no33.status')
      .execute();

    return {
      data: rows.map((r) => ({ status: r.status, count: Number(r.count) })),
    };
  }

  // Status breakdown for one campaign — backs the status pie chart in the
  // details modal. Ported from GET /api/voice-status-req.
  async statusCountsForRequest(fastify: FastifyInstance, tokenUsername: string, requestId: string) {
    if (!requestId) throw new ValidationError('request_id is required');

    const username = await resolveParentUsername(fastify, tokenUsername);

    const rows = await fastify.db
      .selectFrom('mob_no33')
      .where('username', '=', username)
      .where('request_id', '=', requestId)
      .select(['status', ({ fn }) => fn.countAll<number>().as('count')])
      .groupBy('status')
      .execute();

    return {
      data: rows.map((r) => ({ status: r.status, count: Number(r.count) })),
    };
  }

  // Per-recipient drill-down for one campaign — the "eye" action on the
  // summary list. Ported from GET /api/voice-details.
  async details(
    fastify:       FastifyInstance,
    tokenUsername: string,
    requestId:     string,
    query:         DetailsQuery,
  ) {
    if (!requestId) throw new ValidationError('request_id is required');

    const page   = Math.max(1, Number(query.page) || 1);
    const limit  = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const offset = (page - 1) * limit;

    const username = await resolveParentUsername(fastify, tokenUsername);

    let baseQuery = fastify.db
      .selectFrom('mob_no33')
      .where('username', '=', username)
      .where('request_id', '=', requestId);

    if (query.search) {
      const term = `%${query.search}%`;
      baseQuery = baseQuery.where((eb) => eb.or([
        eb('receiver', 'like', term),
        eb('status',   'like', term),
      ]));
    }

    if (query.status) {
      baseQuery = baseQuery.where('status', '=', query.status);
    }

    if (query.schedule_date) {
      baseQuery = baseQuery.where('schedule_date', '=', query.schedule_date);
    }

    const countRow = await baseQuery
      .select(({ fn }) => [fn.countAll<number>().as('total')])
      .executeTakeFirst();
    const total = Number(countRow?.total ?? 0);

    // LEFT JOIN the IVR outcome (if this campaign ran through the IVR
    // engine) so the drill-down shows what each recipient pressed.
    // ivr_call_results.row_id stores mob_no33.id as a string.
    const data = await baseQuery
      .leftJoin('ivr_call_results as icr', (join) => join
        .onRef('icr.campaign_id', '=', 'mob_no33.request_id')
        .on(sql`icr.row_id = CAST(mob_no33.id AS CHAR)`))
      .selectAll('mob_no33')
      .select([
        'icr.digits_pressed as dtmf_pressed',
        'icr.collected_input as collected_input',
        'icr.webhook_success as webhook_success',
        'icr.webhook_http_code as webhook_http_code',
        'icr.webhook_payload as webhook_payload',
        'icr.webhook_response as webhook_response',
        'icr.disposition as dtmf_disposition',
        // NOT aliased to call_duration — mob_no33.call_duration (the real
        // per-call duration, already included by selectAll above) was being
        // silently overwritten by this DTMF-specific field, which is NULL
        // for the vast majority of calls (anyone who didn't press a key).
        // icr.duration_seconds itself isn't used anywhere downstream today.
        'icr.path_json as dtmf_path',
        'icr.forward_billing as forward_billing',
      ])
      // mob_no33.retry_count is already included by selectAll above
      .orderBy('mob_no33.id', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    // Resolve each recorded key press to the audio/transfer it triggered so
    // the panel can play the reply audio directly from the report. Requires
    // the campaign's flow definition (one fetch per page).
    if (data.some((row: any) => row.dtmf_path)) {
      const flowRow = await fastify.db
        .selectFrom('ivr_flows')
        .select('flow_json')
        .where('campaign_id', '=', requestId)
        .executeTakeFirst();

      let flowNodes: Record<string, any> | null = null;
      if (flowRow?.flow_json) {
        try {
          const parsed = typeof flowRow.flow_json === 'string'
            ? JSON.parse(flowRow.flow_json)
            : flowRow.flow_json;
          flowNodes = parsed?.nodes ?? null;
        } catch { /* malformed flow - presses just won't be playable */ }
      }

      for (const row of data as any[]) {
        let path: Array<{ node?: string; digit?: string; audio?: string; type?: string; transfer_attempts?: Array<{ number: string; status: string }> }> = [];
        try {
          const parsedPath = typeof row.dtmf_path === 'string'
            ? JSON.parse(row.dtmf_path)
            : (row.dtmf_path ?? []);
          path = Array.isArray(parsedPath) ? parsedPath : [];
        } catch { /* ignore */ }

        row.dtmf_presses = path
          .filter((step) => step.digit)
          .map((step) => {
            // Already-resolved shape from the external voice engine's own
            // webhook ({digit, audio, type}) — it played the audio itself,
            // there's no cell247 flow `node` id to look up for these.
            if (!step.node && (step.audio !== undefined || step.type)) {
              return { digit: step.digit, audio: step.audio ?? null, type: step.type ?? 'unknown' };
            }
            const action = flowNodes?.[step.node!]?.digits?.[step.digit!] ?? null;
            if (action?.goto) {
              const target = flowNodes?.[action.goto];
              return {
                digit: step.digit,
                audio: target?.play ?? null,
                type: target?.digits ? 'submenu' : 'audio',
              };
            }
            if (action?.transfer_to_number || action?.transfer_to_extension) {
              return {
                digit: step.digit,
                audio: null,
                type: 'transfer',
                attempts: step.transfer_attempts ?? null,
              };
            }
            if (action?.hangup) {
              return { digit: step.digit, audio: null, type: 'recorded' };
            }
            return { digit: step.digit, audio: null, type: 'unknown' };
          });
        delete row.dtmf_path;
      }
    }

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }

  // DTMF response distribution for one IVR campaign — digit counts +
  // disposition counts from ivr_call_results. Returns ivr_enabled: false
  // for campaigns that never had a flow (plain playback broadcasts).
  async dtmfStats(fastify: FastifyInstance, tokenUsername: string, requestId: string) {
    if (!requestId) throw new ValidationError('request_id is required');

    const username = await resolveParentUsername(fastify, tokenUsername);

    // Ownership check - the campaign must belong to this user.
    const campaign = await fastify.db
      .selectFrom('delivery33')
      .select(['requestid', 'retries', 'retries_count', 'retry_interval'])
      .where('username', '=', username)
      .where('requestid', '=', requestId)
      .executeTakeFirst();
    if (!campaign) throw new ValidationError('Campaign not found');

    // How many rows were actually redialed at least once
    const retriedRow = await fastify.db
      .selectFrom('mob_no33')
      .where('request_id', '=', requestId)
      .where('retry_count', '>', 0)
      .select(({ fn }) => fn.countAll<number>().as('count'))
      .executeTakeFirst();

    const retry = {
      max_retries: Number(campaign.retries ?? 0),
      retry_interval_minutes: campaign.retry_interval ?? null,
      retries_used: Number(campaign.retries_count ?? 0),
      numbers_retried: Number(retriedRow?.count ?? 0),
    };

    const flow = await fastify.db
      .selectFrom('ivr_flows')
      .select('id')
      .where('campaign_id', '=', requestId)
      .executeTakeFirst();

    if (!flow) return { ivr_enabled: false, retry, digits: [], dispositions: [] };

    const digitRows = await fastify.db
      .selectFrom('ivr_call_results')
      .where('campaign_id', '=', requestId)
      .where('digits_pressed', 'is not', null)
      .select(['digits_pressed', ({ fn }) => fn.countAll<number>().as('count')])
      .groupBy('digits_pressed')
      .execute();

    const dispositionRows = await fastify.db
      .selectFrom('ivr_call_results')
      .where('campaign_id', '=', requestId)
      .select(['disposition', ({ fn }) => fn.countAll<number>().as('count')])
      .groupBy('disposition')
      .execute();

    return {
      ivr_enabled: true,
      retry,
      digits: digitRows.map((r) => ({ digits: r.digits_pressed, count: Number(r.count) })),
      dispositions: dispositionRows.map((r) => ({ disposition: r.disposition, count: Number(r.count) })),
    };
  }

  // Returns the raw IVR flow definition (engine flow_json) for a campaign so
  // the panel can render the uploaded DTMF menu read-only.
  async campaignFlow(fastify: FastifyInstance, tokenUsername: string, requestId: string) {
    if (!requestId) throw new ValidationError('request_id is required');
    const username = await resolveParentUsername(fastify, tokenUsername);

    const campaign = await fastify.db
      .selectFrom('delivery33')
      .select('requestid')
      .where('username', '=', username)
      .where('requestid', '=', requestId)
      .executeTakeFirst();
    if (!campaign) throw new ValidationError('Campaign not found');

    const row = await fastify.db
      .selectFrom('ivr_flows')
      .select('flow_json')
      .where('campaign_id', '=', requestId)
      .executeTakeFirst();

    if (!row?.flow_json) return { ivr_enabled: false, flow: null };

    let flow: unknown = row.flow_json;
    if (typeof flow === 'string') {
      try { flow = JSON.parse(flow); } catch { flow = null; }
    }
    return { ivr_enabled: !!flow, flow };
  }

  async list(fastify: FastifyInstance, tokenUsername: string, query: SummaryQuery) {
    const { from_date, to_date, status } = query;

    if (!from_date || !DATE_RE.test(from_date)) {
      throw new ValidationError('from_date is required (YYYY-MM-DD)');
    }
    if (!to_date || !DATE_RE.test(to_date)) {
      throw new ValidationError('to_date is required (YYYY-MM-DD)');
    }
    if (to_date < from_date) {
      throw new ValidationError('to_date must be on or after from_date');
    }

    const page   = Math.max(1, Number(query.page) || 1);
    const limit  = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const sortColumn: SortableColumn = (SORTABLE_COLUMNS as readonly string[]).includes(
      query.sort ?? '',
    )
      ? (query.sort as SortableColumn)
      : 'created_at';
    const sortOrder = query.order === 'asc' ? 'asc' : 'desc';

    const username = await resolveParentUsername(fastify, tokenUsername);

    const startDate = `${from_date} 00:00:00`;
    const endDate   = `${to_date} 23:59:59`;

    let baseQuery = fastify.db
      .selectFrom('delivery33')
      .where('username', '=', username)
      .where('dte', '>=', startDate)
      .where('dte', '<=', endDate)
      .where('pulse30', '=', query.pulse30 ? 1 : 0);

    // delivery33 has no dedicated `status` column — the closest analog is
    // `sms`, the human-readable status text this same endpoint maintains.
    if (status) {
      baseQuery = baseQuery.where('sms', '=', status);
    }

    const countRow = await baseQuery
      .select(({ fn }) => [fn.countAll<number>().as('total')])
      .executeTakeFirst();
    const total = Number(countRow?.total ?? 0);

    const rows = await baseQuery
      .selectAll()
      .orderBy(sortColumn, sortOrder)
      .limit(limit)
      .offset(offset)
      .execute();

    const data = await Promise.all(
      rows.map(async (row) => {
        const sms = await syncRequestStatus(fastify, row.requestid, row.sms, row.retries_count);
        const content = row.content.startsWith(AUDIO_PREFIX)
          ? row.content.replace(AUDIO_PREFIX, AUDIO_BASE_URL)
          : row.content;

        return { ...row, sms, content };
      }),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }
}

export const summaryService = new SummaryService();

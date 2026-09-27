import { sql } from 'kysely';
import { db } from '../models/db.js';
import { redisConnection } from '../queues/index.js';

// ── Voice refund worker ──────────────────────────────────────────────────────
// Credits for a voice campaign are deducted upfront: (per-call rate) x
// (contact count), before any calls happen — every recipient is "pre-paid"
// at delivery33.deduction credits, win or lose. Once a campaign finishes
// (Completed or Stopped), any recipient that never connected should have
// that pre-paid credit given back.
//
// This moves real money (credits), so it's layered against every way two
// overlapping runs (e.g. a PM2 restart briefly running old + new process)
// could double-refund the same campaign:
//   1. Redis lock around the whole tick — the cheap, first line of defense;
//      stops a second overlapping run before it does any work at all.
//   2. Atomic claim per campaign (`UPDATE ... WHERE id=? AND refund=0`,
//      checking rows-affected) — InnoDB row-locks the matched row, so if
//      the Redis lock ever fails to prevent an overlap, at most one of two
//      concurrent transactions can claim a given campaign; the other sees
//      0 rows affected and backs off before touching any credits.
//   3. Unique key on mob_no33_refund_controller(request_id, username) / on
//      mob_no33_pulse_refund_controller(request_id) — belt-and-suspenders at
//      the schema level; makes a duplicate audit row physically impossible
//      to insert regardless of any application bug that might bypass 1/2.
//   4. Claim + credit + audit + ledger all happen in one transaction per
//      campaign — it fully commits or fully rolls back, never half-applies.
//
// Every tick:
//   1. Find delivery33 rows from the last 24h that are Completed/Stopped
//      and not yet refund-checked (refund = 0) — loops in batches until
//      none remain, so a backlog doesn't wait a full tick per 500 rows.
//   2. For each, count recipients that never connected:
//        NO ANSWER / BUSY / FAILED — always
//        STOP                     — only if the campaign was Stopped
//                                    (paused before it could be dialed)
//   3. full_refund = that count x delivery33.deduction — ALWAYS credited to
//      the campaign-owning username, regardless of any reseller redirect.
//   4. partial_refund (permission-gated by the owner's own
//      voice_partial_refund): for ANSWERED calls, charge only what was
//      actually listened.
//        - Standard Voice, and Voice 30 campaigns NOT under a
//          voice_pulse30_refund_reseller-flagged reseller: the usual
//          `deduction - CEIL(call_duration / slab)` per call.
//        - Voice 30 campaigns whose owner IS in a flagged reseller's
//          downline: any call under 15s only effectively costs 0.5 credit
//          regardless of how many slabs it was billed for — refund
//          `deduction - 0.5` instead of the usual slab formula — and the
//          whole partial_refund amount is credited to the RESELLER's
//          account, not the campaign owner's.
//   5. Standard Voice keeps writing to the legacy mob_no33_refund_controller
//      (one combined row, unchanged behavior). Voice 30 writes to its own
//      mob_no33_pulse_refund_controller (one row per campaign, full_refund
//      and partial_refund tracked separately, plus who actually received
//      the partial_refund).
//   6. Either way, set delivery33.refund = 1 so it's never re-checked —
//      this flag (not the audit tables) is the idempotency guard for the
//      "nothing to refund" case, so we never write a zero-credit audit row.

const TAG        = '[voice-refund-checker]';
const SCAN_MS    = 10 * 60_000; // 10 min
const BATCH      = 500;
const MAX_BATCHES_PER_TICK = 20; // safety cap — 10k campaigns/tick before yielding to the next hour
const MAX_DOWNLINE_HOPS = 5; // matches buildSubTree / getSimDownline elsewhere in the codebase

const LOCK_KEY = 'lock:voice-refund-checker';
const LOCK_TTL_MS = 8 * 60_000; // 8 min — under the 10 min tick interval, still ample for one tick

const SHORT_CALL_SECONDS = 15; // under this, Voice 30 reseller-redirect calls only effectively cost SHORT_CALL_CHARGE
const SHORT_CALL_CHARGE  = 0.5; // refund = deduction - SHORT_CALL_CHARGE, not a flat SHORT_CALL_CHARGE refund

/** 'YYYY-MM-DD HH:mm:ss' in IST (UTC+5:30) — matches fund1 conventions */
function nowIST(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 19).replace('T', ' ');
}

function isDuplicateKeyError(err: unknown): boolean {
  const code = (err as { code?: string } | undefined)?.code;
  return code === 'ER_DUP_ENTRY';
}

interface EligibleCampaign {
  id:        number;
  requestid: string;
  username:  string;
  deduction: string;
  status:    string;
  dte:       string;
  pulse30:   number;
}

interface OutcomeCounts {
  failed_count: string | null;
  stop_count:   string | null;
}

// BFS over `clients` (username -> client_username), same pattern as
// getSimDownline in gsm/campaign/services/campaign.service.ts and
// buildSubTree in client-management.service.ts, reimplemented against the
// raw `db` import since this worker runs outside Fastify's request context.
async function resolveDownline(root: string): Promise<Set<string>> {
  const all = new Set<string>([root]);
  let frontier = [root];

  for (let depth = 0; depth < MAX_DOWNLINE_HOPS && frontier.length > 0; depth++) {
    const rows = await db
      .selectFrom('clients')
      .select('client_username')
      .where('username', 'in', frontier)
      .execute();

    const next = rows.map((r) => r.client_username).filter((u) => !all.has(u));
    next.forEach((u) => all.add(u));
    frontier = next;
  }

  return all;
}

// Maps every downline username -> their flagged reseller. Built once per
// tick (not per campaign) — cheap, since normally only a handful of
// resellers will ever have voice_pulse30_refund_reseller set.
async function loadPulse30RefundResellerMap(): Promise<Map<string, string>> {
  const resellers = await db
    .selectFrom('Permissions')
    .select('username')
    .where('voice_pulse30_refund_reseller', '=', 1)
    .execute();

  const map = new Map<string, string>();
  for (const r of resellers) {
    const downline = await resolveDownline(r.username);
    for (const u of downline) {
      if (u === r.username) continue; // a reseller never redirects to itself
      if (!map.has(u)) map.set(u, r.username); // first flagged ancestor wins
    }
  }
  return map;
}

async function processStandardVoiceCampaign(
  campaign:    EligibleCampaign,
  refundCount: number,
  deduction:   number,
): Promise<'refunded' | 'no-op' | 'already-claimed'> {
  let partialCredits = 0;
  if (deduction > 0) {
    const perms = await db
      .selectFrom('Permissions')
      .select(['voice_partial_refund'])
      .where('username', '=', campaign.username)
      .executeTakeFirst();

    if (Number(perms?.voice_partial_refund ?? 0) === 1) {
      const partial = await sql<{ partial_sum: string | null }>`
        SELECT COALESCE(SUM(GREATEST(${deduction} - CEIL(call_duration / 15), 0)), 0) AS partial_sum
        FROM mob_no33
        WHERE request_id = ${campaign.requestid} AND username = ${campaign.username}
          AND status = 'ANSWERED' AND call_duration >= 1
      `.execute(db);
      partialCredits = Number(partial.rows[0]?.partial_sum ?? 0);
    }
  }

  const refundCredits = refundCount * deduction + partialCredits;

  let outcome: 'refunded' | 'no-op' | 'already-claimed' = 'no-op';

  try {
    await db.transaction().execute(async (trx) => {
      const claim = await trx
        .updateTable('delivery33')
        .set({ refund: 1 })
        .where('id', '=', campaign.id)
        .where('refund', '=', 0)
        .executeTakeFirst();

      if (Number(claim.numUpdatedRows ?? 0) === 0) {
        outcome = 'already-claimed';
        return;
      }

      if (refundCredits > 0) {
        await trx.updateTable('credits')
          .set((eb) => ({ voice_credits: eb('voice_credits', '+', refundCredits) }))
          .where('username', '=', campaign.username)
          .execute();

        // Unique key on (request_id, username) — throws ER_DUP_ENTRY if a
        // refund for this campaign somehow already exists. Caught below;
        // the whole transaction (including the claim above) rolls back.
        await trx.insertInto('mob_no33_refund_controller').values({
          request_id: campaign.requestid,
          username:   campaign.username,
          credits:    refundCredits,
        }).execute();

        const admin = await trx
          .selectFrom('ci_admin')
          .select('usertype')
          .where('username', '=', campaign.username)
          .executeTakeFirst();

        await trx.insertInto('fund1').values({
          // Must match channels.front_end_name for back_end_name='voice_credits'
          // ('Voice 15') — the statement's getMyStatement() filters fund1 rows
          // by exact service-name match against that table. This used to say
          // 'Voice Broadcast', a string not registered in `channels` at all,
          // so every refund through this (the actually-used, non-pulse30) path
          // was written correctly but silently invisible on the client's
          // Debit/Credit Statement — same class of bug the pulse30 branch
          // below already avoids by correctly using 'Voice 30'.
          service:  'Voice 15',
          sms:      String(refundCredits),
          accex:    '0',
          amt:      '0',
          taxamt:   '0',
          pps:      0,
          decrip:   `Refund for ${campaign.requestid} (${campaign.dte.slice(0, 10)})`,
          name:     campaign.username,
          cd:       'Credit',
          dte:      nowIST(),
          usertype: admin?.usertype ?? 'client',
          reseller: 'system',
        }).execute();

        outcome = 'refunded';
      }
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      console.warn(`${TAG} Duplicate refund blocked by unique key for ${campaign.requestid} — already refunded, skipping`);
      return 'already-claimed';
    }
    throw err;
  }

  return outcome;
}

async function processPulse30Campaign(
  campaign:           EligibleCampaign,
  refundCount:        number,
  deduction:           number,
  pulse30ResellerMap: Map<string, string>,
): Promise<'refunded' | 'no-op' | 'already-claimed'> {
  const fullRefundCredits = refundCount * deduction;
  const redirectTarget    = pulse30ResellerMap.get(campaign.username) ?? null;

  let partialCredits = 0;
  if (deduction > 0) {
    const perms = await db
      .selectFrom('Permissions')
      .select(['voice_partial_refund'])
      .where('username', '=', campaign.username)
      .executeTakeFirst();

    if (Number(perms?.voice_partial_refund ?? 0) === 1) {
      // Reseller-redirected campaigns: an answered call under 15s only ever
      // effectively costs SHORT_CALL_CHARGE (0.5) credit, regardless of how
      // many slabs the call was originally billed for — refund the
      // difference between what was actually charged and that 0.5, not a
      // flat 0.5. (The usual slab math would refund 0 for anything answered
      // within the first 30s slab, which undercounts multi-slab campaigns.)
      const partial = redirectTarget
        ? await sql<{ partial_sum: string | null }>`
            SELECT COALESCE(SUM(
              CASE
                WHEN call_duration >= 1 AND call_duration < ${sql.lit(SHORT_CALL_SECONDS)} THEN GREATEST(${deduction} - ${sql.lit(SHORT_CALL_CHARGE)}, 0)
                ELSE GREATEST(${deduction} - CEIL(call_duration / 30), 0)
              END
            ), 0) AS partial_sum
            FROM mob_no33
            WHERE request_id = ${campaign.requestid} AND username = ${campaign.username}
              AND status = 'ANSWERED' AND call_duration >= 1
          `.execute(db)
        : await sql<{ partial_sum: string | null }>`
            SELECT COALESCE(SUM(GREATEST(${deduction} - CEIL(call_duration / 30), 0)), 0) AS partial_sum
            FROM mob_no33
            WHERE request_id = ${campaign.requestid} AND username = ${campaign.username}
              AND status = 'ANSWERED' AND call_duration >= 1
          `.execute(db);
      partialCredits = Number(partial.rows[0]?.partial_sum ?? 0);
    }
  }

  const partialRecipient = redirectTarget ?? campaign.username;

  let outcome: 'refunded' | 'no-op' | 'already-claimed' = 'no-op';

  try {
    await db.transaction().execute(async (trx) => {
      const claim = await trx
        .updateTable('delivery33')
        .set({ refund: 1 })
        .where('id', '=', campaign.id)
        .where('refund', '=', 0)
        .executeTakeFirst();

      if (Number(claim.numUpdatedRows ?? 0) === 0) {
        outcome = 'already-claimed';
        return;
      }

      if (fullRefundCredits > 0) {
        await sql`
          UPDATE credits SET voice_pulse30_credits = voice_pulse30_credits + ${fullRefundCredits}
          WHERE username = ${campaign.username}
        `.execute(trx);
      }

      if (partialCredits > 0) {
        await sql`
          UPDATE credits SET voice_pulse30_credits = voice_pulse30_credits + ${partialCredits}
          WHERE username = ${partialRecipient}
        `.execute(trx);
      }

      if (fullRefundCredits > 0 || partialCredits > 0) {
        // Unique key on request_id — throws ER_DUP_ENTRY if this campaign
        // was somehow already recorded. Caught below; the whole
        // transaction (including the claim above) rolls back.
        await trx.insertInto('mob_no33_pulse_refund_controller').values({
          request_id:              campaign.requestid,
          username:                campaign.username,
          full_refund:             fullRefundCredits,
          partial_refund:          partialCredits,
          partial_refund_username: partialCredits > 0 ? partialRecipient : null,
        }).execute();

        if (fullRefundCredits > 0) {
          const admin = await trx
            .selectFrom('ci_admin')
            .select('usertype')
            .where('username', '=', campaign.username)
            .executeTakeFirst();

          await trx.insertInto('fund1').values({
            service:  'Voice 30',
            sms:      String(fullRefundCredits),
            accex:    '0',
            amt:      '0',
            taxamt:   '0',
            pps:      0,
            decrip:   `Refund for ${campaign.requestid} (${campaign.dte.slice(0, 10)})`,
            name:     campaign.username,
            cd:       'Credit',
            dte:      nowIST(),
            usertype: admin?.usertype ?? 'client',
            reseller: 'system',
          }).execute();
        }

        if (partialCredits > 0) {
          const recipientAdmin = await trx
            .selectFrom('ci_admin')
            .select('usertype')
            .where('username', '=', partialRecipient)
            .executeTakeFirst();

          await trx.insertInto('fund1').values({
            service:  'Voice 30',
            sms:      String(partialCredits),
            accex:    '0',
            amt:      '0',
            taxamt:   '0',
            pps:      0,
            decrip:   redirectTarget
              ? `Voice 30 partial refund for ${campaign.requestid} — from username ${campaign.username} (${campaign.dte.slice(0, 10)})`
              : `Partial refund (unheard duration) for ${campaign.requestid} (${campaign.dte.slice(0, 10)})`,
            name:     partialRecipient,
            cd:       'Credit',
            dte:      nowIST(),
            usertype: recipientAdmin?.usertype ?? 'client',
            reseller: redirectTarget ?? 'system',
          }).execute();
        }

        outcome = 'refunded';
      }
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      console.warn(`${TAG} Duplicate refund blocked by unique key for ${campaign.requestid} — already refunded, skipping`);
      return 'already-claimed';
    }
    throw err;
  }

  return outcome;
}

async function processCampaign(
  campaign:           EligibleCampaign,
  pulse30ResellerMap: Map<string, string>,
): Promise<'refunded' | 'no-op' | 'already-claimed'> {
  const counts = await sql<OutcomeCounts>`
    SELECT
      SUM(CASE WHEN status IN ('NO ANSWER', 'BUSY', 'FAILED') THEN 1 ELSE 0 END) AS failed_count,
      SUM(CASE WHEN status = 'STOP' THEN 1 ELSE 0 END) AS stop_count
    FROM mob_no33
    WHERE request_id = ${campaign.requestid} AND username = ${campaign.username}
  `.execute(db);

  const row         = counts.rows[0];
  const failedCount = Number(row?.failed_count ?? 0);
  const stopCount   = campaign.status === 'Stopped' ? Number(row?.stop_count ?? 0) : 0;
  const refundCount = failedCount + stopCount;
  const deduction   = Number(campaign.deduction) || 0;
  const isPulse30   = Number(campaign.pulse30) === 1;

  return isPulse30
    ? processPulse30Campaign(campaign, refundCount, deduction, pulse30ResellerMap)
    : processStandardVoiceCampaign(campaign, refundCount, deduction);
}

async function processRefunds(): Promise<void> {
  let refunded = 0;
  let checked  = 0;

  const pulse30ResellerMap = await loadPulse30RefundResellerMap();

  for (let batch = 0; batch < MAX_BATCHES_PER_TICK; batch++) {
    const campaigns = await sql<EligibleCampaign>`
      SELECT id, requestid, username, deduction, status, dte, pulse30
      FROM delivery33
      WHERE refund = 0
        AND status IN ('Completed', 'Stopped')
        AND STR_TO_DATE(dte, '%Y-%m-%d %H:%i:%s') >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      LIMIT ${sql.lit(BATCH)}
    `.execute(db);

    if (campaigns.rows.length === 0) break;

    for (const campaign of campaigns.rows) {
      try {
        const outcome = await processCampaign(campaign, pulse30ResellerMap);
        checked++;
        if (outcome === 'refunded') refunded++;
      } catch (err) {
        console.error(`${TAG} Failed processing ${campaign.requestid}:`, err);
      }
    }

    if (campaigns.rows.length < BATCH) break;
  }

  if (checked > 0) console.log(`${TAG} Checked ${checked} campaign(s), refunded ${refunded}`);
}

// Simple NX+expiry distributed lock via the shared Redis connection — no
// extra dependency needed for a single-Redis-instance setup. The random
// token means we only ever release a lock we still own, so an expired
// lock re-acquired by another process is never accidentally cleared.
async function withLock(fn: () => Promise<void>): Promise<void> {
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const acquired = await redisConnection.set(LOCK_KEY, token, 'PX', LOCK_TTL_MS, 'NX');

  if (acquired !== 'OK') {
    console.log(`${TAG} Skipping tick — another run holds the lock`);
    return;
  }

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

export function startVoiceRefundCheckerWorker() {
  const tick = () => withLock(processRefunds).catch((err) => console.error(`${TAG} Tick error:`, err));

  const scanTimer = setInterval(tick, SCAN_MS);

  // Run once immediately on boot
  tick();

  console.log(`${TAG} Started — scan interval: ${SCAN_MS / 60_000}min`);

  return {
    close: async () => {
      clearInterval(scanTimer);
    },
  };
}

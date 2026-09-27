import { db } from '../models/db.js';
import { redisConnection } from '../queues/index.js';
import { sendFallbackNotification, resolveFallbackConfig } from '../modules/v1/voice/fallback-notify/services/fallback-notify.service.js';

// ── Voice call fallback notify worker ────────────────────────────────────────
// Sweeps call_failure_notify_queue for rows whose configured delay has
// elapsed (send_after <= NOW(), 0-minute delay = due immediately) and
// actually sends them. Deliberately NOT gated by RUN_SINGLETON_WORKERS —
// both PM2 worker processes run this on their own interval, safe because:
//   1. A Redis NX lock around each tick (same withLock() pattern as
//      voice-refund-checker.worker.ts) stops a second overlapping tick
//      before it does any work.
//   2. Belt-and-suspenders: each row is additionally claimed with an atomic
//      `UPDATE ... WHERE id=? AND status='pending'`, checking rows-affected
//      — if the lock ever fails to prevent an overlap, only one of two
//      concurrent claims on the same row can ever succeed.
//
// Route/assignment resolution is re-run at SEND time (not trusted from
// queue time) — a delay can be up to 5 hours, long enough for an admin to
// have re-assigned or deleted the route in between; re-resolving picks up
// whatever is actually configured right now, same as a fresh call would.
// On completion, writes fallback_status/response/error/payload directly
// onto the mob_no33 row too (not just the queue table), so it's visible in
// the report/detail views without a join.
//
// The claim itself leaves status='pending' (previously it pessimistically
// flipped to 'failed' before the send even started, which meant an admin
// viewing the Logs/Report table during that brief window saw a false
// "failed" row with no HTTP code or response). claimed_at is the atomic
// claim marker instead — a row is claimable if it's pending AND either
// never claimed or its claim is older than CLAIM_TIMEOUT_MS (handles a
// worker that died mid-send without ever writing a final status).

const TAG        = '[call-fallback-notify]';
const SCAN_MS    = 30_000; // "Immediate" (delay_minutes=0) should still feel prompt
const BATCH      = 50;
const LOCK_KEY   = 'lock:call-fallback-notify';
const LOCK_TTL_MS = 25_000; // under SCAN_MS, ample for one batch
const CLAIM_TIMEOUT_MS = 60_000; // a claim older than this is assumed dead and reclaimable

interface DueRow {
  id: number;
  tracking_id: string;
  channel: 'whatsapp' | 'sms';
  receiver: string;
  mob_no33_id: number | null;
  username: string;
}

async function updateMobNo33(mobNo33Id: number | null, fields: Record<string, unknown>): Promise<void> {
  if (!mobNo33Id) return;
  await db.updateTable('mob_no33').set(fields as any).where('id', '=', mobNo33Id).execute();
}

async function processDueNotifications(): Promise<void> {
  let sent = 0, failed = 0, skipped = 0;

  for (let i = 0; i < 20; i++) { // safety cap per tick, matches BATCH * 20 ceiling elsewhere in this codebase
    const claimCutoff = new Date(Date.now() - CLAIM_TIMEOUT_MS);
    const due = await db
      .selectFrom('call_failure_notify_queue')
      .select(['id', 'tracking_id', 'channel', 'receiver', 'mob_no33_id', 'username'])
      .where('status', '=', 'pending')
      .where('send_after', '<=', new Date())
      .where((eb) => eb.or([eb('claimed_at', 'is', null), eb('claimed_at', '<', claimCutoff)]))
      .orderBy('id', 'asc')
      .limit(BATCH)
      .execute() as unknown as DueRow[];

    if (due.length === 0) break;

    for (const row of due) {
      // Atomic per-row claim — stays 'pending' (a false "failed" mid-send
      // used to show up in the Logs/Report table for the brief window
      // before the real send completed). claimed_at is the atomic marker;
      // a stale claim (worker died mid-send) becomes reclaimable again
      // after CLAIM_TIMEOUT_MS via the `due` query above.
      const claim = await db
        .updateTable('call_failure_notify_queue')
        .set((eb) => ({ claimed_at: new Date(), attempts: eb('attempts', '+', 1) }) as any)
        .where('id', '=', row.id)
        .where('status', '=', 'pending')
        .where((eb) => eb.or([eb('claimed_at', 'is', null), eb('claimed_at', '<', claimCutoff)]))
        .executeTakeFirst();
      if (Number(claim.numUpdatedRows ?? 0) === 0) continue; // claimed by the other process already

      try {
        const resolved = await resolveFallbackConfig(db, row.username, row.channel);
        if (!resolved) {
          const note = 'No route resolved for this account, its ancestors, or the platform default at send time.';
          await db.updateTable('call_failure_notify_queue')
            .set({ status: 'failed', resolution_level: 'none', response_body: note, sent_at: new Date() } as any)
            .where('id', '=', row.id).execute();
          await updateMobNo33(row.mob_no33_id, { fallback_status: 'failed', fallback_error: note });
          skipped++;
          continue;
        }

        const result = await sendFallbackNotification(resolved.route, {
          number: row.receiver,
          trackingId: row.tracking_id,
        });

        await db.updateTable('call_failure_notify_queue')
          .set({
            status:             result.ok ? 'sent' : 'failed',
            resolution_level:   resolved.level,
            resolved_username:  resolved.resolvedUsername,
            route_id:           resolved.route.id,
            url:                result.requestUrl,
            request_payload:    result.requestBody,
            response_status:    result.status,
            response_body:      result.error ?? result.body,
            sent_at:            new Date(),
          } as any)
          .where('id', '=', row.id)
          .execute();

        // status 200 (result.ok) -> fallback_status='sent' on the recipient
        // row too, per the explicit ask: report/error/payload visible
        // directly on mob_no33, not just the queue's audit trail.
        await updateMobNo33(row.mob_no33_id, {
          fallback_status:   result.ok ? 'sent' : 'failed',
          fallback_response: result.ok ? result.body : null,
          fallback_error:    result.ok ? null : (result.error ?? result.body),
          fallback_payload:  result.requestBody,
        });

        if (result.ok) sent++; else failed++;
      } catch (err) {
        const message = String((err as any)?.message ?? err);
        await db.updateTable('call_failure_notify_queue')
          .set({ status: 'failed', response_body: message, sent_at: new Date() } as any)
          .where('id', '=', row.id).execute();
        await updateMobNo33(row.mob_no33_id, { fallback_status: 'failed', fallback_error: message });
        failed++;
        console.error(`${TAG} Error sending row ${row.id}:`, err);
      }
    }

    if (due.length < BATCH) break;
  }

  if (sent || failed || skipped) console.log(`${TAG} Tick: sent=${sent} failed=${failed} skipped(none)=${skipped}`);
}

// Same NX+expiry distributed lock as voice-refund-checker.worker.ts.
async function withLock(fn: () => Promise<void>): Promise<void> {
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const acquired = await redisConnection.set(LOCK_KEY, token, 'PX', LOCK_TTL_MS, 'NX');
  if (acquired !== 'OK') return; // another process holds the lock this tick — quiet skip, this runs every 30s

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

export function startCallFallbackNotifyWorker() {
  const tick = () => withLock(processDueNotifications).catch((err) => console.error(`${TAG} Tick error:`, err));

  const scanTimer = setInterval(tick, SCAN_MS);
  tick(); // run once immediately on boot

  console.log(`${TAG} Started — scan interval: ${SCAN_MS / 1000}s`);

  return {
    close: async () => {
      clearInterval(scanTimer);
    },
  };
}

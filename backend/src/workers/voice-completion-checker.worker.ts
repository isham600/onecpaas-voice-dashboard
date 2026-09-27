import { sql } from 'kysely';
import { db } from '../models/db.js';

// ── Voice campaign status classifier ────────────────────────────────────────
// A voice campaign's recipient rows (mob_no33) move through:
//   PP1/75 (submitted) -> 59 (queued to dial) -> CALLING/Submitted ->
//   a terminal outcome (ANSWERED / NO ANSWER / BUSY / FAILED / CANCELED).
//
// Retries are NOT handled here — cell247 forwards `retries`/`retry_interval`
// to the external voice engine at dispatch and the engine redials on its own,
// sending further status webhooks against the same mob_no33 row as it does.
// Only the retry-specific "Processing-Retries" status is dropped — it leaked
// the engine's background redialing to the client and confused them, since a
// campaign they considered finished would flip back and forth while the
// engine kept retrying behind the scenes. Plain Pending/Processing/Completed
// stays.
//
// This worker classifies each campaign's delivery33.status from the
// aggregate state of its mob_no33 rows every SCAN_MS:
//   - Pending    every row is still PP1/59/75 (nothing dialed yet)
//   - Processing some rows dialed, some not, or still on a call
//   - Completed  every row has reached a terminal outcome at least once.
//                Stays Completed even if the engine later redials a failed
//                number in the background — that's a same-row status update
//                to the client-facing detail view, not a campaign-level
//                state change.

const TAG      = '[voice-completion-checker]';
const SCAN_MS  = 5_000;

let isProcessing = false;

async function classifyCampaignStatuses(): Promise<void> {
  // The aggregate UPDATE below can outrun SCAN_MS on a large mob_no33 table.
  // Without this guard, the next tick fires anyway and a second identical
  // UPDATE self-blocks on the first (observed live via INNODB_TRX: two
  // threads running the exact same query, one in LOCK WAIT on the other),
  // holding row locks long enough to cause lock-wait-timeouts elsewhere.
  if (isProcessing) {
    console.log(`${TAG} Previous scan still running, skipping this tick`);
    return;
  }
  isProcessing = true;
  try {
    await runClassifyCampaignStatuses();
  } finally {
    isProcessing = false;
  }
}

async function runClassifyCampaignStatuses(): Promise<void> {
  // Only ever need to look at mob_no33 rows belonging to a campaign that's
  // still non-terminal in delivery33 — this is the same set the outer
  // UPDATE's WHERE already targets. Scoping the aggregation to it (instead
  // of grouping the ENTIRE mob_no33 table every 60s) is what actually keeps
  // this cheap, so there is no need for — and no excuse for — a time cutoff
  // on top of it. A previous version additionally required
  // `d.created_at >= NOW() - INTERVAL 24 HOUR`, meant as a performance
  // guard but actually just an unscoped correctness bug: any campaign still
  // dialing (or fully done but never caught by a tick) past its 24th hour
  // fell out of this WHERE forever and stayed stuck at Pending/Processing —
  // permanently, even after every one of its rows reached a real terminal
  // outcome. Real incident: VCAMP_20260910_19092DAF and _58EC1E0F, both
  // fully resolved (all NO ANSWER) but stuck at "Pending" at 29h old.
  const result = await sql`
    UPDATE delivery33 d
    JOIN (
      SELECT
        m.request_id,
        m.username,
        COUNT(*) AS total,
        SUM(CASE WHEN m.status IN ('PP1', '59') THEN 1 ELSE 0 END) AS undialed,
        SUM(
          CASE
            WHEN m.status NOT IN ('ANSWERED', 'fail', 'CANCELED', 'NO ANSWER', 'BUSY', 'FAILED')
            THEN 1 ELSE 0
          END
        ) AS in_progress
      FROM mob_no33 m
      WHERE m.request_id IN (
        SELECT requestid FROM delivery33
        WHERE status IN ('Pending', 'Processing', 'Processing-Retries', 'Insufficient Credits')
      )
      GROUP BY m.request_id, m.username
    ) agg
      ON agg.request_id = d.requestid AND agg.username = d.username
    SET d.status = CASE
      -- voice-dispatch.worker.ts flags this when the engine rejects a batch
      -- for insufficient balance. Stays put while still fully undialed —
      -- otherwise this scan would flip it straight back to 'Pending' every
      -- tick and the reason would never be visible. Once dispatch actually
      -- makes progress (credits topped up, next batch goes out), it falls
      -- through to the normal classification below like anything else.
      WHEN d.status = 'Insufficient Credits' AND agg.undialed = agg.total THEN 'Insufficient Credits'
      WHEN agg.undialed = agg.total THEN 'Pending'
      WHEN agg.in_progress > 0 OR agg.undialed > 0 THEN 'Processing'
      ELSE 'Completed'
    END
    WHERE d.status IN ('Pending', 'Processing', 'Processing-Retries', 'Insufficient Credits')
    AND d.status != CASE
      WHEN d.status = 'Insufficient Credits' AND agg.undialed = agg.total THEN 'Insufficient Credits'
      WHEN agg.undialed = agg.total THEN 'Pending'
      WHEN agg.in_progress > 0 OR agg.undialed > 0 THEN 'Processing'
      ELSE 'Completed'
    END

  `.execute(db);

  const updated = Number((result as any).numAffectedRows ?? 0);
  if (updated > 0) console.log(`${TAG} Reclassified ${updated} campaign(s)`);
}

export function startVoiceCompletionCheckerWorker() {
  const scanTimer = setInterval(() => {
    classifyCampaignStatuses().catch((err) => console.error(`${TAG} Scan error:`, err));
  }, SCAN_MS);

  // Run once immediately on boot
  classifyCampaignStatuses().catch((err) => console.error(`${TAG} Boot scan error:`, err));

  console.log(`${TAG} Started — scan interval: ${SCAN_MS / 1000}s`);

  return {
    close: async () => {
      clearInterval(scanTimer);
    },
  };
}

import { ValidationError } from '../../../../../utils/errors.js';

/**
 * Builds the flow_json consumed by the voice engine's IVR Stasis app
 * (dinstar-voice-api repo, docs/ivr-engine.md) from either of the two
 * shapes the panel can submit:
 *
 * 1. Flat `callback_audio` (legacy, one level):
 *    [{ dtmf: "1", selected_audio: "https://..." } | { dtmf: "2", selected_number: "9..." }]
 *
 * 2. Nested `dtmf_flow` (multi-level menus, up to MAX_DEPTH):
 *    { rows: [{ digit, action: "audio"|"transfer"|"submenu"|"back",
 *               audio?, after?: "hangup"|"repeat", number?,
 *               prompt_audio?, rows? }] }
 *
 * The campaign's main audio is always the root menu prompt.
 */

const MAX_DEPTH = 5;
const MAX_DIGITS_PER_MENU = 9;
const DIGIT_RE = /^[0-9]$/;
// Sentinel "digit" for the menu's Other / no-match branch (moved to node.invalid).
const OTHER_KEY = 'other';
// Absolute ceiling on how many times a menu/collect prompt may replay, so a
// misconfigured looping value can't loop a call for minutes of dead air.
const MAX_MENU_ATTEMPTS = 5;
const URL_RE = /^https?:\/\/[^\s\r\n`$;|&]+$/;
const PHONE_RE = /^\d{10,16}$/;

type EngineDigitAction =
  | { goto: string }
  | {
      transfer_to_number: string;
      fallback_numbers?: string[];
      // (B) drawer-driven dialing controls
      ring_seconds?: number;
      retry_count?: number;
      overall_timeout_seconds?: number;
      // (#4) run this when no agent answered; (#5) run this after the agent leg ends
      on_no_answer?: { goto: string };
      then?: { goto: string };
    }
  | { hangup: true };

// Long-DTMF: gather multiple digits (fixed length OR key-terminated).
interface EngineCollect {
  length?: number;          // fixed-length mode
  terminator?: string;      // key-terminated mode (e.g. '#')
  timeout_seconds?: number;
  loop_on_empty?: boolean;
  loop_on_invalid?: boolean;
  max_attempts?: number;    // 1 + looping count from the drawer (capped)
}

// Per-menu playback settings (from the DTMF drawer) applied to a menu node.
interface EngineMenuConfig {
  timeout_seconds?:   number;
  max_attempts?:      number;
  reprompt_no_input?: string;
  reprompt_invalid?:  string;
}

// Webhook: fire-and-forget HTTP call with dynamic headers/body ({{var}} tokens).
interface EngineWebhook {
  url:      string;
  method:   string;
  headers?: Record<string, string>;
  body?:    string;
  // Engine aborts the request after this many ms (its own default is 10s). The
  // call never waits for it, but a real WhatsApp/SMS provider send can take ~9s+.
  timeout_ms?: number;
}

interface EngineNode {
  play?: string;
  digits?: Record<string, EngineDigitAction>;
  // "Other" / no-match branch: run this action when the caller presses a key
  // that isn't in `digits` (or gives no input). Same shape as any digit action.
  invalid?: EngineDigitAction;
  collect?: EngineCollect;
  webhook?: EngineWebhook;
  timeout_seconds?: number;
  max_attempts?: number;
  // Audio replayed on a retry: after no input, or after a wrong key. Fall back
  // to the main `play` prompt when unset.
  reprompt_no_input?: string;
  reprompt_invalid?: string;
  goto?: string;
  hangup?: boolean;
}

const MAX_INPUT_LENGTH = 32;
const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const WEBHOOK_DEFAULT_TIMEOUT_MS = 30_000;
const WEBHOOK_MAX_TIMEOUT_MS = 60_000;
const WEBHOOK_URL_RE = /^https?:\/\/[^\s\r\n`$;|&]+$/;

// Validate/shape a webhook config for the engine (from convert or raw dtmf_flow).
function normalizeWebhook(w: EngineWebhook | undefined, where: string): EngineWebhook {
  const url = String(w?.url ?? '').trim();
  if (!WEBHOOK_URL_RE.test(url)) throw new ValidationError(`Webhook needs a valid http(s) URL (${where})`);
  const method = String(w?.method ?? 'POST').toUpperCase();
  if (!HTTP_METHODS.has(method)) throw new ValidationError(`Unsupported webhook method "${method}" (${where})`);
  const out: EngineWebhook = { url, method };
  const timeoutMs = Number((w as { timeout_ms?: unknown } | undefined)?.timeout_ms);
  out.timeout_ms = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.min(Math.trunc(timeoutMs), WEBHOOK_MAX_TIMEOUT_MS) : WEBHOOK_DEFAULT_TIMEOUT_MS;
  if (w?.headers && typeof w.headers === 'object') {
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(w.headers)) {
      const key = String(k).trim();
      if (key) headers[key] = String(v ?? '');
    }
    if (Object.keys(headers).length) out.headers = headers;
  }
  if (w?.body != null && String(w.body).trim() !== '') out.body = String(w.body);
  return out;
}

// Validate/shape a collect config for the engine (from convert or raw dtmf_flow).
function normalizeCollect(c: EngineCollect | undefined, where: string): EngineCollect {
  const cfg: EngineCollect = {};
  const len = Number(c?.length);
  const term = c?.terminator != null ? String(c.terminator) : '';
  if (Number.isInteger(len) && len > 0 && len <= MAX_INPUT_LENGTH) cfg.length = len;
  else if (term) cfg.terminator = term;
  else throw new ValidationError(`Long-DTMF needs a fixed length (1-${MAX_INPUT_LENGTH}) or a terminator key (${where})`);
  const t = Number(c?.timeout_seconds);
  if (Number.isFinite(t) && t > 0) cfg.timeout_seconds = t;
  if (c?.loop_on_empty) cfg.loop_on_empty = true;
  if (c?.loop_on_invalid) cfg.loop_on_invalid = true;
  const ma = Number(c?.max_attempts);
  if (Number.isInteger(ma) && ma > 1) cfg.max_attempts = Math.min(ma, MAX_MENU_ATTEMPTS);
  return cfg;
}

export interface EngineFlow {
  start: string;
  nodes: Record<string, EngineNode>;
}

interface FlatRow {
  dtmf: string;
  selected_audio?: string;
  selected_number?: string;
}

interface NestedRow {
  digit: string;
  action: 'audio' | 'transfer' | 'submenu' | 'back' | 'record' | 'collect' | 'webhook';
  audio?: string;
  after?: 'hangup' | 'repeat';
  number?: string;
  // transfer only: tried in order when the previous number doesn't answer
  fallback_numbers?: string[];
  prompt_audio?: string;
  rows?: NestedRow[];
  // submenu only: the sub-menu's own timeout / looping settings
  menu?: EngineMenuConfig;
  // transfer only: what happens when the forwarded conversation ends (or
  // the target never answers) while the caller is still on the line
  after_transfer?: 'hangup' | 'menu' | 'audio' | 'rating';
  after_transfer_audio?: string;
  // transfer only (B): drawer dialing controls
  ring_seconds?: number;
  retry_count?: number;
  overall_timeout_seconds?: number;
  // transfer only: (#4) a step to run when no agent answered, and (#5) a step to
  // run after the agent conversation ends - each an ordinary node (announcement,
  // sub-menu, Long-DTMF, webhook or hangup).
  no_answer?: NestedRow;
  after_transfer_step?: NestedRow;
  // collect (Long-DTMF) only: how many/which digits to gather, an optional
  // confirmation audio, and/or a webhook to fire after capture (then hang up).
  collect?: EngineCollect;
  after_collect_audio?: string;
  after_webhook?: EngineWebhook;
  // webhook step only
  webhook?: EngineWebhook;
}

function assertAudioUrl(url: unknown, where: string): string {
  if (typeof url !== 'string' || !URL_RE.test(url)) {
    throw new ValidationError(`Invalid audio URL in DTMF config (${where})`);
  }
  return url;
}

/** Flat legacy shape -> one menu + one response node per digit. */
export function buildFlowFromCallbackAudio(mainAudioUrl: string, flat: FlatRow[]): EngineFlow {
  const nodes: Record<string, EngineNode> = {};
  const digits: Record<string, EngineDigitAction> = {};

  for (const row of flat) {
    const d = String(row.dtmf ?? '').trim();
    if (!DIGIT_RE.test(d)) throw new ValidationError(`Invalid DTMF digit "${row.dtmf}"`);
    if (digits[d]) throw new ValidationError(`Duplicate DTMF digit "${d}"`);

    if (row.selected_audio) {
      const nodeName = `resp_${d}`;
      nodes[nodeName] = { play: assertAudioUrl(row.selected_audio, `digit ${d}`), hangup: true };
      digits[d] = { goto: nodeName };
    } else if (row.selected_number) {
      const num = String(row.selected_number).replace(/\D/g, '');
      if (!PHONE_RE.test(num)) throw new ValidationError(`Invalid transfer number for digit ${d}`);
      digits[d] = { transfer_to_number: num };
    } else {
      throw new ValidationError(`DTMF digit ${d} has neither audio nor number`);
    }
  }

  if (Object.keys(digits).length === 0) {
    throw new ValidationError('DTMF config has no valid rows');
  }

  nodes['menu'] = {
    play: assertAudioUrl(mainAudioUrl, 'main audio'),
    digits,
    timeout_seconds: 7,
    max_attempts: 3,
  };

  return { start: 'menu', nodes };
}

/** Nested shape -> node graph with generated names, back-links, repeat loops. */
export function buildFlowFromNested(
  mainAudioUrl: string,
  nested: { rows?: NestedRow[]; collect?: EngineCollect; after_collect_audio?: string; after_webhook?: EngineWebhook; menu?: EngineMenuConfig },
): EngineFlow {
  const nodes: Record<string, EngineNode> = {};

  // Root Long-DTMF: the whole flow is "play the main audio, gather digits" -
  // no menu. The main campaign audio is the collect prompt. Tail after capture:
  // [webhook] -> [confirm audio] -> hangup.
  if (nested?.collect) {
    const root: EngineNode = {
      play: assertAudioUrl(mainAudioUrl, 'main audio'),
      collect: normalizeCollect(nested.collect, 'root Long-DTMF'),
    };
    let tail: string | null = null;
    if (nested.after_collect_audio) {
      nodes['done'] = { play: assertAudioUrl(nested.after_collect_audio, 'after-input audio'), hangup: true };
      tail = 'done';
    }
    if (nested.after_webhook) {
      const whNode: EngineNode = { webhook: normalizeWebhook(nested.after_webhook, 'root webhook') };
      if (tail) whNode.goto = tail; else whNode.hangup = true;
      nodes['webhook'] = whNode;
      tail = 'webhook';
    }
    if (tail) root.goto = tail; else root.hangup = true;
    nodes['collect'] = root;
    return { start: 'collect', nodes };
  }

  if (!Array.isArray(nested?.rows) || nested.rows.length === 0) {
    throw new ValidationError('dtmf_flow.rows must be a non-empty array');
  }

  // Build one action (a menu key, the Other branch, a No-Answer branch or an
  // after-transfer step) and create any nodes it needs. `scope` prefixes the
  // node names; `key` is the digit (blank for a branch step). Mutually recursive
  // with buildMenu for sub-menus.
  const buildAction = (
    row: NestedRow,
    key: string,
    scope: string,
    parentMenu: string | null,
    depth: number,
  ): EngineDigitAction => {
    const where = key !== '' ? `${scope} digit ${key}` : scope;
    switch (row.action) {
      case 'audio': {
        const respName = `${scope}_r${key}`;
        nodes[respName] = {
          play: assertAudioUrl(row.audio, where),
          ...(row.after === 'repeat' ? { goto: scope } : { hangup: true }),
        };
        return { goto: respName };
      }
      case 'submenu': {
        const subName = `${scope}_m${key}`;
        buildMenu(
          subName,
          assertAudioUrl(row.prompt_audio, `${where} submenu prompt`),
          row.rows ?? [],
          scope,
          depth + 1,
          row.menu,
        );
        return { goto: subName };
      }
      case 'back': {
        if (!parentMenu) throw new ValidationError(`"back" used at top level (${where})`);
        return { goto: parentMenu };
      }
      case 'record':
        return { hangup: true };
      case 'collect': {
        const collectName = `${scope}_c${key}`;
        const node: EngineNode = {
          play: assertAudioUrl(row.prompt_audio, `${where} Long-DTMF prompt`),
          collect: normalizeCollect(row.collect, where),
        };
        let tail: string | null = null;
        if (row.after_collect_audio) {
          const doneName = `${collectName}_done`;
          nodes[doneName] = { play: assertAudioUrl(row.after_collect_audio, `${where} after-input audio`), hangup: true };
          tail = doneName;
        }
        if (row.after_webhook) {
          const whName = `${collectName}_wh`;
          const whNode: EngineNode = { webhook: normalizeWebhook(row.after_webhook, `${where} webhook`) };
          if (tail) whNode.goto = tail; else whNode.hangup = true;
          nodes[whName] = whNode;
          tail = whName;
        }
        if (tail) node.goto = tail; else node.hangup = true;
        nodes[collectName] = node;
        return { goto: collectName };
      }
      case 'webhook': {
        const whName = `${scope}_wh${key}`;
        const whNode: EngineNode = { webhook: normalizeWebhook(row.webhook, `${where} webhook`) };
        if (row.after_collect_audio) {
          const doneName = `${whName}_done`;
          nodes[doneName] = { play: assertAudioUrl(row.after_collect_audio, `${where} after-webhook audio`), hangup: true };
          whNode.goto = doneName;
        } else {
          whNode.hangup = true;
        }
        nodes[whName] = whNode;
        return { goto: whName };
      }
      case 'transfer': {
        const num = String(row.number ?? '').replace(/\D/g, '');
        if (!PHONE_RE.test(num)) throw new ValidationError(`Invalid transfer number in ${where}`);
        const transferAction: Extract<EngineDigitAction, { transfer_to_number: string }> = { transfer_to_number: num };

        if (Array.isArray(row.fallback_numbers) && row.fallback_numbers.length > 0) {
          if (row.fallback_numbers.length > 2) throw new ValidationError(`At most 2 fallback numbers allowed (${where})`);
          transferAction.fallback_numbers = row.fallback_numbers.map((fb) => {
            const fbNum = String(fb ?? '').replace(/\D/g, '');
            if (!PHONE_RE.test(fbNum)) throw new ValidationError(`Invalid fallback number in ${where}`);
            return fbNum;
          });
        }

        // (B) drawer dialing controls, each clamped to a sane range.
        const rs = Number(row.ring_seconds);
        if (Number.isFinite(rs) && rs > 0) transferAction.ring_seconds = Math.min(Math.trunc(rs), 120);
        const rc = Number(row.retry_count);
        if (Number.isInteger(rc) && rc > 0) transferAction.retry_count = Math.min(rc, 5);
        const ot = Number(row.overall_timeout_seconds);
        if (Number.isFinite(ot) && ot > 0) transferAction.overall_timeout_seconds = Math.min(Math.trunc(ot), 600);

        // (#4) No-Answer branch. A goto-producing step (announcement / sub-menu /
        // webhook) becomes on_no_answer; a bare hangup keeps the default
        // behaviour (play "agent unavailable" then hang up).
        if (row.no_answer) {
          const na = buildAction(row.no_answer, '', `${scope}_na${key}`, null, depth + 1);
          if ('goto' in na) transferAction.on_no_answer = { goto: na.goto };
          else if (!('hangup' in na)) throw new ValidationError(`No-Answer step can't be a call transfer (${where})`);
        }

        // (#5) after-transfer: a full step wins; else the simple menu/audio/rating options.
        if (row.after_transfer_step) {
          const at = buildAction(row.after_transfer_step, '', `${scope}_at${key}`, null, depth + 1);
          if ('goto' in at) transferAction.then = { goto: at.goto };
          else if (!('hangup' in at)) throw new ValidationError(`After-transfer step can't be a call transfer (${where})`);
        } else {
          switch (row.after_transfer) {
            case 'menu':
              transferAction.then = { goto: 'menu' };
              break;
            case 'audio': {
              const closeName = `${scope}_t${key}`;
              nodes[closeName] = { play: assertAudioUrl(row.after_transfer_audio, `${where} after-transfer audio`), hangup: true };
              transferAction.then = { goto: closeName };
              break;
            }
            case 'rating': {
              const rateName = `${scope}_rate${key}`;
              const rateDigits: Record<string, EngineDigitAction> = {};
              for (const r of ['1', '2', '3', '4', '5']) rateDigits[r] = { hangup: true };
              nodes[rateName] = {
                play: assertAudioUrl(row.after_transfer_audio, `${where} rating prompt`),
                digits: rateDigits,
                timeout_seconds: 7,
                max_attempts: 2,
              };
              transferAction.then = { goto: rateName };
              break;
            }
            // 'hangup' / undefined - no `then`, engine hangs up after transfer
          }
        }
        return transferAction;
      }
      default:
        throw new ValidationError(`Unknown DTMF action "${row.action}" in ${where}`);
    }
  };

  const buildMenu = (
    menuName: string,
    promptAudio: string,
    rows: NestedRow[],
    parentMenu: string | null,
    depth: number,
    menuCfg?: EngineMenuConfig,
  ): void => {
    if (depth > MAX_DEPTH) {
      throw new ValidationError(`DTMF menus nest deeper than ${MAX_DEPTH} levels`);
    }
    // The "Other" (no-match) branch doesn't count against the 0-9 key limit.
    if (rows.filter((r) => String(r.digit ?? '').trim() !== OTHER_KEY).length > MAX_DIGITS_PER_MENU) {
      throw new ValidationError(`A menu can have at most ${MAX_DIGITS_PER_MENU} options`);
    }

    const digits: Record<string, EngineDigitAction> = {};

    for (const row of rows) {
      const d = String(row.digit ?? '').trim();
      // `other` is the no-match branch; every other key must be a single digit.
      if (d !== OTHER_KEY && !DIGIT_RE.test(d)) throw new ValidationError(`Invalid DTMF digit "${row.digit}" in ${menuName}`);
      if (digits[d]) throw new ValidationError(`Duplicate digit "${d}" in ${menuName}`);

      digits[d] = buildAction(row, d, menuName, parentMenu, depth);
    }

    // Split the Other/no-match branch out of `digits` into `invalid` - the
    // engine runs it when a caller presses an unlisted key or gives no input.
    let invalid: EngineDigitAction | undefined;
    if (digits[OTHER_KEY]) {
      invalid = digits[OTHER_KEY];
      delete digits[OTHER_KEY];
    }

    if (Object.keys(digits).length === 0) {
      throw new ValidationError(`Menu ${menuName} has no valid options`);
    }

    // Timeout defaults to 7s; attempts default to 1 (single prompt, no replay)
    // so a quiet/voicemail call can't loop - looping only happens when the flow
    // set a No-Input/Invalid looping voice (max_attempts > 1).
    const timeoutSeconds = Number(menuCfg?.timeout_seconds) > 0 ? Number(menuCfg!.timeout_seconds) : 7;
    const maxAttempts = Number(menuCfg?.max_attempts) > 1
      ? Math.min(Number(menuCfg!.max_attempts), MAX_MENU_ATTEMPTS)
      : 1;
    const menuNode: EngineNode = {
      play: promptAudio,
      digits,
      ...(invalid ? { invalid } : {}),
      timeout_seconds: timeoutSeconds,
      max_attempts: maxAttempts,
    };
    if (menuCfg?.reprompt_no_input) {
      menuNode.reprompt_no_input = assertAudioUrl(menuCfg.reprompt_no_input, `${menuName} no-input looping voice`);
    }
    if (menuCfg?.reprompt_invalid) {
      menuNode.reprompt_invalid = assertAudioUrl(menuCfg.reprompt_invalid, `${menuName} invalid looping voice`);
    }
    nodes[menuName] = menuNode;
  };

  buildMenu('menu', assertAudioUrl(mainAudioUrl, 'main audio'), nested.rows, null, 1, nested.menu);

  return { start: 'menu', nodes };
}

import type { FastifyInstance } from 'fastify';

// Converts a saved IVR builder tree into the nested dtmf_flow rows that
// campaign/services/ivr-flow.builder.ts (buildFlowFromNested) turns into the
// engine's flow_json — and explains, step by step, anything the engine can't run.
// Step audio is the owner's File Hosting audio (file_managers), referenced by id.

export interface FlowNode {
  id:    string;
  type:  string;
  data?: { config?: Record<string, unknown>; label?: string };
}

export interface FlowEdge {
  id?:    string;
  source: string;
  target: string;
}

export interface StoredFlow {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface CollectConfig {
  length?:          number;
  terminator?:      string;
  timeout_seconds?: number;
  loop_on_empty?:   boolean;
  loop_on_invalid?: boolean;
  max_attempts?:    number; // 1 + max(no-input, invalid) looping count from the drawer
}

export interface WebhookConfig {
  url:      string;
  method:   string;
  headers?: Record<string, string>;
  body?:    string;
}

// Per-menu playback settings from the DTMF drawer: how long to wait for a key,
// how many times to re-prompt, and the audio to replay on a no-input / invalid
// retry. Absent fields fall back to the engine defaults (1 attempt, main prompt).
export interface MenuConfig {
  timeout_seconds?:   number;
  max_attempts?:      number;
  reprompt_no_input?: string; // audio url replayed when the caller stays silent
  reprompt_invalid?:  string; // audio url replayed when the caller presses a wrong key
}

export interface IvrRow {
  digit:                 string;
  action:                'audio' | 'transfer' | 'submenu' | 'record' | 'collect' | 'webhook';
  audio?:                string;
  after?:                'hangup';
  number?:               string;
  fallback_numbers?:     string[];
  after_transfer?:       'audio';
  after_transfer_audio?: string;
  // transfer only (B): drawer dialing controls
  ring_seconds?:            number;
  retry_count?:             number;
  overall_timeout_seconds?: number;
  // transfer only: (#4) step run when no agent answered; (#5) step run after the
  // agent conversation ends. Each is an ordinary step (announcement / sub-menu /
  // Long-DTMF / webhook / hangup).
  no_answer?:            IvrRow;
  after_transfer_step?:  IvrRow;
  prompt_audio?:         string;
  rows?:                 IvrRow[];
  // submenu only: the sub-menu's own timeout / looping settings
  menu?:                 MenuConfig;
  // collect (Long-DTMF) only
  collect?:              CollectConfig;
  after_collect_audio?:  string;
  after_webhook?:        WebhookConfig;
  // webhook step only
  webhook?:              WebhookConfig;
}

export interface RootPrompt {
  file_id:          number;
  title:            string;
  duration_seconds: number | null;
  file_url:         string;
}

export interface RootCollect {
  collect:              CollectConfig;
  after_collect_audio?: string;
  after_webhook?:       WebhookConfig;
}

export interface IvrConversion {
  runnable:    boolean;
  issues:      string[];
  rows:        IvrRow[];
  rootPrompt:  RootPrompt | null;
  // Set when the whole flow is a root Long-DTMF (Start → Long-DTMF, no menu).
  rootCollect: RootCollect | null;
  // The root DTMF menu's own timeout / looping settings (null for Long-DTMF root).
  rootMenu:    MenuConfig | null;
}

interface AudioFile {
  id:               number;
  media_name:       string;
  media:            string | null;
  duration_seconds: number | null;
}

const MAX_DEPTH          = 5;
const MAX_KEYS           = 9;
const MAX_PROMPT_SECONDS = 120;
const OTHER_LABEL        = 'Other';
// Sentinel "digit" the builder recognises for a menu's Other / no-match branch.
const OTHER_KEY          = 'other';
const DIGIT_RE           = /^[0-9]$/;

const asString = (value: unknown) => (typeof value === 'string' ? value : value == null ? '' : String(value));

const menuKeys = (node: FlowNode): string[] =>
  Array.isArray(node.data?.config?.keys) ? (node.data!.config!.keys as unknown[]).map(asString) : [];

function referencedFileIds(nodes: FlowNode[]): number[] {
  const ids = new Set<number>();
  for (const node of nodes) {
    const config = node.data?.config ?? {};
    const source = node.type === 'announcement' ? config.source
      : node.type === 'dtmf' ? config.startingVoiceSource
      : node.type === 'longDtmf' ? config.startingVoiceSource
      : undefined;
    const id = Number(source);
    if (Number.isInteger(id) && id > 0) ids.add(id);
  }
  return [...ids];
}

export async function convertIvrFlow(fastify: FastifyInstance, owner: string, flow: StoredFlow): Promise<IvrConversion> {
  const nodes  = Array.isArray(flow?.nodes) ? flow.nodes : [];
  const edges  = Array.isArray(flow?.edges) ? flow.edges : [];
  const issues: string[] = [];

  // Audio always resolves server-side from the owner's own audio files, so a
  // flow can never point the engine at someone else's file.
  const audios = new Map<number, AudioFile>();
  const ids = referencedFileIds(nodes);
  if (ids.length) {
    const rows = await fastify.db
      .selectFrom('file_managers')
      .select(['id', 'media_name', 'media', 'duration_seconds'])
      .where('username', '=', owner)
      .where('media_type', '=', 'audio')
      .where('id', 'in', ids)
      .execute();
    rows.forEach((row) => audios.set(row.id, { ...row, duration_seconds: row.duration_seconds ?? null }));
  }

  const byId       = new Map(nodes.map((node) => [node.id, node]));
  const childrenOf = (id: string) =>
    edges.map((edge) => (edge.source === id ? byId.get(edge.target) : undefined)).filter((n): n is FlowNode => !!n);
  const nextStep   = (id: string) => childrenOf(id).find((node) => node.type !== 'branchMarker');
  const branch     = (id: string, label: string) =>
    childrenOf(id).find((node) => node.type === 'branchMarker' && node.data?.label === label);

  function audioFor(typeValue: unknown, sourceValue: unknown, where: string): AudioFile | null {
    const type = asString(typeValue) || 'voice';
    if (type !== 'voice') {
      issues.push(`${where}: only uploaded audio files can play on calls (not ${type})`);
      return null;
    }
    const audio = audios.get(Number(sourceValue));
    if (!audio) {
      issues.push(`${where}: choose an audio file from File Hosting`);
      return null;
    }
    if (!audio.media) {
      issues.push(`${where}: "${audio.media_name}" has no playable audio`);
      return null;
    }
    return audio;
  }

  // Optional audio: used for looping voices that are only applied when the user
  // actually picks a file. Empty/unset -> null with no issue; a set-but-invalid
  // value is validated through audioFor so the flow flags a real mistake.
  function optionalAudioFor(typeValue: unknown, sourceValue: unknown, where: string): AudioFile | null {
    const src = Number(sourceValue);
    if (!Number.isInteger(src) || src <= 0) return null; // nothing chosen
    return audioFor(typeValue, sourceValue, where);
  }

  // Map the DTMF drawer's menu-level settings (Time Out + looping voices) to the
  // engine's per-menu playback config. Looping voices are optional; when either
  // is set the menu re-prompts (up to 3 attempts) instead of the safe default of
  // a single attempt - so quiet/voicemail calls don't loop unless asked to.
  function menuConfigFrom(config: Record<string, unknown>, where: string): MenuConfig {
    const cfg: MenuConfig = {};
    const timeout = Number(config.timeOut);
    if (Number.isFinite(timeout) && timeout > 0) cfg.timeout_seconds = timeout;
    const noInput = optionalAudioFor(config.noInputLoopingType, config.noInputLoopingSource, `${where} → No Input Looping Voice`);
    const invalid = optionalAudioFor(config.invalidLoopingType, config.invalidLoopingSource, `${where} → Invalid Looping Voice`);
    if (noInput) cfg.reprompt_no_input = noInput.media!;
    if (invalid) cfg.reprompt_invalid = invalid.media!;
    if (noInput || invalid) cfg.max_attempts = 3;
    return cfg;
  }

  // Map the Long-DTMF drawer config to the engine's collect settings.
  function collectFrom(config: Record<string, unknown>, where: string): CollectConfig {
    const cfg: CollectConfig = {};
    const strategy = asString(config.strategy) || 'fixedLength';
    if (strategy === 'fixedLength') {
      const len = Number(config.enterLength);
      if (!Number.isInteger(len) || len < 1 || len > 32) issues.push(`${where}: set a valid input length (1-32 digits)`);
      else cfg.length = len;
    } else if (strategy === 'keyBased') {
      cfg.terminator = '#'; // caller ends input by pressing #
    } else {
      issues.push(`${where}: unsupported Long-DTMF strategy "${strategy}"`);
    }
    const timeout = Number(config.timeOut);
    if (Number.isFinite(timeout) && timeout > 0) cfg.timeout_seconds = timeout;
    // Looping counts from the drawer (0 = no looping). Turn the flags on and
    // carry the largest count as extra attempts (1 base + N re-prompts, capped).
    const noInputLoops = Math.max(0, Math.trunc(Number(config.noInputLooping) || 0));
    const invalidLoops = Math.max(0, Math.trunc(Number(config.invalidInputLooping) || 0));
    if (noInputLoops > 0) cfg.loop_on_empty = true;
    if (invalidLoops > 0) cfg.loop_on_invalid = true;
    const loops = Math.max(noInputLoops, invalidLoops);
    if (loops > 0) cfg.max_attempts = 1 + loops;
    return cfg;
  }

  // Map the Webhook drawer config (url / method / headers[] / body) to the engine shape.
  function webhookFrom(config: Record<string, unknown>, where: string): WebhookConfig {
    const url = asString(config.url).trim();
    if (!/^https?:\/\/\S+$/.test(url)) issues.push(`${where}: enter a valid http(s) webhook URL`);
    const method = (asString(config.method) || 'POST').toUpperCase();
    const headers: Record<string, string> = {};
    const raw = Array.isArray(config.headers) ? (config.headers as Array<Record<string, unknown>>) : [];
    for (const h of raw) {
      const k = asString(h?.key).trim();
      if (k) headers[k] = asString(h?.value);
    }
    const body = asString(config.body);
    const wh: WebhookConfig = { url, method };
    if (Object.keys(headers).length) wh.headers = headers;
    if (body.trim()) wh.body = body;
    return wh;
  }

  // Walk the chain after a collect/webhook step: optional Webhook -> optional
  // Announcement -> Hangup. Returns the engine "tail" pieces.
  function afterInputChain(fromNode: FlowNode, where: string): { after_collect_audio?: string; after_webhook?: WebhookConfig } {
    const out: { after_collect_audio?: string; after_webhook?: WebhookConfig } = {};
    let n = nextStep(fromNode.id);
    if (n?.type === 'webhook') {
      out.after_webhook = webhookFrom(n.data?.config ?? {}, `${where} → Webhook`);
      n = nextStep(n.id);
    }
    if (n?.type === 'announcement') {
      const a = audioFor(n.data?.config?.type, n.data?.config?.source, `${where} → after input`);
      const afterA = nextStep(n.id);
      if (afterA && afterA.type !== 'hangup') issues.push(`${where}: only Hangup can follow the Announcement`);
      if (a) out.after_collect_audio = a.media!;
    } else if (n && n.type !== 'hangup') {
      issues.push(`${where}: after input, only a Webhook, Announcement or Hangup is supported on calls`);
    }
    return out;
  }

  function convertMenu(menu: FlowNode, where: string, depth: number): IvrRow[] {
    if (depth > MAX_DEPTH) {
      issues.push(`${where}: menus can be at most ${MAX_DEPTH} levels deep`);
      return [];
    }

    const keys = menuKeys(menu);
    if (!keys.length) {
      issues.push(`${where}: pick at least one key`);
      return [];
    }
    if (keys.length > MAX_KEYS) issues.push(`${where}: a menu can have at most ${MAX_KEYS} keys`);

    const unsupported = keys.filter((key) => !DIGIT_RE.test(key));
    if (unsupported.length) issues.push(`${where}: keys ${unsupported.join(', ')} aren't supported on calls yet`);

    const rows: IvrRow[] = [];
    for (const key of keys.filter((k) => DIGIT_RE.test(k))) {
      const marker = branch(menu.id, key);
      const step   = marker ? childrenOf(marker.id)[0] : undefined;
      if (!step) continue; // empty key — the engine just repeats the menu
      const row = convertStep(step, key, `${where} → Key ${key}`, depth);
      if (row) rows.push(row);
    }

    // "Other" (no-match) branch: the builder always wires a non-removable Other.
    // Bare Other → Hangup already matches the engine's own default (end the call
    // on a wrong/no key), so it needs no row. A CUSTOM Other response — an
    // announcement, transfer, sub-menu, Long-DTMF or webhook — is converted like
    // any branch under the reserved 'other' key; the builder moves it to the
    // menu's `invalid` slot so it runs whenever the caller presses an unlisted key.
    const other = branch(menu.id, OTHER_LABEL);
    const otherStep = other ? childrenOf(other.id).find((node) => node.type !== 'branchMarker') : undefined;
    if (otherStep && otherStep.type !== 'hangup') {
      const otherRow = convertStep(otherStep, OTHER_KEY, `${where} → Other`, depth);
      if (otherRow) rows.push(otherRow);
    }

    if (!rows.length) issues.push(`${where}: add a step under at least one key`);
    return rows;
  }

  function convertStep(step: FlowNode, digit: string, where: string, depth: number): IvrRow | null {
    const config = step.data?.config ?? {};

    switch (step.type) {
      case 'hangup':
        return { digit, action: 'record' };

      case 'announcement': {
        const audio = audioFor(config.type, config.source, where);
        const after = nextStep(step.id);
        if (after && after.type !== 'hangup') issues.push(`${where}: only Hangup can follow an Announcement on calls`);
        return audio ? { digit, action: 'audio', audio: audio.media!, after: 'hangup' } : null;
      }

      case 'callTransfer': {
        const number = asString(config.phoneNumber).replace(/\D/g, '');
        if (!/^\d{10,16}$/.test(number)) issues.push(`${where}: enter a 10–16 digit phone number to transfer to`);

        const row: IvrRow = { digit, action: 'transfer', number };
        const backupRaw = asString(config.backupNumber).replace(/\D/g, '');
        if (backupRaw) {
          if (!/^\d{10,16}$/.test(backupRaw)) issues.push(`${where}: backup number must be 10–16 digits`);
          else row.fallback_numbers = [backupRaw];
        }

        // (B) Ringtime / Retry Count / Timeout from the drawer.
        const ring = Number(config.ringTime);
        if (Number.isFinite(ring) && ring > 0) row.ring_seconds = Math.trunc(ring);
        const retry = Number(config.retryCount);
        if (Number.isInteger(retry) && retry > 0) row.retry_count = retry;
        const tmo = Number(config.timeout);
        if (Number.isFinite(tmo) && tmo > 0) row.overall_timeout_seconds = Math.trunc(tmo);

        // (#4) No Answer branch: the transfer's branchMarker child. A custom step
        // (announcement / sub-menu / Long-DTMF / webhook) becomes the no-answer
        // path; a bare Hangup keeps the default "agent unavailable" message.
        const noAnswer = childrenOf(step.id).find((node) => node.type === 'branchMarker');
        const noAnswerStep = noAnswer ? childrenOf(noAnswer.id).find((n) => n.type !== 'branchMarker') : undefined;
        if (noAnswerStep && noAnswerStep.type !== 'hangup') {
          if (noAnswerStep.type === 'callTransfer') {
            issues.push(`${where} → No Answer: a No Answer path can't be another call transfer yet`);
          } else {
            const na = convertStep(noAnswerStep, '', `${where} → No Answer`, depth);
            if (na) row.no_answer = na;
          }
        }

        // (#5) After-transfer: the transfer's "next" step, run once the agent
        // conversation ends. Any ordinary step is supported (not another transfer).
        const after = nextStep(step.id);
        if (after && after.type !== 'hangup') {
          if (after.type === 'callTransfer') {
            issues.push(`${where}: after a transfer, chaining directly into another transfer isn't supported yet`);
          } else {
            const at = convertStep(after, '', `${where} → after transfer`, depth);
            if (at) row.after_transfer_step = at;
          }
        }
        return row;
      }

      case 'dtmf': {
        const prompt  = audioFor(config.startingVoiceType, config.startingVoiceSource, `${where} → Starting Voice`);
        const subRows = convertMenu(step, `${where} → Menu`, depth + 1);
        const menu    = menuConfigFrom(config, `${where} → Menu`);
        return prompt ? { digit, action: 'submenu', prompt_audio: prompt.media!, rows: subRows, menu } : null;
      }

      case 'longDtmf': {
        const prompt  = audioFor(config.startingVoiceType, config.startingVoiceSource, `${where} → Starting Voice`);
        const collect = collectFrom(config, where);
        const tail    = afterInputChain(step, where); // optional Webhook / Announcement
        if (!prompt) return null;
        const row: IvrRow = { digit, action: 'collect', prompt_audio: prompt.media!, collect };
        if (tail.after_collect_audio) row.after_collect_audio = tail.after_collect_audio;
        if (tail.after_webhook) row.after_webhook = tail.after_webhook;
        return row;
      }

      case 'webhook': {
        const wh = webhookFrom(config, where);
        // Optional Announcement after the webhook, then Hangup.
        const after = nextStep(step.id);
        let afterAudio: string | undefined;
        if (after?.type === 'announcement') {
          const a = audioFor(after.data?.config?.type, after.data?.config?.source, `${where} → after webhook`);
          const afterA = nextStep(after.id);
          if (afterA && afterA.type !== 'hangup') issues.push(`${where}: only Hangup can follow the Announcement after a Webhook`);
          if (a) afterAudio = a.media!;
        } else if (after && after.type !== 'hangup') {
          issues.push(`${where}: after a Webhook, only an Announcement or Hangup is supported on calls`);
        }
        const row: IvrRow = { digit, action: 'webhook', webhook: wh };
        if (afterAudio) row.after_collect_audio = afterAudio;
        return row;
      }

      default:
        issues.push(`${where}: this step can't be used on calls`);
        return null;
    }
  }

  let rows: IvrRow[] = [];
  let prompt: AudioFile | null = null;
  let rootCollect: RootCollect | null = null;
  let rootMenu: MenuConfig | null = null;

  const start = nodes.find((node) => node.type === 'start');
  const first = start ? nextStep(start.id) : undefined;

  if (first?.type === 'dtmf') {
    const config = first.data?.config ?? {};
    prompt = audioFor(config.startingVoiceType, config.startingVoiceSource, 'Menu → Starting Voice');
    if (prompt && Number(prompt.duration_seconds ?? 0) > MAX_PROMPT_SECONDS) {
      issues.push(`Menu → Starting Voice: "${prompt.media_name}" is longer than ${MAX_PROMPT_SECONDS} seconds`);
    }
    rows = convertMenu(first, 'Menu', 1);
    rootMenu = menuConfigFrom(config, 'Menu');
  } else if (first?.type === 'longDtmf') {
    // Root Long-DTMF: no menu — the main audio prompts and digits are captured.
    const config = first.data?.config ?? {};
    prompt = audioFor(config.startingVoiceType, config.startingVoiceSource, 'Long-DTMF → Starting Voice');
    if (prompt && Number(prompt.duration_seconds ?? 0) > MAX_PROMPT_SECONDS) {
      issues.push(`Long-DTMF → Starting Voice: "${prompt.media_name}" is longer than ${MAX_PROMPT_SECONDS} seconds`);
    }
    const collect = collectFrom(config, 'Long-DTMF');
    const tail = afterInputChain(first, 'Long-DTMF'); // optional Webhook / Announcement
    rootCollect = {
      collect,
      ...(tail.after_collect_audio ? { after_collect_audio: tail.after_collect_audio } : {}),
      ...(tail.after_webhook ? { after_webhook: tail.after_webhook } : {}),
    };
  } else {
    issues.push('The first step after Start must be a DTMF menu or a Long-DTMF — its Starting Voice plays first');
  }

  const runnable = issues.length === 0;
  return {
    runnable,
    issues:      [...new Set(issues)],
    rows:        runnable ? rows : [],
    rootPrompt:  runnable && prompt
      ? {
          file_id:          prompt.id,
          title:            prompt.media_name,
          duration_seconds: prompt.duration_seconds,
          file_url:         prompt.media!,
        }
      : null,
    rootCollect: runnable ? rootCollect : null,
    rootMenu:    runnable ? rootMenu : null,
  };
}

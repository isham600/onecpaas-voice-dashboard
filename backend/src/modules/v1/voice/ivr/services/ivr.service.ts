import type { FastifyInstance } from 'fastify';
import { resolveUsername } from '../../../../../utils/resolveUsername.js';
import { ValidationError, NotFoundError } from '../../../../../utils/errors.js';
import { convertIvrFlow, type IvrConversion, type StoredFlow } from './ivr-convert.js';
import { buildFlowFromNested } from '../../campaign/services/ivr-flow.builder.js';

// Pre-build the engine flow the same way campaign submit does, so the public
// /v1/voice/send `ivr_id` path can use it directly without re-converting. Stored
// as JSON on voice_ivr_flows.compiled_flow. Returns null when the IVR can't run.
function compileEngineFlow(conversion: IvrConversion): string | null {
  if (!conversion.runnable || !conversion.rootPrompt) return null;
  const audioUrl = conversion.rootPrompt.file_url;
  try {
    const flow = conversion.rootCollect
      ? buildFlowFromNested(audioUrl, conversion.rootCollect)
      : buildFlowFromNested(audioUrl, { rows: conversion.rows as never[], menu: conversion.rootMenu ?? undefined });
    return JSON.stringify({
      flow,
      audio_url: audioUrl,
      audio_duration: conversion.rootPrompt.duration_seconds,
    });
  } catch {
    // A convert-clean flow that still fails to build shouldn't block saving.
    return null;
  }
}

// ── Constants & types ───────────────────────────────────────────────────────

const IVR_STATUS = { draft: 0, active: 1 } as const;
type StatusLabel = keyof typeof IVR_STATUS;
const STATUS_LABELS: Record<number, StatusLabel> = { 0: 'draft', 1: 'active' };

type Route = 'transactional' | 'promotional';

export interface IvrListQuery {
  page?:   number;
  limit?:  number;
  status?: StatusLabel;
  search?: string;
}

export interface CreateIvrBody {
  title: string;
  route: Route;
}

export interface SaveStepsBody {
  title?: string;
  nodes:  StoredFlow['nodes'];
  edges:  StoredFlow['edges'];
}

interface IvrDbRow {
  id:         number;
  username:   string;
  title:      string;
  route:      Route;
  status:     number;
  flow_json:  string;
  created_at: Date | null;
  updated_at: Date | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const defaultFlow = (): StoredFlow => ({
  nodes: [
    { id: 'start',  type: 'start',  data: {} },
    { id: 'hangup', type: 'hangup', data: {} },
  ],
  edges: [{ id: 'start->hangup', source: 'start', target: 'hangup' }],
});

function parseFlow(json: string | null): StoredFlow {
  try {
    const parsed = JSON.parse(json ?? '');
    if (Array.isArray(parsed?.nodes) && Array.isArray(parsed?.edges)) return parsed;
  } catch {
    // corrupt JSON falls back to an empty flow
  }
  return defaultFlow();
}

async function toItem(fastify: FastifyInstance, row: IvrDbRow, includeFlow: boolean) {
  const flow       = parseFlow(row.flow_json);
  const conversion = await convertIvrFlow(fastify, row.username, flow);

  return {
    id:          row.id,
    title:       row.title,
    route:       row.route,
    status:      STATUS_LABELS[Number(row.status)] ?? 'draft',
    type:        flow.nodes.some((node) => node.type === 'dtmf') ? 'Branching' : 'Linear',
    runnable:    conversion.runnable,
    issues:      conversion.issues,
    root_prompt: conversion.rootPrompt,
    created_at:  row.created_at,
    updated_at:  row.updated_at,
    ...(includeFlow ? { nodes: flow.nodes, edges: flow.edges } : {}),
  };
}

async function findOwned(fastify: FastifyInstance, owner: string, id: number) {
  const row = await fastify.db
    .selectFrom('voice_ivr_flows')
    .selectAll()
    .where('id', '=', id)
    .where('username', '=', owner)
    .executeTakeFirst();

  if (!row) throw new NotFoundError('IVR');
  return row;
}

// ── Operations ──────────────────────────────────────────────────────────────

export async function listIvrs(fastify: FastifyInstance, tokenUsername: string, q: IvrListQuery) {
  const owner = await resolveUsername(fastify, tokenUsername);
  const page  = Math.max(1, Number(q.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(q.limit ?? 20)));

  let query = fastify.db.selectFrom('voice_ivr_flows').where('username', '=', owner);
  if (q.status) query = query.where('status', '=', IVR_STATUS[q.status]);
  if (q.search) query = query.where('title', 'like', `%${q.search}%`);

  const [countRow, rows] = await Promise.all([
    query.select((eb) => eb.fn.countAll<number>().as('total')).executeTakeFirst(),
    query
      .selectAll()
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),
  ]);

  const total      = Number(countRow?.total ?? 0);
  const totalPages = Math.ceil(total / limit);

  return {
    data: await Promise.all(rows.map((row) => toItem(fastify, row, false))),
    meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
}

export async function getIvr(fastify: FastifyInstance, tokenUsername: string, id: number) {
  const owner = await resolveUsername(fastify, tokenUsername);
  return { data: await toItem(fastify, await findOwned(fastify, owner, id), true) };
}

export async function createIvr(fastify: FastifyInstance, tokenUsername: string, body: CreateIvrBody) {
  const owner = await resolveUsername(fastify, tokenUsername);
  const title = body.title.trim();
  if (!title) throw new ValidationError('Title is required.', [{ field: 'title', message: 'Title is required.' }]);

  const result = await fastify.db
    .insertInto('voice_ivr_flows')
    .values({
      username:  owner,
      title,
      route:     body.route,
      status:    IVR_STATUS.draft,
      flow_json: JSON.stringify(defaultFlow()),
    })
    .executeTakeFirstOrThrow();

  const row = await findOwned(fastify, owner, Number(result.insertId));
  return { message: 'IVR created', data: await toItem(fastify, row, true) };
}

export async function saveIvrSteps(fastify: FastifyInstance, tokenUsername: string, id: number, body: SaveStepsBody) {
  const owner = await resolveUsername(fastify, tokenUsername);
  await findOwned(fastify, owner, id);

  const title = body.title?.trim();
  const flow = { nodes: body.nodes, edges: body.edges };
  // Refresh the pre-built engine flow on every save so the send API's `ivr_id`
  // path always sees the latest version (null when the IVR isn't runnable yet).
  const conversion = await convertIvrFlow(fastify, owner, flow);
  const compiledFlow = compileEngineFlow(conversion);
  await fastify.db
    .updateTable('voice_ivr_flows')
    .set({
      ...(title ? { title } : {}),
      flow_json:     JSON.stringify(flow),
      status:        IVR_STATUS.active,
      compiled_flow: compiledFlow,
    })
    .where('id', '=', id)
    .where('username', '=', owner)
    .execute();

  const row = await findOwned(fastify, owner, id);
  return { message: 'IVR saved', data: await toItem(fastify, row, true) };
}

export async function deleteIvr(fastify: FastifyInstance, tokenUsername: string, id: number) {
  const owner = await resolveUsername(fastify, tokenUsername);
  await findOwned(fastify, owner, id);

  // Campaigns already sent keep their own ivr_flows snapshot.
  await fastify.db
    .deleteFrom('voice_ivr_flows')
    .where('id', '=', id)
    .where('username', '=', owner)
    .execute();

  return { message: 'IVR deleted' };
}

// For campaign submit: the owner's active IVR converted for the engine, or a
// 400 explaining exactly why it can't run.
export async function loadRunnableIvr(fastify: FastifyInstance, owner: string, id: number): Promise<IvrConversion> {
  const row = await fastify.db
    .selectFrom('voice_ivr_flows')
    .selectAll()
    .where('id', '=', id)
    .where('username', '=', owner)
    .where('status', '=', IVR_STATUS.active)
    .executeTakeFirst();

  if (!row) throw new NotFoundError('IVR');

  const conversion = await convertIvrFlow(fastify, owner, parseFlow(row.flow_json));
  if (!conversion.runnable || !conversion.rootPrompt) {
    throw new ValidationError(`IVR "${row.title}" can't run yet: ${conversion.issues.join('; ')}`);
  }
  return conversion;
}

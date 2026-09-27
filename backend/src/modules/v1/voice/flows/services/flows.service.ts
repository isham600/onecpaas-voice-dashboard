import type { FastifyInstance } from 'fastify';
import { resolveUsername } from '../../../../../utils/resolveUsername.js';
import { ValidationError, NotFoundError } from '../../../../../utils/errors.js';

// Counts only rows that actually carry a key press — mirrors how the
// frontend's DtmfFlowBuilder treats an incomplete row (no digit chosen yet)
// as not really "an option" yet.
function countOptions(rows: unknown): number {
  if (!Array.isArray(rows)) return 0;
  return rows.filter((r: any) => r && typeof r.digit === 'string' && r.digit).length;
}

function parseRows(rowsJson: string): unknown[] {
  try {
    const parsed = JSON.parse(rowsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function listFlows(fastify: FastifyInstance, tokenUsername: string) {
  const username = await resolveUsername(fastify, tokenUsername);

  const rows = await fastify.db
    .selectFrom('voice_dtmf_flows')
    .select(['id', 'name', 'rows_json', 'created_at', 'updated_at'])
    .where('username', '=', username)
    .orderBy('updated_at', 'desc')
    .execute();

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    option_count: countOptions(parseRows(r.rows_json)),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getFlow(fastify: FastifyInstance, tokenUsername: string, id: number) {
  const username = await resolveUsername(fastify, tokenUsername);

  const row = await fastify.db
    .selectFrom('voice_dtmf_flows')
    .select(['id', 'name', 'rows_json', 'updated_at'])
    .where('id', '=', id)
    .where('username', '=', username)
    .executeTakeFirst();

  if (!row) throw new NotFoundError('Flow');

  return { id: row.id, name: row.name, rows: parseRows(row.rows_json), updated_at: row.updated_at };
}

function validateName(name: unknown): string {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) throw new ValidationError('name is required');
  if (trimmed.length > 191) throw new ValidationError('name must be 191 characters or fewer');
  return trimmed;
}

function validateRows(rows: unknown): string {
  if (!Array.isArray(rows)) throw new ValidationError('rows must be an array');
  return JSON.stringify(rows);
}

export async function createFlow(
  fastify: FastifyInstance,
  tokenUsername: string,
  body: { name?: unknown; rows?: unknown },
) {
  const username = await resolveUsername(fastify, tokenUsername);
  const name = validateName(body.name);
  const rowsJson = validateRows(body.rows);

  const result = await fastify.db
    .insertInto('voice_dtmf_flows')
    .values({ username, name, rows_json: rowsJson })
    .executeTakeFirstOrThrow();

  return { id: Number(result.insertId), name };
}

export async function updateFlow(
  fastify: FastifyInstance,
  tokenUsername: string,
  id: number,
  body: { name?: unknown; rows?: unknown },
) {
  const username = await resolveUsername(fastify, tokenUsername);
  const name = validateName(body.name);
  const rowsJson = validateRows(body.rows);

  const result = await fastify.db
    .updateTable('voice_dtmf_flows')
    .set({ name, rows_json: rowsJson })
    .where('id', '=', id)
    .where('username', '=', username)
    .executeTakeFirst();

  if (Number(result.numUpdatedRows ?? 0) === 0) throw new NotFoundError('Flow');

  return { id, name };
}

export async function deleteFlow(fastify: FastifyInstance, tokenUsername: string, id: number) {
  const username = await resolveUsername(fastify, tokenUsername);

  const result = await fastify.db
    .deleteFrom('voice_dtmf_flows')
    .where('id', '=', id)
    .where('username', '=', username)
    .executeTakeFirst();

  if (Number(result.numDeletedRows ?? 0) === 0) throw new NotFoundError('Flow');

  return { id };
}

import type { FastifyInstance } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { createWriteStream, mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { pipeline } from 'stream/promises';
import path from 'path';
import crypto from 'crypto';

const DEFAULT_DOMAIN = 'https://wa32.nuke.co.in';

// ── File helpers ──────────────────────────────────────────────────────────────

function saveDir(): string {
  const dir = path.join(process.cwd(), 'uploads', 'resellers');
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function saveFile(file: MultipartFile, fastify: FastifyInstance): Promise<string> {
  const ext = path.extname(file.filename).toLowerCase() || '.bin';
  const name = `${crypto.randomUUID()}${ext}`;
  const dir  = saveDir();
  const dest = path.join(dir, name);
  await pipeline(file.file, createWriteStream(dest));
  const base = process.env.BASE_URL ?? 'http://localhost:3005';
  return `${base}/uploads/resellers/${name}`;
}

async function deleteFile(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    const urlPath = new URL(url).pathname;
    const rel     = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
    await unlink(path.join(process.cwd(), rel));
  } catch {
    // ignore — file may already be gone
  }
}

// ── Resellers CRUD ────────────────────────────────────────────────────────────

const FEATURE_FLAGS = [
  'whatsapp', 'voice', 'sms', 'rcs', 'number', 'AI', 'email',
  'bulk_whatsapp', 'telegram', 'instagram', 'manage_clients',
  'your_integration', 'reseller_setting', 'invoice',
] as const;

const TEXT_FIELDS = [
  'domain', 'username', 'heading', 'description', 'footer',
  'loginHeading', 'loginSubheading', 'loginParagraph', 'reseller',
] as const;

export async function createReseller(fastify: FastifyInstance, parts: AsyncIterableIterator<any>) {
  const fields: Record<string, string> = {};
  let   logoUrl: string | undefined;
  let   bgUrl:   string | undefined;

  for await (const part of parts) {
    if (part.type === 'file') {
      if (part.fieldname === 'logo')     logoUrl = await saveFile(part, fastify);
      else if (part.fieldname === 'bg_image') bgUrl = await saveFile(part, fastify);
      else await part.toBuffer(); // drain unused files
    } else {
      fields[part.fieldname] = part.value as string;
    }
  }

  if (!fields.domain)    throw fastify.httpErrors.badRequest('domain is required');
  if (!fields.username)  throw fastify.httpErrors.badRequest('username is required');
  if (fields.support === undefined) throw fastify.httpErrors.badRequest('support is required');

  // Check domain uniqueness
  const existing = await fastify.db
    .selectFrom('resellers')
    .where('domain', '=', fields.domain)
    .select('id')
    .executeTakeFirst();
  if (existing) throw fastify.httpErrors.conflict(`Domain '${fields.domain}' already exists`);

  const insert: Record<string, any> = {
    domain:   fields.domain,
    username: fields.username,
    support:  Number(fields.support ?? 0),
  };

  if (logoUrl) insert.logo     = logoUrl;
  if (bgUrl)   insert.bg_image = bgUrl;

  for (const f of TEXT_FIELDS) {
    if (fields[f] !== undefined && f !== 'domain' && f !== 'username') {
      insert[f] = fields[f];
    }
  }
  if (fields.signup !== undefined) insert.signup = Number(fields.signup);
  for (const flag of FEATURE_FLAGS) {
    if (fields[flag] !== undefined) insert[flag] = Number(fields[flag]);
  }

  const result = await fastify.db
    .insertInto('resellers')
    .values(insert as any)
    .executeTakeFirst();

  return {
    message: 'Reseller created',
    data:    { id: Number(result.insertId) },
  };
}

export async function readReseller(fastify: FastifyInstance, domain?: string, username?: string) {
  let row: any = null;

  if (domain) {
    row = await fastify.db.selectFrom('resellers').where('domain', '=', domain).selectAll().executeTakeFirst();
  } else if (username) {
    row = await fastify.db.selectFrom('resellers').where('username', '=', username).selectAll().executeTakeFirst();
  }

  // Fallback to default domain
  if (!row) {
    row = await fastify.db.selectFrom('resellers').where('domain', '=', DEFAULT_DOMAIN).selectAll().executeTakeFirst();
  }

  return { data: row ?? null };
}

export async function readResellerById(fastify: FastifyInstance, id: number) {
  const row = await fastify.db.selectFrom('resellers').where('id', '=', id).selectAll().executeTakeFirst();
  if (!row) throw fastify.httpErrors.notFound('Reseller not found');
  return { data: row };
}

export async function updateReseller(fastify: FastifyInstance, id: number, parts: AsyncIterableIterator<any>) {
  const existing = await fastify.db.selectFrom('resellers').where('id', '=', id).selectAll().executeTakeFirst();
  if (!existing) throw fastify.httpErrors.notFound('Reseller not found');

  const fields: Record<string, string> = {};
  let   newLogoUrl: string | undefined;
  let   newBgUrl:   string | undefined;

  for await (const part of parts) {
    if (part.type === 'file') {
      if (part.fieldname === 'logo')          newLogoUrl = await saveFile(part, fastify);
      else if (part.fieldname === 'bg_image') newBgUrl   = await saveFile(part, fastify);
      else await part.toBuffer();
    } else {
      fields[part.fieldname] = part.value as string;
    }
  }

  const update: Record<string, any> = {};

  if (newLogoUrl) {
    await deleteFile(existing.logo);
    update.logo = newLogoUrl;
  }
  if (newBgUrl) {
    await deleteFile(existing.bg_image);
    update.bg_image = newBgUrl;
  }

  for (const f of TEXT_FIELDS) {
    if (fields[f] !== undefined) update[f] = fields[f];
  }
  if (fields.signup !== undefined) update.signup = Number(fields.signup);
  for (const flag of FEATURE_FLAGS) {
    if (fields[flag] !== undefined) update[flag] = Number(fields[flag]);
  }

  // Domain uniqueness check
  if (update.domain && update.domain !== existing.domain) {
    const conflict = await fastify.db
      .selectFrom('resellers')
      .where('domain', '=', update.domain)
      .where('id', '!=', id)
      .select('id')
      .executeTakeFirst();
    if (conflict) throw fastify.httpErrors.conflict(`Domain '${update.domain}' already in use`);
  }

  if (Object.keys(update).length === 0) {
    return { message: 'Nothing to update', data: existing };
  }

  await fastify.db.updateTable('resellers').set(update).where('id', '=', id).execute();
  const updated = await fastify.db.selectFrom('resellers').where('id', '=', id).selectAll().executeTakeFirst();
  return { message: 'Reseller updated', data: updated };
}

export async function deleteReseller(fastify: FastifyInstance, id: number) {
  const row = await fastify.db.selectFrom('resellers').where('id', '=', id).selectAll().executeTakeFirst();
  if (!row) throw fastify.httpErrors.notFound('Reseller not found');

  await Promise.all([deleteFile(row.logo), deleteFile(row.bg_image)]);
  await fastify.db.deleteFrom('resellers').where('id', '=', id).execute();
  return { message: 'Reseller deleted' };
}

// ── Reseller Images CRUD ──────────────────────────────────────────────────────

export async function listResellerImages(fastify: FastifyInstance, username: string) {
  const rows = await fastify.db
    .selectFrom('reseller_images')
    .where('username', '=', username)
    .selectAll()
    .orderBy('id', 'desc')
    .execute();
  return { data: rows };
}

export async function createResellerImage(fastify: FastifyInstance, username: string, parts: AsyncIterableIterator<any>) {
  let imageUrl: string | undefined;

  for await (const part of parts) {
    if (part.type === 'file' && part.fieldname === 'image') {
      imageUrl = await saveFile(part, fastify);
    } else if (part.type === 'file') {
      await part.toBuffer();
    }
  }

  if (!imageUrl) throw fastify.httpErrors.badRequest('image file is required');

  const result = await fastify.db
    .insertInto('reseller_images')
    .values({ username, path: imageUrl } as any)
    .executeTakeFirst();

  return { message: 'Image uploaded', data: { id: Number(result.insertId), username, path: imageUrl } };
}

export async function readResellerImage(fastify: FastifyInstance, id: number) {
  const row = await fastify.db.selectFrom('reseller_images').where('id', '=', id).selectAll().executeTakeFirst();
  if (!row) throw fastify.httpErrors.notFound('Image not found');
  return { data: row };
}

export async function deleteResellerImage(fastify: FastifyInstance, id: number) {
  const row = await fastify.db.selectFrom('reseller_images').where('id', '=', id).selectAll().executeTakeFirst();
  if (!row) throw fastify.httpErrors.notFound('Image not found');
  await deleteFile((row as any).path);
  await fastify.db.deleteFrom('reseller_images').where('id', '=', id).execute();
  return { message: 'Image deleted' };
}

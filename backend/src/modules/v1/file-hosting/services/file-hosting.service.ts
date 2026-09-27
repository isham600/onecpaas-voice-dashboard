import type { FastifyInstance } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { createWriteStream, mkdirSync } from 'fs';
import { unlink, rename, stat } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);
import { ValidationError, NotFoundError } from '../../../../utils/errors.js';

// ── Config ────────────────────────────────────────────────────────────────

const ALLOWED_TYPES: Record<string, { mimes: string[]; maxBytes: number; folder: string }> = {
  image: {
    mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    maxBytes: 5 * 1024 * 1024,
    folder: 'image',
  },
  video: {
    mimes: ['video/mp4', 'video/webm', 'video/x-msvideo', 'video/quicktime'],
    maxBytes: 50 * 1024 * 1024,
    folder: 'video',
  },
  documents: {
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ],
    maxBytes: 10 * 1024 * 1024,
    folder: 'documents',
  },
  audio: {
    mimes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/mp4'],
    maxBytes: 10 * 1024 * 1024,
    folder: 'audio',
  },
};

function mimeToMediaType(mime: string): string | null {
  for (const [type, config] of Object.entries(ALLOWED_TYPES)) {
    if (config.mimes.includes(mime)) return type;
  }
  return null;
}

function getExtFromMime(mime: string, originalName: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/svg+xml': 'svg',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/x-msvideo': 'avi', 'video/quicktime': 'mov',
    'application/pdf': 'pdf', 'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg',
    'audio/x-m4a': 'm4a', 'audio/mp4': 'm4a',
  };
  return map[mime] ?? path.extname(originalName).replace('.', '') ?? 'bin';
}

// Derive disk path from a stored media URL for deletion
function mediaUrlToAbsPath(media: string): string {
  try {
    const urlPath = new URL(media).pathname; // /uploads/2026/04/23/documents/uuid.pdf
    const rel     = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
    return path.join(process.cwd(), rel);
  } catch {
    return path.join(process.cwd(), media);
  }
}

// ── Folder operations ─────────────────────────────────────────────────────

export async function listFolders(fastify: FastifyInstance, username: string) {
  const [folders, stats] = await Promise.all([
    fastify.db
      .selectFrom('file_folders')
      .where('username', '=', username)
      .selectAll()
      .orderBy('folder_name', 'asc')
      .execute(),

    fastify.db
      .selectFrom('file_managers')
      .where('username', '=', username)
      .where('folder', 'is not', null)
      .select([
        'folder',
        eb => eb.fn.countAll<number>().as('file_count'),
        eb => eb.fn.sum<number>('file_size').as('size_bytes'),
      ])
      .groupBy('folder')
      .execute(),
  ]);

  const statsMap = new Map(stats.map(s => [s.folder, s]));

  return {
    data: folders.map(f => {
      const s = statsMap.get(f.folder_name);
      return {
        ...f,
        file_count: Number(s?.file_count ?? 0),
        size_bytes: Number(s?.size_bytes  ?? 0),
        size_label: formatBytes(Number(s?.size_bytes ?? 0)),
      };
    }),
  };
}

export async function createFolder(fastify: FastifyInstance, username: string, folderName: string) {
  const trimmed = folderName.trim();
  if (!trimmed) throw new ValidationError('folder_name cannot be empty');
  if (trimmed.length > 255) throw new ValidationError('folder_name max 255 characters');

  const existing = await fastify.db
    .selectFrom('file_folders')
    .where('username', '=', username)
    .where('folder_name', '=', trimmed)
    .select('id')
    .executeTakeFirst();

  if (existing) throw new ValidationError(`Folder '${trimmed}' already exists`);

  const result = await fastify.db
    .insertInto('file_folders')
    .values({ username, folder_name: trimmed })
    .executeTakeFirstOrThrow();

  return { id: Number(result.insertId), folder_name: trimmed, message: 'Folder created' };
}

export async function renameFolder(fastify: FastifyInstance, username: string, id: number, newName: string) {
  const trimmed = newName.trim();
  if (!trimmed) throw new ValidationError('folder_name cannot be empty');

  const existing = await fastify.db
    .selectFrom('file_folders')
    .where('username', '=', username)
    .where('id', '=', id)
    .select('id')
    .executeTakeFirst();

  if (!existing) throw new NotFoundError('Folder not found');

  const duplicate = await fastify.db
    .selectFrom('file_folders')
    .where('username', '=', username)
    .where('folder_name', '=', trimmed)
    .where('id', '!=', id)
    .select('id')
    .executeTakeFirst();

  if (duplicate) throw new ValidationError(`Folder '${trimmed}' already exists`);

  const oldRow = await fastify.db
    .selectFrom('file_folders')
    .where('id', '=', id)
    .select('folder_name')
    .executeTakeFirstOrThrow();

  await fastify.db
    .updateTable('file_folders')
    .set({ folder_name: trimmed })
    .where('id', '=', id)
    .where('username', '=', username)
    .execute();

  await fastify.db
    .updateTable('file_managers')
    .set({ folder: trimmed })
    .where('username', '=', username)
    .where('folder', '=', oldRow.folder_name)
    .execute();

  return { message: 'Folder renamed' };
}

export async function deleteFolder(fastify: FastifyInstance, username: string, id: number) {
  const folder = await fastify.db
    .selectFrom('file_folders')
    .where('id', '=', id)
    .where('username', '=', username)
    .select(['id', 'folder_name'])
    .executeTakeFirst();

  if (!folder) throw new NotFoundError('Folder not found');

  // Get all files inside the folder
  const files = await fastify.db
    .selectFrom('file_managers')
    .where('username', '=', username)
    .where('folder', '=', folder.folder_name)
    .select(['id', 'media'])
    .execute();

  // Delete physical files from disk
  for (const file of files) {
    if (file.media) {
      const absPath = mediaUrlToAbsPath(file.media);
      try { await unlink(absPath); } catch {}
    }
  }

  // Delete all file_managers records for this folder
  if (files.length > 0) {
    await fastify.db
      .deleteFrom('file_managers')
      .where('username', '=', username)
      .where('folder', '=', folder.folder_name)
      .execute();
  }

  // Delete the folder itself
  await fastify.db
    .deleteFrom('file_folders')
    .where('id', '=', id)
    .where('username', '=', username)
    .execute();

  return {
    message:       'Folder deleted',
    files_deleted: files.length,
  };
}

// ── File operations ───────────────────────────────────────────────────────

export interface FileListQuery {
  page?: number;
  limit?: number;
  folder?: string;
  media_type?: string;
  search?: string;
}

export async function listFiles(fastify: FastifyInstance, username: string, q: FileListQuery) {
  const page   = q.page  ?? 1;
  const limit  = q.limit ?? 20;
  const offset = (page - 1) * limit;

  let baseQuery = fastify.db
    .selectFrom('file_managers')
    .where('username', '=', username);

  if (q.folder)     baseQuery = baseQuery.where('folder',     '=', q.folder);
  if (q.media_type) baseQuery = baseQuery.where('media_type', '=', q.media_type);
  if (q.search)     baseQuery = baseQuery.where('media_name', 'like', `%${q.search}%`);

  const [{ total }] = await baseQuery
    .select((eb) => eb.fn.countAll<number>().as('total'))
    .execute();

  const rows = await baseQuery
    .selectAll()
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute();

  const totalPages = Math.ceil(Number(total) / limit);

  return {
    data: rows.map((r) => ({
      ...r,
      // media already stores the full accessible URL
      url: r.media ?? null,
    })),
    meta: {
      total: Number(total), page, limit, totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export async function uploadFile(
  fastify: FastifyInstance,
  username: string,
  part: MultipartFile,
  folder: string | null,
  customName: string | null,
) {
  const mime      = part.mimetype;
  const mediaType = mimeToMediaType(mime);

  if (!mediaType) {
    part.file.resume();
    throw new ValidationError(`File type '${mime}' is not allowed`);
  }

  const typeConfig = ALLOWED_TYPES[mediaType];
  const ext        = getExtFromMime(mime, part.filename);
  const uuid       = crypto.randomUUID();
  const fileName   = `${uuid}.${ext}`;

  const now   = new Date();
  const year  = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day   = String(now.getDate()).padStart(2, '0');

  const relDir  = path.join('uploads', year, month, day, mediaType);
  const absDir  = path.join(process.cwd(), relDir);
  const absPath = path.join(absDir, fileName);

  mkdirSync(absDir, { recursive: true });

  let bytesWritten = 0;
  const writeStream = createWriteStream(absPath);

  try {
    const countingStream = new Transform({
      transform(chunk: Buffer, _enc: string, cb: () => void) {
        bytesWritten += chunk.length;
        if (bytesWritten > typeConfig.maxBytes) {
          const err = new Error('FILE_TOO_LARGE');
          cb = () => {};
          writeStream.destroy();
          this.destroy(err);
          return;
        }
        this.push(chunk);
        cb();
      },
    });

    await pipeline(part.file, countingStream, writeStream);
  } catch (err: any) {
    try { await unlink(absPath); } catch {}
    if (err.message === 'FILE_TOO_LARGE' || part.file.truncated) {
      const mb = typeConfig.maxBytes / (1024 * 1024);
      throw new ValidationError(`${mediaType} files must be ≤ ${mb}MB`);
    }
    throw err;
  }

  if (part.file.truncated) {
    try { await unlink(absPath); } catch {}
    const mb = typeConfig.maxBytes / (1024 * 1024);
    throw new ValidationError(`${mediaType} files must be ≤ ${mb}MB`);
  }

  // Audio uploads get loudness-normalized and converted to mono mp3 so voice
  // campaigns play at consistent volume everywhere (Asterisk's IVR engine
  // plays these files raw - no dialplan-side ffmpeg pass anymore). Also
  // converts wav/m4a/ogg(opus) into a format Asterisk can always read.
  // loudnorm targets match the legacy playurl dialplan.
  let finalFileName = fileName;
  let finalMime     = mime;
  if (mediaType === 'audio') {
    const normPath = path.join(absDir, `${uuid}_norm.mp3`);
    try {
      await execFileAsync(process.env.FFMPEG_PATH || 'ffmpeg', [
        '-y', '-i', absPath,
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
        '-ac', '1', '-ar', '44100', '-b:a', '128k',
        normPath,
      ], { timeout: 60_000 });

      await unlink(absPath);
      finalFileName = `${uuid}.mp3`;
      await rename(normPath, path.join(absDir, finalFileName));
      finalMime    = 'audio/mpeg';
      bytesWritten = (await stat(path.join(absDir, finalFileName))).size;
    } catch (err: any) {
      // ffmpeg missing or file unreadable - keep the original upload rather
      // than failing the whole request, but log loudly since un-normalized
      // audio plays quiet on calls.
      try { await unlink(normPath); } catch {}
      fastify.log.warn({ err: err.message, file: fileName }, 'Audio normalization failed, storing original');
    }
  }

  // Audio duration — probed from the final stored file. Voice campaigns bill
  // 1 credit per started 15s slab, so the server must know the real length
  // rather than trust the client. 120s hard cap.
  let durationSeconds: number | null = null;
  if (mediaType === 'audio') {
    const finalPath = path.join(absDir, finalFileName);
    try {
      const { stdout } = await execFileAsync(process.env.FFPROBE_PATH || 'ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        finalPath,
      ], { timeout: 30_000 });
      const probed = Math.ceil(parseFloat(stdout.trim()));
      if (Number.isFinite(probed) && probed > 0) durationSeconds = probed;
    } catch (err: any) {
      // ffprobe missing/unreadable — keep the upload, campaigns fall back to
      // client-supplied counts for this file
      fastify.log.warn({ err: err.message, file: finalFileName }, 'Audio duration probe failed');
    }

    if (durationSeconds !== null && durationSeconds > 120) {
      try { await unlink(path.join(absDir, finalFileName)); } catch {}
      throw new ValidationError(`Audio duration cannot exceed 120 seconds (this file is ${durationSeconds}s)`);
    }
  }

  const baseUrl  = (fastify as any).config?.BASE_URL ?? '';
  const mediaUrl = `${baseUrl}/uploads/${year}/${month}/${day}/${mediaType}/${finalFileName}`;
  const name     = customName?.trim() || part.filename;

  const result = await fastify.db
    .insertInto('file_managers')
    .values({
      username,
      folder:     folder ?? null,
      media:      mediaUrl,
      media_type: mediaType,
      media_name: name,
      file_size:  bytesWritten,
      mime_type:  mime,
      duration_seconds: durationSeconds,
    })
    .executeTakeFirstOrThrow();

  return {
    id:         Number(result.insertId),
    media_name: name,
    media_type: mediaType,
    media:      mediaUrl,
    url:        mediaUrl,
    file_size:  bytesWritten,
    mime_type:  mime,
    folder:     folder ?? null,
    message:    'File uploaded successfully',
  };
}

// ── GET /storage ──────────────────────────────────────────────────────────────

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + ' GB';
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(2) + ' MB';
  if (bytes >= 1024)      return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' B';
}

export async function getStorageOverview(fastify: FastifyInstance, username: string) {
  const [byType, byFolder] = await Promise.all([
    fastify.db
      .selectFrom('file_managers')
      .where('username', '=', username)
      .select([
        'media_type',
        eb => eb.fn.countAll<number>().as('count'),
        eb => eb.fn.sum<number>('file_size').as('size_bytes'),
      ])
      .groupBy('media_type')
      .execute(),

    fastify.db
      .selectFrom('file_managers')
      .where('username', '=', username)
      .select([
        'folder',
        eb => eb.fn.countAll<number>().as('count'),
        eb => eb.fn.sum<number>('file_size').as('size_bytes'),
      ])
      .groupBy('folder')
      .execute(),
  ]);

  const usedBytes    = byType.reduce((sum, r) => sum + Number(r.size_bytes ?? 0), 0);
  const totalFiles   = byType.reduce((sum, r) => sum + Number(r.count), 0);
  const usagePercent = parseFloat(((usedBytes / STORAGE_LIMIT_BYTES) * 100).toFixed(2));

  return {
    message: 'Storage overview fetched',
    data: {
      storage: {
        limit_bytes:     STORAGE_LIMIT_BYTES,
        limit_label:     '5 GB',
        used_bytes:      usedBytes,
        used_label:      formatBytes(usedBytes),
        remaining_bytes: STORAGE_LIMIT_BYTES - usedBytes,
        remaining_label: formatBytes(STORAGE_LIMIT_BYTES - usedBytes),
        usage_percent:   usagePercent,
      },
      total_files: totalFiles,
      by_type: byType.map(r => ({
        media_type: r.media_type ?? 'unknown',
        count:      Number(r.count),
        size_bytes: Number(r.size_bytes ?? 0),
        size_label: formatBytes(Number(r.size_bytes ?? 0)),
      })),
      by_folder: byFolder.map(r => ({
        folder:     r.folder ?? '(no folder)',
        count:      Number(r.count),
        size_bytes: Number(r.size_bytes ?? 0),
        size_label: formatBytes(Number(r.size_bytes ?? 0)),
      })),
    },
  };
}

export async function deleteFile(fastify: FastifyInstance, username: string, id: number) {
  const file = await fastify.db
    .selectFrom('file_managers')
    .where('id', '=', id)
    .where('username', '=', username)
    .select(['id', 'media'])
    .executeTakeFirst();

  if (!file) throw new NotFoundError('File not found');

  await fastify.db
    .deleteFrom('file_managers')
    .where('id', '=', id)
    .where('username', '=', username)
    .execute();

  if (file.media) {
    const absPath = mediaUrlToAbsPath(file.media);
    try { await unlink(absPath); } catch {}
  }

  return { message: 'File deleted' };
}

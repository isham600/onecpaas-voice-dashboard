import type { FastifyInstance } from 'fastify';

export interface CreateNotificationBody {
  username: string;
  type:     'info' | 'success' | 'warning' | 'error';
  title:    string;
  message:  string;
}

// ── GET / — List latest 50 notifications for a user ──────────────────────────

export async function getNotifications(fastify: FastifyInstance, username: string) {
  const rows = await fastify.db
    .selectFrom('notifications')
    .selectAll()
    .where('username', '=', username)
    .orderBy('created_at', 'desc')
    .limit(50)
    .execute();

  const unread_count = rows.filter((r) => r.is_read === 0).length;

  return { notifications: rows, unread_count };
}

// ── PUT /:id/read — Mark single notification as read ────────────────────────

export async function markOneRead(
  fastify: FastifyInstance,
  username: string,
  id: number,
) {
  const result = await fastify.db
    .updateTable('notifications')
    .set({ is_read: 1 })
    .where('id', '=', id)
    .where('username', '=', username)
    .executeTakeFirst();

  if (!result.numUpdatedRows || result.numUpdatedRows === BigInt(0)) {
    return null; // not found or not owned
  }
  return { updated: true };
}

// ── PUT /read-all — Mark all as read ─────────────────────────────────────────

export async function markAllRead(fastify: FastifyInstance, username: string) {
  await fastify.db
    .updateTable('notifications')
    .set({ is_read: 1 })
    .where('username', '=', username)
    .where('is_read', '=', 0)
    .execute();

  return { updated: true };
}

// ── DELETE /:id — Delete a single notification ───────────────────────────────

export async function deleteOne(
  fastify: FastifyInstance,
  username: string,
  id: number,
) {
  const result = await fastify.db
    .deleteFrom('notifications')
    .where('id', '=', id)
    .where('username', '=', username)
    .executeTakeFirst();

  if (!result.numDeletedRows || result.numDeletedRows === BigInt(0)) {
    return null;
  }
  return { deleted: true };
}

// ── POST / — Create a notification (called by internal services) ─────────────

export async function createNotification(
  fastify: FastifyInstance,
  body: CreateNotificationBody,
) {
  const result = await fastify.db
    .insertInto('notifications')
    .values({
      username: body.username,
      type:     body.type,
      title:    body.title,
      message:  body.message,
    })
    .executeTakeFirstOrThrow();

  const id = Number(result.insertId);

  // Push to connected client in real time — no polling needed on frontend
  fastify.io.to(`user:${body.username}`).emit('notification:new', {
    id,
    username:   body.username,
    type:       body.type,
    title:      body.title,
    message:    body.message,
    is_read:    0,
    created_at: new Date(),
  });

  return { id };
}

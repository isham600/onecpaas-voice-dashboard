import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { notificationsController } from '../controllers/notifications.controller.js';

const auth = (fastify: FastifyInstance) => ({ preValidation: [fastify.authenticate] });

export default async function notificationsRoutes(fastify: FastifyInstance) {

  // ── GET / — List notifications + unread count ─────────────────────────────
  fastify.get('/', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await notificationsController.list(request, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── PUT /read-all — Mark all as read (must come before /:id) ─────────────
  fastify.put('/read-all', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await notificationsController.markAll(request, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── PUT /:id/read — Mark single notification as read ─────────────────────
  fastify.put('/:id/read', {
    ...auth(fastify),
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await notificationsController.markOne(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── DELETE /:id — Delete a notification ──────────────────────────────────
  fastify.delete('/:id', {
    ...auth(fastify),
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await notificationsController.remove(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── POST / — Create a notification (internal — admin or system services) ──
  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'type', 'title', 'message'],
        properties: {
          username: { type: 'string', minLength: 1 },
          type:     { type: 'string', enum: ['info', 'success', 'warning', 'error'] },
          title:    { type: 'string', minLength: 1, maxLength: 200 },
          message:  { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await notificationsController.create(request as any, fastify);
    return reply.code(201).send({ success: true, ...result });
  });
}

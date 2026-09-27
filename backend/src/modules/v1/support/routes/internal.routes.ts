import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { supportController } from '../controllers/support.controller.js';

const auth = (fastify: FastifyInstance) => ({ preValidation: [fastify.authenticate] });

const ticketIdParam = {
  params: {
    type: 'object',
    required: ['ticket_id'],
    properties: { ticket_id: { type: 'string', minLength: 1 } },
  },
};

const idParam = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', pattern: '^[0-9]+$' } },
  },
};

export default async function internalSupportRoutes(fastify: FastifyInstance) {

  // GET /internal/support/tickets
  fastify.get('/tickets', {
    ...auth(fastify),
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page:     { type: 'number', minimum: 1, default: 1 },
          limit:    { type: 'number', minimum: 1, maximum: 100, default: 25 },
          status:   { type: 'number', enum: [0, 1, 2, 3] },
          category: { type: 'string', maxLength: 250 },
          search:   { type: 'string', maxLength: 100 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await supportController.internalList(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // GET /internal/support/tickets/:ticket_id
  fastify.get('/tickets/:ticket_id', {
    ...auth(fastify),
    schema: ticketIdParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await supportController.internalThread(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // POST /internal/support/tickets/:ticket_id/reply
  fastify.post('/tickets/:ticket_id/reply', {
    ...auth(fastify),
    schema: {
      ...ticketIdParam,
      body: {
        type: 'object',
        properties: {
          body:  { type: 'string' },
          media: { type: 'string', maxLength: 255 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await supportController.internalReply(request as any, fastify);
    return reply.code(201).send({ success: true, ...result });
  });

  // PATCH /internal/support/tickets/:ticket_id/status
  fastify.patch('/tickets/:ticket_id/status', {
    ...auth(fastify),
    schema: {
      ...ticketIdParam,
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'number', enum: [0, 1, 2, 3] },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await supportController.updateStatus(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // DELETE /internal/support/tickets/:id
  fastify.delete('/tickets/:id', {
    ...auth(fastify),
    schema: idParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await supportController.deleteMessage(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

}

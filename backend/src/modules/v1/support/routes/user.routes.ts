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

const bodySchema = {
  type: 'object',
  properties: {
    category:             { type: 'string', maxLength: 250 },
    sub_category:         { type: 'string', maxLength: 250 },
    subject_sub_category: { type: 'string', maxLength: 250 },
    subject:              { type: 'string', maxLength: 250 },
    body:                 { type: 'string' },
    media:                { type: 'string', maxLength: 255 },
  },
};

export default async function userSupportRoutes(fastify: FastifyInstance) {

  // POST /support/tickets
  fastify.post('/tickets', {
    ...auth(fastify),
    schema: { body: bodySchema },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await supportController.create(request as any, fastify);
    return reply.code(201).send({ success: true, ...result });
  });

  // POST /support/tickets/:ticket_id/reply
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
    const result = await supportController.userReply(request as any, fastify);
    return reply.code(201).send({ success: true, ...result });
  });

  // GET /support/tickets
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
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await supportController.listMine(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // GET /support/tickets/:ticket_id
  fastify.get('/tickets/:ticket_id', {
    ...auth(fastify),
    schema: ticketIdParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await supportController.thread(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

}

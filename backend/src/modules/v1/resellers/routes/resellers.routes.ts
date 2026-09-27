import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { resellersController } from '../controllers/resellers.controller.js';

const idParam = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', pattern: '^[0-9]+$' } },
  },
};

export default async function resellersRoutes(fastify: FastifyInstance) {
  // ── Public ────────────────────────────────────────────────────────────────

  // GET /resellers?domain=...   or   ?username=...
  // Used by frontend to load branding. Falls back to default domain if no match.
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          domain:   { type: 'string' },
          username: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await resellersController.read(request as any, fastify);
    return reply.code(200).send(result);
  });

  // ── Auth required ─────────────────────────────────────────────────────────

  // Images — registered before /:id so static segment wins
  fastify.get('/images', {
    preValidation: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await resellersController.listImages(request, fastify);
    return reply.code(200).send(result);
  });

  fastify.post('/images', {
    preValidation: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await resellersController.createImage(request, fastify);
    return reply.code(201).send(result);
  });

  fastify.get('/images/:id', {
    preValidation: [fastify.authenticate],
    schema: idParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await resellersController.readImage(request as any, fastify);
    return reply.code(200).send(result);
  });

  fastify.delete('/images/:id', {
    preValidation: [fastify.authenticate],
    schema: idParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await resellersController.removeImage(request as any, fastify);
    return reply.code(200).send(result);
  });

  // Resellers CRUD
  fastify.post('/', {
    preValidation: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await resellersController.create(request, fastify);
    return reply.code(201).send(result);
  });

  fastify.get('/:id', {
    preValidation: [fastify.authenticate],
    schema: idParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await resellersController.readById(request as any, fastify);
    return reply.code(200).send(result);
  });

  fastify.put('/:id', {
    preValidation: [fastify.authenticate],
    schema: idParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await resellersController.update(request as any, fastify);
    return reply.code(200).send(result);
  });

  fastify.delete('/:id', {
    preValidation: [fastify.authenticate],
    schema: idParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await resellersController.remove(request as any, fastify);
    return reply.code(200).send(result);
  });
}

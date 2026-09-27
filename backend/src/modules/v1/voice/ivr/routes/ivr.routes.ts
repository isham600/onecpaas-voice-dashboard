import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ivrController } from '../controllers/ivr.controller.js';

const idParam = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', pattern: '^[0-9]+$' } },
  },
};

const nodeSchema = {
  type: 'object',
  required: ['id', 'type'],
  properties: {
    id:   { type: 'string', maxLength: 100 },
    type: { type: 'string', maxLength: 40 },
    data: { type: 'object' },
  },
};

const edgeSchema = {
  type: 'object',
  required: ['source', 'target'],
  properties: {
    id:     { type: 'string', maxLength: 210 },
    source: { type: 'string', maxLength: 100 },
    target: { type: 'string', maxLength: 100 },
  },
};

export default async function ivrRoutes(fastify: FastifyInstance) {
  const auth = { preValidation: [fastify.authenticate] };

  fastify.get('/', {
    ...auth,
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page:   { type: 'number', default: 1,  minimum: 1 },
          limit:  { type: 'number', default: 20, minimum: 1, maximum: 100 },
          status: { type: 'string', enum: ['draft', 'active'] },
          search: { type: 'string', maxLength: 100 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await ivrController.list(request as any, fastify);
    return reply.code(200).send(result);
  });

  fastify.post('/', {
    ...auth,
    schema: {
      body: {
        type: 'object',
        required: ['title', 'route'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          route: { type: 'string', enum: ['transactional', 'promotional'] },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await ivrController.create(request as any, fastify);
    return reply.code(201).send(result);
  });

  fastify.get('/:id', {
    ...auth,
    schema: idParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await ivrController.getOne(request as any, fastify);
    return reply.code(200).send(result);
  });

  fastify.put('/:id/steps', {
    ...auth,
    schema: {
      ...idParam,
      body: {
        type: 'object',
        required: ['nodes', 'edges'],
        properties: {
          title: { type: 'string', maxLength: 255 },
          nodes: { type: 'array', maxItems: 300, items: nodeSchema },
          edges: { type: 'array', maxItems: 300, items: edgeSchema },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await ivrController.saveSteps(request as any, fastify);
    return reply.code(200).send(result);
  });

  fastify.delete('/:id', {
    ...auth,
    schema: idParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await ivrController.remove(request as any, fastify);
    return reply.code(200).send(result);
  });
}

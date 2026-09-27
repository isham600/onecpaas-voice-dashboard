import type { FastifyInstance } from 'fastify';
import { flowsController } from '../controllers/flows.controller.js';

export default async function flowsRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preValidation: [fastify.authenticate] }, flowsController.list);
  fastify.post('/', { preValidation: [fastify.authenticate] }, flowsController.create);

  fastify.get('/:id', {
    preValidation: [fastify.authenticate],
    schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } },
  }, flowsController.get);

  fastify.put('/:id', {
    preValidation: [fastify.authenticate],
    schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } },
  }, flowsController.update);

  fastify.delete('/:id', {
    preValidation: [fastify.authenticate],
    schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } },
  }, flowsController.remove);
}

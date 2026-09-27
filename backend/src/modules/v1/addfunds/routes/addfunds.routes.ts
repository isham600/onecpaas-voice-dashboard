import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { addfundsController } from '../controllers/addfunds.controller.js';

const auth = (fastify: FastifyInstance) => ({ preValidation: [fastify.authenticate] });

export default async function addfundsRoutes(fastify: FastifyInstance) {
  fastify.get('/auth/multipliers', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await addfundsController.getMultipliers(request);
    return reply.code(200).send(result);
  });

  fastify.post('/auth/get-credits', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await addfundsController.getCredits(request);
    return reply.code(200).send(result);
  });
}

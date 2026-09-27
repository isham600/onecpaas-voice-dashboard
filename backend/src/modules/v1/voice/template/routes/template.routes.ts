import type { FastifyInstance } from 'fastify';

export default async function templateRoutes(fastify: FastifyInstance) {
  fastify.get('/info', async (_request, reply) => {
    return reply.code(200).send({
      success: true,
      module: 'voice-template',
      message: 'Voice Template module is active',
      timestamp: new Date().toISOString(),
    });
  });
}

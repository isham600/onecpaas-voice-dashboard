import type { FastifyInstance } from 'fastify';
import userSupportRoutes    from './routes/user.routes.js';
import internalSupportRoutes from './routes/internal.routes.js';

export async function userSupportModule(fastify: FastifyInstance) {
  await fastify.register(userSupportRoutes);
}

export async function internalSupportModule(fastify: FastifyInstance) {
  await fastify.register(internalSupportRoutes);
}

import type { FastifyInstance } from 'fastify';
import profileRoutes from './routes/profile.routes.js';

export default async function profileModule(fastify: FastifyInstance) {
  await fastify.register(profileRoutes, { prefix: '/' });
}

import type { FastifyInstance } from 'fastify';
import notificationsRoutes from './routes/notifications.routes.js';

export default async function notificationsModule(fastify: FastifyInstance) {
  await fastify.register(notificationsRoutes);
}

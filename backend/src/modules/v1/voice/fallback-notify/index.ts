import { FastifyInstance } from 'fastify';
import fallbackNotifyRoutes from './routes/fallback-notify.routes.js';

export default async function voiceFallbackNotifyModule(fastify: FastifyInstance) {
  await fastify.register(fallbackNotifyRoutes);
}

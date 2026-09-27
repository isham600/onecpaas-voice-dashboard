import { FastifyInstance } from 'fastify';
import webhookRoutes from './routes/webhook.routes.js';

export default async function voiceWebhookModule(fastify: FastifyInstance) {
  await fastify.register(webhookRoutes);
}

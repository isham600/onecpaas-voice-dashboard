import type { FastifyInstance } from 'fastify';
import { voiceWebhookController } from '../controllers/webhook.controller.js';

// No client JWT here — this is a server-to-server callback from the
// external voice engine, authenticated via VOICE_ENGINE_WEBHOOK_SECRET
// (checked in the controller) instead of fastify.authenticate.
export default async function webhookRoutes(fastify: FastifyInstance) {
  fastify.post('/status', voiceWebhookController.status);
  fastify.post('/notifynow', voiceWebhookController.notifynow);
}

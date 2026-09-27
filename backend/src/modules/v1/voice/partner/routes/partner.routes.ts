import type { FastifyInstance } from 'fastify';
import { partnerController } from '../controllers/partner.controller.js';

// No fastify.authenticate here — every route in this module is public
// (reachable without a logged-in panel session) and authenticates itself
// via the partner API token instead (see partner-auth.service.ts).
export default async function partnerRoutes(fastify: FastifyInstance) {
  fastify.post('/submit', partnerController.submit);
  fastify.get('/report', partnerController.report);
  fastify.get('/details', partnerController.details);
  fastify.get('/ivrs', partnerController.ivrs);
  fastify.post('/webhook', partnerController.registerWebhook);
  fastify.get('/webhook', partnerController.getWebhook);
  fastify.delete('/webhook', partnerController.disableWebhook);
}

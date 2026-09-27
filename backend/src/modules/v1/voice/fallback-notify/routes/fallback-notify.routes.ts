import type { FastifyInstance } from 'fastify';
import { fallbackNotifyController } from '../controllers/fallback-notify.controller.js';

// Route/assignment CRUD lives under client-management now (admin-managed,
// not self-service). Only the public delivery-status callback stays here.
export default async function fallbackNotifyRoutes(fastify: FastifyInstance) {
  fastify.post('/callback/:tracking_id', fallbackNotifyController.callback);
}

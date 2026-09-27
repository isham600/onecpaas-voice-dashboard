import type { FastifyReply, FastifyRequest } from 'fastify';
import { recordDeliveryCallback } from '../services/fallback-notify.service.js';

export const fallbackNotifyController = {
  // Called by the CLIENT's own SMS/WhatsApp provider, not by a logged-in
  // cell247 user — no auth, matches the trust model of most delivery-status
  // webhooks (the tracking_id itself is the unguessable credential). Route
  // CRUD and per-client assignment now live entirely under client-management
  // (admin-managed, not self-service — see client-management.routes.ts).
  callback: async (request: FastifyRequest, reply: FastifyReply) => {
    const { tracking_id } = request.params as { tracking_id: string };
    const result = await recordDeliveryCallback(request.server, tracking_id, request.body);
    return reply.code(200).send({ success: true, matched: result.matched });
  },
};

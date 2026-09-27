import type { FastifyReply, FastifyRequest } from 'fastify';
import { authenticatePartnerRequest } from '../services/partner-auth.service.js';
import {
  partnerSubmit, partnerReport, partnerDetails, partnerListIvrs,
  registerPartnerWebhook, getPartnerWebhook, disablePartnerWebhook,
} from '../services/partner.service.js';

export const partnerController = {
  submit: async (request: FastifyRequest, reply: FastifyReply) => {
    const username = await authenticatePartnerRequest(request.server, request);
    const data = await partnerSubmit(request.server, username, request);
    return reply.code(201).send({ success: true, data, message: 'Campaign queued successfully.' });
  },

  report: async (request: FastifyRequest, reply: FastifyReply) => {
    const username = await authenticatePartnerRequest(request.server, request);
    const { request_id } = request.query as { request_id?: string };
    const data = await partnerReport(request.server, username, request_id ?? '');
    return reply.code(200).send({ success: true, ...data });
  },

  details: async (request: FastifyRequest, reply: FastifyReply) => {
    const username = await authenticatePartnerRequest(request.server, request);
    const q = (request.query ?? {}) as Record<string, string | undefined>;
    const data = await partnerDetails(request.server, username, q.request_id ?? '', {
      page: q.page ? Number(q.page) : undefined,
      limit: q.limit ? Number(q.limit) : undefined,
      search: q.search,
      status: q.status,
    });
    return reply.code(200).send({ success: true, ...data });
  },

  ivrs: async (request: FastifyRequest, reply: FastifyReply) => {
    const username = await authenticatePartnerRequest(request.server, request);
    const data = await partnerListIvrs(request.server, username);
    return reply.code(200).send({ success: true, ...data });
  },

  registerWebhook: async (request: FastifyRequest, reply: FastifyReply) => {
    const username = await authenticatePartnerRequest(request.server, request);
    const { url } = (request.body ?? {}) as { url?: string };
    const data = await registerPartnerWebhook(request.server, username, url ?? '');
    return reply.code(200).send({ success: true, data });
  },

  getWebhook: async (request: FastifyRequest, reply: FastifyReply) => {
    const username = await authenticatePartnerRequest(request.server, request);
    const data = await getPartnerWebhook(request.server, username);
    return reply.code(200).send({ success: true, data });
  },

  disableWebhook: async (request: FastifyRequest, reply: FastifyReply) => {
    const username = await authenticatePartnerRequest(request.server, request);
    const data = await disablePartnerWebhook(request.server, username);
    return reply.code(200).send({ success: true, data });
  },
};

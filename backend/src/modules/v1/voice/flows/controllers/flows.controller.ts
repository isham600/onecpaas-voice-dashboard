import type { FastifyReply, FastifyRequest } from 'fastify';
import { listFlows, getFlow, createFlow, updateFlow, deleteFlow } from '../services/flows.service.js';
import { ValidationError } from '../../../../../utils/errors.js';

function parseId(request: FastifyRequest): number {
  const { id } = request.params as { id: string };
  const parsed = parseInt(id, 10);
  if (!Number.isFinite(parsed)) throw new ValidationError('Invalid flow id');
  return parsed;
}

export const flowsController = {
  list: async (request: FastifyRequest, reply: FastifyReply) => {
    const { username } = request.user as { username: string };
    const data = await listFlows(request.server, username);
    return reply.code(200).send({ success: true, data });
  },

  get: async (request: FastifyRequest, reply: FastifyReply) => {
    const { username } = request.user as { username: string };
    const data = await getFlow(request.server, username, parseId(request));
    return reply.code(200).send({ success: true, data });
  },

  create: async (request: FastifyRequest, reply: FastifyReply) => {
    const { username } = request.user as { username: string };
    const data = await createFlow(request.server, username, request.body as any);
    return reply.code(201).send({ success: true, data, message: 'Flow saved.' });
  },

  update: async (request: FastifyRequest, reply: FastifyReply) => {
    const { username } = request.user as { username: string };
    const data = await updateFlow(request.server, username, parseId(request), request.body as any);
    return reply.code(200).send({ success: true, data, message: 'Flow updated.' });
  },

  remove: async (request: FastifyRequest, reply: FastifyReply) => {
    const { username } = request.user as { username: string };
    const data = await deleteFlow(request.server, username, parseId(request));
    return reply.code(200).send({ success: true, data, message: 'Flow deleted.' });
  },
};

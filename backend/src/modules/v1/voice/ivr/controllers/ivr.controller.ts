import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  listIvrs, getIvr, createIvr, saveIvrSteps, deleteIvr,
  type IvrListQuery, type CreateIvrBody, type SaveStepsBody,
} from '../services/ivr.service.js';

class IvrController {
  async list(request: FastifyRequest<{ Querystring: IvrListQuery }>, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const result = await listIvrs(fastify, username, request.query);
    return { success: true, ...result };
  }

  async getOne(request: FastifyRequest<{ Params: { id: string } }>, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const result = await getIvr(fastify, username, Number(request.params.id));
    return { success: true, ...result };
  }

  async create(request: FastifyRequest<{ Body: CreateIvrBody }>, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const result = await createIvr(fastify, username, request.body);
    return { success: true, ...result };
  }

  async saveSteps(
    request: FastifyRequest<{ Params: { id: string }; Body: SaveStepsBody }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const result = await saveIvrSteps(fastify, username, Number(request.params.id), request.body);
    return { success: true, ...result };
  }

  async remove(request: FastifyRequest<{ Params: { id: string } }>, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const result = await deleteIvr(fastify, username, Number(request.params.id));
    return { success: true, ...result };
  }
}

export const ivrController = new IvrController();

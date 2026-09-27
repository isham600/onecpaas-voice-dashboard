import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  createReseller,
  readReseller,
  readResellerById,
  updateReseller,
  deleteReseller,
  listResellerImages,
  createResellerImage,
  readResellerImage,
  deleteResellerImage,
} from '../services/resellers.service.js';

class ResellersController {
  // ── Resellers ─────────────────────────────────────────────────────────────

  async read(request: FastifyRequest<{ Querystring: { domain?: string; username?: string } }>, fastify: FastifyInstance) {
    return readReseller(fastify, request.query.domain, request.query.username);
  }

  async create(request: FastifyRequest, fastify: FastifyInstance) {
    const parts = (request as any).parts() as AsyncIterableIterator<any>;
    return createReseller(fastify, parts);
  }

  async readById(request: FastifyRequest<{ Params: { id: string } }>, fastify: FastifyInstance) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid id');
    return readResellerById(fastify, id);
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, fastify: FastifyInstance) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid id');
    const parts = (request as any).parts() as AsyncIterableIterator<any>;
    return updateReseller(fastify, id, parts);
  }

  async remove(request: FastifyRequest<{ Params: { id: string } }>, fastify: FastifyInstance) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid id');
    return deleteReseller(fastify, id);
  }

  // ── Reseller Images ───────────────────────────────────────────────────────

  async listImages(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    return listResellerImages(fastify, username);
  }

  async createImage(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const parts = (request as any).parts() as AsyncIterableIterator<any>;
    return createResellerImage(fastify, username, parts);
  }

  async readImage(request: FastifyRequest<{ Params: { id: string } }>, fastify: FastifyInstance) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid id');
    return readResellerImage(fastify, id);
  }

  async removeImage(request: FastifyRequest<{ Params: { id: string } }>, fastify: FastifyInstance) {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid id');
    return deleteResellerImage(fastify, id);
  }
}

export const resellersController = new ResellersController();

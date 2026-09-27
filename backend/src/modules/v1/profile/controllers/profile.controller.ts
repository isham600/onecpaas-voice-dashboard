import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  getMyProfile,
  updateAccount,
  updateBusiness,
  changeOwnPassword,
  generateApiToken,
  type UpdateAccountBody,
  type UpdateBusinessBody,
  type ChangeOwnPasswordBody,
} from '../services/profile.service.js';

class ProfileController {
  async me(request: FastifyRequest, fastify: FastifyInstance) {
    const { userId } = request.user as { userId: number };
    const data = await getMyProfile(fastify, userId);
    return { success: true, data };
  }

  async updateAccount(
    request: FastifyRequest<{ Body: UpdateAccountBody }>,
    fastify: FastifyInstance,
  ) {
    const { userId } = request.user as { userId: number };
    return updateAccount(fastify, userId, request.body);
  }

  async updateBusiness(
    request: FastifyRequest<{ Body: UpdateBusinessBody }>,
    fastify: FastifyInstance,
  ) {
    const { userId } = request.user as { userId: number };
    return updateBusiness(fastify, userId, request.body);
  }

  async changePassword(
    request: FastifyRequest<{ Body: ChangeOwnPasswordBody }>,
    fastify: FastifyInstance,
  ) {
    const { userId } = request.user as { userId: number };
    return changeOwnPassword(fastify, userId, request.body);
  }

  async generateApiToken(request: FastifyRequest, fastify: FastifyInstance) {
    const { userId } = request.user as { userId: number };
    return generateApiToken(fastify, userId);
  }
}

export const profileController = new ProfileController();

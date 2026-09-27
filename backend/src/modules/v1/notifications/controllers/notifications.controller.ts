import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  getNotifications,
  markOneRead,
  markAllRead,
  deleteOne,
  createNotification,
  type CreateNotificationBody,
} from '../services/notifications.service.js';

type AuthUser = { username: string };

class NotificationsController {
  async list(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as AuthUser;
    return getNotifications(fastify, username);
  }

  async markOne(
    request: FastifyRequest<{ Params: { id: string } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as AuthUser;
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid notification id');

    const result = await markOneRead(fastify, username, id);
    if (!result) throw fastify.httpErrors.notFound('Notification not found');
    return result;
  }

  async markAll(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as AuthUser;
    return markAllRead(fastify, username);
  }

  async remove(
    request: FastifyRequest<{ Params: { id: string } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as AuthUser;
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid notification id');

    const result = await deleteOne(fastify, username, id);
    if (!result) throw fastify.httpErrors.notFound('Notification not found');
    return result;
  }

  async create(
    request: FastifyRequest<{ Body: CreateNotificationBody }>,
    fastify: FastifyInstance,
  ) {
    return createNotification(fastify, request.body);
  }
}

export const notificationsController = new NotificationsController();

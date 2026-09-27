import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  createTicket,
  replyToTicket,
  listMyTickets,
  getTicketThread,
  listTicketsInternal,
  updateTicketStatus,
  deleteTicketMessage,
  type CreateTicketBody,
  type ReplyBody,
  type TicketQuery,
  type InternalTicketQuery,
} from '../services/support.service.js';

class SupportController {

  // ── User endpoints ──────────────────────────────────────────────────────────

  async create(
    request: FastifyRequest<{ Body: CreateTicketBody }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return createTicket(fastify, username, request.body);
  }

  async userReply(
    request: FastifyRequest<{ Params: { ticket_id: string }; Body: ReplyBody }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return replyToTicket(fastify, username, 'user', request.params.ticket_id, request.body);
  }

  async listMine(
    request: FastifyRequest<{ Querystring: TicketQuery }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return listMyTickets(fastify, username, request.query);
  }

  async thread(
    request: FastifyRequest<{ Params: { ticket_id: string } }>,
    fastify: FastifyInstance,
  ) {
    return getTicketThread(fastify, request.params.ticket_id);
  }

  // ── Internal endpoints ──────────────────────────────────────────────────────

  async internalList(
    request: FastifyRequest<{ Querystring: InternalTicketQuery }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return listTicketsInternal(fastify, username, request.query);
  }

  async internalThread(
    request: FastifyRequest<{ Params: { ticket_id: string } }>,
    fastify: FastifyInstance,
  ) {
    return getTicketThread(fastify, request.params.ticket_id);
  }

  async internalReply(
    request: FastifyRequest<{ Params: { ticket_id: string }; Body: ReplyBody }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return replyToTicket(fastify, username, 'reseller', request.params.ticket_id, request.body);
  }

  async updateStatus(
    request: FastifyRequest<{ Params: { ticket_id: string }; Body: { status: number } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return updateTicketStatus(fastify, username, request.params.ticket_id, request.body.status);
  }

  async deleteMessage(
    request: FastifyRequest<{ Params: { id: string } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return deleteTicketMessage(fastify, username, Number(request.params.id));
  }
}

export const supportController = new SupportController();

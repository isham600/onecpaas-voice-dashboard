import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  getClientTree,
  getClientStats,
  listClients,
  createClient,
  updateClientPermissions,
  getClientPermissions,
  updateClientExpiry,
  impersonateClient,
  changeClientPassword,
  getMyCreditLogs,
  getClientCreditLogs,
  getMyStatement,
  getStatementServiceOptions,
  getServicePurchaseUsageSummary,
  getMonthlySummary,
  getDownlineTransferSummary,
  getDownlineUserDetails,
  type StatementQuery,
  type ServiceSummaryQuery,
  type MonthlySummaryQuery,
  type DownlineSummaryQuery,
  type DownlineDetailsQuery,
  type UpdatePermissionsBody,
  getClientById,
  updateClient,
  changeUserType,
  changeStatus,
  deleteClient,
  transferCredits,
  type ClientQuery,
  type CreateClientBody,
  type UpdateClientBody,
  type ChangeUserTypeBody,
  type ChangeStatusBody,
  type TransferCreditsBody,
  type ChangeClientPasswordBody,
  type CreditLogsQuery,
  listFallbackRoutes,
  createFallbackRoute,
  updateFallbackRoute,
  deleteFallbackRoute,
  setFallbackRouteDefault,
  clearFallbackRouteDefault,
  getClientFallbackAssignments,
  assignClientFallbackRoute,
  removeClientFallbackAssignment,
  testClientFallbackRoute,
  listFallbackLogsForAdmin,
  type FallbackLogsQuery,
  listVoiceRoutesAdmin,
  updateVoiceRouteAdmin,
  listVoiceRouteAssignmentsAdmin,
  listVoiceRouteLogsAdmin,
  getClientVoiceRoute,
  setClientVoiceRoute,
} from '../services/client-management.service.js';
import type { UpsertRouteBody } from '../../voice/fallback-notify/services/fallback-notify.service.js';

class ClientManagementController {
  async tree(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    return getClientTree(fastify, username);
  }

  async stats(
    request: FastifyRequest,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return getClientStats(fastify, username);
  }

  async list(
    request: FastifyRequest<{ Querystring: ClientQuery }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return listClients(fastify, username, request.query);
  }

  async create(
    request: FastifyRequest<{ Body: CreateClientBody }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return createClient(fastify, username, request.body);
  }

  async getById(
    request: FastifyRequest<{ Params: { id: string } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return getClientById(fastify, username, id);
  }

  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateClientBody }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return updateClient(fastify, username, id, request.body);
  }

  async changeUserType(
    request: FastifyRequest<{ Params: { id: string }; Body: ChangeUserTypeBody }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return changeUserType(fastify, username, id, request.body);
  }

  async changeStatus(
    request: FastifyRequest<{ Params: { id: string }; Body: ChangeStatusBody }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return changeStatus(fastify, username, id, request.body);
  }

  async remove(
    request: FastifyRequest<{ Params: { id: string } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return deleteClient(fastify, username, id);
  }

  async transferCredits(
    request: FastifyRequest<{ Params: { id: string }; Body: TransferCreditsBody }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return transferCredits(fastify, username, id, request.body);
  }

  async updatePermissions(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdatePermissionsBody }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return updateClientPermissions(fastify, username, id, request.body);
  }

  async getPermissions(
    request: FastifyRequest<{ Params: { id: string } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return getClientPermissions(fastify, username, id);
  }

  // ── Voice Call Fallback Notify — Routes (global, reusable) + per-client
  // Assignments, managed from Manage Clients. ──────────────────────────────

  async listRoutes(
    request: FastifyRequest<{ Querystring: { channel?: string } }>,
    fastify: FastifyInstance,
  ) {
    return listFallbackRoutes(fastify, request.query?.channel);
  }

  async createRoute(
    request: FastifyRequest<{ Body: UpsertRouteBody }>,
    fastify: FastifyInstance,
  ) {
    return createFallbackRoute(fastify, request.body);
  }

  async updateRoute(
    request: FastifyRequest<{ Params: { routeId: string }; Body: Partial<UpsertRouteBody> }>,
    fastify: FastifyInstance,
  ) {
    const routeId = parseInt(request.params.routeId, 10);
    if (isNaN(routeId)) throw fastify.httpErrors.badRequest('Invalid route id');
    return updateFallbackRoute(fastify, routeId, request.body);
  }

  async deleteRoute(
    request: FastifyRequest<{ Params: { routeId: string } }>,
    fastify: FastifyInstance,
  ) {
    const routeId = parseInt(request.params.routeId, 10);
    if (isNaN(routeId)) throw fastify.httpErrors.badRequest('Invalid route id');
    return deleteFallbackRoute(fastify, routeId);
  }

  async setRouteDefault(
    request: FastifyRequest<{ Params: { routeId: string } }>,
    fastify: FastifyInstance,
  ) {
    const routeId = parseInt(request.params.routeId, 10);
    if (isNaN(routeId)) throw fastify.httpErrors.badRequest('Invalid route id');
    return setFallbackRouteDefault(fastify, routeId);
  }

  async clearRouteDefault(
    request: FastifyRequest<{ Params: { routeId: string } }>,
    fastify: FastifyInstance,
  ) {
    const routeId = parseInt(request.params.routeId, 10);
    if (isNaN(routeId)) throw fastify.httpErrors.badRequest('Invalid route id');
    return clearFallbackRouteDefault(fastify, routeId);
  }

  async getClientFallbackAssignments(
    request: FastifyRequest<{ Params: { id: string } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return getClientFallbackAssignments(fastify, username, id);
  }

  async assignClientFallbackRoute(
    request: FastifyRequest<{ Params: { id: string }; Body: { channel: string; route_id: number } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return assignClientFallbackRoute(fastify, username, id, request.body.channel, request.body.route_id);
  }

  async removeClientFallbackAssignment(
    request: FastifyRequest<{ Params: { id: string; channel: string } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return removeClientFallbackAssignment(fastify, username, id, request.params.channel);
  }

  async testClientFallbackRoute(
    request: FastifyRequest<{ Params: { id: string; channel: string }; Body: { number?: string } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return testClientFallbackRoute(fastify, username, id, request.params.channel, request.body ?? {});
  }

  // ── Voice Routes ──────────────────────────────────────────────────────────
  async listVoiceRoutes(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    return listVoiceRoutesAdmin(fastify, username);
  }

  async updateVoiceRoute(
    request: FastifyRequest<{ Params: { code: string }; Body: { url?: string; api_key?: string; status?: 0 | 1; regenerate_webhook_token?: boolean } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return updateVoiceRouteAdmin(fastify, username, request.params.code, request.body ?? {});
  }

  async voiceRouteAssignments(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    return listVoiceRouteAssignmentsAdmin(fastify, username);
  }

  async voiceRouteLogs(
    request: FastifyRequest<{ Querystring: { route_code?: string; status?: string; page?: number; limit?: number } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return listVoiceRouteLogsAdmin(fastify, username, request.query);
  }

  async getClientVoiceRoute(request: FastifyRequest<{ Params: { id: string } }>, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return getClientVoiceRoute(fastify, username, id);
  }

  async setClientVoiceRoute(
    request: FastifyRequest<{ Params: { id: string }; Body: { route_code: string } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return setClientVoiceRoute(fastify, username, id, request.body?.route_code);
  }

  async fallbackLogs(
    request: FastifyRequest<{ Querystring: FallbackLogsQuery }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return listFallbackLogsForAdmin(fastify, username, request.query);
  }

  async updateExpiry(
    request: FastifyRequest<{ Params: { id: string }; Body: { expiry: string | null } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return updateClientExpiry(fastify, username, id, request.body.expiry);
  }

  async impersonate(
    request: FastifyRequest<{ Params: { id: string } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return impersonateClient(fastify, username, id);
  }

  async changePassword(
    request: FastifyRequest<{ Params: { id: string }; Body: ChangeClientPasswordBody }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return changeClientPassword(fastify, username, id, request.body);
  }

  async myCreditLogs(
    request: FastifyRequest<{ Querystring: CreditLogsQuery }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return getMyCreditLogs(fastify, username, request.query);
  }

  async clientCreditLogs(
    request: FastifyRequest<{ Params: { id: string }; Querystring: CreditLogsQuery }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) throw fastify.httpErrors.badRequest('Invalid client id');
    return getClientCreditLogs(fastify, username, id, request.query);
  }

  async myStatement(
    request: FastifyRequest<{ Querystring: StatementQuery }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return getMyStatement(fastify, username, request.query);
  }

  async statementServiceOptions(
    request: FastifyRequest,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return getStatementServiceOptions(fastify, username);
  }

  async serviceSummary(
    request: FastifyRequest<{ Querystring: ServiceSummaryQuery }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return getServicePurchaseUsageSummary(fastify, username, request.query);
  }

  async monthlySummary(
    request: FastifyRequest<{ Querystring: MonthlySummaryQuery }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return getMonthlySummary(fastify, username, request.query);
  }

  async downlineSummary(
    request: FastifyRequest<{ Querystring: DownlineSummaryQuery }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return getDownlineTransferSummary(fastify, username, request.query);
  }

  async downlineUserDetails(
    request: FastifyRequest<{ Querystring: DownlineDetailsQuery }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    return getDownlineUserDetails(fastify, username, request.query);
  }
}

export const clientManagementController = new ClientManagementController();

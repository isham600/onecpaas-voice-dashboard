import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { clientManagementController } from '../controllers/client-management.controller.js';

const auth = (fastify: FastifyInstance) => ({ preValidation: [fastify.authenticate] });

const idParam = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', pattern: '^[0-9]+$' } },
  },
};

const VALID_SERVICES = [
  'whatsapp_marketing_credits',
  'bulk_whatsapp_credits',
  'international_bulk_whatsapp_credits',
  'action_button_credits',
  'whatsapp_utility_credits',
  'whatsapp_credits',
  'branded_whatsapp_credits',
  'unbranded_whatsapp_credits',
  'sms_credits',
  'voice_credits',
  'voice_pulse30_credits',
  'rcs_credits',
  'gsm_credits',
  'gsm_sim_credit',
  'ai_videos_credits',
  'email_credits',
  'instagram_credits',
  'unofficial_business',
  'telegram_credits',
];

export default async function clientManagementRoutes(fastify: FastifyInstance) {

  // ── GET /management/tree ─────────────────────────────────────────────────
  fastify.get('/management/tree', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.tree(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── GET /management — list clients ────────────────────────────────────────
  fastify.get('/management', {
    ...auth(fastify),
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page:      { type: 'number', minimum: 1, default: 1 },
          limit:     { type: 'number', minimum: 1, maximum: 100, default: 25 },
          search:    { type: 'string', maxLength: 100 },
          user_type: { type: 'string', enum: ['client', 'reseller'] },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.list(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── POST /management — create client ──────────────────────────────────────
  fastify.post('/management', {
    ...auth(fastify),
    schema: {
      body: {
        type: 'object',
        required: ['first_name', 'last_name', 'client_username', 'client_email', 'client_mobile_no', 'user_type', 'password', 'password_confirmation'],
        properties: {
          first_name:            { type: 'string', minLength: 1, maxLength: 100 },
          last_name:             { type: 'string', minLength: 1, maxLength: 100 },
          client_username:       { type: 'string', minLength: 3, maxLength: 100 },
          client_email:          { type: 'string', format: 'email', maxLength: 191 },
          client_mobile_no:      { type: 'string', pattern: '^[0-9]{8,15}$' },
          user_type:             { type: 'string', enum: ['client', 'reseller'] },
          password:              { type: 'string', minLength: 8, maxLength: 100 },
          password_confirmation: { type: 'string', minLength: 8, maxLength: 100 },
          country:               { type: 'string', maxLength: 100, nullable: true },
          expiry:                { type: 'string', format: 'date', nullable: true },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.create(request as any, fastify);
    return reply.code(201).send({ success: true, status: 1, ...result });
  });

  // ── GET /management/stats — overview counts ───────────────────────────────
  fastify.get('/management/stats', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.stats(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── GET /management/:id — get single client ───────────────────────────────
  fastify.get('/management/:id', {
    ...auth(fastify),
    schema: idParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.getById(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── PUT /management/:id — update client ───────────────────────────────────
  fastify.put('/management/:id', {
    ...auth(fastify),
    schema: {
      ...idParam,
      body: {
        type: 'object',
        properties: {
          first_name:       { type: 'string', minLength: 1, maxLength: 100 },
          last_name:        { type: 'string', minLength: 1, maxLength: 100 },
          client_username:  { type: 'string', minLength: 3, maxLength: 100 },
          client_email:     { type: 'string', format: 'email', maxLength: 191 },
          client_mobile_no: { type: 'string', pattern: '^[0-9]{8,15}$' },
          user_type:        { type: 'string', enum: ['client', 'reseller'] },
          country:          { type: 'string', maxLength: 100, nullable: true },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.update(request as any, fastify);
    return reply.code(200).send({ success: true, status: 1, ...result });
  });

  // ── PATCH /management/:id/usertype ────────────────────────────────────────
  fastify.patch('/management/:id/usertype', {
    ...auth(fastify),
    schema: {
      ...idParam,
      body: {
        type: 'object',
        required: ['user_type'],
        properties: {
          user_type: { type: 'string', enum: ['client', 'reseller'] },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.changeUserType(request as any, fastify);
    return reply.code(200).send({ success: true, status: 1, ...result });
  });

  // ── PATCH /management/:id/status ──────────────────────────────────────────
  fastify.patch('/management/:id/status', {
    ...auth(fastify),
    schema: {
      ...idParam,
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['true', 'false'] },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.changeStatus(request as any, fastify);
    return reply.code(200).send({ success: true, status: 1, ...result });
  });

  // ── DELETE /management/:id — delete client ────────────────────────────────
  fastify.delete('/management/:id', {
    ...auth(fastify),
    schema: idParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.remove(request as any, fastify);
    return reply.code(200).send({ success: true, status: 1, ...result });
  });

  // ── PATCH /management/:id/permissions — update permission flags ──────────
  fastify.patch('/management/:id/permissions', {
    ...auth(fastify),
    schema: {
      ...idParam,
      body: {
        type: 'object',
        properties: {
          can_access_report:            { type: 'number', enum: [0, 1] },
          email_credits:                { type: 'number', enum: [0, 1] },
          whatsapp_credits:             { type: 'number', enum: [0, 1] },
          Whatsapp_marketing:           { type: 'number', enum: [0, 1] },
          whatsapp_utility:             { type: 'number', enum: [0, 1] },
          bulk_whatsapp:                { type: 'number', enum: [0, 1] },
          international_bulk_whatsapp:  { type: 'number', enum: [0, 1] },
          action_button:                { type: 'number', enum: [0, 1] },
          unofficial_whatsapp_add_button: { type: 'number', enum: [0, 1] },
          branded_whatsapp:             { type: 'number', enum: [0, 1] },
          unbranded_whatsapp:           { type: 'number', enum: [0, 1] },
          sms_credits:                  { type: 'number', enum: [0, 1] },
          voice_credits:                { type: 'number', enum: [0, 1] },
          voice_pulse30:                { type: 'number', enum: [0, 1] },
          rcs_credits:                  { type: 'number', enum: [0, 1] },
          gsm_credits:                  { type: 'number', enum: [0, 1] },
          Credit_SIM_line:              { type: 'number', enum: [0, 1] },
          Credit_SIM_GSM:               { type: 'number', enum: [0, 1] },
          ai_videos_credits:            { type: 'number', enum: [0, 1] },
          virtual_call_credits:         { type: 'number', enum: [0, 1] },
          telegram:                     { type: 'number', enum: [0, 1] },
          instagram:                    { type: 'number', enum: [0, 1] },
          manage_clients:               { type: 'number', enum: [0, 1] },
          metalogin:                    { type: 'number', enum: [0, 1] },
          invoice:                      { type: 'number', enum: [0, 1] },
          invoice_create:               { type: 'number', enum: [0, 1] },
          billing:                      { type: 'number', enum: [0, 1] },
          admin_support:                { type: 'number', enum: [0, 1] },
          reseller_support:             { type: 'number', enum: [0, 1] },
          support:                      { type: 'number', enum: [0, 1] },
          broadcast_masterreseller:     { type: 'number', enum: [0, 1] },
          broadcast_masterreseller_csv: { type: 'number', enum: [0, 1] },
          Broadcast_chart:              { type: 'number', enum: [0, 1] },
          broadcast_readstatus:         { type: 'number', enum: [0, 1] },
          your_integration:             { type: 'number', enum: [0, 1] },
          reseller_setting:             { type: 'number', enum: [0, 1] },
          can_agent_access_all_chat:    { type: 'number', enum: [0, 1] },
          agent_auto_assign_sendtemp:   { type: 'number', enum: [0, 1] },
          agent_showtemp_username:      { type: 'number', enum: [0, 1] },
          agent_auto_assign_broadcast:  { type: 'number', enum: [0, 1] },
          numbers_credits:              { type: 'number', enum: [0, 1] },
          international_call:           { type: 'number', enum: [0, 1] },
          url_shortener:                { type: 'number', enum: [0, 1] },
          file_manager:                 { type: 'number', enum: [0, 1] },
          google_integration:           { type: 'number', enum: [0, 1] },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.updatePermissions(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── GET /management/:id/permissions — dedicated permissions read ─────────
  fastify.get('/management/:id/permissions', {
    ...auth(fastify),
    schema: idParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.getPermissions(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── Voice Call Fallback Notify — Routes (global, reusable) + per-client
  // Assignments, managed from Manage Clients. ──────────────────────────────
  const clientIdParam = {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'string', pattern: '^[0-9]+$' } } },
  };
  const clientChannelParam = {
    params: {
      type: 'object', required: ['id', 'channel'],
      properties: { id: { type: 'string', pattern: '^[0-9]+$' }, channel: { type: 'string', enum: ['whatsapp', 'sms'] } },
    },
  };
  const routeIdParam = {
    params: { type: 'object', required: ['routeId'], properties: { routeId: { type: 'string', pattern: '^[0-9]+$' } } },
  };

  // Routes — global, not tied to any client id.
  fastify.get('/management/fallback-routes', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.listRoutes(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  fastify.post('/management/fallback-routes', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.createRoute(request as any, fastify);
    return reply.code(201).send({ success: true, ...result });
  });

  fastify.put('/management/fallback-routes/:routeId', {
    ...auth(fastify), schema: routeIdParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.updateRoute(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  fastify.delete('/management/fallback-routes/:routeId', {
    ...auth(fastify), schema: routeIdParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.deleteRoute(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  fastify.post('/management/fallback-routes/:routeId/set-default', {
    ...auth(fastify), schema: routeIdParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.setRouteDefault(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  fastify.delete('/management/fallback-routes/:routeId/set-default', {
    ...auth(fastify), schema: routeIdParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.clearRouteDefault(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // Assignments — scoped to one client.
  fastify.get('/management/:id/fallback-assignments', {
    ...auth(fastify), schema: clientIdParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.getClientFallbackAssignments(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  fastify.post('/management/:id/fallback-assignments', {
    ...auth(fastify), schema: clientIdParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.assignClientFallbackRoute(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  fastify.delete('/management/:id/fallback-assignments/:channel', {
    ...auth(fastify), schema: clientChannelParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.removeClientFallbackAssignment(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  fastify.post('/management/:id/fallback-assignments/:channel/test', {
    ...auth(fastify), schema: clientChannelParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.testClientFallbackRoute(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── Voice Routes (predefined providers + per-user assignment) ────────────
  const codeParam = { params: { type: 'object', required: ['code'], properties: { code: { type: 'string', enum: ['default', 'notifynow'] } } } };

  fastify.get('/management/voice-routes', { ...auth(fastify) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.listVoiceRoutes(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  fastify.put('/management/voice-routes/:code', { ...auth(fastify), schema: codeParam }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.updateVoiceRoute(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  fastify.get('/management/voice-route-assignments', { ...auth(fastify) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.voiceRouteAssignments(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  fastify.get('/management/voice-route-logs', {
    ...auth(fastify),
    schema: { querystring: { type: 'object', properties: {
      route_code: { type: 'string', enum: ['default', 'notifynow'] },
      status: { type: 'string', enum: ['sent', 'failed', 'received'] },
      page: { type: 'number', minimum: 1, default: 1 },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 25 },
    } } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.voiceRouteLogs(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  fastify.get('/management/:id/voice-route', { ...auth(fastify), schema: idParam }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.getClientVoiceRoute(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  fastify.put('/management/:id/voice-route', {
    ...auth(fastify),
    schema: { ...idParam, body: { type: 'object', required: ['route_code'], properties: { route_code: { type: 'string', enum: ['default', 'notifynow'] } } } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.setClientVoiceRoute(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // Logs/report — every fallback attempt across the caller's own account +
  // its direct downline clients, joined with the route name, filterable.
  fastify.get('/management/fallback-logs', {
    ...auth(fastify),
    schema: {
      querystring: {
        type: 'object',
        properties: {
          route_id: { type: 'number' },
          channel:  { type: 'string', enum: ['whatsapp', 'sms'] },
          status:   { type: 'string', enum: ['pending', 'sent', 'failed'] },
          page:     { type: 'number', minimum: 1, default: 1 },
          limit:    { type: 'number', minimum: 1, maximum: 100, default: 25 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.fallbackLogs(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── PATCH /management/:id/expiry — set or clear account validity date ────
  fastify.patch('/management/:id/expiry', {
    ...auth(fastify),
    schema: {
      ...idParam,
      body: {
        type: 'object',
        required: ['expiry'],
        properties: {
          expiry: {
            anyOf: [
              { type: 'string', format: 'date' },
              { type: 'null' },
            ],
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.updateExpiry(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── GET /credits/logs — logged-in user's own transaction logs ────────────
  fastify.get('/credits/logs', {
    ...auth(fastify),
    schema: {
      querystring: {
        type: 'object',
        properties: {
          start_date: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
          end_date:   { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
          service:    { type: 'string', maxLength: 100 },
          cd:         { type: 'string', enum: ['credit', 'debit'] },
          page:       { type: 'number', minimum: 1, default: 1 },
          limit:      { type: 'number', minimum: 1, maximum: 100, default: 25 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.myCreditLogs(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── GET /credits/statement — debit/credit statement with running balance ──
  fastify.get('/credits/statement', {
    ...auth(fastify),
    schema: {
      querystring: {
        type: 'object',
        properties: {
          service:    { type: 'string' }, // comma-separated back_end_names, or 'all'
          type:       { type: 'string' }, // comma-separated: Purchase,Transfer,Refund,Adjustment,Usage
          start_date: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
          end_date:   { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
          page:       { type: 'number', minimum: 1, default: 1 },
          limit:      { type: 'number', minimum: 1, maximum: 100, default: 25 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.myStatement(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── GET /credits/services — dynamic dropdown source for the statement report ──
  fastify.get('/credits/services', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.statementServiceOptions(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── GET /credits/service-summary — Service Purchase & Usage Summary ──────
  fastify.get('/credits/service-summary', {
    ...auth(fastify),
    schema: {
      querystring: {
        type: 'object',
        properties: {
          start_date: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
          end_date:   { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.serviceSummary(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── GET /credits/monthly-summary — one row per month, per service or all ──
  fastify.get('/credits/monthly-summary', {
    ...auth(fastify),
    schema: {
      querystring: {
        type: 'object',
        properties: {
          service:    { type: 'string', enum: [...VALID_SERVICES, 'all'] },
          start_date: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
          end_date:   { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.monthlySummary(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── GET /credits/downline-summary — purchases + per-user transfer totals ──
  fastify.get('/credits/downline-summary', {
    ...auth(fastify),
    schema: {
      querystring: {
        type: 'object',
        properties: {
          year:    { type: 'number', minimum: 2000, maximum: 2100 },
          month:   { type: 'number', minimum: 1, maximum: 12 },
          service: { type: 'string', enum: [...VALID_SERVICES, 'all'] },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.downlineSummary(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── GET /credits/downline-summary/details — day-wise records for one user ─
  fastify.get('/credits/downline-summary/details', {
    ...auth(fastify),
    schema: {
      querystring: {
        type: 'object',
        required: ['target'],
        properties: {
          target:  { type: 'string', minLength: 1 },
          year:    { type: 'number', minimum: 2000, maximum: 2100 },
          month:   { type: 'number', minimum: 1, maximum: 12 },
          service: { type: 'string', enum: [...VALID_SERVICES, 'all'] },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.downlineUserDetails(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── GET /management/:id/credits/logs — specific client's transaction logs ─
  fastify.get('/management/:id/credits/logs', {
    ...auth(fastify),
    schema: {
      ...idParam,
      querystring: {
        type: 'object',
        properties: {
          start_date: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
          end_date:   { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
          service:    { type: 'string', maxLength: 100 },
          cd:         { type: 'string', enum: ['credit', 'debit'] },
          page:       { type: 'number', minimum: 1, default: 1 },
          limit:      { type: 'number', minimum: 1, maximum: 100, default: 25 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.clientCreditLogs(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── PATCH /management/:id/password — change client password ─────────────
  fastify.patch('/management/:id/password', {
    ...auth(fastify),
    schema: {
      ...idParam,
      body: {
        type: 'object',
        required: ['new_password', 'new_password_confirmation'],
        properties: {
          new_password:              { type: 'string', minLength: 8, maxLength: 100 },
          new_password_confirmation: { type: 'string', minLength: 8, maxLength: 100 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.changePassword(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── POST /management/:id/impersonate — generate client JWT ───────────────
  fastify.post('/management/:id/impersonate', {
    ...auth(fastify),
    schema: idParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.impersonate(request as any, fastify);
    return reply.code(200).send({ success: true, ...result });
  });

  // ── POST /management/:id/credits — transfer credits ───────────────────────
  fastify.post('/management/:id/credits', {
    ...auth(fastify),
    schema: {
      ...idParam,
      body: {
        type: 'object',
        required: ['client_username', 'service', 'operation', 'credits', 'amount'],
        properties: {
          client_username: { type: 'string', minLength: 1 },
          service:         { type: 'string', enum: VALID_SERVICES },
          operation:       { type: 'string', enum: ['credit', 'debit'] },
          credits:         { type: 'number', minimum: 1 },
          amount:          { type: 'number', minimum: 0 },
          description:     { type: 'string', maxLength: 255 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await clientManagementController.transferCredits(request as any, fastify);
    return reply.code(200).send({ success: true, status: 1, ...result });
  });

}

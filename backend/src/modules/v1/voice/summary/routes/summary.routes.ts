import type { FastifyInstance } from 'fastify';
import { summaryController } from '../controllers/summary.controller.js';

const exportFiltersSchema = {
  type: 'object',
  properties: {
    search:    { type: 'string', maxLength: 100 },
    status:    { type: 'string', maxLength: 50 },
    from_date: { type: 'string' },
    to_date:   { type: 'string' },
    pulse30:   { type: 'number', enum: [0, 1] },
  },
};

const jobIdParam = {
  params: {
    type: 'object',
    required: ['jobId'],
    properties: { jobId: { type: 'string', maxLength: 100 } },
  },
};

export default async function summaryRoutes(fastify: FastifyInstance) {
  // GET /api/v1/voice/summary?from_date=&to_date=&page=&limit=&sort=&order=&status=
  fastify.get('/', {
    preValidation: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        required: ['from_date', 'to_date'],
        properties: {
          from_date: { type: 'string' },
          to_date:   { type: 'string' },
          status:    { type: 'string' },
          page:      { type: 'integer', default: 1, minimum: 1 },
          limit:     { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          sort:      { type: 'string', enum: ['created_at', 'dte'], default: 'created_at' },
          order:     { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          pulse30:   { type: 'number', enum: [0, 1] },
        },
      },
    },
  }, async (request, reply) => {
    const result = await summaryController.list(request, fastify);
    return reply.code(200).send(result);
  });

  // ══════════════════════════════════════════════════════════
  // REPORT EXPORTS — async job queue (queued -> processing -> ready/failed)
  // ══════════════════════════════════════════════════════════

  // GET /api/v1/voice/summary/reports — list all export jobs for this user
  fastify.get('/reports', {
    preValidation: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['voice_summary', 'voice_details'] },
        },
      },
    },
  }, async (request, reply) => {
    const result = await summaryController.exportList(request, fastify);
    return reply.code(200).send(result);
  });

  // POST /api/v1/voice/summary/export?from_date=&to_date=&status= — queue
  // the full report export (the "Export" button), unpaginated unlike list()
  fastify.post('/export', {
    preValidation: [fastify.authenticate],
    schema: {
      querystring: {
        ...exportFiltersSchema,
        required: ['from_date', 'to_date'],
      },
    },
  }, async (request, reply) => {
    const result = await summaryController.exportSummary(request, fastify);
    return reply.code(202).send(result);
  });

  // POST /api/v1/voice/summary/:requestId/export — queue one campaign's
  // recipient CSV, ported from the legacy POST /get-delivery-csvdata
  fastify.post('/:requestId/export', {
    preValidation: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['requestId'],
        properties: { requestId: { type: 'string' } },
      },
      querystring: exportFiltersSchema,
    },
  }, async (request, reply) => {
    const result = await summaryController.exportDetails(request, fastify);
    return reply.code(202).send(result);
  });

  // GET /api/v1/voice/summary/reports/:jobId — poll export job status
  fastify.get('/reports/:jobId', {
    preValidation: [fastify.authenticate],
    schema: jobIdParam,
  }, async (request, reply) => {
    const result = await summaryController.exportStatus(request, fastify);
    return reply.code(200).send(result);
  });

  // GET /api/v1/voice/summary/reports/:jobId/download — stream a ready export
  fastify.get('/reports/:jobId/download', {
    preValidation: [fastify.authenticate],
    schema: { ...jobIdParam, response: { '2xx': { type: 'string' } } },
  }, async (request, reply) => {
    await summaryController.exportDownload(request, fastify, reply);
  });

  // GET /api/v1/voice/summary/status?from_date=&to_date= — status breakdown
  // for the "Call Overview" dashboard cards, ported from GET /api/voice-status
  fastify.get('/status', {
    preValidation: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        required: ['from_date', 'to_date'],
        properties: {
          from_date: { type: 'string' },
          to_date:   { type: 'string' },
          pulse30:   { type: 'number', enum: [0, 1] },
        },
      },
    },
  }, async (request, reply) => {
    const result = await summaryController.statusCounts(request, fastify);
    return reply.code(200).send(result);
  });

  // GET /api/v1/voice/summary/:requestId/status — status breakdown for one
  // campaign, ported from GET /api/voice-status-req
  fastify.get('/:requestId/status', {
    preValidation: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['requestId'],
        properties: { requestId: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    const result = await summaryController.statusCountsForRequest(request, fastify);
    return reply.code(200).send(result);
  });

  // GET /api/v1/voice/summary/:requestId/flow — the campaign's uploaded IVR
  // menu (engine flow_json) for read-only display
  fastify.get('/:requestId/flow', {
    preValidation: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['requestId'],
        properties: { requestId: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    const result = await summaryController.campaignFlow(request, fastify);
    return reply.code(200).send(result);
  });

  // GET /api/v1/voice/summary/:requestId/dtmf — DTMF digit distribution +
  // dispositions for an IVR campaign (ivr_enabled:false for plain broadcasts)
  fastify.get('/:requestId/dtmf', {
    preValidation: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['requestId'],
        properties: { requestId: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    const result = await summaryController.dtmfStats(request, fastify);
    return reply.code(200).send(result);
  });

  // GET /api/v1/voice/summary/:requestId — per-recipient drill-down (the
  // "eye" action), ported from GET /api/voice-details
  fastify.get('/:requestId', {
    preValidation: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['requestId'],
        properties: { requestId: { type: 'string' } },
      },
      querystring: {
        type: 'object',
        properties: {
          page:          { type: 'integer', default: 1,  minimum: 1 },
          limit:         { type: 'integer', default: 10, minimum: 1, maximum: 100 },
          search:        { type: 'string' },
          status:        { type: 'string' },
          schedule_date: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const result = await summaryController.details(request, fastify);
    return reply.code(200).send(result);
  });
}

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { summaryService, type SummaryQuery, type DetailsQuery, type StatusCountsQuery } from '../services/summary.service.js';
import {
  requestVoiceSummaryExport, requestVoiceDetailsExport,
  getExportStatus, listExports, downloadExport,
  type VoiceExportType, type ExportFilters,
} from '../services/export.service.js';

class SummaryController {
  async list(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const query = request.query as SummaryQuery;

    const { data, meta } = await summaryService.list(fastify, username, query);
    return { success: true, data, meta };
  }

  async statusCounts(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const query = request.query as StatusCountsQuery;

    const { data } = await summaryService.statusCounts(fastify, username, query);
    return { success: true, data };
  }

  async statusCountsForRequest(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const { requestId } = request.params as { requestId: string };

    const { data } = await summaryService.statusCountsForRequest(fastify, username, requestId);
    return { success: true, data };
  }

  async details(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const { requestId } = request.params as { requestId: string };
    const query = request.query as DetailsQuery;

    const { data, meta } = await summaryService.details(fastify, username, requestId, query);
    return { success: true, data, meta };
  }

  async dtmfStats(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const { requestId } = request.params as { requestId: string };

    const result = await summaryService.dtmfStats(fastify, username, requestId);
    return { success: true, ...result };
  }

  async campaignFlow(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const { requestId } = request.params as { requestId: string };

    const result = await summaryService.campaignFlow(fastify, username, requestId);
    return { success: true, ...result };
  }

  // ── Async CSV exports (job queue) ──────────────────────────────────────────

  async exportSummary(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const query = request.query as ExportFilters;

    const result = await requestVoiceSummaryExport(fastify, username, query);
    return { success: true, ...result };
  }

  async exportDetails(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const { requestId } = request.params as { requestId: string };
    const query = request.query as ExportFilters;

    const result = await requestVoiceDetailsExport(fastify, username, requestId, query);
    return { success: true, ...result };
  }

  async exportList(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const { type } = request.query as { type?: VoiceExportType };

    const result = await listExports(fastify, username, type);
    return { success: true, ...result };
  }

  async exportStatus(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const { jobId } = request.params as { jobId: string };

    const result = await getExportStatus(fastify, username, jobId);
    return { success: true, ...result };
  }

  async exportDownload(request: FastifyRequest, fastify: FastifyInstance, reply: FastifyReply) {
    const { username } = request.user as { username: string };
    const { jobId } = request.params as { jobId: string };

    await downloadExport(fastify, username, jobId, reply);
  }
}

export const summaryController = new SummaryController();

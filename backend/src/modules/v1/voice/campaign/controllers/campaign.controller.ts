import type { FastifyInstance, FastifyRequest } from 'fastify';
import { submitVoiceCampaign, stopVoiceCampaign } from '../services/campaign.service.js';

class CampaignController {
  async submit(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const data = await submitVoiceCampaign(fastify, username, request);
    return { success: true, data, message: 'Campaign queued successfully.' };
  }

  async pause(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const { requestId } = request.params as { requestId: string };
    const data = await stopVoiceCampaign(fastify, username, requestId);
    return { success: true, data, message: 'Campaign paused.' };
  }
}

export const campaignController = new CampaignController();

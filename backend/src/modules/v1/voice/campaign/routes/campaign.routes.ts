import type { FastifyInstance } from 'fastify';
import { campaignController } from '../controllers/campaign.controller.js';

export default async function campaignRoutes(fastify: FastifyInstance) {
  fastify.get('/info', async (_request, reply) => {
    return reply.code(200).send({
      success: true,
      module: 'voice-campaign',
      message: 'Voice Campaign module is active',
      timestamp: new Date().toISOString(),
    });
  });

  // POST /api/v1/voice/campaign/submit — multipart (textbox or csv_file)
  fastify.post('/submit', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const result = await campaignController.submit(request, fastify);
    return reply.code(201).send(result);
  });

  // POST /api/v1/voice/campaign/:requestId/pause — hard-stop a running
  // campaign (not-yet-dialed + retry-pending rows only, one-way for now)
  fastify.post('/:requestId/pause', {
    preValidation: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['requestId'],
        properties: { requestId: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    const result = await campaignController.pause(request, fastify);
    return reply.code(200).send(result);
  });
}

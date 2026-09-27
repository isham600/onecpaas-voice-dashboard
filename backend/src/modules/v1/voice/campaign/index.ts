import { FastifyInstance } from 'fastify';
import campaignRoutes from './routes/campaign.routes.js';

export default async function campaignModule(fastify: FastifyInstance) {
  await fastify.register(campaignRoutes);
}

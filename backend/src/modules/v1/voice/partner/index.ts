import { FastifyInstance } from 'fastify';
import partnerRoutes from './routes/partner.routes.js';

export default async function voicePartnerModule(fastify: FastifyInstance) {
  await fastify.register(partnerRoutes);
}

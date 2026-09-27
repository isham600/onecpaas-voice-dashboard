import { FastifyInstance } from 'fastify';
import flowsRoutes from './routes/flows.routes.js';

export default async function voiceFlowsModule(fastify: FastifyInstance) {
  await fastify.register(flowsRoutes);
}

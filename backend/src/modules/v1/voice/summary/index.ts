import { FastifyInstance } from 'fastify';
import summaryRoutes from './routes/summary.routes.js';

export default async function summaryModule(fastify: FastifyInstance) {
  await fastify.register(summaryRoutes);
}

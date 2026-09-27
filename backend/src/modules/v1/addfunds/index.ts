import type { FastifyInstance } from 'fastify';
import addfundsRoutes from './routes/addfunds.routes.js';

export default async function addfundsModule(fastify: FastifyInstance) {
  fastify.register(addfundsRoutes);
}

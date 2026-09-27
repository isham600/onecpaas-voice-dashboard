import { FastifyInstance } from 'fastify';
import resellersRoutes from './routes/resellers.routes.js';

export default async function resellersModule(fastify: FastifyInstance) {
  await fastify.register(resellersRoutes);
}

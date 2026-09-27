import { FastifyInstance } from 'fastify';
import ivrRoutes from './routes/ivr.routes.js';

export default async function ivrModule(fastify: FastifyInstance) {
  await fastify.register(ivrRoutes);
}

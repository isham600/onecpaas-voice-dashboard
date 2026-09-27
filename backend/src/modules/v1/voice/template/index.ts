import { FastifyInstance } from 'fastify';
import templateRoutes from './routes/template.routes.js';

export default async function templateModule(fastify: FastifyInstance) {
  await fastify.register(templateRoutes);
}

import { FastifyInstance } from 'fastify';
import fileHostingRoutes from './routes/file-hosting.routes.js';

export default async function fileHostingModule(fastify: FastifyInstance) {
  await fastify.register(fileHostingRoutes);
}

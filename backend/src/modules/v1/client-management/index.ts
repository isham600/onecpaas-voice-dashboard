import { FastifyInstance } from 'fastify';
import clientManagementRoutes from './routes/client-management.routes.js';

export default async function clientManagementModule(fastify: FastifyInstance) {
  await fastify.register(clientManagementRoutes);
}

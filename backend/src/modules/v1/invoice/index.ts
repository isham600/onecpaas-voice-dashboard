import type { FastifyInstance } from 'fastify';
import invoiceRoutes from './routes/invoice.routes.js';

export default async function invoiceModule(fastify: FastifyInstance) {
  fastify.register(invoiceRoutes);
}

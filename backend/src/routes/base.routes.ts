import { FastifyInstance } from 'fastify';

export async function registerHealthRoutes(fastify: FastifyInstance) {
  // ──────────────────────────────────────────────────────
  // Health Check
  // ──────────────────────────────────────────────────────
  fastify.get('/health', async (request, reply) => {
    return reply.code(200).send({
      success: true,
      code: 'SERVICE_HEALTHY',
      message: 'Service is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
    });
  });

  // ──────────────────────────────────────────────────────
  // API Status
  // ──────────────────────────────────────────────────────
  fastify.get('/api', async (request, reply) => {
    return reply.code(200).send({
      success: true,
      code: 'API_RUNNING',
      message: 'WhatsApp CRM API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // ──────────────────────────────────────────────────────
  // Catch All - Not Found
  // Uses setNotFoundHandler so static-file routes are never intercepted.
  // ──────────────────────────────────────────────────────
  fastify.setNotFoundHandler(async (request, reply) => {
    return reply.code(404).send({
      success: false,
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
      timestamp: new Date().toISOString(),
    });
  });
}
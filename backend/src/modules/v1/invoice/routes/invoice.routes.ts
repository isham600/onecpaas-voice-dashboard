import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { invoiceController } from '../controllers/invoice.controller.js';

const auth = (fastify: FastifyInstance) => ({ preValidation: [fastify.authenticate] });

export default async function invoiceRoutes(fastify: FastifyInstance) {
  fastify.post('/get-invoice', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Determine whether this is a read or create based on payload action if needed
    // However, the controller specifically has read and create functions.
    // The frontend sends { action: "read" } to get-invoice.
    const body: any = request.body || {};
    if (body.action === 'read') {
      const result = await invoiceController.read(request);
      return reply.code(200).send(result);
    } else {
      // Default behavior if action not specified (or add create here if needed, but best to separate)
      const result = await invoiceController.read(request);
      return reply.code(200).send(result);
    }
  });

  fastify.post('/create', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await invoiceController.create(request);
    return reply.code(200).send(result);
  });

  fastify.post('/getcompany-invoice', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await invoiceController.getCompanies(request);
    return reply.code(200).send(result);
  });

  fastify.post('/invoice_company', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await invoiceController.createCompany(request);
    return reply.code(200).send(result);
  });

  fastify.post('/update-company', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await invoiceController.updateCompany(request);
    return reply.code(200).send(result);
  });

  fastify.post('/delete-company', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await invoiceController.deleteCompany(request);
    return reply.code(200).send(result);
  });

  fastify.get('/:id/pdf', {
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await invoiceController.generatePDF(request, reply);
  });

  fastify.post('/preview', {
    ...auth(fastify),
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    await invoiceController.previewPDF(request, reply);
  });
}

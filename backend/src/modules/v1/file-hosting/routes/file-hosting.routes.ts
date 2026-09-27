import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { fileHostingController } from '../controllers/file-hosting.controller.js';

const idParam = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', pattern: '^[0-9]+$' } },
  },
};

export default async function fileHostingRoutes(fastify: FastifyInstance) {
  // multipart registered globally via src/plugins/multipart.ts

  // ── Folders ──────────────────────────────────────────────

  fastify.get('/folders', {
    preValidation: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await fileHostingController.getFolders(request, fastify);
    return reply.code(200).send(result);
  });

  fastify.post('/folders', {
    preValidation: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['folder_name'],
        properties: { folder_name: { type: 'string', maxLength: 255 } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await fileHostingController.postFolder(request as any, fastify);
    return reply.code(201).send(result);
  });

  fastify.put('/folders/:id', {
    preValidation: [fastify.authenticate],
    schema: {
      ...idParam,
      body: {
        type: 'object',
        required: ['folder_name'],
        properties: { folder_name: { type: 'string', maxLength: 255 } },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await fileHostingController.putFolder(request as any, fastify);
    return reply.code(200).send(result);
  });

  fastify.delete('/folders/:id', {
    preValidation: [fastify.authenticate],
    schema: idParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await fileHostingController.removeFolder(request as any, fastify);
    return reply.code(200).send(result);
  });

  // ── Files ─────────────────────────────────────────────────

  fastify.get('/files', {
    preValidation: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page:       { type: 'number', default: 1,  minimum: 1 },
          limit:      { type: 'number', default: 20, minimum: 1, maximum: 100 },
          folder:     { type: 'string', maxLength: 255 },
          media_type: { type: 'string', enum: ['image', 'video', 'documents', 'audio'] },
          search:     { type: 'string', maxLength: 100 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await fileHostingController.getFiles(request as any, fastify);
    return reply.code(200).send(result);
  });

  fastify.post('/upload', {
    preValidation: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          folder: { type: 'string', maxLength: 255 },
          name:   { type: 'string', maxLength: 255 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await fileHostingController.upload(request, fastify);
    return reply.code(201).send(result);
  });

  fastify.get('/storage', {
    preValidation: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await fileHostingController.storageOverview(request, fastify);
    return reply.code(200).send(result);
  });

  fastify.delete('/files/:id', {
    preValidation: [fastify.authenticate],
    schema: idParam,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await fileHostingController.removeFile(request as any, fastify);
    return reply.code(200).send(result);
  });

}

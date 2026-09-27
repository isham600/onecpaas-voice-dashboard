import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  listFolders, createFolder, renameFolder, deleteFolder,
  listFiles, uploadFile, deleteFile, getStorageOverview,
  type FileListQuery,
} from '../services/file-hosting.service.js';

class FileHostingController {
  async getFolders(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const result = await listFolders(fastify, username);
    return { success: true, ...result };
  }

  async postFolder(request: FastifyRequest<{ Body: { folder_name: string } }>, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const result = await createFolder(fastify, username, request.body.folder_name);
    return { success: true, ...result };
  }

  async putFolder(
    request: FastifyRequest<{ Params: { id: string }; Body: { folder_name: string } }>,
    fastify: FastifyInstance,
  ) {
    const { username } = request.user as { username: string };
    const result = await renameFolder(fastify, username, Number(request.params.id), request.body.folder_name);
    return { success: true, ...result };
  }

  async removeFolder(request: FastifyRequest<{ Params: { id: string } }>, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const result = await deleteFolder(fastify, username, Number(request.params.id));
    return { success: true, ...result };
  }

  async getFiles(request: FastifyRequest<{ Querystring: FileListQuery }>, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const result = await listFiles(fastify, username, request.query);
    return { success: true, ...result };
  }

  async upload(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const q          = request.query as any;
    const folder     = q.folder as string | undefined;
    const customName = q.name   as string | undefined;

    const part = await request.file();
    if (!part) {
      return { success: false, message: 'No file provided' };
    }

    const result = await uploadFile(fastify, username, part, folder ?? null, customName ?? null);
    return { success: true, ...result };
  }

  async removeFile(request: FastifyRequest<{ Params: { id: string } }>, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const result = await deleteFile(fastify, username, Number(request.params.id));
    return { success: true, ...result };
  }

  async storageOverview(request: FastifyRequest, fastify: FastifyInstance) {
    const { username } = request.user as { username: string };
    const result = await getStorageOverview(fastify, username);
    return { success: true, ...result };
  }
}

export const fileHostingController = new FileHostingController();

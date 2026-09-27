import fp from 'fastify-plugin';
import { Server } from 'socket.io';
import type { FastifyInstance } from 'fastify';

// Connected clients: sender_id → socket.id
const connectedClients: Record<string, string> = {};

declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
    ioClients: Record<string, string>;
  }
}

export default fp(async function socketPlugin(fastify: FastifyInstance) {
  const io = new Server(fastify.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    const sender_id = socket.handshake.query.sender_id as string | undefined;
    const username  = socket.handshake.query.username  as string | undefined;

    if (sender_id) {
      // Join a named room so multiple clients watching the same sender number all receive events
      socket.join(`sender:${sender_id}`);
      connectedClients[sender_id] = socket.id;
      fastify.log.info(`[socket.io] connected  sender_id=${sender_id}  socket=${socket.id}`);
    }

    if (username) {
      socket.join(`user:${username}`);
      fastify.log.info(`[socket.io] joined room  user:${username}  socket=${socket.id}`);
    }

    if (!sender_id && !username) {
      fastify.log.warn('[socket.io] client connected without sender_id or username');
    }

    socket.on('disconnect', () => {
      if (sender_id) {
        delete connectedClients[sender_id];
        fastify.log.info(`[socket.io] disconnected  sender_id=${sender_id}`);
      }
    });
  });

  fastify.decorate('io', io);
  fastify.decorate('ioClients', connectedClients);

  fastify.addHook('onClose', (_instance, done) => {
    io.close();
    done();
  });
});

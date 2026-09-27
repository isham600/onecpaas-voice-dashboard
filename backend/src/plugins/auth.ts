import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export interface JwtPayload {
  userId:       number;
  username:     string;
  email:        string;
  name:         string;
  role:         string;
  usertype:     string | null;
  tokenVersion: number;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'change_me_in_production',
    sign: { expiresIn: '7d' },
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    await request.jwtVerify();

    const { userId, tokenVersion } = request.user;

    const row = await fastify.db
      .selectFrom('ci_admin')
      .select(['token_version', 'expiry'])
      .where('admin_id', '=', userId)
      .executeTakeFirst();

    if (!row || (row.token_version ?? 0) !== tokenVersion) {
      return reply.code(401).send({ success: false, message: 'Session expired. Please log in again.' });
    }

    if (row.expiry) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      if (today > row.expiry) {
        return reply.code(403).send({ success: false, message: 'Account expired. Please contact your administrator.' });
      }
    }
  });
});

import fp from 'fastify-plugin';
import { db } from '../models/db.js';
import { Kysely } from 'kysely';
import { DB } from '../models/schema.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Kysely<DB>;
  }
}

export default fp(async (fastify) => {
  fastify.decorate('db', db);
});
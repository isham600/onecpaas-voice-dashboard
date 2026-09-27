import type { FastifyInstance } from 'fastify';
import { redisConnection as redis } from '../queues/index.js';

const USERTYPE_TTL = 300; // cache usertype/parent-username for 5 minutes

// If ci_admin.usertype = 'agent' → look up parent username from assign_users.
// Otherwise use own username.
// Result is cached in Redis for 5 minutes — usertype rarely changes.
export async function resolveUsername(
  fastify: FastifyInstance,
  loggedInUsername: string,
): Promise<string> {
  const cacheKey = `usertype:${loggedInUsername}`;
  const cached   = await redis.get(cacheKey);
  // 'self' sentinel = not an agent, return own username
  if (cached !== null) return cached === 'self' ? loggedInUsername : cached;

  const user = await fastify.db
    .selectFrom('ci_admin')
    .select('usertype')
    .where('username', '=', loggedInUsername)
    .executeTakeFirst();

  if (user?.usertype === 'agent') {
    const assignRow = await fastify.db
      .selectFrom('assign_users')
      .select('username')
      .where('assign_user', '=', loggedInUsername)
      .executeTakeFirst();

    const parent = assignRow?.username ?? loggedInUsername;
    redis.set(cacheKey, parent, 'EX', USERTYPE_TTL).catch(() => {});
    return parent;
  }

  redis.set(cacheKey, 'self', 'EX', USERTYPE_TTL).catch(() => {});
  return loggedInUsername;
}

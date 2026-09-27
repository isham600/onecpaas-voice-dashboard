import fp from 'fastify-plugin';
import fastifyEnv from '@fastify/env';

export default fp(async (fastify) => {
  await fastify.register(fastifyEnv, {
    schema: {
      type: 'object',
      required: ['MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'],
      properties: {
        MYSQL_HOST: { type: 'string' },
        MYSQL_PORT: { type: 'string' },
        MYSQL_USER: { type: 'string' },
        MYSQL_PASSWORD: { type: 'string' },
        MYSQL_DATABASE: { type: 'string' },
        REDIS_HOST: { type: 'string', default: 'localhost' },
        REDIS_PORT: { type: 'string', default: '6379' },
        NODE_ENV: { type: 'string', default: 'development' },
        PORT: { type: 'string', default: '3040' },
        BASE_URL: { type: 'string' },
        ALLOWED_ORIGINS: { type: 'string', default: 'http://localhost:3000' },
        JWT_SECRET: { type: 'string', default: 'change_me' },
        ENCRYPTION_KEY: { type: 'string' },
        PANEL_URL: { type: 'string', default: 'http://localhost:3000' },
      },
    },
    dotenv: true,
  });
});

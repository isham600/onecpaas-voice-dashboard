import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleError } from './utils/errors.js';

// Plugins
import config from './plugins/config.js';
import sensible from './plugins/sensible.js';
import db from './plugins/db.js';
import authPlugin from './plugins/auth.js';
import multipartPlugin from './plugins/multipart.js';
import socketPlugin from './plugins/socket.js';

// Routes
import { registerHealthRoutes } from './routes/base.routes.js';

// Modules — v1
import authModule from './modules/v1/auth/index.js';
import voiceModule from './modules/v1/voice/index.js';
import fileHostingModule from './modules/v1/file-hosting/index.js';
import clientManagementModule from './modules/v1/client-management/index.js';
import profileModule from './modules/v1/profile/index.js';
import { userSupportModule, internalSupportModule } from './modules/v1/support/index.js';
import notificationsModule from './modules/v1/notifications/index.js';
import resellersModule from './modules/v1/resellers/index.js';
import invoiceModule from './modules/v1/invoice/index.js';
import addfundsModule from './modules/v1/addfunds/index.js';

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          colorize: true,
        },
      },
    },
    bodyLimit: 1024 * 1024 * 10,
    trustProxy: true,  // read real IP from X-Forwarded-For (nginx proxy)
  });

  // ── Plugins ──────────────────────────────────────────────
  await app.register(config);
  await app.register(sensible);
  await app.register(db);
  await app.register(authPlugin);
  await app.register(multipartPlugin);
  await app.register(socketPlugin);

  // ── Global Error Handler ─────────────────────────────────
  app.setErrorHandler(async (error, request, reply) => {
    return handleError(reply, error, request);
  });

  // ── CORS ─────────────────────────────────────────────────
  // Origin is evaluated at request time so @fastify/env has already
  // loaded .env before the first request arrives.
  await app.register(cors, {
    origin: (origin, cb) => {
      const allowed = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
        .split(',')
        .map((o) => o.trim());

      if (!origin || allowed.includes('*') || allowed.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Static file serving (uploaded media) ────────────────
  // Uploaded files use immutable UUID names (never overwritten), so they're
  // safe to cache for a long time. A real max-age is essential for voice: with
  // the previous max-age=0, Asterisk's media cache re-downloaded audio on every
  // single playback, causing contention and intermittent playback failures
  // under concurrent IVR calls. 30 days + immutable lets it fetch once.
  await app.register(staticPlugin, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    immutable: true,
  });

  // ── Base Routes ──────────────────────────────────────────
  await registerHealthRoutes(app);

  // ── Module Registration ──────────────────────────────────
  await app.register(authModule,             { prefix: '/api/v1/auth' });
  await app.register(voiceModule,            { prefix: '/api/v1/voice' });
  await app.register(fileHostingModule,      { prefix: '/api/v1/file-hosting' });
  await app.register(clientManagementModule, { prefix: '/api/v1/clients' });
  await app.register(profileModule,          { prefix: '/api/v1/profile' });
  await app.register(userSupportModule,     { prefix: '/api/v1/support' });
  await app.register(internalSupportModule, { prefix: '/api/v1/internal/support' });
  await app.register(notificationsModule,   { prefix: '/api/v1/notifications' });
  await app.register(resellersModule,       { prefix: '/api/v1/resellers' });
  await app.register(invoiceModule,         { prefix: '/api/v1/invoices' });
  await app.register(addfundsModule,        { prefix: '/api/v1/addfunds' });

  return app;
};

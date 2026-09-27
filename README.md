# onecpaas-voice-dashboard

Voice campaign dashboard — Fastify/TypeScript backend + React (Vite) frontend.

```
onecpaas-voice-dashboard/
├── backend/    Fastify API + BullMQ workers
└── frontend/   React + Vite dashboard UI
```

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`) — both packages refuse to install with npm/yarn
- MySQL 8+
- Redis (used by the backend's BullMQ queues/workers)

## Backend setup

```bash
cd backend
pnpm install
cp .env.example .env
```

Fill in `.env` — at minimum: `MYSQL_*`, `REDIS_HOST`/`REDIS_PORT`, `JWT_SECRET`,
`ENCRYPTION_KEY`, and `VOICE_ENGINE_API_URL`/`VOICE_ENGINE_API_TOKEN` (the
external voice dial engine this backend forwards campaigns to). See the
comments in `.env.example` for what each variable does.

A `license.json` (generated separately per deployment) must be placed in the
backend root before the server will start — see `scripts/get-fingerprint.js`
and `scripts/setup-license.js`.

Run the API in dev mode:

```bash
pnpm run dev
```

Build and run in production:

```bash
pnpm run build
pnpm run start
```

Background workers (campaign dispatch, refund checks, webhooks, exports) run
as a separate process via PM2:

```bash
pnpm run workers:start     # start workers (ecosystem.config.cjs)
pnpm run workers:logs
pnpm run workers:stop
```

`ecosystem.config.cjs` defines both the API and worker PM2 processes; set
`RUN_SINGLETON_WORKERS=1` on exactly one worker instance if running more than
one, so scheduled jobs don't run twice.

## Frontend setup

```bash
cd frontend
pnpm install
cp .env.example .env.local
```

Fill in `.env.local` — at minimum `VITE_API_BASE_URL`, `VITE_BASE_URL`, and
`VITE_AUTH_BASE_URL`, pointing at wherever the backend from the step above is
running (e.g. `http://localhost:3000`).

Run the dashboard in dev mode:

```bash
pnpm run dev
```

Build for production:

```bash
pnpm run build
```

Output is written to `frontend/dist/` — serve it with any static file host or
behind a reverse proxy (nginx, etc.) pointed at the backend API.

## Running both together locally

1. Start MySQL and Redis.
2. `cd backend && pnpm install && pnpm run dev` (defaults to port 3000).
3. In a second terminal: `cd frontend && pnpm install && pnpm run dev`
   (Vite's dev server prints its own port — set `VITE_API_BASE_URL` to match
   step 2's port).

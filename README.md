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

A `license.json` must be present before the server will start — see
**Licensing** below.

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

## Licensing

The server validates a signed `license.json` at startup, tied to the specific
machine it's running on (hostname + CPU + MAC address hash). No valid license
for that machine → the server prints an error and exits (PM2 will not
auto-restart it — this is intentional, not a crash loop bug).

To get a license issued for a new deployment machine:

```bash
cd backend
pnpm run license:fingerprint
```

This prints a fingerprint hash for the machine it's run on. Send that
fingerprint to get a signed `license.json` issued, then place the file:

- **Dev** (`pnpm run dev` / `pnpm run start`): in the `backend/` root, next to
  `package.json`.
- **Production** (built via `deploy:build`, below): in `backend/deploy/`,
  next to `server.js`.

`license.json` is git-ignored — it's per-machine and must never be committed.

## Production deploy build

`pnpm run deploy:build` bundles the backend into a standalone `deploy/`
folder — this is what actually gets run in production, not the raw `src/`.

```bash
cd backend
pnpm run deploy:build
```

What it does:

1. Bundles `src/` with esbuild into `deploy/server.js` and `deploy/worker.js`.
2. Copies over `package.json`, `ecosystem.config.cjs`, `.env.example`, and
   `scripts/get-fingerprint.js`.
3. Leaves `.env`, `license.json`, and `node_modules/` inside `deploy/` alone
   if they already exist from a previous build — running this again to ship
   a code update won't wipe your live config.

After building:

```bash
cd deploy
pnpm install                # first time only, or after a dependency change
# place license.json here if this is a brand-new machine
pm2 delete all              # if processes are already running from a previous build
pm2 start ecosystem.config.cjs
```

`ecosystem.config.cjs` inside `deploy/` starts both the API and worker
processes together — see **Backend setup** above for `RUN_SINGLETON_WORKERS`
if running the worker as more than one PM2 instance.

# Setup

## Current Prerequisites

- Node.js `22.x`
- `pnpm` `10.11.0`

On this machine, `pnpm` is installed under `$HOME/.npm-global/bin`, so add it to `PATH` first if needed:

```bash
export PATH="$HOME/.npm-global/bin:$PATH"
```

## Install

```bash
pnpm install
```

## Verify the Foundation

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm smoke:auth
pnpm smoke:workspace
```

## Dockerized Runtime

Bring up the local stack:

```bash
docker compose up -d --build
```

Apply the first migration and seed the database:

```bash
docker compose run --rm tip-api pnpm --filter @tip/api prisma:migrate:deploy
docker compose run --rm tip-api pnpm --filter @tip/api prisma:seed
```

Verify the authenticated prototype flow:

```bash
node scripts/smoke-auth.mjs
node scripts/smoke-workspace.mjs
```

`smoke-workspace` now verifies the full Phase 7 path: register, create a project, upload an image through the API into MinIO, authenticate an API WebSocket session, enqueue a worker job, wait for realtime `queued`/`active`/`completed` delivery, and download the generated thumbnail.

Default host endpoints from the current root `.env.example`:

- web: `http://localhost:13000`
- web readiness: `http://localhost:13000/ready`
- api: `http://localhost:13001`
- api readiness: `http://localhost:13001/ready`
- worker health: `http://localhost:13002/health`
- worker readiness: `http://localhost:13002/ready`
- postgres: `localhost:15432`
- redis: `localhost:16379`
- minio api: `http://localhost:19000`
- minio console: `http://localhost:19001`

Seeded demo credentials:

- email: `demo@theindiesprototype.local`
- password: `Prototype123!`

Seeded demo workspace data:

- project: `Demo Workspace`
- assets: `cover-art.png` (`draft`) and `teaser-trailer.mp4` (`processing`)

## Host-Run Placeholder Commands

```bash
pnpm --filter @tip/web dev
pnpm --filter @tip/api dev
pnpm --filter @tip/worker dev
```

If your environment blocks port binding, dry-run validation is available:

```bash
TIP_DRY_RUN=1 pnpm --filter @tip/web dev
TIP_DRY_RUN=1 pnpm --filter @tip/api dev
TIP_DRY_RUN=1 pnpm --filter @tip/worker dev
```

## Environment Files

- copy `.env.example` at the repo root for Dockerized local development
- copy `.env.production.example` at the repo root for the production Compose stack
- each app also contains its own `.env.example` for service-specific local runs outside Docker

## Production Bootstrap Summary

Phase 9 selects a single Ubuntu VPS with Docker Compose as the first deployment target.

Production bootstrap:

```bash
cp .env.production.example .env.production
pnpm release:check
bash scripts/deploy-production.sh .env.production
```

Public runtime expectations:

- Nginx owns the public HTTP entrypoint
- `/` serves the web modular monolith
- `/api/*` proxies to the API and strips the `/api` prefix
- `/api/realtime` upgrades to the authenticated WebSocket endpoint
- PostgreSQL, Redis, MinIO, and the worker remain private to the Docker network

## Notes

- Prisma, PostgreSQL, Redis, and MinIO are now wired into the running prototype baseline
- the current auth strategy uses short-lived access tokens plus an `HttpOnly` refresh-token cookie
- Phase 6 adds BullMQ-backed worker execution, Sharp thumbnail generation, job retry flows, and authenticated derived-output download
- Phase 7 adds authenticated WebSocket delivery, Redis-backed project event fan-out, reconnect resync, and polling fallback when the socket is unavailable
- Phase 8 adds structured logs, request IDs, web/worker readiness endpoints, Docker health checks for every runtime, CI quality gates, and an operations runbook
- Phase 9 adds production Dockerfiles, reverse-proxy routing, deployment scripts, and a release checklist for host promotion
- The Docker development stack is the authoritative runtime baseline and is expected to run on Node `22.x`

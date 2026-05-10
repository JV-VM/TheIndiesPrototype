# TheIndiesPrototype

TheIndiesPrototype (TIP) is a distributed prototype platform for creator-focused asset workflows. The repository is organized as a monorepo with two modular monolith applications and one decoupled worker service:

- `apps/web` for the frontend modular monolith
- `apps/api` for the backend modular monolith
- `apps/worker` for asynchronous processing
- `packages/*` for shared contracts, types, UI primitives, and utilities

## Current Status

Phase 9 deployment readiness is in place:

- monorepo root with `pnpm` workspaces and `turbo`
- TypeScript, ESLint, and Prettier baseline
- app and package boundaries
- Docker Compose stack for web, API, worker, PostgreSQL, Redis, and MinIO
- Prisma schema, first migration, and seed strategy
- dependency-aware API readiness checks for PostgreSQL, Redis, and MinIO
- auth endpoints for registration, login, refresh, logout, and `me`
- rotating refresh-token sessions persisted in PostgreSQL
- protected project CRUD and project-scoped asset record endpoints
- proxied asset upload into MinIO with MIME validation, filename sanitization, and size limits
- authenticated asset source download backed by persisted object keys
- BullMQ-backed job enqueueing from the API with PostgreSQL-persisted job state
- worker-side Sharp thumbnail generation with derived outputs stored back in MinIO
- Redis pub/sub fan-out from the worker and API into authenticated WebSocket delivery
- browser-facing workspace shell with sign-in, session restore, projects, drag-and-drop upload, queue controls, retry actions, live delivery status, and derived-output download
- structured JSON logs across web, API, and worker with traceable request and job identifiers
- web, API, and worker health/readiness endpoints plus Docker health checks for all runtime services
- GitHub Actions CI for build, lint, typecheck, test, and Docker-backed smoke verification
- auth, upload, job, worker, and realtime protocol tests plus live Docker smoke tests
- production Dockerfiles for web, API, and worker
- Nginx reverse-proxy routing for `/`, `/api/*`, and `/api/realtime`
- a production Docker Compose stack and deployment helper scripts for a single-host VPS target
- production environment templates and a release checklist

## Commands

```bash
export PATH="$HOME/.npm-global/bin:$PATH"
pnpm install
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm smoke:auth
pnpm smoke:workspace
```

`pnpm` is installed in `$HOME/.npm-global/bin` on this machine, so the `PATH` export is required unless your shell already includes it.

The project target runtime is now Node.js `22.x`. The Docker stack runs against that runtime, and the host now also has Node `22.x` installed through `nvm` for interactive shells.

For constrained environments where binding ports is blocked, each placeholder app also supports a dry run:

```bash
TIP_DRY_RUN=1 pnpm --filter @tip/web dev
TIP_DRY_RUN=1 pnpm --filter @tip/api dev
TIP_DRY_RUN=1 pnpm --filter @tip/worker dev
```

## Bootstrap Flow

Local development bootstrap:

```bash
cp .env.example .env
pnpm install
pnpm build
docker compose up -d --build
docker compose run --rm tip-api pnpm --filter @tip/api prisma:migrate:deploy
docker compose run --rm tip-api pnpm --filter @tip/api prisma:seed
node scripts/smoke-auth.mjs
node scripts/smoke-workspace.mjs
```

Production-oriented bootstrap on a single VPS:

```bash
cp .env.production.example .env.production
pnpm release:check
bash scripts/deploy-production.sh .env.production
```

## Docker Stack

```bash
docker compose up -d --build
docker compose run --rm tip-api pnpm --filter @tip/api prisma:migrate:deploy
docker compose run --rm tip-api pnpm --filter @tip/api prisma:seed
node scripts/smoke-auth.mjs
node scripts/smoke-workspace.mjs
```

Default host endpoints:

- web: `http://localhost:13000`
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
- asset records: `cover-art.png` (`draft`) and `teaser-trailer.mp4` (`processing`)

Phase 6 processing currently supports uploaded image assets and generates one thumbnail derivative per queued job.
Phase 7 adds live job-state delivery, reconnect-driven resynchronization, and polling fallback when the socket is unavailable.
Phase 8 adds structured logs, request IDs, readiness coverage for every runtime, CI quality gates, and an operational runbook.
Phase 9 adds production images, reverse-proxy routing, a VPS deployment baseline, and a release checklist.

## Documentation

- [Project Scope](./theindiesprototype_scope.md)
- [Roadmap](./docs/roadmap.md)
- [Architecture](./docs/architecture.md)
- [Setup](./docs/setup.md)
- [Deployment](./docs/deployment.md)
- [Decisions](./docs/decisions.md)
- [Operations](./docs/operations.md)
- [Release Checklist](./docs/release-checklist.md)

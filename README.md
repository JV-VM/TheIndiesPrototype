# TheIndiesPrototype

TheIndiesPrototype (TIP) is a distributed prototype platform for creator-focused asset workflows. The repository is organized as a monorepo with two modular monolith applications and one decoupled worker service:

- `apps/web` for the frontend modular monolith
- `apps/api` for the backend modular monolith
- `apps/worker` for asynchronous processing
- `packages/*` for shared contracts, types, UI primitives, and utilities

## Current Status

Phase 4 workspace and asset domain flow is in place:

- monorepo root with `pnpm` workspaces and `turbo`
- TypeScript, ESLint, and Prettier baseline
- app and package boundaries
- Docker Compose stack for web, API, worker, PostgreSQL, Redis, and MinIO
- Prisma schema, first migration, and seed strategy
- dependency-aware API readiness checks for PostgreSQL, Redis, and MinIO
- auth endpoints for registration, login, refresh, logout, and `me`
- rotating refresh-token sessions persisted in PostgreSQL
- protected project CRUD and project-scoped asset record endpoints
- browser-facing workspace shell with sign-in, session restore, projects, filters, and asset inventory
- auth and project-domain unit tests plus live Docker smoke tests

## Commands

```bash
export PATH="$HOME/.npm-global/bin:$PATH"
pnpm install
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm smoke:workspace
```

`pnpm` is installed in `$HOME/.npm-global/bin` on this machine, so the `PATH` export is required unless your shell already includes it.

The project target runtime is now Node.js `22.x`. The current host machine may still have an older Node installed, but the Docker stack runs against the project target runtime.

For constrained environments where binding ports is blocked, each placeholder app also supports a dry run:

```bash
TIP_DRY_RUN=1 pnpm --filter @tip/web dev
TIP_DRY_RUN=1 pnpm --filter @tip/api dev
TIP_DRY_RUN=1 pnpm --filter @tip/worker dev
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

## Documentation

- [Project Scope](./theindiesprototype_scope.md)
- [Roadmap](./docs/roadmap.md)
- [Architecture](./docs/architecture.md)
- [Setup](./docs/setup.md)
- [Deployment](./docs/deployment.md)
- [Decisions](./docs/decisions.md)

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

Default host endpoints from the current root `.env.example`:

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
- each app also contains its own `.env.example` for service-specific local runs outside Docker

## Notes

- Prisma, PostgreSQL, Redis, and MinIO are now wired into the running prototype baseline
- the current auth strategy uses short-lived access tokens plus an `HttpOnly` refresh-token cookie
- Phase 4 adds protected project CRUD, asset metadata records, pagination, and lifecycle filters
- Angular, NestJS, BullMQ, and real upload/processing workflows remain future phases
- The Docker development stack is the authoritative runtime baseline and is expected to run on Node `22.x`

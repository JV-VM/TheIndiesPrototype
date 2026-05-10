# Setup

## Current Prerequisites

- Node.js `20.x`
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
```

## Placeholder Runtime Commands

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

- copy `.env.example` at the repo root when Phase 2 infrastructure work begins
- each app already contains its own `.env.example` for service-specific values

## Notes

- Angular, NestJS, Prisma, Redis, PostgreSQL, MinIO, and BullMQ are not wired yet in this phase
- this setup document will expand during the Docker and persistence phases

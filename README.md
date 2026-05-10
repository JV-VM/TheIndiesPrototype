# TheIndiesPrototype

TheIndiesPrototype (TIP) is a distributed prototype platform for creator-focused asset workflows. The repository is organized as a monorepo with two modular monolith applications and one decoupled worker service:

- `apps/web` for the frontend modular monolith
- `apps/api` for the backend modular monolith
- `apps/worker` for asynchronous processing
- `packages/*` for shared contracts, types, UI primitives, and utilities

## Current Status

Phase 1 scaffolding is in place:

- monorepo root with `pnpm` workspaces and `turbo`
- TypeScript, ESLint, and Prettier baseline
- app and package boundaries
- roadmap and architecture documentation baseline

## Commands

```bash
export PATH="$HOME/.npm-global/bin:$PATH"
pnpm install
pnpm build
pnpm lint
pnpm typecheck
```

`pnpm` is installed in `$HOME/.npm-global/bin` on this machine, so the `PATH` export is required unless your shell already includes it.

For constrained environments where binding ports is blocked, each placeholder app also supports a dry run:

```bash
TIP_DRY_RUN=1 pnpm --filter @tip/web dev
TIP_DRY_RUN=1 pnpm --filter @tip/api dev
TIP_DRY_RUN=1 pnpm --filter @tip/worker dev
```

## Documentation

- [Project Scope](./theindiesprototype_scope.md)
- [Roadmap](./docs/roadmap.md)
- [Architecture](./docs/architecture.md)
- [Setup](./docs/setup.md)
- [Deployment](./docs/deployment.md)
- [Decisions](./docs/decisions.md)

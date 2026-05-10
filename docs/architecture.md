# Architecture Baseline

## Intent

TheIndiesPrototype starts with a monorepo foundation that preserves the final architectural shape from day one:

- `apps/web` remains a frontend modular monolith
- `apps/api` remains a backend modular monolith
- `apps/worker` remains a decoupled async service
- `packages/*` stay thin and reusable

This lets the early prototype feel production-shaped without splitting services prematurely.

## Runtime Topology

Phase 4 introduces the first authenticated domain runtime:

```text
[ browser ] -> [ tip-web ] -> renders workspace shell
     |                |
     | REST + cookies |
     +------------> [ tip-api ] -- projects/assets --> PostgreSQL
                                     |                readiness checks
                                     |                Redis
                                     |                MinIO
                                     |
                                 [ tip-worker ]
```

Compose services currently provided:

- `tip-web`
- `tip-api`
- `tip-worker`
- `tip-postgres`
- `tip-redis`
- `tip-minio`
- `tip-minio-init`

## Repository Layout

```text
apps/
  web/
  api/
  worker/
packages/
  contracts/
  shared/
  types/
  ui/
docs/
```

## Frontend Modules

- `app-shell`
- `auth`
- `projects`
- `assets`
- `jobs`
- `realtime`
- `shared-ui`

These boundaries should become Angular feature modules or equivalent standalone feature slices when Phase 3 implementation begins.
The current web placeholder already reflects these boundaries through the authenticated shell, project inventory, and feature cards.

## Backend Modules

- `auth`
- `users`
- `projects`
- `assets`
- `jobs`
- `storage`
- `realtime`
- `health`

These boundaries are already represented in the backend module map, with auth now backed by real persistence and token flows. They should still become NestJS modules with thin controllers and isolated services in later phases.

## Worker Boundaries

- `queues/` for queue definitions and consumers
- `processors/` for transformation pipelines
- `runtime/` for bootstrapping, lifecycle hooks, and operational wiring

The worker must only share contracts and types with the API, not implementation code.

## Shared Package Rules

- `packages/types` hosts domain and DTO-like shapes
- `packages/contracts` hosts route, queue, and event contracts
- `packages/shared` hosts utilities with no app-specific knowledge
- `packages/ui` hosts reusable design tokens and later UI primitives

## Current State

The repo still uses lightweight Node placeholder application servers instead of Angular and NestJS implementations. That remains intentional. The current baseline now combines real infrastructure with the first real authenticated domain workflow:

- Prisma schema and migrations in `apps/api/prisma`
- PostgreSQL persistence model for users, sessions, projects, assets, and jobs
- Redis as the queue/cache backbone to be consumed more fully in Phase 6
- MinIO as S3-compatible object storage
- API readiness checks backed by concrete dependency probes
- auth endpoints for register, login, refresh, logout, and protected user resolution
- PostgreSQL-backed refresh sessions with hashed token storage and rotation
- protected project CRUD and paginated asset record endpoints
- frontend shell state that restores sessions through the auth API and surfaces project/asset state

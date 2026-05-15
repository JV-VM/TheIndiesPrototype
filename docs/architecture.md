# Architecture Baseline

## Intent

TheIndiesPrototype starts with a monorepo foundation that preserves the final architectural shape from day one:

- `apps/web` remains a frontend modular monolith
- `apps/api` remains a backend modular monolith
- `apps/worker` remains a decoupled async service
- `packages/*` stay thin and reusable

This lets the early prototype feel production-shaped without splitting services prematurely.

Phase 8 adds the first operational hardening layer on top of that baseline: structured logs, request/job correlation identifiers, runtime readiness surfaces, and CI-backed smoke gates. Phase 9 adds a production-shaped reverse-proxy entrypoint and compiled runtime images so the same module boundaries remain deployable on one real host.

## Runtime Topology

Phase 7 extends the authenticated distributed-processing runtime with live delivery:

```text
[ browser ] -> [ tip-web ] -> renders workspace shell
     |                |
     | REST + cookies | WebSocket auth + project subscription
     +------------> [ tip-api ] -- projects/assets --> PostgreSQL
                       |             |                readiness checks
                       |             |                persisted state
                       |             |
                       |             +-- Redis + BullMQ enqueue
                       |             +-- Redis pub/sub event fan-out
                       |             +-- MinIO source objects
                       |             +-- object-key metadata
                       |
                       +-----------> [ tip-worker ] -- Sharp thumbnail pipeline --> MinIO derived objects
                                         |
                                         +-- Redis pub/sub job + notification events
```

Compose services currently provided:

- `tip-web`
- `tip-api`
- `tip-worker`
- `tip-postgres`
- `tip-redis`
- `tip-minio`
- `tip-minio-init`

## Production Topology

Phase 9 standardizes the first deployment target as one Ubuntu VPS running Docker Compose:

```text
[ internet ]
     |
[ nginx reverse proxy ]
  |            |
  |            +--> /api/* and /api/realtime --> [ tip-api ]
  |
  +--> / --> [ tip-web ]

[ tip-api ] --> PostgreSQL
[ tip-api ] --> Redis / BullMQ
[ tip-api ] --> MinIO
[ tip-worker ] --> Redis / BullMQ
[ tip-worker ] --> PostgreSQL
[ tip-worker ] --> MinIO
```

The reverse proxy keeps public routing simple while PostgreSQL, Redis, MinIO, and the worker stay private to the Docker network.

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
Production deployment preserves this as one process and one image: `tip-web`.

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
Production deployment preserves this as one process and one image: `tip-api`.

## Worker Boundaries

- `queues/` for queue definitions and consumers
- `processors/` for transformation pipelines
- `runtime/` for bootstrapping, lifecycle hooks, and operational wiring

The worker must only share contracts and types with the API, not implementation code.
Production deployment preserves this as one process and one image: `tip-worker`.

## Shared Package Rules

- `packages/types` hosts domain and DTO-like shapes
- `packages/contracts` hosts route, queue, and event contracts
- `packages/shared` hosts utilities with no app-specific knowledge
- `packages/ui` hosts reusable design tokens and later UI primitives

## Current State

The repo still uses lightweight Node placeholder application servers instead of a full Angular and NestJS replacement at the public entrypoints. That remains intentional. Phase 0 and Phase 1 of the frontend integration now add a real Angular foundation under `/frontend-foundation` while the existing root workspace flow remains live until later feature slices migrate. The current baseline now combines real infrastructure with the first real authenticated domain workflow:

- Prisma schema and migrations in `apps/api/prisma`
- PostgreSQL persistence model for users, sessions, projects, assets, and jobs
- Redis as both the BullMQ transport and the realtime pub/sub backbone used by the API and worker
- MinIO as S3-compatible object storage
- API readiness checks backed by concrete dependency probes
- auth endpoints for register, login, refresh, logout, and protected user resolution
- PostgreSQL-backed refresh sessions with hashed token storage and rotation
- protected project CRUD and paginated asset record endpoints
- proxied upload and authenticated source download routes in the API
- asset source object keys stored as `projects/{projectId}/assets/{assetId}/source/{sanitizedFilename}`
- BullMQ enqueueing from the API using persisted job ids as queue job ids
- worker-side thumbnail generation with derived objects stored as `projects/{projectId}/assets/{assetId}/derived/{filename}`
- authenticated WebSocket sessions on `/realtime` with user-scoped project subscriptions
- worker and API event publishing for `job.updated` and `notification.created`
- frontend shell state that restores sessions through the auth API, reconciles project/job state after socket reconnects, and falls back to polling when the socket is unavailable
- Angular standalone frontend foundation in `apps/web/src/app` with modular SCSS tokens, route guards, auth session restore, project/assets/jobs/realtime slices, incremental socket-driven UI updates, reusable UI primitives, and protected routes served by the existing `tip-web` runtime at `/frontend-foundation`
- structured JSON logging in the web, API, and worker runtimes
- `x-request-id` correlation in API responses and request-completion logs
- health and readiness endpoints for web, API, and worker so Docker and operators can distinguish process liveness from dependency readiness
- production Dockerfiles that boot from compiled `dist` output instead of development commands
- Nginx routing that presents one public origin while keeping the API under `/api` and realtime under `/api/realtime`

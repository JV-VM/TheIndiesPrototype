# Architecture Baseline

## Intent

TheIndiesPrototype starts with a monorepo foundation that preserves the final architectural shape from day one:

- `apps/web` remains a frontend modular monolith
- `apps/api` remains a backend modular monolith
- `apps/worker` remains a decoupled async service
- `packages/*` stay thin and reusable

This lets the early prototype feel production-shaped without splitting services prematurely.

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

## Backend Modules

- `auth`
- `users`
- `projects`
- `assets`
- `jobs`
- `storage`
- `realtime`
- `health`

These boundaries should become NestJS modules with thin controllers and isolated services.

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

The repo currently uses runnable placeholder services instead of Angular, NestJS, Prisma, BullMQ, and MinIO integrations. That is intentional for Phase 1. The next phases replace placeholders with real runtime integrations without changing the structural boundaries.

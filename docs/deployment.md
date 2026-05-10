# Deployment

## Status

The repository is now deployable as a local Dockerized prototype. Production deployment is still deferred, but the Compose stack is a complete runnable environment for the current scope.

Current development runtime artifacts:

- `docker-compose.yml`
- `infrastructure/docker/workspace.dev.Dockerfile`
- `infrastructure/nginx/README.md` as the future reverse-proxy placeholder

## Current Local Deployment Flow

```bash
docker compose up -d --build
docker compose run --rm tip-api pnpm --filter @tip/api prisma:migrate:deploy
docker compose run --rm tip-api pnpm --filter @tip/api prisma:seed
node scripts/smoke-auth.mjs
```

Successful smoke verification confirms:

- the stack boots on Docker with Node `22.x`
- the API can read PostgreSQL, Redis, and MinIO
- auth registration, session restore, refresh, and logout work end to end
- protected project creation, asset record creation, and lifecycle updates work end to end
- the prototype is locally runnable from documentation alone

## Planned Phase 9 Scope

- production Dockerfiles for `web`, `api`, and `worker`
- reverse proxy and public routing
- environment and secret mapping
- deployment target selection
- release checklist and operational verification

## Interim Constraint

The current setup is suitable for local development, review, and prototype demonstration. Production images, reverse-proxy configuration, secret hardening, and release-oriented operations remain later phases.

# Deployment

## Status

The repository is now deployable both as a local Dockerized prototype and as a single-host production-oriented stack.

Development runtime artifacts:

- `docker-compose.yml`
- `infrastructure/docker/workspace.dev.Dockerfile`
- `.github/workflows/ci.yml`

Production runtime artifacts:

- `docker-compose.production.yml`
- `infrastructure/docker/web.prod.Dockerfile`
- `infrastructure/docker/api.prod.Dockerfile`
- `infrastructure/docker/worker.prod.Dockerfile`
- `infrastructure/nginx/default.conf`
- `.env.production.example`
- `scripts/release-check.sh`
- `scripts/deploy-production.sh`
- `docs/release-checklist.md`

## Local Flow

```bash
docker compose up -d --build
docker compose run --rm tip-api pnpm --filter @tip/api prisma:migrate:deploy
docker compose run --rm tip-api pnpm --filter @tip/api prisma:seed
node scripts/smoke-auth.mjs
node scripts/smoke-workspace.mjs
```

Successful smoke verification confirms:

- the stack boots on Docker with Node `22.x`
- the API can read PostgreSQL, Redis, and MinIO
- auth registration, session restore, refresh, and logout work end to end
- protected project creation, source upload into MinIO, BullMQ-backed worker processing, authenticated thumbnail download, and lifecycle updates work end to end
- websocket-based job delivery reaches the client with `queued`, `active`, and `completed` events before the final REST verification

## Selected Production Target

The first supported deployment target is one Ubuntu VPS running Docker Engine and Docker Compose.

Reasoning:

- it matches the prototype scope without introducing orchestrator complexity too early
- it preserves the current modular-monolith plus worker architecture exactly as built
- it is realistic for a portfolio-grade prototype and straightforward to explain to a reviewer
- it keeps the deployment contract repo-owned and reproducible

## Reverse Proxy Contract

Nginx exposes one public origin:

- `/` -> `tip-web`
- `/api/*` -> `tip-api` with the `/api` prefix stripped before upstream routing
- `/api/realtime` -> API WebSocket endpoint at `/realtime`
- `/health` and `/ready` -> public health surfaces via `tip-web`

The web runtime therefore uses:

- `TIP_API_BASE_URL=https://<host>/api`
- `TIP_WS_BASE_URL=wss://<host>/api`

## Environment and Secrets

Local development uses `.env.example`. Production uses `.env.production.example` as the template for a host-specific `.env.production`.

Secrets that must be replaced before deployment:

- `TIP_POSTGRES_PASSWORD`
- `TIP_MINIO_SECRET_KEY`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Values that should be reviewed explicitly:

- `TIP_PUBLIC_HOST`
- `TIP_WEB_PUBLIC_ORIGIN`
- `TIP_API_PUBLIC_ORIGIN`
- `TIP_API_PUBLIC_WS_ORIGIN`
- `TIP_PUBLIC_HTTP_PORT`
- `UPLOAD_MAX_BYTES`
- `WORKER_CONCURRENCY`

## Production Deployment Flow

Preflight:

```bash
cp .env.production.example .env.production
pnpm release:check
```

Deploy:

```bash
bash scripts/deploy-production.sh .env.production
```

The helper script:

- builds the production images
- starts PostgreSQL, Redis, MinIO, and bucket initialization
- runs `prisma migrate deploy` through the API image
- starts API, worker, web, and the public Nginx proxy

## Operational Baseline

- structured JSON logs are emitted by `tip-web`, `tip-api`, and `tip-worker`
- API responses expose `x-request-id` for traceable diagnostics
- web, API, and worker expose health/readiness surfaces
- backup and restore expectations are documented in [Operations](./operations.md)
- CI enforces build, lint, typecheck, test, and Docker-backed smoke checks

## Release Process

Use [Release Checklist](./release-checklist.md) for:

- preflight validation
- deployment execution
- post-deploy verification
- rollback expectations

## Constraint

This phase is implemented in the repository. Live Docker validation still depends on the host Docker daemon being reachable from the execution environment.

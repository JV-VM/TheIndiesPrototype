# Operations Runbook

## Runtime Endpoints

- web health: `http://localhost:13000/health`
- web readiness: `http://localhost:13000/ready`
- api health: `http://localhost:13001/health`
- api readiness: `http://localhost:13001/ready`
- worker health: `http://localhost:13002/health`
- worker readiness: `http://localhost:13002/ready`

## Structured Logs

- Every API response now includes `x-request-id`.
- API logs include `requestId`, method, path, client IP, status code, and duration.
- Worker logs include `jobId`, `assetId`, `projectId`, attempt counts, and transition outcomes.
- Web server logs include request IDs, status codes, and readiness-proxy failures.

## Common Diagnostics

Use these first when the prototype looks unhealthy:

```bash
docker compose ps
docker compose logs -f tip-api tip-web tip-worker
curl -i http://localhost:13001/ready
curl -i http://localhost:13000/ready
curl -i http://localhost:13002/ready
```

For the production-oriented stack, use the same commands against `docker-compose.production.yml` and the public host:

```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs -f tip-proxy tip-api tip-web tip-worker
curl -i http://<public-host>/health
curl -i http://<public-host>/ready
```

## Recovery Playbook

### API readiness is degraded

1. Check `docker compose logs tip-api`.
2. Call `http://localhost:13001/ready` and inspect which dependency is unhealthy.
3. If PostgreSQL or Redis is unhealthy, restart the stack:

```bash
docker compose up -d --build
```

### Worker readiness is degraded

1. Check `docker compose logs tip-worker`.
2. Call `http://localhost:13002/ready`.
3. If Redis or MinIO is failing, restart those services first:

```bash
docker compose up -d tip-redis tip-minio tip-minio-init
```

### Web readiness is degraded

1. Check `docker compose logs tip-web`.
2. Call `http://localhost:13000/ready`.
3. The web server depends on API readiness, so fix `tip-api` first if the upstream payload is degraded.

### Realtime UI falls back to polling

1. Open the browser shell and inspect the realtime status panel.
2. Check `docker compose logs tip-api tip-worker` for websocket upgrade errors or Redis pub/sub failures.
3. Call `http://localhost:13001/ready` and `http://localhost:13002/ready`.
4. Refresh the browser after the API and worker are healthy again.

### Rate limits block local testing

Auth and write endpoints now enforce per-client in-memory limits. Wait for the reported `retry-after` window to expire, or restart `tip-api` to clear the in-memory buckets during development.

## Critical Flow Verification

```bash
docker compose up -d --build
docker compose run --rm tip-api pnpm --filter @tip/api prisma:migrate:deploy
docker compose run --rm tip-api pnpm --filter @tip/api prisma:seed
node scripts/smoke-auth.mjs
node scripts/smoke-workspace.mjs
```

`smoke-workspace` verifies the protected critical path: register, create project, upload image, authenticate websocket, receive live `queued`/`active`/`completed` job updates, and download the thumbnail.

Use [Release Checklist](./release-checklist.md) before promoting a new production revision.

## Backup Expectations

### PostgreSQL

Local backup:

```bash
mkdir -p backups
docker compose exec -T tip-postgres pg_dump -U tip tip > backups/tip-postgres.sql
```

Local restore:

```bash
cat backups/tip-postgres.sql | docker compose exec -T tip-postgres psql -U tip -d tip
```

Expectation for deployed environments:

- run scheduled logical backups before schema-changing releases
- keep at least one verified restore artifact outside the running host
- test restore against a clean database before relying on the backup policy

### MinIO

Local backup:

```bash
mkdir -p backups
docker compose exec -T tip-minio sh -c 'tar czf - /data' > backups/tip-minio-data.tgz
```

Local restore:

```bash
cat backups/tip-minio-data.tgz | docker compose exec -T tip-minio sh -c 'tar xzf - -C /'
```

Expectation for deployed environments:

- back up object storage on the same cadence as the relational database
- preserve both source objects and derived outputs
- treat MinIO and PostgreSQL backups as one recovery unit for consistent restores

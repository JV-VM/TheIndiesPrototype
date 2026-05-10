# Release Checklist

## Preflight

- confirm the target host runs Docker Engine with Compose support
- copy `.env.production.example` to `.env.production` and replace every placeholder secret
- verify DNS for the public hostname already points to the target host or load balancer
- confirm the firewall exposes only the public HTTP port and any explicitly approved admin ports

## Repository Gate

Run this before promoting a new revision:

```bash
pnpm release:check
```

For a full local confidence pass, also run:

```bash
docker compose up -d --build
docker compose run --rm tip-api pnpm --filter @tip/api prisma:migrate:deploy
docker compose run --rm tip-api pnpm --filter @tip/api prisma:seed
node scripts/smoke-auth.mjs
node scripts/smoke-workspace.mjs
docker compose down -v --remove-orphans
```

## Deployment

```bash
bash scripts/deploy-production.sh .env.production
```

## Post-Deploy Verification

- open `http://<public-host>/health`
- open `http://<public-host>/ready`
- register a new account through the web shell
- create a project, upload an image, queue a job, and confirm thumbnail download
- confirm API logs and worker logs show matching request and job identifiers

## Rollback

- redeploy the last known-good commit with the same `.env.production`
- if the release included schema changes, restore PostgreSQL and MinIO together using the runbook in [Operations](./operations.md)
- repeat the post-deploy verification after rollback

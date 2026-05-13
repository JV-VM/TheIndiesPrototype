# Release Checklist

## Preflight

- run the repository gate before promoting a new revision
- confirm the selected deployment target is Render Blueprint or VPS Docker Compose
- for Render, confirm the workspace can create paid web, private service, worker, Postgres, Key Value, and disk-backed MinIO resources
- for VPS, confirm the target host runs Docker Engine with Compose support
- for VPS, copy `.env.production.example` to `.env.production` and replace every placeholder secret
- for VPS, verify DNS for the public hostname already points to the target host or load balancer
- for VPS, confirm the firewall exposes only the public HTTP port and any explicitly approved admin ports

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

## Render Deployment

Create or sync a Render Blueprint instance from `render.yaml`.

After the first deploy, verify the public service URLs. If Render did not assign the default `theindiesprototype-web.onrender.com` and `theindiesprototype-api.onrender.com` URLs, update:

- web service: `TIP_API_BASE_URL`
- web service: `TIP_WS_BASE_URL`
- API service: `TIP_WEB_ORIGIN`

## VPS Deployment

```bash
bash scripts/deploy-production.sh .env.production
```

## Post-Deploy Verification

- open the web service `/health`
- open the web service `/ready`
- open the API service `/ready`
- register a new account through the web shell
- create a project, upload an image, queue a job, and confirm thumbnail download
- confirm API logs and worker logs show matching request and job identifiers

## Rollback

- redeploy the last known-good commit with the same `.env.production`
- if the release included schema changes, restore PostgreSQL and MinIO together using the runbook in [Operations](./operations.md)
- repeat the post-deploy verification after rollback

#!/usr/bin/env bash

set -euo pipefail

ENV_FILE="${1:-.env.production}"
COMPOSE_ARGS=(-f docker-compose.production.yml --env-file "${ENV_FILE}")

if [[ ! -f "${ENV_FILE}" ]]; then
  printf 'missing env file: %s\n' "${ENV_FILE}" >&2
  printf 'copy .env.production.example to %s and fill in production secrets first\n' "${ENV_FILE}" >&2
  exit 1
fi

docker compose "${COMPOSE_ARGS[@]}" build
docker compose "${COMPOSE_ARGS[@]}" up -d tip-postgres tip-redis tip-minio tip-minio-init
docker compose "${COMPOSE_ARGS[@]}" run --rm tip-api pnpm --filter @tip/api prisma:migrate:deploy
docker compose "${COMPOSE_ARGS[@]}" up -d tip-api tip-worker tip-web tip-proxy

printf 'production deployment applied using %s\n' "${ENV_FILE}"

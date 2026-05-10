#!/usr/bin/env bash

set -euo pipefail

export PATH="${HOME}/.npm-global/bin:${PATH}"

pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose -f docker-compose.production.yml config >/dev/null

printf 'release check passed\n'

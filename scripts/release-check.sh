#!/usr/bin/env bash

set -euo pipefail

export PATH="${HOME}/.npm-global/bin:${PATH}"
PNPM_BIN="${PNPM_BIN:-corepack pnpm}"

${PNPM_BIN} turbo run lint --force
${PNPM_BIN} turbo run typecheck --force
${PNPM_BIN} --recursive --if-present test
${PNPM_BIN} turbo run build --force
docker compose -f docker-compose.production.yml config >/dev/null

printf 'release check passed\n'

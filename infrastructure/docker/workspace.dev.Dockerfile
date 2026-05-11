FROM node:22-bookworm-slim AS workspace-base

WORKDIR /workspace

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.11.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json eslint.config.mjs .prettierrc.json .prettierignore .gitignore ./
COPY README.md theindiesprototype_scope.md ./
COPY docs ./docs
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @tip/shared build
RUN pnpm --filter @tip/contracts build
RUN pnpm --filter @tip/types build
RUN pnpm --filter @tip/api prisma:generate

FROM workspace-base AS web-dev
CMD ["pnpm", "--filter", "@tip/web", "dev"]

FROM workspace-base AS api-dev
CMD ["pnpm", "--filter", "@tip/api", "dev"]

FROM workspace-base AS worker-dev
CMD ["pnpm", "--filter", "@tip/worker", "dev"]

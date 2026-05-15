# Frontend Architecture

The Angular frontend in `apps/web/src/app` is intentionally integrated as a protected slice-based client inside the existing `tip-web` runtime rather than as a big-bang replacement.

## Runtime Model

- The legacy browser workspace still lives at `/`.
- The Angular application is served by the same Node runtime at `/frontend-foundation`.
- API calls stay on the existing backend contract surface from `packages/contracts` and `packages/types`.
- Realtime is an enhancement layer. REST remains authoritative after reconnects and during fallback polling.

## Folder Boundaries

- `core/`: runtime config, auth, HTTP, layout shell, and cross-cutting UI state
- `design-system/`: local UI primitives used by multiple slices
- `features/auth`: session entry and route recovery
- `features/projects`: project list, selection, CRUD, and current-project state
- `features/assets`: asset inventory, upload staging, draft creation, and source download
- `features/jobs`: queue filtering, retry flow, thumbnail download, and queue summaries
- `features/realtime`: socket lifecycle, notifications, reconnect behavior, and REST resync
- `shared/`: low-level utilities and shared view helpers with no business ownership

## State Rules

- Each feature owns its own reactive state through Angular signals.
- `ProjectsWorkspaceService` is the selection anchor for assets, jobs, and realtime subscriptions.
- Assets and jobs react to project selection changes, reset their collections, and repopulate independently.
- Realtime can patch visible asset/job rows optimistically, but still schedules a background resync for correctness.

## UX Hardening

- Loading skeletons are used when protected data is synchronizing and no prior collection is available.
- Empty states remain actionable and explain the next workflow step.
- Notices use `status` and `alert` semantics for accessibility.
- Focus-visible styles and reduced-motion handling are applied globally.

## Test Contract

- Frontend package tests run with `node --import tsx --test test/*.test.ts`.
- The current suite covers auth session behavior, project workspace state selection, and realtime-driven asset/job state updates.
- Repo-level `pnpm test` picks up `@tip/web` automatically through Turbo and the existing recursive release check.

## Delivery Contract

- `pnpm --filter @tip/web lint`
- `pnpm --filter @tip/web typecheck`
- `pnpm --filter @tip/web test`
- `pnpm --filter @tip/web build`
- `TIP_DRY_RUN=1 node apps/web/dist/server/dev-server.js`

This keeps the Angular integration verifiable without requiring the sandbox to open a live HTTP port.

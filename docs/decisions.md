# Architectural Decisions

## ADR-001: Monorepo with `pnpm` and `turbo`

- Status: accepted
- Context: the project needs shared types, coordinated builds, and cross-cutting tooling while keeping web, API, and worker concerns separate.
- Decision: use a `pnpm` workspace monorepo orchestrated with `turbo`.
- Consequence: workspace-level standards are centralized and app/package boundaries are easier to enforce.

## ADR-002: Modular Monoliths for Web and API

- Status: accepted
- Context: the product needs clear boundaries without the operational cost of early service sprawl.
- Decision: keep frontend and backend as independent modular monoliths inside a single repo.
- Consequence: domains remain isolated, but deployment and development stay simpler in the prototype stage.

## ADR-003: Decoupled Worker from the Start

- Status: accepted
- Context: async processing is a core product behavior, not a later optimization.
- Decision: preserve a separate worker service boundary from the beginning, even before BullMQ is integrated.
- Consequence: queue contracts, job events, and storage handoffs must remain explicit.

## ADR-004: Production-Shaped Local Development

- Status: accepted
- Context: the prototype is intended to demonstrate distributed-system thinking, not just isolated feature code.
- Decision: design local development around Dockerized runtime services and clear environment contracts.
- Consequence: infrastructure setup arrives early in the roadmap instead of being postponed until deployment.

## ADR-005: Persistence and Runtime Dependencies in Phase 2

- Status: accepted
- Context: the prototype needs a realistic local substrate before application domains can safely grow.
- Decision: wire PostgreSQL, Redis, and MinIO into the API and worker runtime in Phase 2, with Prisma owning the relational schema and migrations.
- Consequence: later feature phases can build on real storage and dependency health instead of mock infrastructure.

## ADR-006: Dependency Access Through Adapter Ports

- Status: accepted
- Context: the API should not bind domain logic directly to vendor clients as the infrastructure surface grows.
- Decision: define database, queue, and storage adapter ports, then provide concrete PostgreSQL, Redis, and MinIO implementations behind them.
- Consequence: the modular monolith keeps infrastructure coupling localized and easier to replace or test.

## ADR-007: Short-Lived Access Tokens with Rotating Refresh Sessions

- Status: accepted
- Context: the prototype needs real session handling now, but it still has to stay simple enough to run locally without a full identity stack.
- Decision: issue short-lived JWT access tokens for API calls, store refresh tokens in an `HttpOnly` cookie, and persist only hashed refresh-token state in PostgreSQL with rotation on refresh.
- Consequence: the prototype gets realistic session recovery and server-side revocation, while browser token storage and broader identity concerns remain a later hardening topic.

## ADR-008: Project and Asset Records Before Uploads

- Status: accepted
- Context: upload and queue work are later distributed concerns, but the prototype still needs stable user-owned domain objects before those phases start.
- Decision: implement protected project CRUD and asset metadata records in Phase 4, including lifecycle states, pagination, and ownership checks, before file transfer exists.
- Consequence: later upload, storage, and job orchestration work can attach to durable IDs and known state machines instead of introducing domain modeling at the same time as infrastructure complexity.

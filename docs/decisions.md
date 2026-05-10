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

## ADR-009: Proxied Uploads Through the API First

- Status: accepted
- Context: the prototype needed a real upload path in Phase 5, but adding presigned direct uploads would also introduce a second browser-storage contract and extra security surface at the same time.
- Decision: send browser uploads through authenticated API endpoints first, validate MIME type and size before persistence, and let the API own MinIO object-key creation and download authorization.
- Consequence: the first upload flow stays easier to reason about and test locally, while direct-to-storage uploads can remain a later optimization if prototype scale actually demands it.

## ADR-010: Persisted Job IDs Drive Queue Execution

- Status: accepted
- Context: Phase 6 needs Redis-backed execution, but user-visible job state still has to stay authoritative in PostgreSQL so the API and UI can reason about retries and outcomes.
- Decision: create the PostgreSQL job record first, then reuse that persisted id as the BullMQ job id and treat Redis as the execution transport rather than the source of truth.
- Consequence: API responses, worker updates, retry flows, and later realtime broadcasts can all refer to one stable identifier without extra reconciliation layers.

## ADR-011: Redis Pub/Sub Bridges Worker Events into WebSocket Delivery

- Status: accepted
- Context: Phase 7 needs live job visibility in the frontend, but the worker must stay decoupled from API internals and the browser still has to reconcile against persisted PostgreSQL state after disconnects.
- Decision: publish worker and API lifecycle events into Redis pub/sub channels, let the API subscribe and fan those events out through authenticated WebSocket sessions, and treat socket messages as a delivery optimization rather than the source of truth.
- Consequence: the worker stays isolated, the API owns session-aware fan-out and reconnect behavior, and the frontend can resync from authoritative REST state whenever a socket session is interrupted.

## ADR-012: Operational Signals Are First-Class Runtime Features

- Status: accepted
- Context: Phase 8 needs the prototype to be diagnosable in local Docker and credible in CI, but the codebase still uses lightweight runtime servers rather than a larger framework with batteries included.
- Decision: add structured JSON logs, request/job correlation identifiers, web/API/worker readiness endpoints, and a CI workflow directly inside the current runtime layer instead of waiting for a future framework migration.
- Consequence: failures can be traced with stable identifiers now, Docker can distinguish healthy processes from healthy dependencies, and the repo baseline is guarded by automated quality and smoke gates.

## ADR-013: First Production Target Is a Single-Host Docker Compose Deployment

- Status: accepted
- Context: Phase 9 needs a real deployment story, but the prototype still benefits more from clarity and reproducibility than from early orchestration complexity.
- Decision: support one Ubuntu VPS running Docker Compose, with Nginx as the public reverse proxy and the existing web, API, worker, PostgreSQL, Redis, and MinIO services running as one stack.
- Consequence: the deployed architecture stays close to local development, release steps remain easy to document, and future moves to a managed platform can happen from a working production baseline instead of from theory.

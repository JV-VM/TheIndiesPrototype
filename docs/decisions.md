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

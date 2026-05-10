# TheIndiesPrototype Delivery Roadmap

## Goal

Deliver a locally functional, dockerized, extensively documented, and deployable prototype of TheIndiesPrototype (TIP) while preserving the intended architecture:

- `apps/web` as a frontend modular monolith
- `apps/api` as a backend modular monolith
- `apps/worker` as a decoupled async processing service
- shared packages for contracts, UI, types, and reusable infrastructure code

The roadmap below turns the product scope into an implementation sequence that increases complexity deliberately instead of mixing distributed concerns too early.

Current progress as of 2026-05-10:

- Phase 1 completed
- Phase 2 completed
- Phase 3 completed
- Phase 4 completed

## Prototype Finish Line

The prototype is considered complete when all of the following are true:

- `docker compose up --build` starts the full local stack successfully
- a user can register, sign in, create a workspace/project, upload an asset, queue a processing job, and retrieve the processed output
- live job status updates are visible in the frontend without manual refresh
- the system has baseline observability: health checks, structured logs, and failure visibility
- the repository contains clear setup, architecture, operations, and deployment documentation
- production-oriented container images and deployment instructions exist for a real host environment

## Architectural Constraints

### Frontend Modular Monolith

The frontend should stay inside one deployable app, but be separated internally by feature modules:

- `app-shell`
- `auth`
- `projects`
- `assets`
- `jobs`
- `realtime`
- `shared-ui`

### Backend Modular Monolith

The backend should stay inside one deployable API, but be separated internally by domain modules:

- `auth`
- `users`
- `projects`
- `assets`
- `jobs`
- `storage`
- `realtime`
- `health`

### Decoupled Processing Layer

The worker remains an isolated service with its own runtime concerns:

- queue consumers
- processing pipelines
- retry/failure handling
- object storage interactions
- job result publishing

### Shared Base

Shared packages should be intentionally thin and dependency-safe:

- `packages/types` for shared domain and DTO typings
- `packages/shared` for reusable utilities, configs, and helpers
- `packages/ui` for reusable frontend UI primitives
- optional `packages/contracts` for API schemas, events, and validation contracts

## Phase Sequence

The roadmap is organized by complexity scope:

1. decoupled base and repo foundation
2. persistent domain and application shell
3. secure product workflow
4. storage and upload boundaries
5. distributed job execution
6. real-time synchronization
7. operational hardening
8. documentation and deployment readiness

## Phase 1 - Monorepo Foundation and Architecture Baseline

### Objective

Create the repo skeleton, development standards, and app/package boundaries so the rest of the work lands on a stable base.

### Tasks

- initialize the monorepo with `pnpm` workspaces and `turbo`
- create `apps/web`, `apps/api`, `apps/worker`, and the initial `packages/*` structure
- configure root TypeScript, ESLint, Prettier, and shared build scripts
- initialize a valid Git repository state and align it with conventional commit expectations
- define import boundaries so web, api, worker, and shared packages do not couple incorrectly
- create environment variable conventions and `.env.example` files
- establish a docs structure: `docs/architecture.md`, `docs/decisions.md`, `docs/setup.md`, `docs/deployment.md`
- document the module map for frontend and backend modular monoliths
- define the basic CI contract: lint, typecheck, test, build

### Exit Criteria

- every app can boot with placeholder code
- workspace scripts run consistently from the repo root
- the repository structure matches the scope document
- architectural boundaries are documented before feature work starts

## Phase 2 - Local Infrastructure and Persistence Foundation

### Objective

Make the local environment production-shaped from day one and establish the database, cache, and object storage foundation.

### Tasks

- create `docker-compose.yml` with `tip-web`, `tip-api`, `tip-worker`, `tip-postgres`, `tip-redis`, and `tip-minio`
- add development Dockerfiles for web, api, and worker with fast local iteration support
- wire health checks and startup dependencies between containers
- bootstrap Prisma in `apps/api`
- model the initial relational schema for `users`, `projects`, `assets`, `jobs`, and `sessions`
- create the first migration and seed strategy
- define storage, queue, and database adapter interfaces so app logic stays decoupled
- verify API connectivity to PostgreSQL, Redis, and MinIO from inside Docker
- document local bootstrapping and service endpoints

### Exit Criteria

- `docker compose up` starts the full infrastructure without manual intervention
- Prisma migrations run cleanly
- API health endpoints confirm database, Redis, and storage availability
- local setup is reproducible from documentation alone

## Phase 3 - Authentication and Application Shell

### Objective

Establish secure access control, session handling, and the first usable product shell.

### Tasks

- implement backend auth module with registration, login, refresh, logout, and password hashing
- choose token transport strategy and document it clearly
- implement session persistence model and refresh-token rotation rules
- add DTO validation, security headers, and baseline rate limiting around auth endpoints
- build frontend auth flows: sign up, sign in, sign out, protected route gating, session restore
- create the frontend app shell, navigation, and authenticated layout
- define shared auth contracts between frontend and backend
- add unit and integration tests for auth flows
- document auth behavior, security assumptions, and local test users

### Exit Criteria

- a new user can create an account and access protected pages
- auth survives page refreshes and token renewal events
- unauthorized access is blocked consistently on both frontend and backend

## Phase 4 - Projects and Asset Domain Workflow

### Objective

Build the first real product workflow around user-scoped workspaces and asset records before file transfer and distributed processing are introduced.

### Tasks

- implement backend modules for projects and assets with clear service boundaries
- add CRUD operations for projects with ownership enforcement
- define asset metadata and lifecycle states such as `draft`, `uploaded`, `queued`, `processing`, `completed`, and `failed`
- build frontend project list, project detail, and asset inventory views
- create the typed API client layer used by the frontend
- add pagination, filtering, and empty-state UX for project and asset screens
- write tests for ownership boundaries and validation rules
- document the domain model and lifecycle state machine

### Exit Criteria

- authenticated users can manage their own projects
- asset records exist and move through known states even before file processing is enabled
- frontend and backend contracts are stable enough to support upload and job orchestration work

## Phase 5 - Upload Pipeline and Object Storage Integration

### Objective

Introduce the file boundary safely: browser to API/storage, storage to metadata, and metadata back to the user experience.

### Tasks

- implement MinIO bucket strategy, naming rules, and local access policies
- choose and implement the upload flow: proxied upload or signed direct upload
- add MIME validation, file size limits, filename sanitization, and upload error handling
- persist asset metadata, source object keys, and storage-related audit details
- build drag-and-drop upload UX with progress, retry, and validation messaging
- expose secure preview/download access patterns for stored objects
- add backend and end-to-end tests for upload success and rejection cases
- document storage architecture, bucket layout, and security constraints

### Exit Criteria

- a user can upload supported assets from the web app into MinIO
- invalid files are rejected consistently
- uploaded assets appear in project views with persisted metadata

## Phase 6 - Distributed Processing and Worker Execution

### Objective

Turn stored assets into asynchronously processed outputs using Redis queues and an isolated worker service.

### Tasks

- design queue names, job payload contracts, and retry strategy
- integrate BullMQ into the API for enqueueing work
- implement the worker process with one initial image-processing pipeline using `sharp`
- persist job state transitions in PostgreSQL
- publish failure details, retry counts, and terminal job outcomes
- support requeue and manual retry flows from the API
- generate derived outputs such as thumbnails or transformed assets and store them in MinIO
- add tests covering successful jobs, retries, and hard failures
- document queue topology, job payloads, and worker responsibilities

### Exit Criteria

- a stored asset can be queued and processed end-to-end
- retries happen predictably for transient failures
- users can distinguish between queued, running, completed, and failed jobs

## Phase 7 - Real-Time Updates and Frontend Synchronization

### Objective

Expose distributed system behavior to the user through live updates instead of polling-only UX.

### Tasks

- implement authenticated WebSocket connectivity in the API
- define event channels for job lifecycle updates and project-scoped notifications
- propagate worker and queue events into the API event layer
- update frontend state in real time for job progress and completion events
- implement reconnect and resync behavior for lost socket sessions
- add a fallback synchronization strategy when the socket is unavailable
- build user-facing notifications for processing completion and failure
- add integration tests for event delivery and frontend state reconciliation
- document the event contract and reconnection strategy

### Exit Criteria

- job status changes appear in the UI without manual refresh
- socket reconnects do not leave the interface in a stale state
- live updates remain consistent with persisted backend state

## Phase 8 - Operational Hardening and Quality Gates

### Objective

Make the prototype diagnosable, safer, and credible as a production-oriented engineering showcase.

### Tasks

- add structured logging across web, api, and worker
- implement correlation IDs and traceable request/job logs
- expose health, readiness, and dependency checks for all runtime services
- add centralized error formatting and operational error categorization
- harden API security with CORS policy, validation pipes, permission checks, and rate limiting
- define backup/restore expectations for PostgreSQL and MinIO in local and deployed environments
- add smoke tests for the critical user flow
- wire CI to run lint, typecheck, tests, and build checks on every change
- document operational runbooks for local failures and common recovery steps

### Exit Criteria

- the prototype exposes enough signals to debug failures quickly
- CI protects the baseline from obvious regressions
- local and deployed environments have a documented operational checklist

## Phase 9 - Documentation, Production Images, and Deployment

### Objective

Finish the prototype as a deliverable: easy to run locally, easy to understand, and realistically deployable.

### Tasks

- create production Dockerfiles for web, api, and worker
- add reverse-proxy configuration for public routing and API/web separation
- choose a first deployment target and document the reasoning
- define environment variables and secrets management requirements per environment
- create deployment scripts or manifests for the selected platform
- document the full bootstrap flow in `README.md`
- complete `docs/architecture.md` with system diagrams and module boundaries
- maintain `docs/decisions.md` as an ADR-style log of major technical choices
- write `docs/deployment.md`, `docs/setup.md`, and an operator runbook
- add a release checklist for local verification and deployment promotion

### Exit Criteria

- the stack can be built into production images
- deployment steps are documented end-to-end
- the repository is understandable by someone who did not build it

## Suggested Execution Rules

- keep web and api as modular monoliths until there is a proven reason to split services
- keep worker code decoupled from API internals by sharing contracts, not direct service imports
- finish vertical slices fully before opening the next layer of distributed complexity
- prefer one supported upload/processing path first, then generalize
- document decisions as they are made, not at the end
- keep the local Docker environment close to production topology

## Critical First Implementation Slice

If execution starts immediately, the first slice should be:

1. phase 1 repo foundation
2. phase 2 dockerized infrastructure
3. phase 3 authentication shell
4. phase 4 project and asset records

That creates a stable baseline before object storage, queues, and sockets are introduced.

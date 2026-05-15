# TheIndiesPrototype — Angular Frontend Scope, UI/UX Direction & Build Plan

## 0. Project Identity

**Project Name:** TheIndiesPrototype  
**Internal Acronym:** TIP  
**Frontend Framework:** Angular  
**Styling Strategy:** Modular SCSS  
**Product Category:** Creator infrastructure / asset-processing SaaS  
**Core Positioning:** Infrastructure for indie creators who ship.

TheIndiesPrototype is a scalable creator-focused platform for uploading, processing, organizing, and monitoring digital assets through distributed background workflows.

The product should feel like a polished internal platform from a fast-moving AI/startup team: technical, elegant, fast, and useful.

---

# 1. Product Definition

## What TheIndiesPrototype Should Be

TheIndiesPrototype should be a cloud-native asset workflow platform for indie creators, small studios, and technical teams.

At its core, the platform allows users to:

1. Create projects/workspaces
2. Upload assets
3. Send assets into processing pipelines
4. Monitor real-time job progress
5. Review generated outputs
6. Download or reuse processed assets

The project should demonstrate serious engineering ability, not just CRUD development.

It should show:

- Full-stack ownership
- Strong frontend architecture
- Scalable backend communication
- Real-time systems
- Async job pipelines
- Production-oriented UI/UX
- Documentation-driven engineering

---

# 2. UI/UX Vision

## Desired Product Feel

The frontend should feel like:

- Linear for calm productivity
- Vercel for developer-platform polish
- Stripe for premium SaaS clarity
- Figma for creator workspace energy
- Datadog for operational/realtime dashboard structure
- Notion for simple workspace organization

The goal is not to copy these products directly, but to borrow their design principles.

---

## Visual Personality

TheIndiesPrototype should feel:

- Dark-first
- Technical but friendly
- Minimal but not empty
- Fast and responsive
- Creator-oriented
- Infrastructure-aware
- Premium but practical

Avoid:

- Generic admin templates
- Bootstrap-looking dashboards
- Overcrowded tables
- Excessive neon/cyberpunk effects
- Default Angular Material appearance
- Overly corporate enterprise UI

---

# 3. Angular Frontend Stack

## Core Stack

| Area | Tool |
|---|---|
| Framework | Angular |
| Language | TypeScript |
| Styling | Modular SCSS |
| UI Foundation | Angular CDK + custom components |
| Optional Component Base | Angular Material |
| State Management | NgRx SignalStore or Angular Signals |
| Component State | RxAngular or local signals |
| API Communication | Angular HttpClient |
| Realtime | WebSocket / Socket.IO client |
| Forms | Angular Reactive Forms |
| Icons | Lucide Angular or Material Symbols |
| Charts | Apache ECharts / ngx-charts / custom SVG |
| Testing | Vitest/Jest + Angular Testing Library |
| E2E | Playwright |

---

# 4. Why Angular Fits This Project

Angular is a strong fit because TheIndiesPrototype benefits from:

- Strong architectural boundaries
- Dependency injection
- Feature-based routing
- Reactive forms
- TypeScript-first development
- Scalable enterprise-style organization
- Excellent support for large dashboards

This project should use Angular as a strength: structured, modular, documented, and production-oriented.

---

# 5. Frontend Architecture

## Recommended App Structure

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── auth/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── http/
│   │   │   └── layout/
│   │   │
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   ├── directives/
│   │   │   ├── pipes/
│   │   │   └── utils/
│   │   │
│   │   ├── features/
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── assets/
│   │   │   ├── upload/
│   │   │   ├── queue/
│   │   │   ├── workers/
│   │   │   └── settings/
│   │   │
│   │   ├── design-system/
│   │   │   ├── button/
│   │   │   ├── card/
│   │   │   ├── badge/
│   │   │   ├── modal/
│   │   │   ├── input/
│   │   │   ├── sidebar/
│   │   │   └── empty-state/
│   │   │
│   │   ├── app.routes.ts
│   │   ├── app.config.ts
│   │   └── app.component.ts
│   │
│   ├── styles/
│   │   ├── abstracts/
│   │   │   ├── _variables.scss
│   │   │   ├── _mixins.scss
│   │   │   ├── _functions.scss
│   │   │   └── _tokens.scss
│   │   │
│   │   ├── base/
│   │   │   ├── _reset.scss
│   │   │   ├── _typography.scss
│   │   │   └── _globals.scss
│   │   │
│   │   ├── themes/
│   │   │   ├── _dark.scss
│   │   │   └── _light.scss
│   │   │
│   │   └── styles.scss
│   │
│   └── environments/
│
├── angular.json
└── package.json
```

---

# 6. Modular SCSS Strategy

## Goals

The SCSS system should be:

- Token-based
- Component-scoped
- Easy to theme
- Dark-mode ready
- Maintainable
- Not dependent on heavy UI frameworks

---

## Global SCSS Layers

### 1. Abstracts

Used for design tokens and reusable helpers.

```text
styles/abstracts/
├── _tokens.scss
├── _variables.scss
├── _mixins.scss
└── _functions.scss
```

### 2. Base

Used for global behavior.

```text
styles/base/
├── _reset.scss
├── _typography.scss
└── _globals.scss
```

### 3. Themes

Used for app-wide CSS variables.

```text
styles/themes/
├── _dark.scss
└── _light.scss
```

---

## Example Token Direction

```scss
:root {
  --tip-bg: #09090b;
  --tip-surface: #111113;
  --tip-surface-elevated: #18181b;
  --tip-border: #27272a;

  --tip-text-primary: #f4f4f5;
  --tip-text-secondary: #a1a1aa;
  --tip-text-muted: #71717a;

  --tip-accent: #7c3aed;
  --tip-accent-soft: rgba(124, 58, 237, 0.16);

  --tip-success: #22c55e;
  --tip-warning: #f59e0b;
  --tip-danger: #ef4444;
}
```

---

# 7. Design System Components

TheIndiesPrototype should build its own lightweight design system.

## Core Components

### Layout
- App shell
- Sidebar
- Topbar
- Page header
- Split panel
- Workspace layout

### Feedback
- Toast
- Loading skeleton
- Empty state
- Error state
- Progress indicator

### Inputs
- Button
- Input
- Textarea
- Select
- File dropzone
- Search field

### Display
- Card
- Stat card
- Badge
- Status pill
- Asset preview
- Job timeline
- Worker activity item

### Overlays
- Modal
- Drawer
- Command palette
- Popover

---

# 8. Main Application Screens

## 8.1 Landing Page

Purpose:
- Present the product
- Communicate technical sophistication
- Show what the platform does
- Lead users to login/signup

Sections:
- Hero
- Product workflow
- Use cases
- Architecture preview
- Call to action

## 8.2 Authentication

Screens:
- Login
- Register
- Forgot password later

UX goals:
- Simple
- Minimal
- Secure-looking
- Fast

## 8.3 Dashboard

Purpose:
- Give a high-level view of system activity

Main blocks:
- Active jobs
- Completed jobs
- Failed jobs
- Storage usage
- Recent assets
- Recent projects
- Worker activity

## 8.4 Projects

Purpose:
- Organize creator workspaces

Features:
- Project cards
- Project search
- Create project modal
- Project detail page

## 8.5 Asset Library

Purpose:
- Browse uploaded and processed assets

Features:
- Grid/list toggle
- Filters
- Asset status
- Preview modal
- Download button

## 8.6 Upload Center

Purpose:
- Upload files and start processing jobs

Features:
- Drag-and-drop area
- File queue preview
- Validation feedback
- Processing options
- Start processing button

## 8.7 Queue Monitor

Purpose:
- Showcase distributed systems knowledge

Features:
- Active jobs
- Waiting jobs
- Failed jobs
- Retry action
- Job details
- Live progress

## 8.8 Worker Monitor

Purpose:
- Show infrastructure awareness

Features:
- Worker status
- Current workload
- Processing speed
- Recent worker events

## 8.9 Settings

Purpose:
- User and project configuration

Features:
- Profile
- API settings later
- Storage settings
- Team settings later

---

# 9. Navigation Model

## Sidebar Navigation

```text
Dashboard
Projects
Assets
Upload Center
Queue Monitor
Workers
Settings
```

## Topbar

Should include:
- Current project selector
- Search
- Upload button
- Theme toggle
- User menu

---

# 10. UX Principles

## Principle 1 — Show System Activity Clearly

The platform should feel alive.

Use:
- Live indicators
- Progress bars
- Updating job cards
- Worker status badges

## Principle 2 — Hide Complexity Until Needed

Do not overwhelm the user.

Use:
- Summary cards first
- Drill-down pages second
- Expandable details
- Modals/drawers for advanced data

## Principle 3 — Make Empty States Useful

Every empty screen should explain what to do next.

Example:
- No projects yet → Create your first project
- No assets yet → Upload your first asset
- No jobs yet → Process an asset

## Principle 4 — Design for Portfolio Impact

Every major screen should communicate engineering maturity.

The UI should make it obvious that the project has:
- queues
- workers
- storage
- status tracking
- architecture thinking

---

# 11. Angular Implementation Phases

## Phase 1 — Visual Foundation

Goal:
Create the design system and app shell.

### Subtasks
- Configure global SCSS structure
- Create design tokens
- Create dark theme
- Build app shell
- Build sidebar
- Build topbar
- Build reusable card component
- Build reusable button component
- Build status pill component
- Build page header component

### Output
A polished empty dashboard shell.

---

## Phase 2 — Routing & Layout

Goal:
Establish scalable navigation.

### Subtasks
- Define feature routes
- Add lazy-loaded routes
- Add protected route structure
- Create dashboard route
- Create projects route
- Create assets route
- Create upload route
- Create queue route
- Create workers route
- Create settings route

### Output
A navigable Angular application with clean route boundaries.

---

## Phase 3 — Dashboard UI

Goal:
Create the main portfolio-facing dashboard.

### Subtasks
- Add summary stat cards
- Add active job preview
- Add recent asset list
- Add recent project cards
- Add worker activity block
- Add storage usage widget
- Add skeleton loading states

### Output
A beautiful dashboard that communicates the product’s purpose.

---

## Phase 4 — Upload Experience

Goal:
Build the core creator workflow.

### Subtasks
- Create drag-and-drop upload component
- Add selected file preview
- Add file validation states
- Add upload progress UI
- Add processing options panel
- Add upload confirmation flow
- Connect to backend upload endpoint

### Output
A polished upload center.

---

## Phase 5 — Asset Library

Goal:
Make uploaded assets easy to browse and manage.

### Subtasks
- Create asset grid
- Create asset card
- Add asset status indicators
- Add filters
- Add search
- Add preview modal
- Add download action

### Output
A creator-friendly asset library.

---

## Phase 6 — Queue Monitor

Goal:
Show async processing architecture visually.

### Subtasks
- Create job list
- Create job detail drawer
- Add status filters
- Add progress indicators
- Add retry failed job action
- Connect to backend queue status endpoint
- Add realtime updates

### Output
A technical but understandable queue dashboard.

---

## Phase 7 — Worker Monitor

Goal:
Show infrastructure awareness.

### Subtasks
- Create worker status cards
- Add workload display
- Add recent worker event list
- Add active processing indicator
- Add simple throughput chart

### Output
A monitoring screen that makes the system feel real.

---

## Phase 8 — Realtime UX

Goal:
Make the platform feel alive.

### Subtasks
- Add WebSocket service
- Subscribe to job events
- Update job progress live
- Show connection status
- Add toast notifications
- Handle reconnect states

### Output
Real-time processing feedback.

---

## Phase 9 — Polish & Portfolio Readiness

Goal:
Make the frontend impressive for recruiters and clients.

### Subtasks
- Add responsive behavior
- Improve loading states
- Add micro-interactions
- Polish empty states
- Add error states
- Add screenshot-ready demo data
- Record short demo video
- Write frontend architecture notes

### Output
Portfolio-ready Angular SaaS interface.

---

# 12. Backend Integration Contracts

## Suggested API Endpoints

```text
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/me

GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id

POST   /assets/upload
GET    /assets
GET    /assets/:id
DELETE /assets/:id

POST   /jobs
GET    /jobs
GET    /jobs/:id
POST   /jobs/:id/retry

GET    /workers
GET    /metrics/overview
```

---

# 13. Realtime Events

## WebSocket Event Examples

```text
job.created
job.started
job.progress
job.completed
job.failed
worker.online
worker.offline
asset.processed
```

---

# 14. Suggested Angular Services

```text
core/http/api-client.service.ts
core/auth/auth.service.ts
core/auth/auth.store.ts
core/realtime/realtime.service.ts

features/projects/data-access/projects.service.ts
features/assets/data-access/assets.service.ts
features/upload/data-access/upload.service.ts
features/queue/data-access/jobs.service.ts
features/workers/data-access/workers.service.ts
```

---

# 15. Suggested State Stores

## Auth Store
State:
- user
- accessToken/session
- isAuthenticated
- loading

## Dashboard Store
State:
- metrics
- recentAssets
- activeJobs
- workerActivity

## Upload Store
State:
- selectedFiles
- uploadProgress
- validationErrors
- processingOptions

## Queue Store
State:
- jobs
- filters
- selectedJob
- connectionStatus

---

# 16. Visual References

## Linear
Use as reference for:
- calm productivity UI
- elegant spacing
- minimal dashboard patterns
- clean interaction design

## Vercel
Use as reference for:
- developer platform polish
- deployment/status UI
- dark-mode technical aesthetic
- strong typography

## Stripe
Use as reference for:
- premium SaaS presentation
- visual hierarchy
- gradients and product storytelling

## Figma
Use as reference for:
- creator workspace feeling
- side panels
- tool-oriented UX

## Datadog
Use as reference for:
- operational dashboards
- infrastructure monitoring
- realtime status interfaces

## Notion
Use as reference for:
- workspace organization
- simple navigation
- calm content grouping

---

# 17. Technical References

## Angular
Use Angular’s modern standalone app structure, routing, SSR/hydration options, and dependency injection system.

## Angular Material / CDK
Use Angular Material carefully as infrastructure, not as the visual identity. CDK is especially useful for overlays, accessibility, menus, dialogs, and layout behaviors.

## NgRx SignalStore
Good fit for feature-level state, especially dashboards, auth, queue state, and worker state.

## RxAngular
Good fit for performance-focused rendering and local component state where frequent realtime updates happen.

## SCSS
Use component-scoped SCSS plus global design tokens. Avoid global style leaks.

---

# 18. Recommended First Sprint

## Sprint Goal
Build the visual foundation and main shell.

### Tasks
1. Create SCSS token system
2. Create dark theme variables
3. Build app shell
4. Build sidebar
5. Build topbar
6. Build dashboard route
7. Build card component
8. Build button component
9. Build status pill component
10. Create mock dashboard data
11. Build first dashboard screen

### Success Criteria
At the end of Sprint 1, the frontend should already look like a real SaaS product, even before full backend integration.

---

# 19. Portfolio Presentation

When presenting this project, describe it as:

> TheIndiesPrototype is a creator infrastructure platform built with Angular, NestJS, PostgreSQL, Redis, and background workers. It demonstrates distributed asset processing, real-time queue monitoring, modular frontend architecture, and production-oriented system design.

This is stronger than saying:

> I built an upload dashboard.

The point is to communicate ownership, architecture, and production thinking.

---

# 20. Final Direction

The frontend should not merely display backend data.

It should make the system understandable.

A good user should immediately understand:

- What projects exist
- What assets were uploaded
- What jobs are processing
- What failed
- What workers are active
- What action they should take next

That clarity is what will make TheIndiesPrototype feel like a serious product.

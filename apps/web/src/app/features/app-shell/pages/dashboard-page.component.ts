import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject
} from "@angular/core";
import { NgFor } from "@angular/common";
import { Router } from "@angular/router";

import { ButtonComponent } from "../../../design-system/button/button.component";
import { CardComponent } from "../../../design-system/card/card.component";
import { EmptyStateComponent } from "../../../design-system/empty-state/empty-state.component";
import { PageHeaderComponent } from "../../../design-system/page-header/page-header.component";
import { StatusPillComponent } from "../../../design-system/status-pill/status-pill.component";
import { AuthService } from "../../../core/auth/auth.service";
import { JobsWorkspaceService } from "../../jobs/jobs-workspace.service";
import { ProjectsWorkspaceService } from "../../projects/projects-workspace.service";
import { RealtimePanelComponent } from "../../realtime/components/realtime-panel.component";

interface StatCard {
  label: string;
  value: string;
  summary: string;
  tone: "default" | "accent" | "signal";
}

interface PipelineStage {
  label: string;
  status: string;
  summary: string;
  tone: "neutral" | "success" | "signal" | "warning";
}

interface SliceCard {
  label: string;
  summary: string;
  nextStep: string;
}

@Component({
  selector: "tip-dashboard-page",
  standalone: true,
  imports: [
    NgFor,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    StatusPillComponent,
    RealtimePanelComponent
  ],
  template: `
    <div class="dashboard">
      <tip-page-header
        eyebrow="Protected Shell"
        title="The Angular client now restores the session and owns the project workspace entrypoint."
        description="This dashboard now runs behind real route protection and reads live project state. Later slices can attach assets, jobs, and realtime delivery without replacing the shell again."
      >
        <tip-button (click)="goToProjects()">Open projects workspace</tip-button>
        <tip-button variant="ghost">Legacy workspace still stays at /</tip-button>
      </tip-page-header>

      <section class="stats-grid">
        <tip-card
          *ngFor="let stat of statCards"
          class="stat-card"
          [variant]="stat.tone"
        >
            <div class="stat-copy">
            <span>{{ stat.label }}</span>
            <strong>{{ stat.value }}</strong>
            <p>{{ stat.summary }}</p>
          </div>
        </tip-card>
      </section>

      <section class="dashboard-grid">
        <tip-card variant="signal" class="panel panel-large">
          <div class="panel-header">
            <div>
              <span class="section-label">Delivery Model</span>
              <h3>Frontend integration phases</h3>
            </div>
            <tip-status-pill label="Non-breaking rollout" tone="signal" />
          </div>

          <div class="pipeline-grid">
            <article *ngFor="let stage of pipelineStages" class="pipeline-card">
              <tip-status-pill [label]="stage.status" [tone]="stage.tone" />
              <strong>{{ stage.label }}</strong>
              <p>{{ stage.summary }}</p>
            </article>
          </div>
        </tip-card>

        <tip-card class="panel">
          <div class="panel-header">
            <div>
              <span class="section-label">Architecture</span>
              <h3>Feature slice map</h3>
            </div>
            <tip-status-pill label="Matches docs/architecture" tone="success" />
          </div>

          <div class="slice-grid">
            <article *ngFor="let slice of sliceCards" class="slice-card">
              <strong>{{ slice.label }}</strong>
              <p>{{ slice.summary }}</p>
              <small>{{ slice.nextStep }}</small>
            </article>
          </div>
        </tip-card>

        <tip-realtime-panel />

        <tip-card class="panel">
          <div class="panel-header">
            <div>
              <span class="section-label">Useful Empty States</span>
              <h3>Portfolio-safe placeholders</h3>
            </div>
          </div>

          <div class="empty-grid">
            <tip-empty-state
              title="Projects now live in Angular"
              description="Project listing, selection, search, pagination, and CRUD now run inside the protected shell with the current API."
              actionLabel="Open projects workspace"
              (action)="goToProjects()"
            />
            <tip-empty-state
              title="Assets now live in Angular"
              description="Upload staging, drag and drop, draft asset creation, inventory filtering, source download, and queue handoff are all available inside the protected shell."
              actionLabel="Open projects workspace"
              (action)="goToProjects()"
            />
            <tip-empty-state
              title="Realtime now live in Angular"
              description="Socket authentication, project subscription, reconnect, notifications, and polling fallback now resync the Angular workspace."
              actionLabel="Open jobs workspace"
              (action)="goToJobs()"
            />
          </div>
        </tip-card>
      </section>
    </div>
  `,
  styleUrl: "./dashboard-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly workspaceService = inject(ProjectsWorkspaceService);
  private readonly jobsWorkspaceService = inject(JobsWorkspaceService);
  private readonly router = inject(Router);

  protected readonly pipelineStages: PipelineStage[] = [
    {
      label: "Phase 0",
      status: "Complete",
      summary:
        "Angular build configuration, runtime config injection, and server/browser split are now first-class.",
      tone: "success"
    },
    {
      label: "Phase 1",
      status: "Complete",
      summary:
        "Dashboard route, shell layout, design tokens, and reusable components establish the base product language.",
      tone: "signal"
    },
    {
      label: "Phase 2",
      status: "Complete",
      summary:
        "Core HTTP, route protection, runtime state, and error handling will connect Angular to the current API surface.",
      tone: "warning"
    },
    {
      label: "Phase 3",
      status: "Complete",
      summary:
        "Register, sign in, refresh, logout, and session restore now work inside Angular with the current auth API.",
      tone: "success"
    },
    {
      label: "Phase 4",
      status: "Complete",
      summary:
        "Project search, selection, pagination, create, update, and delete flows now live in the Angular workspace slice.",
      tone: "neutral"
    },
    {
      label: "Phase 5",
      status: "Complete",
      summary:
        "Asset inventory, uploads, draft creation, source downloads, and queue handoff now run in the Angular workspace.",
      tone: "success"
    },
    {
      label: "Phase 6",
      status: "Complete",
      summary:
        "Queue filtering, retries, processed-thumbnail downloads, and jobs summaries now live in the Angular shell.",
      tone: "signal"
    },
    {
      label: "Phase 7",
      status: "Complete",
      summary:
        "Realtime socket auth, project subscription, notifications, reconnect behavior, and polling fallback now keep the workspace synchronized.",
      tone: "warning"
    },
    {
      label: "Phase 8",
      status: "Complete",
      summary:
        "Realtime UX now updates queue and asset state incrementally, surfaces connection fallbacks clearly, and promotes important events into workspace notices.",
      tone: "success"
    },
    {
      label: "Phase 9",
      status: "Complete",
      summary:
        "Responsive behavior, shimmer loading states, formatted operational metadata, polished empty states, and motion/accessibility refinements now make the interface portfolio-ready.",
      tone: "signal"
    },
    {
      label: "Phase 10",
      status: "Complete",
      summary:
        "Frontend delivery now includes a package test suite, a documented architecture note, and a release-friendly CI contract alongside build and dry-run verification.",
      tone: "neutral"
    }
  ];

  protected readonly sliceCards: SliceCard[] = [
    {
      label: "auth",
      summary:
        "Session restore, login, logout, and route gating remain isolated from project and asset screens.",
      nextStep: "Integrated with the existing auth API."
    },
    {
      label: "projects",
      summary:
        "Workspace selection and project CRUD stay a dedicated domain slice instead of leaking into shell concerns.",
      nextStep: "Integrated with live project browsing and editing."
    },
    {
      label: "assets",
      summary:
        "Upload, validation, metadata, and preview behaviors stay independent from job execution UI.",
      nextStep: "Integrated with upload, draft creation, and source download."
    },
    {
      label: "jobs",
      summary:
        "Queue states, retries, and derived-output visibility remain their own operational view.",
      nextStep: "Integrated with filtering, retry, and thumbnail download."
    },
    {
      label: "realtime",
      summary:
        "Socket delivery enhances the UI but does not become the source of truth.",
      nextStep: "Integrated with reconnect-driven resync and fallback polling."
    },
    {
      label: "shared-ui",
      summary:
        "Design-system primitives can move into packages/ui once reuse justifies promotion.",
      nextStep: "Hardening complete. Promote primitives only when a second surface needs them."
    }
  ];

  async ngOnInit(): Promise<void> {
    await this.workspaceService.ensureLoaded();
  }

  protected get statCards(): StatCard[] {
    return [
      {
        label: "Signed-in user",
        value: this.authService.user()?.email ?? "Unknown session",
        summary:
          "Route protection and bootstrap recovery now decide whether the shell renders at all.",
        tone: "accent"
      },
      {
        label: "Projects in scope",
        value: String(this.workspaceService.totalProjects()),
        summary:
          "The dashboard is now reading the live paginated project collection instead of static showcase data.",
        tone: "signal"
      },
      {
        label: "Queue items loaded",
        value: String(this.jobsWorkspaceService.collection()?.totalItems ?? 0),
        summary:
          "The queue slice now exposes active, queued, failed, and completed work for the selected project.",
        tone: "default"
      },
      {
        label: "Migration strategy",
        value: "Hybrid rollout",
        summary:
          "The current workspace remains available while Angular pages replace it slice by slice.",
        tone: "accent"
      }
    ];
  }

  protected async goToProjects(): Promise<void> {
    await this.router.navigateByUrl("/projects");
  }

  protected async goToJobs(): Promise<void> {
    await this.router.navigateByUrl("/jobs");
  }
}

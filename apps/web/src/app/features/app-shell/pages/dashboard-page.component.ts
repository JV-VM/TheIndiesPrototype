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
        eyebrow="Protected workspace"
        title="A real seeded workspace for inspecting asset ingestion, async processing, and realtime delivery."
        description="Use this dashboard as the technical walkthrough after entering demo mode. It summarizes the system shape, live operational scope, and where to inspect the implemented architecture next."
      >
        <tip-button (click)="goToProjects()">Open projects workspace</tip-button>
        <tip-button variant="ghost" (click)="goToJobs()">Open live queue</tip-button>
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
              <span class="section-label">Architecture highlights</span>
              <h3>How the system is composed</h3>
            </div>
            <tip-status-pill label="Implemented in repo" tone="signal" />
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
              <span class="section-label">System lanes</span>
              <h3>Where each concern lives</h3>
            </div>
            <tip-status-pill label="Matches deployed flow" tone="success" />
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
              <span class="section-label">Inspection paths</span>
              <h3>What to open next</h3>
            </div>
          </div>

          <div class="empty-grid">
            <tip-empty-state
              title="Inspect project and asset state"
              description="Open the projects workspace to review seeded records, asset metadata, upload flow, and how queue handoff starts from a project context."
              actionLabel="Open projects workspace"
              (action)="goToProjects()"
            />
            <tip-empty-state
              title="Inspect queue execution"
              description="Open the queue view to review job status breakdowns, retries, and derived output visibility after worker execution."
              actionLabel="Open jobs workspace"
              (action)="goToJobs()"
            />
            <tip-empty-state
              title="Inspect realtime behavior"
              description="Watch socket status, notifications, and live state transitions to verify that the UI stays synchronized with backend events."
              actionLabel="Open projects workspace"
              (action)="goToProjects()"
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
      label: "Auth boundary",
      status: "Live",
      summary:
        "The workspace remains protected behind restored sessions, rotating refresh cookies, and route guards.",
      tone: "success"
    },
    {
      label: "Asset ingestion",
      status: "Live",
      summary:
        "Uploads are validated by the API, persisted to object storage, and tracked as project-scoped asset records.",
      tone: "signal"
    },
    {
      label: "Job orchestration",
      status: "Live",
      summary:
        "Processing work is queued durably, queried from the workspace, and retried when failures need another pass.",
      tone: "neutral"
    },
    {
      label: "Worker execution",
      status: "Live",
      summary:
        "A separate worker transforms queued assets and stores derived outputs back into persistent storage.",
      tone: "success"
    },
    {
      label: "Realtime delivery",
      status: "Live",
      summary:
        "Redis pub/sub fans backend events into authenticated WebSocket updates so the workspace reflects state changes quickly.",
      tone: "warning"
    },
    {
      label: "Storage model",
      status: "Live",
      summary:
        "Source files and processed outputs stay behind authenticated application flows instead of leaking direct bucket access.",
      tone: "success"
    },
    {
      label: "Quality gates",
      status: "Live",
      summary:
        "Build, typecheck, tests, smoke coverage, Docker packaging, and deployment wiring are part of the delivery contract.",
      tone: "signal"
    }
  ];

  protected readonly sliceCards: SliceCard[] = [
    {
      label: "auth",
      summary:
        "Session restore, login, logout, and route gating stay isolated from project and asset screens.",
      nextStep: "Inspect how demo mode and manual sign-in converge into the same protected shell."
    },
    {
      label: "projects",
      summary:
        "Workspace selection, search, and CRUD stay a dedicated domain slice instead of leaking into shell concerns.",
      nextStep: "Open Projects to inspect seeded records, editing, and project-scoped inventory."
    },
    {
      label: "assets",
      summary:
        "Upload, validation, metadata, and preview behaviors stay independent from job execution UI.",
      nextStep: "Inspect upload staging, metadata drafts, and source download paths."
    },
    {
      label: "jobs",
      summary:
        "Queue states, retries, and derived-output visibility remain their own operational view.",
      nextStep: "Open Queue to inspect live status buckets and retry flows."
    },
    {
      label: "realtime",
      summary:
        "Socket delivery enhances the UI but does not become the source of truth.",
      nextStep: "Watch the connection panel and notices while queue state changes propagate."
    },
    {
      label: "delivery",
      summary:
        "Deployment, runtime config, smoke verification, and CI keep the demo reproducible beyond local-only conditions.",
      nextStep: "Cross-check this surface with the public landing page and deployed Render routes."
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
          "The protected shell is using a real restored session, including demo mode entry when applicable.",
        tone: "accent"
      },
      {
        label: "Projects in scope",
        value: String(this.workspaceService.totalProjects()),
        summary:
          "This count is read from the live workspace collection rather than hardcoded showcase content.",
        tone: "signal"
      },
      {
        label: "Queue items loaded",
        value: String(this.jobsWorkspaceService.collection()?.totalItems ?? 0),
        summary:
          "Queue state exposes active, queued, failed, and completed work when a project context is selected.",
        tone: "default"
      },
      {
        label: "Deployment target",
        value: "Render + Docker",
        summary:
          "The same workflow is shaped for deployed use with runtime config, health checks, and service boundaries.",
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

import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";

import { ApiError } from "../../../core/http/api-error";
import { AuthService } from "../../../core/auth/auth.service";
import { NoticeService } from "../../../core/ui/notice.service";
import { ButtonComponent } from "../../../design-system/button/button.component";
import { CardComponent } from "../../../design-system/card/card.component";
import { NoticeBannerComponent } from "../../../shared/components/notice-banner.component";

interface FeatureItem {
  title: string;
  description: string;
}

@Component({
  selector: "tip-landing-page",
  standalone: true,
  imports: [RouterLink, ButtonComponent, CardComponent, NoticeBannerComponent],
  template: `
    <main class="landing-shell">
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">Public page before login</span>
          <h1>Asset processing workflow, architecture depth, and a demo with no signup wall.</h1>
          <p class="hero-lead">
            The goal is simple: let a recruiter understand the product fast, then enter a real
            seeded workspace in one click instead of being forced through account creation first.
          </p>

          <div class="hero-actions">
            <tip-button [disabled]="busy()" (click)="openDemoWorkspace()">
              {{ busy() ? "Opening..." : "Enter demo mode" }}
            </tip-button>
            <a class="secondary-action" routerLink="/auth">Manual sign in</a>
          </div>

          <tip-notice-banner />
        </div>

        <tip-card class="hero-panel" variant="signal">
          <div class="hero-panel-header">
            <span class="mini-label">Demo access</span>
            <h2>One click opens the seeded workspace with auth, jobs, realtime, and storage already wired.</h2>
          </div>

          <div class="hero-panel-grid">
            <article>
              <strong>No signup friction</strong>
              <p>The primary path is demo-first, not form-first.</p>
            </article>
            <article>
              <strong>Real seeded data</strong>
              <p>The workspace opens with projects, assets, and queue state already available.</p>
            </article>
            <article>
              <strong>Real system surface</strong>
              <p>Everything on this page maps to implemented application behavior.</p>
            </article>
          </div>
        </tip-card>
      </section>

      <section class="section-grid">
        <tip-card>
          <div class="section-header">
            <span class="section-kicker">Problem</span>
            <h2>What this system solves</h2>
          </div>
          <p>
            Creative asset pipelines usually fragment uploads, processing, status tracking, and
            delivery across disconnected tools. Teams lose visibility into what is queued, what is
            running, and where processed outputs live.
          </p>
        </tip-card>

        <tip-card variant="accent">
          <div class="section-header">
            <span class="section-kicker">Solution</span>
            <h2>How the application addresses it</h2>
          </div>
          <p>
            TIP centralizes the workflow in one protected workspace: upload assets, persist them,
            enqueue processing jobs, track job state in realtime, and retrieve derived outputs from
            durable storage.
          </p>
        </tip-card>
      </section>

      <section class="section-grid">
        <tip-card>
          <div class="section-header">
            <span class="section-kicker">Core features</span>
            <h2>Core features</h2>
          </div>
          <ul class="feature-list">
            @for (feature of coreFeatures; track feature.title) {
              <li>
                <strong>{{ feature.title }}</strong>
                <p>{{ feature.description }}</p>
              </li>
            }
          </ul>
        </tip-card>

        <tip-card>
          <div class="section-header">
            <span class="section-kicker">Tech stack</span>
            <h2>Production-oriented stack</h2>
          </div>
          <div class="chip-grid">
            @for (item of techStack; track item) {
              <span class="chip">{{ item }}</span>
            }
          </div>
        </tip-card>
      </section>

      <section class="section-grid">
        <tip-card>
          <div class="section-header">
            <span class="section-kicker">Architecture highlights</span>
            <h2>Where the engineering depth shows up</h2>
          </div>
          <ul class="feature-list">
            @for (item of architectureHighlights; track item.title) {
              <li>
                <strong>{{ item.title }}</strong>
                <p>{{ item.description }}</p>
              </li>
            }
          </ul>
        </tip-card>

        <tip-card variant="signal">
          <div class="section-header">
            <span class="section-kicker">Demo access</span>
            <h2>Open the seeded workspace instantly</h2>
          </div>
          <p>
            The demo account is preseeded. No registration step, no credential copy/paste, no dead
            landing branch.
          </p>
          <tip-button [disabled]="busy()" (click)="openDemoWorkspace()">
            {{ busy() ? "Opening..." : "Enter demo mode" }}
          </tip-button>
        </tip-card>
      </section>
    </main>
  `,
  styleUrl: "./landing-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPageComponent {
  private readonly authService = inject(AuthService);
  private readonly noticeService = inject(NoticeService);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly coreFeatures: FeatureItem[] = [
    {
      title: "Project-scoped workspace",
      description: "Projects, assets, and jobs stay grouped inside one authenticated operator view."
    },
    {
      title: "Asset ingestion",
      description: "Validated uploads move through the API into persistent object storage."
    },
    {
      title: "Async job execution",
      description: "Queued work runs in the worker pipeline with persisted state and retry handling."
    },
    {
      title: "Realtime job updates",
      description: "Authenticated WebSocket delivery keeps the UI synchronized with backend events."
    },
    {
      title: "Processed output retrieval",
      description: "Derived files remain addressable and downloadable after processing completes."
    },
    {
      title: "Session recovery",
      description: "Access and refresh token flows restore the protected shell after reloads."
    }
  ];

  protected readonly techStack = [
    "Angular",
    "TypeScript",
    "Node.js",
    "PostgreSQL",
    "Redis",
    "Docker",
    "BullMQ",
    "MinIO",
    "Prisma",
    "Sharp",
    "WebSocket",
    "GitHub Actions",
    "Render"
  ];

  protected readonly architectureHighlights: FeatureItem[] = [
    {
      title: "Auth",
      description: "Rotating access and refresh tokens protect routes and restore sessions."
    },
    {
      title: "Workers",
      description: "Background execution is isolated from the API and tracked in PostgreSQL."
    },
    {
      title: "ETL",
      description: "Asset data is uploaded, validated, persisted, and transformed through one pipeline."
    },
    {
      title: "Jobs",
      description: "Queue state is durable, queryable, and exposed cleanly to the workspace UI."
    },
    {
      title: "Realtime",
      description: "Redis pub/sub fans events out to the API and authenticated clients."
    },
    {
      title: "Storage",
      description: "MinIO-backed object keys and authenticated downloads for source and output files."
    },
    {
      title: "CI/CD",
      description: "Build, lint, test, smoke, and Docker packaging are already wired into delivery."
    }
  ];

  protected async openDemoWorkspace(): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    this.noticeService.setNeutral("Opening the seeded demo workspace...");

    try {
      await this.authService.openDemoWorkspace();
      await this.router.navigateByUrl("/dashboard");
    } catch (error) {
      this.noticeService.setDanger(this.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return error instanceof Error ? error.message : "Demo access failed.";
  }
}

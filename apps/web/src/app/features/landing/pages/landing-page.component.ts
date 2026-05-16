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
          <span class="eyebrow">Public preview</span>
          <h1>Creator workflows, distributed systems, and realtime delivery before login.</h1>
          <p class="hero-lead">
            This public page explains the problem, the solution, the stack, and the architecture.
            The demo opens the seeded workspace directly, so recruiters can inspect the product
            without creating an account first.
          </p>

          <div class="hero-actions">
            <tip-button [disabled]="busy()" (click)="openDemoWorkspace()">
              {{ busy() ? "Opening..." : "Open demo workspace" }}
            </tip-button>
            <a class="secondary-action" routerLink="/auth">Sign in</a>
          </div>

          <tip-notice-banner />
        </div>

        <tip-card class="hero-panel" variant="signal">
          <div class="hero-panel-header">
            <span class="mini-label">Portfolio overview</span>
            <h2>One click into a seeded workspace, with auth, jobs, and realtime already wired.</h2>
          </div>

          <div class="hero-panel-grid">
            <article>
              <strong>Public pitch</strong>
              <p>Short, direct, and easy to scan in a recruiter pass.</p>
            </article>
            <article>
              <strong>Seeded demo</strong>
              <p>No signup wall. The demo account is already in place.</p>
            </article>
            <article>
              <strong>Real system</strong>
              <p>Every section maps to an implemented part of the stack.</p>
            </article>
          </div>
        </tip-card>
      </section>

      <section class="section-grid">
        <tip-card>
          <div class="section-header">
            <span class="section-kicker">Problem</span>
            <h2>What problem the system solves</h2>
          </div>
          <p>
            Recruiters need to understand the product fast. Most demos hide the interesting
            parts behind generic CRUD, so the architecture never gets to speak for itself.
          </p>
        </tip-card>

        <tip-card variant="accent">
          <div class="section-header">
            <span class="section-kicker">Solution</span>
            <h2>How the application addresses it</h2>
          </div>
          <p>
            TIP surfaces a full creator workflow: public framing, authenticated sessions,
            workspace state, async processing, realtime job updates, and persistent storage.
          </p>
        </tip-card>
      </section>

      <section class="section-grid">
        <tip-card>
          <div class="section-header">
            <span class="section-kicker">Core features</span>
            <h2>Key capabilities</h2>
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
            This button uses the preseeded demo account, so there is no registration step and no
            manual credential entry.
          </p>
          <tip-button [disabled]="busy()" (click)="openDemoWorkspace()">
            {{ busy() ? "Opening..." : "Open demo workspace" }}
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
      title: "Workspace library",
      description: "Projects stay scoped to one account and can be browsed like a real product."
    },
    {
      title: "Asset upload",
      description: "Files move through validated API endpoints into persistent object storage."
    },
    {
      title: "Queue processing",
      description: "Jobs are queued, retried, and completed by the worker pipeline."
    },
    {
      title: "Realtime delivery",
      description: "Status changes arrive live over authenticated WebSocket sessions."
    },
    {
      title: "Session restore",
      description: "Access and refresh tokens recover the shell after reloads."
    }
  ];

  protected readonly techStack = [
    "Angular",
    "NestJS",
    "PostgreSQL",
    "Redis",
    "Docker",
    "BullMQ",
    "MinIO",
    "Prisma",
    "Sharp",
    "WebSocket"
  ];

  protected readonly architectureHighlights: FeatureItem[] = [
    {
      title: "Auth",
      description: "Rotating access and refresh tokens with guarded app routes."
    },
    {
      title: "Workers",
      description: "Background execution separated from the API and tracked in PostgreSQL."
    },
    {
      title: "ETL",
      description: "Upload, validate, persist, and transform asset data across the pipeline."
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

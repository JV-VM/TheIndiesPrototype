import { ChangeDetectionStrategy, Component, OnInit, inject } from "@angular/core";
import { ReactiveFormsModule, FormBuilder } from "@angular/forms";
import type { JobLifecycleStatus } from "@tip/types";

import { ButtonComponent } from "../../../design-system/button/button.component";
import { CardComponent } from "../../../design-system/card/card.component";
import { EmptyStateComponent } from "../../../design-system/empty-state/empty-state.component";
import { LoadingStateComponent } from "../../../design-system/loading-state/loading-state.component";
import { PageHeaderComponent } from "../../../design-system/page-header/page-header.component";
import { StatusPillComponent } from "../../../design-system/status-pill/status-pill.component";
import { NoticeBannerComponent } from "../../../shared/components/notice-banner.component";
import {
  formatRelativeTime,
  formatTimestamp
} from "../../../shared/utils/formatting";
import { RealtimePanelComponent } from "../../realtime/components/realtime-panel.component";
import { JobsWorkspaceService } from "../jobs-workspace.service";
import { ProjectsWorkspaceService } from "../../projects/projects-workspace.service";

@Component({
  selector: "tip-jobs-page",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatusPillComponent,
    NoticeBannerComponent,
    RealtimePanelComponent
  ],
  template: `
    <div class="jobs-page">
      <tip-page-header
        eyebrow="Phase 6 and 7"
        title="Queue control and live delivery now run in the Angular workspace."
        description="The jobs view shows active, queued, completed, and failed work, while the realtime slice keeps the project in sync with socket delivery and polling fallback."
      >
        <tip-status-pill
          [label]="(jobsService.collection()?.totalItems || 0) + ' jobs tracked'"
          tone="signal"
        />
      </tip-page-header>

      <tip-notice-banner />

      <div class="jobs-layout">
        <section class="jobs-main">
          <tip-card class="panel">
            <div class="panel-header">
              <div>
                <span class="section-label">Processing Queue</span>
                <h3>Project jobs</h3>
              </div>
              <tip-button variant="ghost" (click)="refreshJobs()">Refresh</tip-button>
            </div>

            @if (!projectsWorkspaceService.selectedProject()) {
              <tip-empty-state
                title="Select a project"
                description="Choose a project from the workspace library before reviewing queue activity."
                actionLabel="Refresh queue"
                (action)="refreshJobs()"
              />
            } @else {
              <form class="filter-form" [formGroup]="filterForm" (ngSubmit)="applyFilter()">
                <label>
                  <span>Status</span>
                  <select formControlName="status">
                    <option value="all">All statuses</option>
                    @for (status of jobsService.lifecycleStatuses; track status) {
                      <option [value]="status">{{ status }}</option>
                    }
                  </select>
                </label>
                <tip-button variant="secondary" buttonType="submit">Filter queue</tip-button>
              </form>

              <div class="snapshot-grid">
                <article class="snapshot-card">
                  <strong>Active</strong>
                  <span>{{ jobsService.activeCount() }}</span>
                </article>
                <article class="snapshot-card">
                  <strong>Queued</strong>
                  <span>{{ jobsService.queuedCount() }}</span>
                </article>
                <article class="snapshot-card">
                  <strong>Done</strong>
                  <span>{{ jobsService.completedCount() }}</span>
                </article>
                <article class="snapshot-card">
                  <strong>Failed</strong>
                  <span>{{ jobsService.failedCount() }}</span>
                </article>
              </div>

              @if (jobsService.isLoading() && jobsService.items().length === 0) {
                <tip-loading-state
                  title="Loading queue state"
                  description="The client is reconciling project jobs, retries, and derived output availability."
                />
              } @else if (jobsService.items().length > 0) {
                <div class="job-list">
                  @for (job of jobsService.items(); track job.id) {
                    <article class="job-row">
                      <div class="job-head">
                        <div>
                          <strong>{{ job.payload?.originalFilename || job.assetId }}</strong>
                          <p>{{ job.kind }} • attempt {{ job.attempts }}/{{ job.maxAttempts }}</p>
                        </div>
                        <tip-status-pill [label]="job.status" tone="signal" />
                      </div>
                      <p class="muted-note">
                        Queue <span class="code-pill">{{ job.queueName }}</span>
                        • Job <span class="code-pill">{{ job.id }}</span>
                      </p>
                      @if (job.failureReason) {
                        <p class="danger-copy">{{ job.failureReason }}</p>
                      }
                      @if (job.result?.outputs?.[0]; as thumbnail) {
                        <p class="muted-note">
                          Output <span class="code-pill">{{ thumbnail.objectKey }}</span>
                        </p>
                      }
                      <p class="muted-note">
                        Updated {{ formatTimestamp(job.updatedAt) }} • {{ formatRelativeTime(job.updatedAt) }}
                      </p>
                      <div class="job-actions">
                        @if (job.status === 'failed') {
                          <tip-button
                            variant="ghost"
                            [disabled]="jobsService.isMutating()"
                            (click)="retryJob(job.id)"
                          >
                            Retry job
                          </tip-button>
                        }
                        @if (job.result?.outputs?.[0]; as thumbnail) {
                          <tip-button
                            variant="ghost"
                            (click)="downloadThumbnail(job.id, thumbnail.filename)"
                          >
                            Download thumbnail
                          </tip-button>
                        }
                      </div>
                    </article>
                  }
                </div>

                @if (jobsService.collection(); as collection) {
                  <div class="pagination-row">
                    <tip-button
                      variant="ghost"
                      [disabled]="collection.page <= 1 || jobsService.isLoading()"
                      (click)="previousPage()"
                    >
                      Previous
                    </tip-button>
                    <p>Page {{ collection.page }} of {{ collection.totalPages }}</p>
                    <tip-button
                      variant="ghost"
                      [disabled]="collection.page >= collection.totalPages || jobsService.isLoading()"
                      (click)="nextPage()"
                    >
                      Next
                    </tip-button>
                  </div>
                }
              } @else {
                <tip-empty-state
                  title="No jobs yet"
                  description="Trigger thumbnail generation from the asset inventory to start the first run."
                  actionLabel="Refresh queue"
                  (action)="refreshJobs()"
                />
              }
            }
          </tip-card>
        </section>

        <section class="jobs-side">
          <tip-realtime-panel />
        </section>
      </div>
    </div>
  `,
  styleUrl: "./jobs-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobsPageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly jobsService = inject(JobsWorkspaceService);
  protected readonly projectsWorkspaceService = inject(ProjectsWorkspaceService);
  protected readonly formatRelativeTime = formatRelativeTime;
  protected readonly formatTimestamp = formatTimestamp;
  protected readonly filterForm = this.formBuilder.nonNullable.group({
    status: ["all"]
  });

  async ngOnInit(): Promise<void> {
    await this.jobsService.ensureLoadedForSelectedProject();
    this.filterForm.patchValue(
      {
        status: this.jobsService.filters().status ?? "all"
      },
      {
        emitEvent: false
      }
    );
  }

  protected async applyFilter(): Promise<void> {
    const status = this.filterForm.getRawValue().status;
    await this.jobsService.loadJobsForSelectedProject({
      status: status === "all" ? null : (status as JobLifecycleStatus)
    });
  }

  protected async refreshJobs(): Promise<void> {
    await this.jobsService.loadJobsForSelectedProject();
  }

  protected async retryJob(jobId: string): Promise<void> {
    await this.jobsService.retryJob(jobId);
  }

  protected async downloadThumbnail(
    jobId: string,
    filename: string
  ): Promise<void> {
    await this.jobsService.downloadThumbnail(jobId, filename);
  }

  protected async previousPage(): Promise<void> {
    const currentPage = this.jobsService.collection()?.page ?? 1;
    await this.jobsService.goToPage(currentPage - 1);
  }

  protected async nextPage(): Promise<void> {
    const currentPage = this.jobsService.collection()?.page ?? 1;
    await this.jobsService.goToPage(currentPage + 1);
  }
}

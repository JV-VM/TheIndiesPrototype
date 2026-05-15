import { Injectable, computed, effect, inject, signal } from "@angular/core";

import {
  jobLifecycleStatuses,
  type JobLifecycleStatus,
  type ProjectJobUpdateEvent,
  type ProjectJobCollection
} from "@tip/types";

import { ApiClientService } from "../../core/http/api-client.service";
import { NoticeService } from "../../core/ui/notice.service";
import { saveDownloadedBlob } from "../../shared/utils/blob-download";
import { ProjectsWorkspaceService } from "../projects/projects-workspace.service";
import { applyRealtimeJobUpdateToJobs } from "../realtime/realtime-updates";

interface JobFilters {
  page: number;
  pageSize: number;
  status: JobLifecycleStatus | null;
}

@Injectable({
  providedIn: "root"
})
export class JobsWorkspaceService {
  private readonly apiClient = inject(ApiClientService);
  private readonly projectsWorkspaceService = inject(ProjectsWorkspaceService);
  private readonly noticeService = inject(NoticeService);

  private readonly collectionState = signal<ProjectJobCollection | null>(null);
  private readonly loadingState = signal(false);
  private readonly mutatingState = signal(false);
  private readonly filtersState = signal<JobFilters>({
    page: 1,
    pageSize: 6,
    status: null
  });
  private lastProjectId: string | null = null;

  readonly collection = computed(() => this.collectionState());
  readonly items = computed(() => this.collectionState()?.items ?? []);
  readonly isLoading = computed(() => this.loadingState());
  readonly isMutating = computed(() => this.mutatingState());
  readonly filters = computed(() => this.filtersState());
  readonly lifecycleStatuses = jobLifecycleStatuses;
  readonly activeCount = computed(
    () => this.items().filter((job) => job.status === "active").length
  );
  readonly queuedCount = computed(
    () => this.items().filter((job) => job.status === "queued").length
  );
  readonly completedCount = computed(
    () => this.items().filter((job) => job.status === "completed").length
  );
  readonly failedCount = computed(
    () => this.items().filter((job) => job.status === "failed").length
  );

  constructor() {
    effect(() => {
      const selectedProjectId = this.projectsWorkspaceService.selectedProjectId();

      if (selectedProjectId === this.lastProjectId) {
        return;
      }

      this.lastProjectId = selectedProjectId;
      this.collectionState.set(null);
      this.filtersState.update((current) => ({
        ...current,
        page: 1
      }));

      if (selectedProjectId) {
        void this.loadJobsForSelectedProject({
          background: true,
          suppressErrors: true
        });
      }
    });
  }

  async ensureLoadedForSelectedProject(): Promise<void> {
    if (this.collectionState()) {
      return;
    }

    await this.loadJobsForSelectedProject();
  }

  async loadJobsForSelectedProject(options?: {
    page?: number;
    pageSize?: number;
    status?: JobLifecycleStatus | null;
    background?: boolean;
    suppressErrors?: boolean;
  }): Promise<void> {
    const selectedProjectId = this.projectsWorkspaceService.selectedProjectId();
    const background = options?.background === true;

    if (!selectedProjectId) {
      this.collectionState.set(null);
      return;
    }

    if (options?.status !== undefined) {
      this.filtersState.update((current) => ({
        ...current,
        status: options.status ?? null,
        page: 1
      }));
    }

    if (options?.page !== undefined) {
      this.filtersState.update((current) => ({
        ...current,
        page: options.page ?? 1
      }));
    }

    if (options?.pageSize !== undefined) {
      this.filtersState.update((current) => ({
        ...current,
        pageSize: options.pageSize ?? current.pageSize
      }));
    }

    if (!background) {
      this.loadingState.set(true);
    }

    try {
      const collection = await this.apiClient.jobs.listByProject(
        selectedProjectId,
        this.filtersState()
      );
      this.collectionState.set(collection);
    } catch (error) {
      if (!options?.suppressErrors) {
        this.noticeService.setDanger(
          this.errorMessage(error, "Could not load project jobs.")
        );
      }
    } finally {
      if (!background) {
        this.loadingState.set(false);
      }
    }
  }

  async queueAssetProcessing(assetId: string): Promise<boolean> {
    const projectId = this.projectsWorkspaceService.selectedProjectId();

    if (!projectId) {
      return false;
    }

    this.mutatingState.set(true);

    try {
      const job = await this.apiClient.jobs.createForAsset(projectId, assetId, {});
      this.noticeService.setSuccess(
        `Queued ${job.kind} for the selected asset. The worker will process it asynchronously.`
      );
      await this.projectsWorkspaceService.refreshCurrentProject({
        background: true,
        suppressErrors: true
      });
      await this.loadJobsForSelectedProject({
        page: 1
      });
      return true;
    } catch (error) {
      this.noticeService.setDanger(
        this.errorMessage(error, "Could not queue the processing job.")
      );
      return false;
    } finally {
      this.mutatingState.set(false);
    }
  }

  async retryJob(jobId: string): Promise<boolean> {
    const projectId = this.projectsWorkspaceService.selectedProjectId();

    if (!projectId) {
      return false;
    }

    this.mutatingState.set(true);

    try {
      await this.apiClient.jobs.retryByProject(projectId, jobId);
      this.noticeService.setSuccess(
        "Failed job requeued for another processing attempt."
      );
      await this.projectsWorkspaceService.refreshCurrentProject({
        background: true,
        suppressErrors: true
      });
      await this.loadJobsForSelectedProject({
        background: true,
        suppressErrors: true
      });
      return true;
    } catch (error) {
      this.noticeService.setDanger(
        this.errorMessage(error, "Could not retry the failed job.")
      );
      return false;
    } finally {
      this.mutatingState.set(false);
    }
  }

  async downloadThumbnail(
    jobId: string,
    fallbackFilename: string
  ): Promise<boolean> {
    const projectId = this.projectsWorkspaceService.selectedProjectId();

    if (!projectId) {
      return false;
    }

    try {
      this.noticeService.setNeutral("Preparing the processed thumbnail download...");
      const result = await this.apiClient.jobs.downloadThumbnail(projectId, jobId);
      saveDownloadedBlob(
        result.blob,
        result.filename ?? fallbackFilename ?? "thumbnail.png"
      );
      this.noticeService.setSuccess(
        "Processed thumbnail download started in the browser."
      );
      return true;
    } catch (error) {
      this.noticeService.setDanger(
        this.errorMessage(error, "Could not download the processed thumbnail.")
      );
      return false;
    }
  }

  applyRealtimeJobUpdate(event: ProjectJobUpdateEvent): void {
    this.collectionState.update((collection) =>
      applyRealtimeJobUpdateToJobs(collection, event)
    );
  }

  async goToPage(nextPage: number): Promise<void> {
    const collection = this.collectionState();

    if (!collection || nextPage < 1 || nextPage > collection.totalPages) {
      return;
    }

    await this.loadJobsForSelectedProject({
      page: nextPage
    });
  }

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }

}

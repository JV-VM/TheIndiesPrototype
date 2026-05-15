import { Injectable, computed, inject, signal } from "@angular/core";

import type {
  CreateProjectInput,
  ProjectCollection,
  ProjectDetail,
  ProjectSummary,
  UpdateProjectInput
} from "@tip/types";

import { ApiClientService } from "../../core/http/api-client.service";
import { NoticeService } from "../../core/ui/notice.service";

interface ProjectListFilters {
  query: string;
  page: number;
  pageSize: number;
}

@Injectable({
  providedIn: "root"
})
export class ProjectsWorkspaceService {
  private readonly apiClient = inject(ApiClientService);
  private readonly noticeService = inject(NoticeService);

  private readonly collectionState = signal<ProjectCollection | null>(null);
  private readonly selectedProjectIdState = signal<string | null>(null);
  private readonly selectedProjectState = signal<ProjectDetail | null>(null);
  private readonly filtersState = signal<ProjectListFilters>({
    query: "",
    page: 1,
    pageSize: 6
  });
  private readonly loadingListState = signal(false);
  private readonly loadingDetailState = signal(false);
  private readonly mutatingState = signal(false);
  private didLoadOnce = false;

  readonly collection = computed(() => this.collectionState());
  readonly selectedProject = computed(() => this.selectedProjectState());
  readonly selectedProjectId = computed(() => this.selectedProjectIdState());
  readonly filters = computed(() => this.filtersState());
  readonly isLoadingList = computed(() => this.loadingListState());
  readonly isLoadingDetail = computed(() => this.loadingDetailState());
  readonly isMutating = computed(() => this.mutatingState());
  readonly projects = computed(() => this.collectionState()?.items ?? []);
  readonly totalProjects = computed(() => this.collectionState()?.totalItems ?? 0);

  reset(): void {
    this.collectionState.set(null);
    this.selectedProjectIdState.set(null);
    this.selectedProjectState.set(null);
    this.filtersState.set({
      query: "",
      page: 1,
      pageSize: 6
    });
    this.loadingListState.set(false);
    this.loadingDetailState.set(false);
    this.mutatingState.set(false);
    this.didLoadOnce = false;
  }

  async ensureLoaded(): Promise<void> {
    if (this.didLoadOnce) {
      return;
    }

    await this.loadProjects();
  }

  async loadProjects(options?: {
    query?: string;
    page?: number;
    pageSize?: number;
    focusProjectId?: string | null;
    background?: boolean;
    suppressErrors?: boolean;
  }): Promise<void> {
    const background = options?.background === true;

    if (!background) {
      this.loadingListState.set(true);
    }

    if (options?.query !== undefined) {
      this.filtersState.update((current) => ({
        ...current,
        query: options.query ?? "",
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

    try {
      const filters = this.filtersState();
      const collection = await this.apiClient.projects.list(filters);
      this.collectionState.set(collection);
      this.didLoadOnce = true;

      const focusProjectId =
        options?.focusProjectId !== undefined
          ? options.focusProjectId
          : this.selectedProjectIdState();

      const fallbackProject = collection.items[0] ?? null;
      const nextSelectedProject =
        collection.items.find((project) => project.id === focusProjectId) ??
        fallbackProject;

      this.selectedProjectIdState.set(nextSelectedProject?.id ?? null);

      if (nextSelectedProject) {
        await this.loadProjectDetail(nextSelectedProject.id, true, options?.suppressErrors);
      } else {
        this.selectedProjectState.set(null);
      }
    } catch (error) {
      if (!options?.suppressErrors) {
        this.noticeService.setDanger(
          this.errorMessage(error, "Could not load projects.")
        );
      }
    } finally {
      if (!background) {
        this.loadingListState.set(false);
      }
    }
  }

  async loadProjectDetail(
    projectId: string,
    suppressLoading = false,
    suppressErrors = false
  ): Promise<void> {
    if (!suppressLoading) {
      this.loadingDetailState.set(true);
    }

    try {
      const project = await this.apiClient.projects.get(projectId);
      this.selectedProjectIdState.set(project.id);
      this.selectedProjectState.set(project);
    } catch (error) {
      if (!suppressErrors) {
        this.noticeService.setDanger(
          this.errorMessage(error, "Could not load the selected project.")
        );
      }
    } finally {
      if (!suppressLoading) {
        this.loadingDetailState.set(false);
      }
    }
  }

  async selectProject(project: ProjectSummary): Promise<void> {
    if (project.id === this.selectedProjectIdState()) {
      return;
    }

    await this.loadProjectDetail(project.id);
  }

  async createProject(payload: CreateProjectInput): Promise<boolean> {
    this.mutatingState.set(true);

    try {
      const project = await this.apiClient.projects.create(payload);
      this.noticeService.setSuccess("Project created.");
      await this.loadProjects({
        focusProjectId: project.id
      });
      return true;
    } catch (error) {
      this.noticeService.setDanger(
        this.errorMessage(error, "Could not create the project.")
      );
      return false;
    } finally {
      this.mutatingState.set(false);
    }
  }

  async updateSelectedProject(payload: UpdateProjectInput): Promise<boolean> {
    const projectId = this.selectedProjectIdState();

    if (!projectId) {
      return false;
    }

    this.mutatingState.set(true);

    try {
      await this.apiClient.projects.update(projectId, payload);
      this.noticeService.setSuccess("Project details updated.");
      await this.loadProjects({
        focusProjectId: projectId
      });
      return true;
    } catch (error) {
      this.noticeService.setDanger(
        this.errorMessage(error, "Could not update the project.")
      );
      return false;
    } finally {
      this.mutatingState.set(false);
    }
  }

  async deleteSelectedProject(): Promise<boolean> {
    const projectId = this.selectedProjectIdState();

    if (!projectId) {
      return false;
    }

    this.mutatingState.set(true);

    try {
      await this.apiClient.projects.remove(projectId);
      this.noticeService.setSuccess("Project removed.");
      await this.loadProjects({
        focusProjectId: null
      });
      return true;
    } catch (error) {
      this.noticeService.setDanger(
        this.errorMessage(error, "Could not delete the project.")
      );
      return false;
    } finally {
      this.mutatingState.set(false);
    }
  }

  async goToPage(nextPage: number): Promise<void> {
    const collection = this.collectionState();

    if (!collection || nextPage < 1 || nextPage > collection.totalPages) {
      return;
    }

    await this.loadProjects({
      page: nextPage
    });
  }

  async refreshCurrentProject(options?: {
    background?: boolean;
    suppressErrors?: boolean;
  }): Promise<void> {
    await this.loadProjects({
      focusProjectId: this.selectedProjectIdState(),
      ...(options?.background !== undefined
        ? {
            background: options.background
          }
        : {}),
      ...(options?.suppressErrors !== undefined
        ? {
            suppressErrors: options.suppressErrors
          }
        : {})
    });
  }

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}

import { Injectable, computed, effect, inject, signal } from "@angular/core";

import {
  assetKinds,
  assetLifecycleStatuses,
  type AssetKind,
  type AssetLifecycleStatus,
  type ProjectJobUpdateEvent,
  type ProjectAssetCollection
} from "@tip/types";

import { ApiClientService } from "../../core/http/api-client.service";
import { NoticeService } from "../../core/ui/notice.service";
import { applyRealtimeJobUpdateToAssets } from "../realtime/realtime-updates";
import { ProjectsWorkspaceService } from "../projects/projects-workspace.service";
import { saveDownloadedBlob } from "../../shared/utils/blob-download";

interface AssetFilters {
  query: string;
  page: number;
  pageSize: number;
  status: AssetLifecycleStatus | null;
  kind: AssetKind | null;
}

@Injectable({
  providedIn: "root"
})
export class AssetsWorkspaceService {
  private readonly apiClient = inject(ApiClientService);
  private readonly projectsWorkspaceService = inject(ProjectsWorkspaceService);
  private readonly noticeService = inject(NoticeService);

  private readonly collectionState = signal<ProjectAssetCollection | null>(null);
  private readonly loadingState = signal(false);
  private readonly mutatingState = signal(false);
  private readonly filtersState = signal<AssetFilters>({
    query: "",
    page: 1,
    pageSize: 6,
    status: null,
    kind: null
  });
  private readonly pendingUploadFileState = signal<File | null>(null);
  private readonly uploadKindState = signal<AssetKind>("image");
  private readonly uploadBusyState = signal(false);
  private readonly uploadProgressState = signal(0);
  private lastProjectId: string | null = null;

  readonly collection = computed(() => this.collectionState());
  readonly items = computed(() => this.collectionState()?.items ?? []);
  readonly isLoading = computed(() => this.loadingState());
  readonly isMutating = computed(() => this.mutatingState());
  readonly filters = computed(() => this.filtersState());
  readonly pendingUploadFile = computed(() => this.pendingUploadFileState());
  readonly uploadKind = computed(() => this.uploadKindState());
  readonly uploadBusy = computed(() => this.uploadBusyState());
  readonly uploadProgress = computed(() => this.uploadProgressState());
  readonly assetKinds = assetKinds;
  readonly lifecycleStatuses = assetLifecycleStatuses;

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
      this.clearPendingUpload();

      if (selectedProjectId) {
        void this.loadAssetsForSelectedProject({
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

    await this.loadAssetsForSelectedProject();
  }

  async loadAssetsForSelectedProject(options?: {
    query?: string;
    page?: number;
    pageSize?: number;
    status?: AssetLifecycleStatus | null;
    kind?: AssetKind | null;
    background?: boolean;
    suppressErrors?: boolean;
  }): Promise<void> {
    const selectedProjectId = this.projectsWorkspaceService.selectedProjectId();
    const background = options?.background === true;

    if (!selectedProjectId) {
      this.collectionState.set(null);
      return;
    }

    if (options?.query !== undefined) {
      this.filtersState.update((current) => ({
        ...current,
        query: options.query ?? "",
        page: 1
      }));
    }

    if (options?.status !== undefined) {
      this.filtersState.update((current) => ({
        ...current,
        status: options.status ?? null,
        page: 1
      }));
    }

    if (options?.kind !== undefined) {
      this.filtersState.update((current) => ({
        ...current,
        kind: options.kind ?? null,
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
      const filters = this.filtersState();
      const collection = await this.apiClient.assets.listByProject(
        selectedProjectId,
        filters
      );
      this.collectionState.set(collection);
    } catch (error) {
      if (!options?.suppressErrors) {
        this.noticeService.setDanger(
          this.errorMessage(error, "Could not load project assets.")
        );
      }
    } finally {
      if (!background) {
        this.loadingState.set(false);
      }
    }
  }

  rememberPendingUpload(file: File): void {
    this.pendingUploadFileState.set(file);
    this.uploadKindState.set(inferAssetKindFromFile(file));
    this.uploadProgressState.set(0);
    this.noticeService.setNeutral(
      "Upload staged. Submit it to persist the source object in storage."
    );
  }

  clearPendingUpload(): void {
    this.pendingUploadFileState.set(null);
    this.uploadProgressState.set(0);
  }

  setUploadKind(kind: AssetKind): void {
    this.uploadKindState.set(kind);
  }

  async createDraftAsset(payload: {
    originalFilename: string;
    contentType: string;
    byteSize: number;
    kind: AssetKind;
    status: AssetLifecycleStatus;
  }): Promise<boolean> {
    const projectId = this.projectsWorkspaceService.selectedProjectId();

    if (!projectId) {
      return false;
    }

    this.mutatingState.set(true);

    try {
      await this.apiClient.assets.createForProject(projectId, payload);
      this.noticeService.setSuccess(
        "Asset record created. Lifecycle state can now evolve independently."
      );
      await this.projectsWorkspaceService.refreshCurrentProject({
        background: true,
        suppressErrors: true
      });
      await this.loadAssetsForSelectedProject({
        page: 1
      });
      return true;
    } catch (error) {
      this.noticeService.setDanger(
        this.errorMessage(error, "Could not create the asset record.")
      );
      return false;
    } finally {
      this.mutatingState.set(false);
    }
  }

  async uploadPendingFile(): Promise<boolean> {
    const projectId = this.projectsWorkspaceService.selectedProjectId();
    const pendingUploadFile = this.pendingUploadFileState();

    if (!projectId || !pendingUploadFile || this.uploadBusyState()) {
      return false;
    }

    this.uploadBusyState.set(true);
    this.uploadProgressState.set(0);
    this.noticeService.setNeutral("Uploading source asset to object storage...");

    try {
      const asset = await this.apiClient.assets.uploadToProject(projectId, {
        file: pendingUploadFile,
        kind: this.uploadKindState(),
        onProgress: (progress) => {
          this.uploadProgressState.set(progress);
        }
      });

      this.clearPendingUpload();
      this.noticeService.setSuccess(
        `Uploaded ${asset.originalFilename} into storage and linked it to the selected project.`
      );
      await this.projectsWorkspaceService.refreshCurrentProject({
        background: true,
        suppressErrors: true
      });
      await this.loadAssetsForSelectedProject({
        page: 1
      });
      return true;
    } catch (error) {
      this.noticeService.setDanger(
        this.errorMessage(error, "Could not upload the selected asset.")
      );
      return false;
    } finally {
      this.uploadBusyState.set(false);
      if (!this.pendingUploadFileState()) {
        this.uploadProgressState.set(0);
      }
    }
  }

  async updateAssetStatus(
    assetId: string,
    status: AssetLifecycleStatus
  ): Promise<boolean> {
    const projectId = this.projectsWorkspaceService.selectedProjectId();

    if (!projectId) {
      return false;
    }

    this.mutatingState.set(true);

    try {
      await this.apiClient.assets.updateForProject(projectId, assetId, {
        status
      });
      this.noticeService.setSuccess("Asset lifecycle state updated.");
      await this.projectsWorkspaceService.refreshCurrentProject({
        background: true,
        suppressErrors: true
      });
      await this.loadAssetsForSelectedProject({
        background: true,
        suppressErrors: true
      });
      return true;
    } catch (error) {
      this.noticeService.setDanger(
        this.errorMessage(error, "Could not update the asset state.")
      );
      return false;
    } finally {
      this.mutatingState.set(false);
    }
  }

  applyRealtimeJobUpdate(event: ProjectJobUpdateEvent): void {
    this.collectionState.update((collection) =>
      applyRealtimeJobUpdateToAssets(collection, event)
    );
  }

  async downloadAsset(
    assetId: string,
    fallbackFilename: string
  ): Promise<boolean> {
    const projectId = this.projectsWorkspaceService.selectedProjectId();

    if (!projectId) {
      return false;
    }

    try {
      this.noticeService.setNeutral("Preparing the source download...");
      const result = await this.apiClient.assets.downloadFromProject(
        projectId,
        assetId
      );
      saveDownloadedBlob(
        result.blob,
        result.filename ?? fallbackFilename ?? "asset-download"
      );
      this.noticeService.setSuccess("Source download started in the browser.");
      return true;
    } catch (error) {
      this.noticeService.setDanger(
        this.errorMessage(error, "Could not download the stored asset.")
      );
      return false;
    }
  }

  async goToPage(nextPage: number): Promise<void> {
    const collection = this.collectionState();

    if (!collection || nextPage < 1 || nextPage > collection.totalPages) {
      return;
    }

    await this.loadAssetsForSelectedProject({
      page: nextPage
    });
  }

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}

function inferAssetKindFromFile(file: File): AssetKind {
  const contentType = (file.type || "").toLowerCase();

  if (contentType.startsWith("image/")) {
    return "image";
  }

  if (contentType.startsWith("audio/")) {
    return "audio";
  }

  if (contentType.startsWith("video/")) {
    return "video";
  }

  return "document";
}

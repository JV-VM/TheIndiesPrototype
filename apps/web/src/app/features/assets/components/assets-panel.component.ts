import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";

import { assetKinds, assetLifecycleStatuses, type AssetKind, type AssetLifecycleStatus } from "@tip/types";

import { ButtonComponent } from "../../../design-system/button/button.component";
import { CardComponent } from "../../../design-system/card/card.component";
import { EmptyStateComponent } from "../../../design-system/empty-state/empty-state.component";
import { LoadingStateComponent } from "../../../design-system/loading-state/loading-state.component";
import { StatusPillComponent } from "../../../design-system/status-pill/status-pill.component";
import {
  formatBytes,
  formatRelativeTime,
  formatTimestamp
} from "../../../shared/utils/formatting";
import { ProjectsWorkspaceService } from "../../projects/projects-workspace.service";
import { AssetsWorkspaceService } from "../assets-workspace.service";
import { JobsWorkspaceService } from "../../jobs/jobs-workspace.service";

@Component({
  selector: "tip-assets-panel",
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    StatusPillComponent
  ],
  template: `
    <tip-card class="panel">
      <div class="panel-header">
        <div>
          <span class="section-label">Phase 5 Assets</span>
          <h3>Asset inventory and upload flow</h3>
        </div>
        <tip-status-pill
          [label]="(assetsService.collection()?.totalItems || 0) + ' total'"
          tone="signal"
        />
      </div>

      @if (!projectsWorkspaceService.selectedProject()) {
        <tip-empty-state
          title="Select a project"
          description="Choose a workspace to manage its files, drafts, and processing history."
          actionLabel="Refresh library"
          (action)="refreshAssets()"
        />
      } @else {
        <form class="filter-form" [formGroup]="filterForm" (ngSubmit)="applyFilters()">
          <label>
            <span>Search assets</span>
            <input type="search" formControlName="query" placeholder="Search by filename" autocomplete="off" />
          </label>
          <label>
            <span>Status</span>
            <select formControlName="status">
              <option value="all">All statuses</option>
              @for (status of assetStatuses; track status) {
                <option [value]="status">{{ status }}</option>
              }
            </select>
          </label>
          <label>
            <span>Kind</span>
            <select formControlName="kind">
              <option value="all">All kinds</option>
              @for (kind of assetKindsList; track kind) {
                <option [value]="kind">{{ kind }}</option>
              }
            </select>
          </label>
          <tip-button variant="secondary" buttonType="submit">Filter assets</tip-button>
        </form>

        <div
          class="upload-dropzone"
          [attr.data-drag]="dragActive()"
          (dragenter)="handleDragEnter($event)"
          (dragover)="handleDragOver($event)"
          (dragleave)="handleDragLeave($event)"
          (drop)="handleDrop($event)"
        >
          <input
            #fileInput
            class="visually-hidden"
            type="file"
            accept=".gif,.jpeg,.jpg,.json,.md,.mov,.mp3,.mp4,.ogg,.pdf,.png,.svg,.txt,.wav,.webm,.webp"
            (change)="handleFileInput($event)"
          />
          <p>
            Drop one supported file here or
            <button class="inline-picker" type="button" (click)="fileInput.click()">browse from disk</button>.
          </p>
          <p class="muted-note">Supports image, audio, video, and document files up to 25 MB.</p>

          @if (assetsService.pendingUploadFile(); as pendingFile) {
            <div class="upload-meta">
              <span class="code-pill">{{ pendingFile.name }}</span>
              <span class="code-pill">{{ pendingFile.type || 'application/octet-stream' }}</span>
              <span class="code-pill">{{ formatBytes(pendingFile.size) }}</span>
            </div>
          }
        </div>

        <div class="upload-actions">
          <label>
            <span>Asset kind</span>
            <select
              [ngModel]="assetsService.uploadKind()"
              (ngModelChange)="setUploadKind($event)"
              [ngModelOptions]="{ standalone: true }"
            >
              @for (kind of assetKindsList; track kind) {
                <option [value]="kind">{{ kind }}</option>
              }
            </select>
          </label>
          <tip-button
            [disabled]="!assetsService.pendingUploadFile() || assetsService.uploadBusy()"
            (click)="uploadPendingFile()"
          >
            {{ assetsService.uploadBusy() ? 'Uploading ' + assetsService.uploadProgress() + '%' : assetsService.pendingUploadFile() ? 'Upload source asset' : 'Choose a file first' }}
          </tip-button>
        </div>

        @if (assetsService.uploadBusy() || assetsService.uploadProgress() > 0) {
          <div class="upload-progress">
            <div class="upload-progress-bar">
              <span [style.width.%]="Math.max(assetsService.uploadProgress(), 6)"></span>
            </div>
            <p class="muted-note">
              {{ assetsService.uploadBusy() ? 'Uploading ' + assetsService.uploadProgress() + '%' : 'Upload ready.' }}
            </p>
          </div>
        }

        <form class="draft-form" [formGroup]="draftForm" (ngSubmit)="createDraft()">
          <div class="subsection-head">
            <div>
              <strong>Create draft asset</strong>
              <p>Add metadata first when the real source file is not ready yet.</p>
            </div>
            <tip-status-pill label="draft" tone="warning" />
          </div>
          <div class="draft-grid">
            <label>
              <span>Filename</span>
              <input type="text" formControlName="originalFilename" placeholder="cover-art.png" autocomplete="off" />
            </label>
            <label>
              <span>Content type</span>
              <input type="text" formControlName="contentType" placeholder="image/png" autocomplete="off" />
            </label>
            <label>
              <span>Size in bytes</span>
              <input type="number" formControlName="byteSize" min="0" step="1" />
            </label>
            <label>
              <span>Kind</span>
              <select formControlName="kind">
                @for (kind of assetKindsList; track kind) {
                  <option [value]="kind">{{ kind }}</option>
                }
              </select>
            </label>
            <label>
              <span>Initial status</span>
              <select formControlName="status">
                @for (status of assetStatuses; track status) {
                  <option [value]="status">{{ status }}</option>
                }
              </select>
            </label>
          </div>
          <tip-button [disabled]="assetsService.isMutating() || draftForm.invalid" buttonType="submit">
            Add draft asset
          </tip-button>
        </form>

        @if (assetsService.isLoading() && assetsService.items().length === 0) {
          <tip-loading-state
            title="Loading asset inventory"
            description="The workspace is pulling stored sources, draft records, and lifecycle state for the selected project."
          />
        } @else if (assetsService.items().length > 0) {
          <div class="asset-list">
            @for (asset of assetsService.items(); track asset.id) {
              <article class="asset-row">
                <div class="asset-head">
                  <div>
                    <strong>{{ asset.originalFilename }}</strong>
                    <p>{{ asset.contentType }} • {{ asset.kind }} • {{ formatBytes(asset.byteSize) }}</p>
                  </div>
                  <tip-status-pill [label]="asset.status" tone="signal" />
                </div>
                <p class="muted-note">
                  @if (asset.objectKey) {
                    Stored source: <span class="code-pill">{{ asset.objectKey }}</span>
                  } @else {
                    Metadata-only draft. Upload a file when you are ready to process it.
                  }
                </p>
                <p class="muted-note">
                  Updated {{ formatTimestamp(asset.updatedAt) }} • {{ formatRelativeTime(asset.updatedAt) }}
                </p>
                <div class="asset-actions">
                  <label>
                    <span>Status</span>
                    <select #statusSelect [ngModel]="asset.status" [ngModelOptions]="{ standalone: true }">
                      @for (status of assetStatuses; track status) {
                        <option [value]="status">{{ status }}</option>
                      }
                    </select>
                  </label>
                  <tip-button
                    variant="ghost"
                    [disabled]="assetsService.isMutating()"
                    (click)="updateAssetStatus(asset.id, statusSelect.value)"
                  >
                    Apply status
                  </tip-button>
                  @if (asset.objectKey && asset.kind === 'image') {
                    <tip-button
                      variant="ghost"
                      [disabled]="jobsService.isMutating() || asset.status === 'queued' || asset.status === 'processing'"
                      (click)="processAsset(asset.id)"
                    >
                      Generate thumbnail
                    </tip-button>
                  }
                  @if (asset.objectKey) {
                    <tip-button variant="ghost" (click)="downloadAsset(asset.id, asset.originalFilename)">
                      Download source
                    </tip-button>
                  }
                </div>
              </article>
            }
          </div>

          @if (assetsService.collection(); as collection) {
            <div class="pagination-row">
              <tip-button
                variant="ghost"
                [disabled]="collection.page <= 1 || assetsService.isLoading()"
                (click)="previousPage()"
              >
                Previous
              </tip-button>
              <p>Page {{ collection.page }} of {{ collection.totalPages }}</p>
              <tip-button
                variant="ghost"
                [disabled]="collection.page >= collection.totalPages || assetsService.isLoading()"
                (click)="nextPage()"
              >
                Next
              </tip-button>
            </div>
          }
        } @else {
          <tip-empty-state
            title="No assets yet"
            description="Upload a source file or add a quick draft record to start the pipeline."
            actionLabel="Refresh inventory"
            (action)="refreshAssets()"
          />
        }
      }
    </tip-card>
  `,
  styleUrl: "./assets-panel.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssetsPanelComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly projectsWorkspaceService = inject(ProjectsWorkspaceService);
  protected readonly assetsService = inject(AssetsWorkspaceService);
  protected readonly jobsService = inject(JobsWorkspaceService);
  protected readonly Math = Math;
  protected readonly formatBytes = formatBytes;
  protected readonly formatRelativeTime = formatRelativeTime;
  protected readonly formatTimestamp = formatTimestamp;
  protected readonly dragActive = signal(false);
  protected readonly assetKindsList = assetKinds;
  protected readonly assetStatuses = assetLifecycleStatuses;
  protected readonly filterForm = this.formBuilder.nonNullable.group({
    query: [""],
    status: ["all"],
    kind: ["all"]
  });
  protected readonly draftForm = this.formBuilder.nonNullable.group({
    originalFilename: ["", [Validators.required]],
    contentType: ["", [Validators.required]],
    byteSize: [0, [Validators.required, Validators.min(0)]],
    kind: ["image" as AssetKind],
    status: ["draft" as AssetLifecycleStatus]
  });

  async ngOnInit(): Promise<void> {
    await this.assetsService.ensureLoadedForSelectedProject();
    const filters = this.assetsService.filters();
    this.filterForm.patchValue(
      {
        query: filters.query,
        status: filters.status ?? "all",
        kind: filters.kind ?? "all"
      },
      {
        emitEvent: false
      }
    );
  }

  protected async applyFilters(): Promise<void> {
    const values = this.filterForm.getRawValue();
    await this.assetsService.loadAssetsForSelectedProject({
      query: values.query.trim(),
      status: normalizeAssetStatus(values.status),
      kind: normalizeAssetKind(values.kind)
    });
  }

  protected async refreshAssets(): Promise<void> {
    await this.assetsService.loadAssetsForSelectedProject();
  }

  protected handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      return;
    }

    this.assetsService.rememberPendingUpload(file);
  }

  protected setUploadKind(kind: AssetKind): void {
    this.assetsService.setUploadKind(kind);
  }

  protected handleDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(true);
  }

  protected handleDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.dragActive()) {
      this.dragActive.set(true);
    }
  }

  protected handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
  }

  protected handleDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    const file = event.dataTransfer?.files?.[0];

    if (!file) {
      return;
    }

    this.assetsService.rememberPendingUpload(file);
  }

  protected async uploadPendingFile(): Promise<void> {
    await this.assetsService.uploadPendingFile();
  }

  protected async createDraft(): Promise<void> {
    if (this.draftForm.invalid) {
      this.draftForm.markAllAsTouched();
      return;
    }

    const created = await this.assetsService.createDraftAsset(
      this.draftForm.getRawValue()
    );

    if (created) {
      this.draftForm.reset({
        originalFilename: "",
        contentType: "",
        byteSize: 0,
        kind: "image",
        status: "draft"
      });
    }
  }

  protected async updateAssetStatus(
    assetId: string,
    status: string
  ): Promise<void> {
    await this.assetsService.updateAssetStatus(
      assetId,
      status as AssetLifecycleStatus
    );
  }

  protected async processAsset(assetId: string): Promise<void> {
    const queued = await this.jobsService.queueAssetProcessing(assetId);

    if (queued) {
      await this.router.navigateByUrl("/jobs");
    }
  }

  protected async downloadAsset(
    assetId: string,
    fallbackFilename: string
  ): Promise<void> {
    await this.assetsService.downloadAsset(assetId, fallbackFilename);
  }

  protected async previousPage(): Promise<void> {
    const currentPage = this.assetsService.collection()?.page ?? 1;
    await this.assetsService.goToPage(currentPage - 1);
  }

  protected async nextPage(): Promise<void> {
    const currentPage = this.assetsService.collection()?.page ?? 1;
    await this.assetsService.goToPage(currentPage + 1);
  }
}

function normalizeAssetStatus(
  value: string
): AssetLifecycleStatus | null {
  return value === "all" || value === "" ? null : (value as AssetLifecycleStatus);
}

function normalizeAssetKind(value: string): AssetKind | null {
  return value === "all" || value === "" ? null : (value as AssetKind);
}

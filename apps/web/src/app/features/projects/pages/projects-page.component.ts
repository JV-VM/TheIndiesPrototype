import { ChangeDetectionStrategy, Component, OnInit, effect, inject } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";

import { NoticeBannerComponent } from "../../../shared/components/notice-banner.component";
import { AssetsPanelComponent } from "../../assets/components/assets-panel.component";
import { ButtonComponent } from "../../../design-system/button/button.component";
import { CardComponent } from "../../../design-system/card/card.component";
import { EmptyStateComponent } from "../../../design-system/empty-state/empty-state.component";
import { LoadingStateComponent } from "../../../design-system/loading-state/loading-state.component";
import { PageHeaderComponent } from "../../../design-system/page-header/page-header.component";
import { StatusPillComponent } from "../../../design-system/status-pill/status-pill.component";
import { ProjectsWorkspaceService } from "../projects-workspace.service";

@Component({
  selector: "tip-projects-page",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NoticeBannerComponent,
    AssetsPanelComponent,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    StatusPillComponent
  ],
  template: `
    <div class="projects-page">
      <tip-page-header
        eyebrow="Projects workspace"
        title="Inspect seeded projects, asset context, and the entry point into processing."
        description="This view exposes the live project inventory behind the protected shell. Use it to inspect how project scope anchors assets, queue handoff, and downstream workflow state."
      >
        <tip-status-pill
          [label]="workspaceService.totalProjects() + ' projects in scope'"
          tone="signal"
        />
      </tip-page-header>

      <tip-notice-banner />

      <section class="projects-layout">
        <tip-card class="panel">
          <div class="panel-header">
            <div>
              <span class="section-label">Project inventory</span>
              <h3>Project inventory</h3>
            </div>
            <tip-button
              variant="ghost"
              [disabled]="workspaceService.isLoadingList()"
              (click)="refreshProjects()"
            >
              Refresh
            </tip-button>
          </div>

          <form class="filter-form" [formGroup]="filterForm" (ngSubmit)="applyFilters()">
            <label>
              <span>Search projects</span>
              <input
                type="text"
                formControlName="query"
                placeholder="Demo Workspace"
                autocomplete="off"
              />
            </label>
            <tip-button
              variant="secondary"
              [disabled]="workspaceService.isLoadingList()"
              buttonType="submit"
            >
              Apply filters
            </tip-button>
          </form>

          @if (workspaceService.isLoadingList() && workspaceService.projects().length === 0) {
            <tip-loading-state
              title="Loading project library"
              description="The workspace inventory is being restored so project-scoped assets and jobs can be inspected."
            />
          } @else if (workspaceService.projects().length > 0) {
            <div class="project-list">
              @for (project of workspaceService.projects(); track project.id) {
                <button
                  class="project-list-item"
                  type="button"
                  [attr.data-active]="workspaceService.selectedProjectId() === project.id"
                  (click)="selectProject(project.id)"
                >
                  <div>
                    <strong>{{ project.name }}</strong>
                    <p>{{ project.description || 'No description yet.' }}</p>
                  </div>
                  <span>{{ project.assetCount }} assets</span>
                </button>
              }
            </div>

            @if (workspaceService.collection(); as collection) {
              <div class="pagination-row">
                <tip-button
                  variant="ghost"
                  [disabled]="collection.page <= 1 || workspaceService.isLoadingList()"
                  (click)="previousPage()"
                >
                  Previous
                </tip-button>
                <p>Page {{ collection.page }} of {{ collection.totalPages }}</p>
                <tip-button
                  variant="ghost"
                  [disabled]="collection.page >= collection.totalPages || workspaceService.isLoadingList()"
                  (click)="nextPage()"
                >
                  Next
                </tip-button>
              </div>
            }
          } @else {
            <tip-empty-state
              title="No projects yet"
              description="Create the first project here to establish the scope that assets, jobs, and realtime delivery attach to."
              actionLabel="Create first project"
              (action)="focusCreateNameField()"
            />
          }
        </tip-card>

        <div class="detail-column">
          <tip-card class="panel">
            <div class="panel-header">
              <div>
                <span class="section-label">Create project</span>
                <h3>Add a new workspace entry</h3>
              </div>
            </div>

            <form class="stack-form" [formGroup]="createForm" (ngSubmit)="createProject()">
              <label>
                <span>Name</span>
                <input #createNameInput type="text" formControlName="name" autocomplete="off" />
              </label>
              <label>
                <span>Description</span>
                <textarea formControlName="description" rows="4"></textarea>
              </label>
              <tip-button [disabled]="workspaceService.isMutating() || createForm.invalid" buttonType="submit">
                {{ workspaceService.isMutating() ? 'Creating...' : 'Create project' }}
              </tip-button>
            </form>
          </tip-card>

          <tip-card class="panel">
            <div class="panel-header">
              <div>
                <span class="section-label">Selected project</span>
                <h3>{{ workspaceService.selectedProject()?.name || 'Choose a project' }}</h3>
              </div>
              @if (workspaceService.selectedProject(); as selectedProject) {
                <tip-status-pill
                  [label]="selectedProject.assetCount + ' assets tracked'"
                  tone="success"
                />
              }
            </div>

            @if (workspaceService.isLoadingDetail() && !workspaceService.selectedProject()) {
              <tip-loading-state
                title="Loading project detail"
                description="Project metadata is being synchronized so asset inventory and queue activity can load against the current selection."
              />
            } @else if (workspaceService.selectedProject()) {
              <form class="stack-form" [formGroup]="editForm" (ngSubmit)="updateProject()">
                <label>
                  <span>Name</span>
                  <input type="text" formControlName="name" autocomplete="off" />
                </label>
                <label>
                  <span>Description</span>
                  <textarea formControlName="description" rows="5"></textarea>
                </label>
                <div class="action-row">
                  <tip-button
                    [disabled]="workspaceService.isMutating() || editForm.invalid"
                    buttonType="submit"
                  >
                    Save changes
                  </tip-button>
                  <tip-button
                    variant="ghost"
                    [disabled]="workspaceService.isMutating()"
                    (click)="deleteProject()"
                  >
                    Delete project
                  </tip-button>
                </div>
              </form>
            } @else {
              <tip-empty-state
                title="No project selected"
                description="Pick a project from the list to inspect its metadata, assets, and queue entry points."
                actionLabel="Refresh library"
                (action)="refreshProjects()"
              />
            }
          </tip-card>

          <tip-assets-panel />
        </div>
      </section>
    </div>
  `,
  styleUrl: "./projects-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectsPageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly workspaceService = inject(ProjectsWorkspaceService);
  protected readonly filterForm = this.formBuilder.nonNullable.group({
    query: [""]
  });
  protected readonly createForm = this.formBuilder.nonNullable.group({
    name: ["", [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    description: ["", [Validators.maxLength(500)]]
  });
  protected readonly editForm = this.formBuilder.nonNullable.group({
    name: ["", [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    description: ["", [Validators.maxLength(500)]]
  });

  constructor() {
    effect(() => {
      const selectedProject = this.workspaceService.selectedProject();

      if (!selectedProject) {
        this.editForm.reset({
          name: "",
          description: ""
        });
        return;
      }

      this.editForm.reset(
        {
          name: selectedProject.name,
          description: selectedProject.description ?? ""
        },
        {
          emitEvent: false
        }
      );
    });

    effect(() => {
      this.filterForm.patchValue(
        {
          query: this.workspaceService.filters().query
        },
        {
          emitEvent: false
        }
      );
    });
  }

  async ngOnInit(): Promise<void> {
    await this.workspaceService.ensureLoaded();
  }

  protected async applyFilters(): Promise<void> {
    await this.workspaceService.loadProjects({
      query: this.filterForm.getRawValue().query.trim()
    });
  }

  protected async refreshProjects(): Promise<void> {
    await this.workspaceService.loadProjects();
  }

  protected async selectProject(projectId: string): Promise<void> {
    const project = this.workspaceService
      .projects()
      .find((candidate) => candidate.id === projectId);

    if (!project) {
      return;
    }

    await this.workspaceService.selectProject(project);
  }

  protected async createProject(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const created = await this.workspaceService.createProject({
      name: this.createForm.getRawValue().name.trim(),
      description: normalizeDescription(this.createForm.getRawValue().description)
    });

    if (created) {
      this.createForm.reset({
        name: "",
        description: ""
      });
    }
  }

  protected async updateProject(): Promise<void> {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    await this.workspaceService.updateSelectedProject({
      name: this.editForm.getRawValue().name.trim(),
      description: normalizeDescription(this.editForm.getRawValue().description)
    });
  }

  protected async deleteProject(): Promise<void> {
    if (!window.confirm("Delete this project from the current account?")) {
      return;
    }

    await this.workspaceService.deleteSelectedProject();
  }

  protected async previousPage(): Promise<void> {
    const currentPage = this.workspaceService.collection()?.page ?? 1;
    await this.workspaceService.goToPage(currentPage - 1);
  }

  protected async nextPage(): Promise<void> {
    const currentPage = this.workspaceService.collection()?.page ?? 1;
    await this.workspaceService.goToPage(currentPage + 1);
  }

  protected focusCreateNameField(): void {
    queueMicrotask(() => {
      const element = document.querySelector<HTMLInputElement>(
        "input[formcontrolname='name']"
      );
      element?.focus();
    });
  }
}

function normalizeDescription(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

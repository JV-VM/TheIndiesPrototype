import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { NgFor } from "@angular/common";
import { RouterLink, RouterLinkActive } from "@angular/router";

import { ProjectsWorkspaceService } from "../../features/projects/projects-workspace.service";

interface NavigationItem {
  label: string;
  route: string;
  phase: string;
}

interface ModuleTrackItem {
  label: string;
  status: string;
}

@Component({
  selector: "tip-shell-sidebar",
  standalone: true,
  imports: [NgFor, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="brand-block">
        <span class="eyebrow">Angular Foundation</span>
        <h1>TIP</h1>
        <p>
          Phase 0 and Phase 1 establish the frontend shell, design tokens, and
          reusable UI primitives without breaking the current workspace flow.
        </p>
      </div>

      <nav class="nav-list" aria-label="Foundation navigation">
        <a
          *ngFor="let item of navigationItems"
          class="nav-item"
          [routerLink]="item.route"
          routerLinkActive="nav-item-active"
        >
          <span>{{ item.label }}</span>
          <small>{{ item.phase }}</small>
        </a>
      </nav>

      <section class="track-panel">
        <div class="track-header">
          <span class="mini-label">Module Track</span>
          <span class="mini-pill">{{ workspaceService.totalProjects() }} projects</span>
        </div>
        <div class="track-grid">
          <article *ngFor="let item of moduleTrack" class="track-card">
            <strong>{{ item.label }}</strong>
            <p>{{ item.status }}</p>
          </article>
        </div>
      </section>
    </aside>
  `,
  styleUrl: "./shell-sidebar.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellSidebarComponent {
  protected readonly workspaceService = inject(ProjectsWorkspaceService);
  protected readonly navigationItems: NavigationItem[] = [
    {
      label: "Dashboard",
      route: "/dashboard",
      phase: "Operational summary"
    },
    {
      label: "Projects",
      route: "/projects",
      phase: "Workspace CRUD"
    },
    {
      label: "Queue",
      route: "/jobs",
      phase: "Live processing"
    }
  ];

  protected readonly moduleTrack: ModuleTrackItem[] = [
    {
      label: "app-shell",
      status: "Active in Angular foundation"
    },
    {
      label: "auth",
      status: "Migrates in Phase 3"
    },
    {
      label: "projects",
      status: "Integrated in Angular"
    },
    {
      label: "assets",
      status: "Integrated in Angular"
    },
    {
      label: "jobs",
      status: "Integrated in Angular"
    },
    {
      label: "realtime",
      status: "Integrated in Angular"
    }
  ];
}

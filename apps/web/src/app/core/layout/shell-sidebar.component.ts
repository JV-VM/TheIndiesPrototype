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
        <span class="eyebrow">Processing workspace</span>
        <h1>TIP</h1>
        <p>
          This protected shell is the operational view for projects, assets, jobs,
          realtime delivery, and processed output retrieval.
        </p>
      </div>

      <nav class="nav-list" aria-label="Workspace navigation">
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
          <span class="mini-label">System map</span>
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
      phase: "Architecture summary"
    },
    {
      label: "Projects",
      route: "/projects",
      phase: "Assets and metadata"
    },
    {
      label: "Queue",
      route: "/jobs",
      phase: "Jobs and delivery"
    }
  ];

  protected readonly moduleTrack: ModuleTrackItem[] = [
    {
      label: "auth",
      status: "Protected routes and session recovery active"
    },
    {
      label: "projects",
      status: "Scoped CRUD and workspace selection live"
    },
    {
      label: "assets",
      status: "Upload, metadata, and source retrieval live"
    },
    {
      label: "jobs",
      status: "Queue state, retries, and outputs visible"
    },
    {
      label: "realtime",
      status: "Socket sync and fallback delivery active"
    },
    {
      label: "storage",
      status: "Persistent object storage wired behind API"
    }
  ];
}

import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject
} from "@angular/core";
import { RouterOutlet } from "@angular/router";

import {
  FRONTEND_RUNTIME_CONFIG,
  FrontendRuntimeConfig
} from "../config/runtime-config";
import { ProjectsWorkspaceService } from "../../features/projects/projects-workspace.service";
import { RealtimeWorkspaceService } from "../../features/realtime/realtime-workspace.service";
import { ShellSidebarComponent } from "./shell-sidebar.component";
import { ShellTopbarComponent } from "./shell-topbar.component";

@Component({
  selector: "tip-app-shell",
  standalone: true,
  imports: [RouterOutlet, ShellSidebarComponent, ShellTopbarComponent],
  template: `
    <div class="shell-frame">
      <tip-shell-sidebar />
      <main class="shell-main">
        <tip-shell-topbar
          [apiBaseUrl]="runtimeConfig.apiBaseUrl"
          [wsBaseUrl]="runtimeConfig.wsBaseUrl"
        />
        <section class="shell-content">
          <router-outlet></router-outlet>
        </section>
      </main>
    </div>
  `,
  styleUrl: "./app-shell.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent implements OnInit {
  protected readonly runtimeConfig: FrontendRuntimeConfig = inject(
    FRONTEND_RUNTIME_CONFIG
  );
  private readonly workspaceService = inject(ProjectsWorkspaceService);
  private readonly realtimeService = inject(RealtimeWorkspaceService);

  async ngOnInit(): Promise<void> {
    await this.workspaceService.ensureLoaded();
    this.realtimeService.initialize();
    this.realtimeService.syncWithSession();
  }
}

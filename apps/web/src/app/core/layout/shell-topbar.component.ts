import { ChangeDetectionStrategy, Component, inject, input } from "@angular/core";
import { NgFor } from "@angular/common";

import { AuthService } from "../auth/auth.service";
import { ButtonComponent } from "../../design-system/button/button.component";
import { RealtimeWorkspaceService } from "../../features/realtime/realtime-workspace.service";

interface SignalChip {
  label: string;
  value: string;
}

@Component({
  selector: "tip-shell-topbar",
  standalone: true,
  imports: [NgFor, ButtonComponent],
  template: `
    <header class="topbar">
      <div class="headline-row">
        <div class="copy-block">
          <span class="phase-chip">Demo workspace</span>
          <div>
            <h2>Inspect the protected workflow across auth, ingestion, jobs, realtime, and storage</h2>
            <p>
              This shell is the live product surface behind the public landing page,
              not a mock walkthrough. Use it to inspect how the system behaves after login.
            </p>
          </div>
        </div>
        <div class="user-actions">
          <span class="user-pill">{{ authService.user()?.email }}</span>
          <tip-button variant="ghost" (click)="logout()">Sign Out</tip-button>
        </div>
      </div>

      <div class="signal-list" aria-label="Runtime integration points">
        <article *ngFor="let chip of signalChips" class="signal-chip">
          <strong>{{ chip.label }}</strong>
          <span>{{ chip.value }}</span>
        </article>
      </div>
    </header>
  `,
  styleUrl: "./shell-topbar.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellTopbarComponent {
  protected readonly authService = inject(AuthService);
  protected readonly realtimeService = inject(RealtimeWorkspaceService);
  readonly apiBaseUrl = input.required<string>();
  readonly wsBaseUrl = input.required<string>();

  protected get signalChips(): SignalChip[] {
    return [
      {
        label: "Public entry",
        value: "/"
      },
      {
        label: "API base",
        value: this.apiBaseUrl()
      },
      {
        label: "Realtime",
        value: `${this.realtimeService.statusLabel()} (${this.realtimeService.statusValue()})`
      },
      {
        label: "Notifications",
        value: String(this.realtimeService.notifications().length)
      },
      {
        label: "Workspace route",
        value: "/dashboard"
      }
    ];
  }

  protected async logout(): Promise<void> {
    await this.authService.logout();
  }
}

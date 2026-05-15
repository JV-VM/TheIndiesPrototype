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
          <span class="phase-chip">Phases 0 to 10</span>
          <div>
            <h2>Angular workspace integrated across auth, assets, jobs, and realtime</h2>
            <p>
              The protected shell now owns the core creator workflow while the
              legacy root flow stays available during the migration window.
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
        label: "Legacy workspace",
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
        label: "Migration route",
        value: "/frontend-foundation"
      }
    ];
  }

  protected async logout(): Promise<void> {
    await this.authService.logout();
  }
}

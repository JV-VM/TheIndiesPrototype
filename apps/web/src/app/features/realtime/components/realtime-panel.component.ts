import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

import { CardComponent } from "../../../design-system/card/card.component";
import { EmptyStateComponent } from "../../../design-system/empty-state/empty-state.component";
import { StatusPillComponent } from "../../../design-system/status-pill/status-pill.component";
import { formatRelativeTime, formatTimestamp } from "../../../shared/utils/formatting";
import { RealtimeWorkspaceService } from "../realtime-workspace.service";

@Component({
  selector: "tip-realtime-panel",
  standalone: true,
  imports: [CardComponent, EmptyStateComponent, StatusPillComponent],
  template: `
    <tip-card class="panel" variant="signal">
      <div class="panel-header">
        <div>
          <span class="section-label">Live Delivery</span>
          <h3>Socket status and project notifications</h3>
        </div>
        <tip-status-pill [label]="realtimeService.statusLabel()" tone="signal" />
      </div>

      <div class="status-grid">
        <div class="status-chip">
          <strong>Status</strong>
          <span>{{ realtimeService.statusValue() }}</span>
        </div>
        <div class="status-chip">
          <strong>Fallback</strong>
          <span>
            {{
              realtimeService.fallbackActive()
                ? 'Polling ' + Math.round(realtimeService.fallbackPollIntervalMs() / 1000) + 's'
                : 'Socket only'
            }}
          </span>
        </div>
        <div class="status-chip">
          <strong>Subscription</strong>
          <span>{{ realtimeService.subscribedProjectId() || 'All projects' }}</span>
        </div>
      </div>

      <p class="muted-note">
        Socket <span class="code-pill">{{ realtimeService.buildSocketUrl() }}</span>
        • Connection <span class="code-pill">{{ realtimeService.connectionId() || 'pending' }}</span>
      </p>
      <p class="muted-note">
        Last signal:
        {{ realtimeService.lastEventLabel() }}
        @if (realtimeService.lastEventAt()) {
          • {{ formatTimestamp(realtimeService.lastEventAt()) }}
        }
      </p>

      @if (realtimeService.notifications().length > 0) {
        <div class="notification-stack">
          @for (notification of realtimeService.notifications(); track notification.id) {
            <article class="notification-card">
              <div class="notification-head">
                <div>
                  <strong>{{ notification.title }}</strong>
                  <p>{{ notification.message }}</p>
                </div>
                <tip-status-pill
                  [label]="notification.level"
                  [tone]="notification.level === 'danger' ? 'warning' : notification.level === 'success' ? 'success' : 'signal'"
                />
              </div>
              <small>
                {{ formatTimestamp(notification.occurredAt) }} •
                {{ formatRelativeTime(notification.occurredAt) }}
              </small>
            </article>
          }
        </div>
      } @else {
        <tip-empty-state
          title="No activity yet"
          description="Completion and failure notices will appear here as jobs move through the queue."
          actionLabel="Wait for events"
        />
      }
    </tip-card>
  `,
  styleUrl: "./realtime-panel.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RealtimePanelComponent {
  protected readonly realtimeService = inject(RealtimeWorkspaceService);
  protected readonly Math = Math;
  protected readonly formatRelativeTime = formatRelativeTime;
  protected readonly formatTimestamp = formatTimestamp;
}

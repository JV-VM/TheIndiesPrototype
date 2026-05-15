import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NgClass } from "@angular/common";

type StatusTone = "neutral" | "success" | "signal" | "warning";

@Component({
  selector: "tip-status-pill",
  standalone: true,
  imports: [NgClass],
  template: `
    <span class="status-pill" [ngClass]="tone()">
      <span class="dot"></span>
      {{ label() }}
    </span>
  `,
  styleUrl: "./status-pill.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusPillComponent {
  readonly label = input.required<string>();
  readonly tone = input<StatusTone>("neutral");
}

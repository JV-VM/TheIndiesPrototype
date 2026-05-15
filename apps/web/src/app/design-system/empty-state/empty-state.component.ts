import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  input
} from "@angular/core";

import { ButtonComponent } from "../button/button.component";

@Component({
  selector: "tip-empty-state",
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <section class="empty-state">
      <strong>{{ title() }}</strong>
      <p>{{ description() }}</p>
      <tip-button variant="secondary" (click)="action.emit()">
        {{ actionLabel() }}
      </tip-button>
    </section>
  `,
  styleUrl: "./empty-state.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input("Plan next phase");

  @Output() readonly action = new EventEmitter<void>();
}

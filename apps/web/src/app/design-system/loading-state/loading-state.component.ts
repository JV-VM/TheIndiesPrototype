import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NgFor } from "@angular/common";

@Component({
  selector: "tip-loading-state",
  standalone: true,
  imports: [NgFor],
  template: `
    <section class="loading-state" aria-live="polite" aria-busy="true">
      <div class="loading-copy">
        <strong>{{ title() }}</strong>
        <p>{{ description() }}</p>
      </div>

      <div class="loading-lines">
        <span *ngFor="let width of lineWidths()" [style.width.%]="width"></span>
      </div>
    </section>
  `,
  styleUrl: "./loading-state.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingStateComponent {
  readonly title = input("Loading workspace state");
  readonly description = input("The client is synchronizing protected project data.");
  readonly lineWidths = input([100, 84, 72]);
}

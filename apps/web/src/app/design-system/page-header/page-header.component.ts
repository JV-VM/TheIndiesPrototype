import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
  selector: "tip-page-header",
  standalone: true,
  template: `
    <header class="page-header">
      <span class="eyebrow">{{ eyebrow() }}</span>
      <div class="copy-block">
        <h1>{{ title() }}</h1>
        <p>{{ description() }}</p>
      </div>
      <div class="actions">
        <ng-content />
      </div>
    </header>
  `,
  styleUrl: "./page-header.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}

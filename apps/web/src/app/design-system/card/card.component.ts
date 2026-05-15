import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NgClass } from "@angular/common";

type CardVariant = "default" | "accent" | "signal";

@Component({
  selector: "tip-card",
  standalone: true,
  imports: [NgClass],
  template: `
    <article class="tip-card" [ngClass]="variant()">
      <ng-content />
    </article>
  `,
  styleUrl: "./card.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardComponent {
  readonly variant = input<CardVariant>("default");
}

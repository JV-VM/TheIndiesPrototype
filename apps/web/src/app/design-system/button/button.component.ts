import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { NgClass } from "@angular/common";

type ButtonVariant = "primary" | "secondary" | "ghost";

@Component({
  selector: "tip-button",
  standalone: true,
  imports: [NgClass],
  template: `
    <button
      class="tip-button"
      [ngClass]="variant()"
      [disabled]="disabled()"
      [type]="buttonType()"
    >
      <ng-content />
    </button>
  `,
  styleUrl: "./button.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>("primary");
  readonly disabled = input(false);
  readonly buttonType = input<"button" | "submit" | "reset">("button");
}

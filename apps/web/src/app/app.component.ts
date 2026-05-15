import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

@Component({
  selector: "tip-root",
  standalone: true,
  imports: [RouterOutlet],
  template: "<router-outlet></router-outlet>",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {}

import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";

import { AuthService } from "../../../core/auth/auth.service";
import { ApiError } from "../../../core/http/api-error";
import { NoticeService } from "../../../core/ui/notice.service";
import { ButtonComponent } from "../../../design-system/button/button.component";
import { CardComponent } from "../../../design-system/card/card.component";
import { NoticeBannerComponent } from "../../../shared/components/notice-banner.component";

@Component({
  selector: "tip-auth-page",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    NoticeBannerComponent
  ],
  template: `
    <main class="auth-shell">
      <section class="hero-panel">
        <span class="eyebrow">Phase 3 Auth Integration</span>
        <h1>Restore sessions, protect routes, and enter the workspace with the real API.</h1>
        <p>
          The Angular frontend now uses the existing register, login, refresh,
          logout, and profile routes. Refresh cookies stay server-owned, while
          access tokens recover the workspace without a manual reload.
        </p>

        <div class="hero-grid">
          <article class="hero-stat">
            <strong>Auth boundary</strong>
            <p>Route guards keep the shell private until session recovery finishes.</p>
          </article>
          <article class="hero-stat">
            <strong>Session model</strong>
            <p>Short-lived access token plus rotating refresh cookie, matching the current backend design.</p>
          </article>
          <article class="hero-stat">
            <strong>Next slice</strong>
            <p>Projects load immediately after successful authentication inside the protected shell.</p>
          </article>
        </div>
      </section>

      <tip-card class="auth-card" variant="accent">
        <div class="auth-card-copy">
          <span class="mini-label">Workspace Access</span>
          <h2>{{ mode() === 'signin' ? 'Sign in' : 'Create an account' }}</h2>
          <p>Use the live API. Passwords must have at least eight characters.</p>
        </div>

        <div class="mode-switch">
          <button
            class="mode-button"
            type="button"
            [attr.data-active]="mode() === 'signin'"
            (click)="setMode('signin')"
          >
            Sign In
          </button>
          <button
            class="mode-button"
            type="button"
            [attr.data-active]="mode() === 'signup'"
            (click)="setMode('signup')"
          >
            Register
          </button>
        </div>

        <tip-notice-banner />

        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
          <label>
            <span>Email</span>
            <input type="email" formControlName="email" autocomplete="email" />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              formControlName="password"
              [attr.autocomplete]="mode() === 'signup' ? 'new-password' : 'current-password'"
            />
          </label>

          <tip-button [disabled]="busy() || form.invalid" buttonType="submit">
            {{ busy() ? 'Working...' : mode() === 'signin' ? 'Sign In And Enter' : 'Register And Enter' }}
          </tip-button>
        </form>
      </tip-card>
    </main>
  `,
  styleUrl: "./auth-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly noticeService = inject(NoticeService);
  private readonly router = inject(Router);

  protected readonly mode = signal<"signin" | "signup">("signin");
  protected readonly busy = signal(false);
  protected readonly form = this.formBuilder.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]]
  });

  protected setMode(mode: "signin" | "signup"): void {
    this.mode.set(mode);
    this.noticeService.clear();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.noticeService.setNeutral("Submitting credentials...");

    try {
      const payload = this.form.getRawValue();

      if (this.mode() === "signin") {
        await this.authService.login(payload);
      } else {
        await this.authService.register(payload);
      }

      await this.router.navigateByUrl("/dashboard");
    } catch (error) {
      this.noticeService.setDanger(this.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message;
    }

    return error instanceof Error ? error.message : "Authentication failed.";
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";

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
    RouterLink,
    ButtonComponent,
    CardComponent,
    NoticeBannerComponent
  ],
  template: `
    <main class="auth-shell">
      <section class="hero-panel">
        <span class="eyebrow">Manual sign in</span>
        <h1>Use credentials only if you need a non-demo path.</h1>
        <p>
          The preferred reviewer flow is still the seeded demo workspace. This page exists for
          manual access against the live auth API when you want to inspect the standard sign-in
          path directly.
        </p>

        <div class="hero-grid">
          <article class="hero-stat">
            <strong>Same backend</strong>
            <p>Login, refresh, logout, and profile recovery run against the deployed API.</p>
          </article>
          <article class="hero-stat">
            <strong>Session model</strong>
            <p>Short-lived access tokens pair with rotating refresh cookies for shell recovery.</p>
          </article>
          <article class="hero-stat">
            <strong>Demo first</strong>
            <p>If you only want the product walkthrough, go back and enter demo mode instead.</p>
          </article>
        </div>
      </section>

      <tip-card class="auth-card" variant="accent">
        <div class="auth-card-copy">
          <span class="mini-label">Workspace Access</span>
          <h2>Sign in</h2>
          <p>Use the live API, or skip the form and open the seeded demo workspace directly.</p>
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
              autocomplete="current-password"
            />
          </label>

          <tip-button [disabled]="busy() || form.invalid" buttonType="submit">
            {{ busy() ? 'Working...' : 'Sign in and enter' }}
          </tip-button>

          <tip-button variant="secondary" [disabled]="busy()" buttonType="button" (click)="openDemoWorkspace()">
            {{ busy() ? 'Opening...' : 'Enter demo mode' }}
          </tip-button>

          <a class="back-link" routerLink="/">Back to public page</a>
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

  protected readonly busy = signal(false);
  protected readonly form = this.formBuilder.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]]
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.noticeService.setNeutral("Submitting credentials...");

    try {
      const payload = this.form.getRawValue();
      await this.authService.login(payload);
      await this.router.navigateByUrl("/dashboard");
    } catch (error) {
      this.noticeService.setDanger(this.errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async openDemoWorkspace(): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    this.noticeService.setNeutral("Opening the seeded demo workspace...");

    try {
      await this.authService.openDemoWorkspace();
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

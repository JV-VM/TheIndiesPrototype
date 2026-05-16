import { Injectable, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";

import type { AuthSessionPayload, AuthUser } from "@tip/types";

import { ApiClientService } from "../http/api-client.service";
import { ApiError } from "../http/api-error";
import { NoticeService } from "../ui/notice.service";
import { ProjectsWorkspaceService } from "../../features/projects/projects-workspace.service";
import { TokenStorageService } from "./token-storage.service";

type AuthBootstrapState =
  | "booting"
  | "restoring"
  | "authenticated"
  | "signed-out";

interface AuthCredentials {
  email: string;
  password: string;
}

const DEMO_CREDENTIALS: AuthCredentials = {
  email: "demo@theindiesprototype.local",
  password: "Prototype123!"
};

@Injectable({
  providedIn: "root"
})
export class AuthService {
  private readonly apiClient = inject(ApiClientService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly noticeService = inject(NoticeService);
  private readonly router = inject(Router);
  private readonly projectsWorkspaceService = inject(ProjectsWorkspaceService);

  private readonly accessTokenState = signal<string | null>(
    this.tokenStorage.read()
  );
  private readonly userState = signal<AuthUser | null>(null);
  private readonly statusState = signal<AuthBootstrapState>("booting");
  private readonly accessTokenExpiresAtState = signal<string | null>(null);
  private restorePromise: Promise<void> | null = null;
  private refreshPromise: Promise<AuthSessionPayload | null> | null = null;

  readonly accessToken = computed(() => this.accessTokenState());
  readonly user = computed(() => this.userState());
  readonly status = computed(() => this.statusState());
  readonly isAuthenticated = computed(() => this.userState() !== null);
  readonly isReady = computed(() => this.statusState() !== "booting");
  readonly accessTokenExpiresAt = computed(() =>
    this.accessTokenExpiresAtState()
  );

  async ensureSessionRestored(): Promise<void> {
    if (this.restorePromise) {
      return this.restorePromise;
    }

    this.statusState.set("restoring");
    this.restorePromise = this.restoreSession()
      .catch(() => undefined)
      .finally(() => {
        this.restorePromise = null;
      });

    return this.restorePromise;
  }

  async login(credentials: AuthCredentials): Promise<void> {
    const payload = await this.apiClient.auth.login(credentials);
    this.applySession(payload);
    this.noticeService.setSuccess("Signed in. Workspace access is active.");
  }

  async register(credentials: AuthCredentials): Promise<void> {
    const payload = await this.apiClient.auth.register(credentials);
    this.applySession(payload);
    this.noticeService.setSuccess("Account created. Workspace access is active.");
  }

  async openDemoWorkspace(): Promise<void> {
    const payload = await this.apiClient.auth.login(DEMO_CREDENTIALS);
    this.applySession(payload);
    this.noticeService.setSuccess("Demo workspace opened.");
  }

  async logout(options?: { redirectToAuth?: boolean }): Promise<void> {
    try {
      await this.apiClient.auth.logout();
    } catch {
      // Keep logout idempotent from the client perspective.
    }

    this.clearSession();
    this.noticeService.setNeutral("Session closed.");

    if (options?.redirectToAuth !== false) {
      await this.router.navigateByUrl("/auth");
    }
  }

  async tryRefreshSession(): Promise<boolean> {
    const payload = await this.refreshSession();
    return payload !== null;
  }

  async handleUnauthorized(): Promise<void> {
    this.clearSession();
    this.noticeService.setNeutral("Session expired. Sign in again to continue.");
    await this.router.navigateByUrl("/auth");
  }

  private async restoreSession(): Promise<void> {
    const storedToken = this.accessTokenState();

    try {
      if (storedToken) {
        try {
          const payload = await this.apiClient.auth.me();
          this.userState.set(payload.user);
          this.statusState.set("authenticated");
          this.noticeService.setSuccess("Recovered the previous session.");
          return;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) {
            throw error;
          }
        }
      }

      const refreshedSession = await this.refreshSession();

      if (!refreshedSession) {
        this.clearSession();
        this.noticeService.setNeutral(
          "Sign in or register to enter the workspace shell."
        );
      }
    } catch (error) {
      this.clearSession();
      if (error instanceof Error) {
        this.noticeService.setDanger(error.message);
      }
    }
  }

  private async refreshSession(): Promise<AuthSessionPayload | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.apiClient.auth
      .refresh()
      .then((payload) => {
        this.applySession(payload);
        return payload;
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          this.clearSession();
          return null;
        }

        throw error;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  private applySession(payload: AuthSessionPayload): void {
    this.accessTokenState.set(payload.accessToken);
    this.accessTokenExpiresAtState.set(payload.accessTokenExpiresAt);
    this.userState.set(payload.user);
    this.statusState.set("authenticated");
    this.tokenStorage.write(payload.accessToken);
  }

  private clearSession(): void {
    this.projectsWorkspaceService.reset();
    this.accessTokenState.set(null);
    this.accessTokenExpiresAtState.set(null);
    this.userState.set(null);
    this.statusState.set("signed-out");
    this.tokenStorage.write(null);
  }
}

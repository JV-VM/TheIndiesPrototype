import { Injectable, computed, effect, inject, signal } from "@angular/core";

import { realtimeRoutes } from "@tip/contracts";
import type {
  ProjectRealtimeEvent,
  RealtimeServerMessage
} from "@tip/types";

import { AuthService } from "../../core/auth/auth.service";
import { FRONTEND_RUNTIME_CONFIG } from "../../core/config/runtime-config";
import { NoticeService } from "../../core/ui/notice.service";
import { AssetsWorkspaceService } from "../assets/assets-workspace.service";
import { JobsWorkspaceService } from "../jobs/jobs-workspace.service";
import { ProjectsWorkspaceService } from "../projects/projects-workspace.service";

type RealtimeStatus =
  | "idle"
  | "connecting"
  | "authenticating"
  | "connected"
  | "reconnecting";

interface WorkspaceNotification {
  id: string;
  level: "info" | "success" | "danger";
  title: string;
  message: string;
  occurredAt: string;
}

@Injectable({
  providedIn: "root"
})
export class RealtimeWorkspaceService {
  private readonly authService = inject(AuthService);
  private readonly projectsWorkspaceService = inject(ProjectsWorkspaceService);
  private readonly assetsWorkspaceService = inject(AssetsWorkspaceService);
  private readonly jobsWorkspaceService = inject(JobsWorkspaceService);
  private readonly runtimeConfig = inject(FRONTEND_RUNTIME_CONFIG);
  private readonly noticeService = inject(NoticeService);

  private readonly statusState = signal<RealtimeStatus>("idle");
  private readonly connectionIdState = signal<string | null>(null);
  private readonly authenticatedState = signal(false);
  private readonly subscribedProjectIdState = signal<string | null>(null);
  private readonly fallbackActiveState = signal(false);
  private readonly fallbackPollIntervalMsState = signal(5_000);
  private readonly lastEventLabelState = signal("Realtime idle.");
  private readonly lastEventAtState = signal<string | null>(null);
  private readonly notificationsState = signal<WorkspaceNotification[]>([]);
  private readonly initializedState = signal(false);
  private socket: WebSocket | null = null;
  private reconnectTimerId: number | null = null;
  private fallbackTimerId: number | null = null;
  private resyncTimerId: number | null = null;
  private reconnectAttempt = 0;
  private authRefreshing = false;

  readonly status = computed(() => this.statusState());
  readonly connectionId = computed(() => this.connectionIdState());
  readonly subscribedProjectId = computed(() => this.subscribedProjectIdState());
  readonly fallbackActive = computed(() => this.fallbackActiveState());
  readonly fallbackPollIntervalMs = computed(() =>
    this.fallbackPollIntervalMsState()
  );
  readonly lastEventLabel = computed(() => this.lastEventLabelState());
  readonly lastEventAt = computed(() => this.lastEventAtState());
  readonly notifications = computed(() => this.notificationsState());

  constructor() {
    effect(() => {
      if (!this.initializedState()) {
        return;
      }

      void this.authService.isAuthenticated();
      void this.authService.accessToken();
      void this.projectsWorkspaceService.selectedProjectId();
      this.syncWithSession();
    });
  }

  initialize(): void {
    if (this.initializedState()) {
      this.syncWithSession();
      return;
    }

    this.initializedState.set(true);
    this.syncWithSession();
  }

  reset(): void {
    this.disconnect("idle");
    this.notificationsState.set([]);
    this.lastEventLabelState.set("Realtime idle.");
    this.lastEventAtState.set(null);
  }

  syncWithSession(): void {
    if (!this.initializedState()) {
      return;
    }

    const accessToken = this.authService.accessToken();
    const projectId = this.projectsWorkspaceService.selectedProjectId();

    if (!this.authService.isAuthenticated() || !accessToken) {
      this.reset();
      return;
    }

    if (
      this.socket &&
      this.socket.readyState === WebSocket.OPEN &&
      this.authenticatedState()
    ) {
      if (this.subscribedProjectIdState() !== projectId) {
        this.sendMessage({
          type: "subscribe_project",
          projectId
        });
      }
      return;
    }

    if (
      this.socket &&
      this.socket.readyState === WebSocket.OPEN &&
      !this.authenticatedState()
    ) {
      this.statusState.set("authenticating");
      this.sendMessage({
        type: "authenticate",
        accessToken,
        projectId
      });
      return;
    }

    this.ensureConnection();
  }

  statusValue(): string {
    if (this.fallbackActiveState()) {
      return "poll";
    }

    switch (this.statusState()) {
      case "connected":
        return "live";
      case "authenticating":
        return "auth";
      case "connecting":
        return "dial";
      case "reconnecting":
        return "retry";
      default:
        return "idle";
    }
  }

  statusLabel(): string {
    if (this.fallbackActiveState() && this.statusState() !== "connected") {
      return "Polling fallback active";
    }

    switch (this.statusState()) {
      case "connected":
        return "Socket live";
      case "authenticating":
        return "Authenticating socket";
      case "connecting":
        return "Connecting socket";
      case "reconnecting":
        return "Reconnecting socket";
      default:
        return "Realtime idle";
    }
  }

  buildSocketUrl(): string {
    return `${this.runtimeConfig.wsBaseUrl}${realtimeRoutes.socket}`;
  }

  private ensureConnection(): void {
    const accessToken = this.authService.accessToken();

    if (!this.authService.isAuthenticated() || !accessToken) {
      return;
    }

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.clearReconnectTimer();

    const socket = new WebSocket(this.buildSocketUrl());
    this.socket = socket;
    this.statusState.set(
      this.reconnectAttempt > 0 ? "reconnecting" : "connecting"
    );
    this.lastEventLabelState.set(
      `Opening realtime socket at ${this.buildSocketUrl()}.`
    );

    socket.addEventListener("open", () => {
      if (this.socket !== socket) {
        return;
      }

      this.statusState.set("authenticating");
      this.authenticatedState.set(false);
      this.sendMessage({
        type: "authenticate",
        accessToken,
        projectId: this.projectsWorkspaceService.selectedProjectId()
      });
    });

    socket.addEventListener("message", (event) => {
      void this.handleMessage(event.data);
    });

    socket.addEventListener("close", () => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = null;
      this.connectionIdState.set(null);
      this.authenticatedState.set(false);
      this.subscribedProjectIdState.set(null);

      if (!this.authService.isAuthenticated()) {
        this.statusState.set("idle");
        this.stopFallbackPolling();
        return;
      }

      this.startFallbackPolling();
      this.scheduleReconnect("Realtime connection closed unexpectedly.");
    });

    socket.addEventListener("error", () => {
      this.lastEventLabelState.set(
        "Realtime transport reported a socket error. Reconnect flow is active."
      );
    });
  }

  private async handleMessage(rawData: unknown): Promise<void> {
    if (typeof rawData !== "string") {
      return;
    }

    let message: RealtimeServerMessage;

    try {
      message = JSON.parse(rawData) as RealtimeServerMessage;
    } catch {
      return;
    }

    switch (message.type) {
      case "ready":
        this.connectionIdState.set(message.connectionId);
        this.lastEventLabelState.set(
          "Socket opened. Waiting for authentication to finish."
        );
        return;
      case "authenticated":
        this.statusState.set("connected");
        this.authenticatedState.set(true);
        this.reconnectAttempt = 0;
        this.lastEventLabelState.set("Realtime session authenticated.");
        return;
      case "subscribed":
        this.statusState.set("connected");
        this.subscribedProjectIdState.set(message.projectId ?? null);
        this.fallbackPollIntervalMsState.set(
          message.fallbackPollIntervalMs ?? this.fallbackPollIntervalMsState()
        );
        this.stopFallbackPolling();
        this.noticeService.setSuccess(
          message.projectId
            ? "Realtime subscription restored for the selected project."
            : "Realtime subscription restored across the workspace."
        );
        this.scheduleResync("Realtime subscription synchronized.");
        return;
      case "event":
        this.recordEvent(message.event);

        if (message.event.type === "job.updated") {
          this.assetsWorkspaceService.applyRealtimeJobUpdate(message.event);
          this.jobsWorkspaceService.applyRealtimeJobUpdate(message.event);
        } else {
          this.publishNotice(message.event.level, message.event.message);
        }

        if (message.event.refreshProjectState) {
          this.scheduleResync(this.summarizeEvent(message.event));
        }
        return;
      case "error":
        if (message.code === "invalid_access_token") {
          await this.recoverAuthentication();
          return;
        }

        this.lastEventLabelState.set(message.message);

        if (!message.recoverable) {
          this.noticeService.setDanger(message.message);
        }

        this.startFallbackPolling();
        return;
      case "pong":
        return;
    }
  }

  private async recoverAuthentication(): Promise<void> {
    if (this.authRefreshing) {
      return;
    }

    this.authRefreshing = true;

    try {
      const recovered = await this.authService.tryRefreshSession();

      if (!recovered) {
        await this.authService.handleUnauthorized();
        this.reset();
        return;
      }

      this.syncWithSession();
    } finally {
      this.authRefreshing = false;
    }
  }

  private recordEvent(event: ProjectRealtimeEvent): void {
    this.lastEventAtState.set(event.occurredAt);
    this.lastEventLabelState.set(this.summarizeEvent(event));

    if (event.type === "notification.created") {
      this.notificationsState.update((current) =>
        [
          {
            id: event.eventId,
            level: event.level,
            title: event.title,
            message: event.message,
            occurredAt: event.occurredAt
          },
          ...current
        ].slice(0, 6)
      );
      return;
    }

    if (event.jobStatus === "completed") {
      this.publishNotice("success", this.summarizeEvent(event));
      return;
    }

    if (event.jobStatus === "failed") {
      this.publishNotice("danger", this.summarizeEvent(event));
    }
  }

  private summarizeEvent(event: ProjectRealtimeEvent): string {
    if (event.type === "notification.created") {
      return `${event.title}: ${event.message}`;
    }

    if (event.jobStatus === "active") {
      return `Job ${event.jobId} is processing ${event.assetId}.`;
    }

    if (event.jobStatus === "completed") {
      return `Job ${event.jobId} completed successfully.`;
    }

    if (event.jobStatus === "failed") {
      return `Job ${event.jobId} failed: ${event.failureReason ?? "Unknown worker failure."}`;
    }

    return `Job ${event.jobId} returned to the queue.`;
  }

  private startFallbackPolling(): void {
    if (
      !this.authService.isAuthenticated() ||
      this.fallbackTimerId !== null ||
      !this.projectsWorkspaceService.selectedProjectId()
    ) {
      return;
    }

    this.fallbackActiveState.set(true);
    this.noticeService.setNeutral(
      "Realtime socket unavailable. Polling fallback is keeping the workspace synchronized."
    );
    this.fallbackTimerId = window.setInterval(() => {
      if (
        !this.authService.isAuthenticated() ||
        !this.projectsWorkspaceService.selectedProjectId() ||
        this.projectsWorkspaceService.isLoadingList() ||
        this.assetsWorkspaceService.isLoading() ||
        this.jobsWorkspaceService.isLoading() ||
        this.assetsWorkspaceService.uploadBusy()
      ) {
        return;
      }

      void this.refreshWorkspaceState(true);
    }, this.fallbackPollIntervalMsState());
  }

  private stopFallbackPolling(): void {
    this.clearFallbackTimer();
    this.fallbackActiveState.set(false);
  }

  private scheduleReconnect(reason: string): void {
    if (!this.authService.isAuthenticated() || this.reconnectTimerId !== null) {
      return;
    }

    this.reconnectAttempt += 1;
    const attempt = this.reconnectAttempt;
    const delayMs = Math.min(1_000 * 2 ** (attempt - 1), 10_000);
    this.statusState.set("reconnecting");
    this.lastEventLabelState.set(
      `${reason} Reconnect attempt ${attempt} in ${Math.round(delayMs / 1000)}s.`
    );

    this.reconnectTimerId = window.setTimeout(() => {
      this.reconnectTimerId = null;
      this.ensureConnection();
    }, delayMs);
  }

  private scheduleResync(reason: string): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.lastEventLabelState.set(reason);
    this.clearResyncTimer();
    this.resyncTimerId = window.setTimeout(() => {
      this.resyncTimerId = null;
      void this.refreshWorkspaceState(true);
    }, 240);
  }

  private async refreshWorkspaceState(background: boolean): Promise<void> {
    await this.projectsWorkspaceService.refreshCurrentProject({
      background,
      suppressErrors: true
    });
    await Promise.all([
      this.assetsWorkspaceService.loadAssetsForSelectedProject({
        background,
        suppressErrors: true
      }),
      this.jobsWorkspaceService.loadJobsForSelectedProject({
        background,
        suppressErrors: true
      })
    ]);
  }

  private sendMessage(message: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(message));
  }

  private disconnect(nextStatus: RealtimeStatus): void {
    const socket = this.socket;

    this.clearReconnectTimer();
    this.clearFallbackTimer();
    this.clearResyncTimer();

    this.socket = null;
    this.statusState.set(nextStatus);
    this.connectionIdState.set(null);
    this.authenticatedState.set(false);
    this.subscribedProjectIdState.set(null);
    this.fallbackActiveState.set(false);
    this.reconnectAttempt = 0;

    if (
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    ) {
      socket.close(1000, "client_shutdown");
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimerId !== null) {
      window.clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }
  }

  private clearFallbackTimer(): void {
    if (this.fallbackTimerId !== null) {
      window.clearInterval(this.fallbackTimerId);
      this.fallbackTimerId = null;
    }
  }

  private clearResyncTimer(): void {
    if (this.resyncTimerId !== null) {
      window.clearTimeout(this.resyncTimerId);
      this.resyncTimerId = null;
    }
  }

  private publishNotice(
    level: "info" | "success" | "danger",
    message: string
  ): void {
    if (level === "danger") {
      this.noticeService.setDanger(message);
      return;
    }

    if (level === "success") {
      this.noticeService.setSuccess(message);
      return;
    }

    this.noticeService.setNeutral(message);
  }
}

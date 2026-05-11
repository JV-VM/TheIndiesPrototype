import { eventRuntimeModuleSource } from "./browser/runtime/events.js";
import { actionsRuntimeModuleSource } from "./browser/runtime/actions.js";
import { realtimeRuntimeModuleSource } from "./browser/runtime/realtime.js";
import { sessionRuntimeModuleSource } from "./browser/runtime/session.js";
import { sharedRuntimeModuleSource } from "./browser/runtime/shared.js";
import { shellViewModuleSource } from "./browser/views/shell.js";
import { workspaceViewModuleSource } from "./browser/views/workspace.js";

interface WebAppConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
}

interface FeatureCard {
  label: string;
  responsibility: string;
  nextPhase: string;
}

interface BrowserScriptConfig extends WebAppConfig {
  featureCards: FeatureCard[];
}

export function renderBrowserScript(config: BrowserScriptConfig): string {
  return `
    import {
      assetKinds,
      assetLifecycleStatuses,
      createApiClient,
      jobLifecycleStatuses,
      realtimeRoutes
    } from "/api-client.js";

    const config = ${JSON.stringify({
      apiBaseUrl: config.apiBaseUrl,
      wsBaseUrl: config.wsBaseUrl
    })};
    const featureCards = ${JSON.stringify(config.featureCards)};
    const storageKey = "tip.access_token";
    const apiClient = createApiClient(config);
    const state = {
      accessToken: localStorage.getItem(storageKey),
      user: null,
      authMode: "signin",
      activeSection: "overview",
      busy: false,
      message: "Restoring session...",
      messageTone: "neutral",
      infrastructure: null,
      projectsBusy: false,
      projects: null,
      projectsQuery: "",
      projectsQueryDraft: "",
      projectsPage: 1,
      projectsPageSize: 6,
      selectedProjectId: null,
      selectedProject: null,
      projectEditDraftProjectId: null,
      projectEditDraftName: "",
      projectEditDraftDescription: "",
      assetsBusy: false,
      assets: null,
      assetQuery: "",
      assetQueryDraft: "",
      assetStatus: "all",
      assetStatusDraft: "all",
      assetKind: "all",
      assetKindDraft: "all",
      assetItemStatusDrafts: {},
      assetCreateDraftOriginalFilename: "",
      assetCreateDraftContentType: "",
      assetCreateDraftByteSize: "0",
      assetCreateDraftKind: "image",
      assetCreateDraftStatus: "draft",
      assetPage: 1,
      assetPageSize: 6,
      jobsBusy: false,
      jobs: null,
      jobsStatus: "all",
      jobsStatusDraft: "all",
      jobsPage: 1,
      jobsPageSize: 6,
      uploadBusy: false,
      uploadProgress: 0,
      uploadKind: "image",
      pendingUploadFile: null,
      uploadDragActive: false,
      realtimeSocket: null,
      realtimeStatus: "idle",
      realtimeConnectionId: null,
      realtimeAuthenticated: false,
      realtimeProjectId: null,
      realtimeFallbackPollIntervalMs: 5_000,
      realtimeFallbackActive: false,
      realtimeReconnectAttempt: 0,
      realtimeReconnectTimerId: null,
      realtimeFallbackTimerId: null,
      realtimeResyncTimerId: null,
      realtimeAuthRefreshing: false,
      realtimeLastEventAt: null,
      realtimeLastEventLabel: "Waiting for the realtime session to come online.",
      notifications: []
    };

    const appElement = document.getElementById("app");
    let renderedMarkup = "";
    let renderFrameId = null;

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    function findClosestTarget(event, selector) {
      return event.target instanceof Element ? event.target.closest(selector) : null;
    }

    function readViewportSnapshot() {
      return {
        scrollX: window.scrollX,
        scrollY: window.scrollY
      };
    }

    function restoreViewportSnapshot(snapshot) {
      const maxScrollY = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );

      window.scrollTo({
        left: snapshot.scrollX,
        top: Math.min(snapshot.scrollY, maxScrollY)
      });
    }

    function setMessage(message, tone = "neutral") {
      state.message = message;
      state.messageTone = tone;
    }

${sharedRuntimeModuleSource}
${realtimeRuntimeModuleSource}
${sessionRuntimeModuleSource}
${actionsRuntimeModuleSource}
${workspaceViewModuleSource}
${shellViewModuleSource}
${eventRuntimeModuleSource}
  `;
}

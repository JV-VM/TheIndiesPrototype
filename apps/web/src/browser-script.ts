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
      projectsPage: 1,
      projectsPageSize: 6,
      selectedProjectId: null,
      selectedProject: null,
      assetsBusy: false,
      assets: null,
      assetQuery: "",
      assetStatus: "all",
      assetKind: "all",
      assetPage: 1,
      assetPageSize: 6,
      jobsBusy: false,
      jobs: null,
      jobsStatus: "all",
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

    function persistToken(token) {
      state.accessToken = token;

      if (token) {
        localStorage.setItem(storageKey, token);
        return;
      }

      localStorage.removeItem(storageKey);
    }

    function clearWorkspaceState() {
      state.projects = null;
      state.selectedProjectId = null;
      state.selectedProject = null;
      state.assets = null;
      state.jobs = null;
      state.projectsPage = 1;
      state.assetPage = 1;
      state.jobsPage = 1;
      clearPendingUpload();
    }

    function errorMessage(error, fallback) {
      return error instanceof Error ? error.message : fallback;
    }

    function errorStatus(error) {
      if (!error || typeof error !== "object" || !("status" in error)) {
        return null;
      }

      return Number(error.status);
    }

    function normalizeFilterValue(value) {
      return value === "all" || value === "" ? null : value;
    }

    function formatDate(value) {
      return new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value));
    }

    function formatBytes(byteSize) {
      return new Intl.NumberFormat("en").format(byteSize) + " bytes";
    }

    function inferAssetKindFromFile(file) {
      const contentType = (file.type || "").toLowerCase();

      if (contentType.startsWith("image/")) {
        return "image";
      }

      if (contentType.startsWith("audio/")) {
        return "audio";
      }

      if (contentType.startsWith("video/")) {
        return "video";
      }

      return "document";
    }

    function clearPendingUpload() {
      state.pendingUploadFile = null;
      state.uploadProgress = 0;
      state.uploadDragActive = false;
    }

    function rememberPendingUpload(file) {
      state.pendingUploadFile = file;
      state.uploadKind = inferAssetKindFromFile(file);
      state.uploadProgress = 0;
      state.uploadDragActive = false;
    }

    function saveDownloadedBlob(blob, filename) {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    }

    function countLifecycleCoverage(counts) {
      return assetLifecycleStatuses.filter((status) => counts[status] > 0).length;
    }

    function buildRealtimeSocketUrl() {
      return \`\${config.wsBaseUrl}\${realtimeRoutes.socket}\`;
    }

    function clearRealtimeReconnectTimer() {
      if (state.realtimeReconnectTimerId !== null) {
        window.clearTimeout(state.realtimeReconnectTimerId);
        state.realtimeReconnectTimerId = null;
      }
    }

    function clearRealtimeFallbackTimer() {
      if (state.realtimeFallbackTimerId !== null) {
        window.clearInterval(state.realtimeFallbackTimerId);
        state.realtimeFallbackTimerId = null;
      }
    }

    function clearRealtimeResyncTimer() {
      if (state.realtimeResyncTimerId !== null) {
        window.clearTimeout(state.realtimeResyncTimerId);
        state.realtimeResyncTimerId = null;
      }
    }

    function disconnectRealtime(nextStatus = "idle") {
      const socket = state.realtimeSocket;

      clearRealtimeReconnectTimer();
      clearRealtimeFallbackTimer();
      clearRealtimeResyncTimer();

      state.realtimeSocket = null;
      state.realtimeStatus = nextStatus;
      state.realtimeConnectionId = null;
      state.realtimeAuthenticated = false;
      state.realtimeProjectId = null;
      state.realtimeFallbackActive = false;
      state.realtimeReconnectAttempt = 0;

      if (
        socket &&
        (socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING)
      ) {
        socket.close(1000, "client_shutdown");
      }
    }

    function pushNotification(notification) {
      state.notifications = [notification, ...state.notifications].slice(0, 6);
    }

    function realtimeStatusValue() {
      if (state.realtimeFallbackActive) {
        return "poll";
      }

      switch (state.realtimeStatus) {
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

    function realtimeStatusLabel() {
      if (state.realtimeFallbackActive && state.realtimeStatus !== "connected") {
        return "Polling fallback active";
      }

      switch (state.realtimeStatus) {
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

    function summarizeRealtimeEvent(event) {
      if (event.type === "notification.created") {
        return \`\${event.title}: \${event.message}\`;
      }

      if (event.jobStatus === "active") {
        return \`Job \${event.jobId} is processing \${event.assetId}.\`;
      }

      if (event.jobStatus === "completed") {
        return \`Job \${event.jobId} completed successfully.\`;
      }

      if (event.jobStatus === "failed") {
        return \`Job \${event.jobId} failed: \${event.failureReason ?? "Unknown worker failure."}\`;
      }

      return \`Job \${event.jobId} returned to the queue.\`;
    }

    function startFallbackPolling() {
      if (
        !state.user ||
        state.realtimeFallbackTimerId !== null ||
        !state.selectedProjectId
      ) {
        return;
      }

      state.realtimeFallbackActive = true;
      state.realtimeFallbackTimerId = window.setInterval(() => {
        if (
          !state.user ||
          !state.selectedProjectId ||
          state.projectsBusy ||
          state.assetsBusy ||
          state.jobsBusy ||
          state.uploadBusy
        ) {
          return;
        }

        void loadProjects({
          focusProjectId: state.selectedProjectId,
          background: true
        });
      }, state.realtimeFallbackPollIntervalMs);
    }

    function stopFallbackPolling() {
      clearRealtimeFallbackTimer();
      state.realtimeFallbackActive = false;
    }

    function scheduleRealtimeReconnect(reason) {
      if (!state.user || state.realtimeReconnectTimerId !== null) {
        return;
      }

      state.realtimeReconnectAttempt += 1;
      const attempt = state.realtimeReconnectAttempt;
      const delayMs = Math.min(1_000 * 2 ** (attempt - 1), 10_000);
      state.realtimeStatus = "reconnecting";
      state.realtimeLastEventLabel = \`\${reason} Reconnect attempt \${attempt} in \${Math.round(delayMs / 1000)}s.\`;
      render();

      state.realtimeReconnectTimerId = window.setTimeout(() => {
        state.realtimeReconnectTimerId = null;
        ensureRealtimeConnection();
      }, delayMs);
    }

    function scheduleRealtimeResync(reason) {
      if (!state.user) {
        return;
      }

      state.realtimeLastEventLabel = reason;
      clearRealtimeResyncTimer();
      state.realtimeResyncTimerId = window.setTimeout(() => {
        state.realtimeResyncTimerId = null;

        void loadProjects({
          focusProjectId: state.selectedProjectId,
          background: true
        });
      }, 240);
    }

    function sendRealtimeMessage(message) {
      if (
        !state.realtimeSocket ||
        state.realtimeSocket.readyState !== WebSocket.OPEN
      ) {
        return;
      }

      state.realtimeSocket.send(JSON.stringify(message));
    }

    async function recoverRealtimeAuthentication() {
      if (state.realtimeAuthRefreshing) {
        return;
      }

      state.realtimeAuthRefreshing = true;

      try {
        await refreshSession();
        syncRealtimeAuthentication();
      } catch {
        disconnectRealtime("idle");
        handleSignedOutState("Session expired. Sign in again to continue.");
      } finally {
        state.realtimeAuthRefreshing = false;
        render();
      }
    }

    async function handleRealtimeMessage(rawData) {
      if (typeof rawData !== "string") {
        return;
      }

      let message;

      try {
        message = JSON.parse(rawData);
      } catch {
        return;
      }

      switch (message.type) {
        case "ready":
          state.realtimeConnectionId = message.connectionId;
          state.realtimeLastEventLabel = "Socket opened. Waiting for authentication to finish.";
          render();
          return;
        case "authenticated":
          state.realtimeStatus = "connected";
          state.realtimeAuthenticated = true;
          state.realtimeReconnectAttempt = 0;
          state.realtimeLastEventLabel = "Realtime session authenticated.";
          render();
          return;
        case "subscribed":
          state.realtimeStatus = "connected";
          state.realtimeProjectId = message.projectId ?? null;
          state.realtimeFallbackPollIntervalMs =
            message.fallbackPollIntervalMs ?? state.realtimeFallbackPollIntervalMs;
          stopFallbackPolling();
          scheduleRealtimeResync("Realtime subscription synchronized.");
          render();
          return;
        case "event":
          state.realtimeLastEventAt = message.event.occurredAt;
          state.realtimeLastEventLabel = summarizeRealtimeEvent(message.event);

          if (message.event.type === "notification.created") {
            pushNotification({
              id: message.event.eventId,
              level: message.event.level,
              title: message.event.title,
              message: message.event.message,
              occurredAt: message.event.occurredAt
            });
          }

          if (message.event.refreshProjectState) {
            scheduleRealtimeResync(state.realtimeLastEventLabel);
          }

          render();
          return;
        case "error":
          if (message.code === "invalid_access_token") {
            state.realtimeAuthenticated = false;
            await recoverRealtimeAuthentication();
            return;
          }

          state.realtimeLastEventLabel = message.message;

          if (!message.recoverable) {
            setMessage(message.message, "danger");
          }

          startFallbackPolling();
          render();
          return;
        case "pong":
          return;
        default:
          return;
      }
    }

    function syncRealtimeAuthentication() {
      if (!state.user || !state.accessToken) {
        return;
      }

      if (
        state.realtimeSocket &&
        state.realtimeSocket.readyState === WebSocket.OPEN
      ) {
        state.realtimeStatus = "authenticating";
        state.realtimeAuthenticated = false;
        sendRealtimeMessage({
          type: "authenticate",
          accessToken: state.accessToken,
          projectId: state.selectedProjectId
        });
        render();
        return;
      }

      ensureRealtimeConnection();
    }

    function syncRealtimeProjectSubscription() {
      if (!state.user) {
        return;
      }

      if (
        state.realtimeSocket &&
        state.realtimeSocket.readyState === WebSocket.OPEN &&
        state.realtimeAuthenticated
      ) {
        sendRealtimeMessage({
          type: "subscribe_project",
          projectId: state.selectedProjectId
        });
      }

      if (state.realtimeFallbackActive) {
        stopFallbackPolling();
        startFallbackPolling();
      }
    }

    function ensureRealtimeConnection() {
      if (!state.user || !state.accessToken) {
        return;
      }

      if (
        state.realtimeSocket &&
        (state.realtimeSocket.readyState === WebSocket.OPEN ||
          state.realtimeSocket.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      clearRealtimeReconnectTimer();
      const socket = new WebSocket(buildRealtimeSocketUrl());

      state.realtimeSocket = socket;
      state.realtimeStatus =
        state.realtimeReconnectAttempt > 0 ? "reconnecting" : "connecting";
      state.realtimeLastEventLabel = \`Opening realtime socket at \${buildRealtimeSocketUrl()}.\`;
      render();

      socket.addEventListener("open", () => {
        if (state.realtimeSocket !== socket) {
          return;
        }

        state.realtimeStatus = "authenticating";
        state.realtimeAuthenticated = false;
        sendRealtimeMessage({
          type: "authenticate",
          accessToken: state.accessToken,
          projectId: state.selectedProjectId
        });
        render();
      });

      socket.addEventListener("message", (event) => {
        void handleRealtimeMessage(event.data);
      });

      socket.addEventListener("close", () => {
        if (state.realtimeSocket !== socket) {
          return;
        }

        state.realtimeSocket = null;
        state.realtimeConnectionId = null;
        state.realtimeAuthenticated = false;
        state.realtimeProjectId = null;

        if (!state.user) {
          state.realtimeStatus = "idle";
          stopFallbackPolling();
          render();
          return;
        }

        startFallbackPolling();
        scheduleRealtimeReconnect(
          "Realtime connection closed unexpectedly."
        );
      });

      socket.addEventListener("error", () => {
        state.realtimeLastEventLabel =
          "Realtime transport reported a socket error. Reconnect flow is active.";
        render();
      });
    }

    function handleSignedOutState(message) {
      disconnectRealtime("idle");
      persistToken(null);
      state.user = null;
      state.notifications = [];
      clearWorkspaceState();
      document.body.dataset.auth = "false";
      setMessage(message, "neutral");
    }

    function applySession(payload) {
      persistToken(payload.accessToken);
      state.user = payload.user;
      document.body.dataset.auth = "true";
      setMessage("Authenticated session active.", "success");
      syncRealtimeAuthentication();
    }

    async function fetchProfile() {
      if (!state.accessToken) {
        return null;
      }

      const payload = await apiClient.auth.me(state.accessToken);
      state.user = payload.user;
      return payload.user;
    }

    async function refreshSession() {
      const payload = await apiClient.auth.refresh();
      applySession(payload);
      return payload;
    }

    async function withAuthenticatedClient(operation) {
      if (!state.accessToken) {
        handleSignedOutState("Sign in to continue.");
        throw new Error("Missing access token.");
      }

      try {
        return await operation();
      } catch (error) {
        if (errorStatus(error) === 401) {
          try {
            await refreshSession();
            return await operation();
          } catch {
            handleSignedOutState("Session expired. Sign in again to continue.");
          }
        }

        throw error;
      }
    }

    async function loadInfrastructure() {
      try {
        state.infrastructure = await fetch(\`\${config.apiBaseUrl}/ready\`, {
          method: "GET",
          credentials: "include"
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error("Infrastructure endpoint unavailable.");
          }

          return response.json();
        });
      } catch {
        state.infrastructure = null;
      }
    }

    async function loadSelectedProject(options = {}) {
      if (!state.selectedProjectId) {
        state.selectedProject = null;
        state.assets = null;
        state.jobs = null;
        stopFallbackPolling();
        return;
      }

      const background = options.background === true;

      if (!background) {
        state.assetsBusy = true;
        state.jobsBusy = true;
      }

      try {
        const [project, assets, jobs] = await withAuthenticatedClient(() =>
          Promise.all([
            apiClient.projects.get(state.accessToken, state.selectedProjectId),
            apiClient.assets.listByProject(state.accessToken, state.selectedProjectId, {
              query: state.assetQuery,
              page: state.assetPage,
              pageSize: state.assetPageSize,
              status: normalizeFilterValue(state.assetStatus),
              kind: normalizeFilterValue(state.assetKind)
            }),
            apiClient.jobs.listByProject(state.accessToken, state.selectedProjectId, {
              page: state.jobsPage,
              pageSize: state.jobsPageSize,
              status: normalizeFilterValue(state.jobsStatus)
            })
          ])
        );

        state.selectedProject = project;
        state.assets = assets;
        state.jobs = jobs;
      } catch (error) {
        setMessage(errorMessage(error, "Could not load project details."), "danger");
      } finally {
        if (!background) {
          state.assetsBusy = false;
          state.jobsBusy = false;
        }

        if (!options.suppressRender) {
          render();
        }
      }
    }

    async function loadProjects(options = {}) {
      if (!state.user) {
        clearWorkspaceState();
        render();
        return;
      }

      const background = options.background === true;

      if (!background) {
        state.projectsBusy = true;
      }

      try {
        const collection = await withAuthenticatedClient(() =>
          apiClient.projects.list(state.accessToken, {
            query: state.projectsQuery,
            page: state.projectsPage,
            pageSize: state.projectsPageSize
          })
        );

        state.projects = collection;
        const focusProjectId = options.focusProjectId ?? state.selectedProjectId;
        const focusProject = collection.items.find(
          (project) => project.id === focusProjectId
        );
        state.selectedProjectId = focusProject?.id ?? collection.items[0]?.id ?? null;
        syncRealtimeProjectSubscription();

        if (state.selectedProjectId) {
          await loadSelectedProject({
            suppressRender: true,
            background
          });
        } else {
          state.selectedProject = null;
          state.assets = null;
          state.jobs = null;
          stopFallbackPolling();
        }
      } catch (error) {
        setMessage(errorMessage(error, "Could not load projects."), "danger");
      } finally {
        if (!background) {
          state.projectsBusy = false;
        }

        if (!options.suppressRender) {
          render();
        }
      }
    }

    async function restoreSession() {
      state.busy = true;
      render();

      try {
        if (state.accessToken) {
          try {
            await fetchProfile();
            document.body.dataset.auth = "true";
            setMessage("Recovered the previous access token.", "success");
          } catch {
            await refreshSession();
          }
        } else {
          await refreshSession();
        }
      } catch {
        handleSignedOutState("Sign in or register to enter the workspace shell.");
      }

      await loadInfrastructure();

      if (state.user) {
        await loadProjects({ suppressRender: true });
        ensureRealtimeConnection();
      }

      state.busy = false;
      render();
    }

    async function submitAuth(event) {
      event.preventDefault();

      if (state.busy) {
        return;
      }

      const form = findClosestTarget(event, "#auth-form");

      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const formData = new FormData(form);
      const payload = {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? "")
      };

      state.busy = true;
      setMessage("Submitting credentials...", "neutral");
      render();

      try {
        const session =
          state.authMode === "signup"
            ? await apiClient.auth.register(payload)
            : await apiClient.auth.login(payload);

        applySession(session);
        state.activeSection = "overview";
        await loadProjects({ suppressRender: true });
      } catch (error) {
        setMessage(errorMessage(error, "Authentication failed."), "danger");
      } finally {
        state.busy = false;
        render();
      }
    }

    async function handleLogout() {
      state.busy = true;
      setMessage("Closing the session...", "neutral");
      render();

      try {
        await apiClient.auth.logout();
      } catch {
        // Keep logout idempotent in the UI.
      }

      handleSignedOutState("Session closed. Sign in again to continue.");
      state.busy = false;
      render();
    }

    async function handleProjectsFilterSubmit(event) {
      event.preventDefault();
      const form = findClosestTarget(event, "#projects-filter-form");

      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const formData = new FormData(form);
      state.projectsQuery = String(formData.get("query") ?? "").trim();
      state.projectsPage = 1;
      await loadProjects({ background: true });
    }

    async function handleProjectCreate(event) {
      event.preventDefault();

      const form = findClosestTarget(event, "#project-create-form");

      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const formData = new FormData(form);

      try {
        const project = await withAuthenticatedClient(() =>
          apiClient.projects.create(state.accessToken, {
            name: String(formData.get("name") ?? "").trim(),
            description: String(formData.get("description") ?? "").trim()
          })
        );

        form.reset();
        state.activeSection = "projects";
        state.assetPage = 1;
        state.jobsPage = 1;
        setMessage("Project created. Asset records can now be attached to it.", "success");
        await loadProjects({ focusProjectId: project.id });
      } catch (error) {
        setMessage(errorMessage(error, "Could not create the project."), "danger");
      }
    }

    async function handleProjectUpdate(event) {
      event.preventDefault();

      if (!state.selectedProject) {
        return;
      }

      const form = findClosestTarget(event, "#project-edit-form");

      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const formData = new FormData(form);

      try {
        const project = await withAuthenticatedClient(() =>
          apiClient.projects.update(state.accessToken, state.selectedProject.id, {
            name: String(formData.get("name") ?? "").trim(),
            description: String(formData.get("description") ?? "").trim()
          })
        );

        setMessage("Project details updated.", "success");
        await loadProjects({ focusProjectId: project.id });
      } catch (error) {
        setMessage(errorMessage(error, "Could not update the project."), "danger");
      }
    }

    async function handleProjectDelete() {
      if (!state.selectedProject) {
        return;
      }

      if (!window.confirm("Delete this project and its draft asset records?")) {
        return;
      }

      try {
        await withAuthenticatedClient(() =>
          apiClient.projects.remove(state.accessToken, state.selectedProject.id)
        );

        setMessage("Project removed from this account.", "success");
        await loadProjects();
      } catch (error) {
        setMessage(errorMessage(error, "Could not delete the project."), "danger");
      }
    }

    async function handleProjectSelection(event) {
      const projectElement = findClosestTarget(event, "[data-project-id]");

      if (!(projectElement instanceof HTMLElement)) {
        return;
      }

      const projectId = projectElement.dataset.projectId;

      if (!projectId || projectId === state.selectedProjectId) {
        return;
      }

      state.selectedProjectId = projectId;
      state.assetPage = 1;
      state.jobsPage = 1;
      state.activeSection = "projects";
      clearPendingUpload();
      syncRealtimeProjectSubscription();
      render();
      await loadSelectedProject({ background: true });
    }

    async function handleAssetFilterSubmit(event) {
      event.preventDefault();
      const form = findClosestTarget(event, "#asset-filter-form");

      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const formData = new FormData(form);
      state.assetQuery = String(formData.get("query") ?? "").trim();
      state.assetStatus = String(formData.get("status") ?? "all");
      state.assetKind = String(formData.get("kind") ?? "all");
      state.assetPage = 1;
      await loadSelectedProject({ background: true });
    }

    async function handleJobFilterSubmit(event) {
      event.preventDefault();
      const form = findClosestTarget(event, "#jobs-filter-form");

      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const formData = new FormData(form);
      state.jobsStatus = String(formData.get("status") ?? "all");
      state.jobsPage = 1;
      await loadSelectedProject({ background: true });
    }

    async function handleJobsRefresh() {
      await loadSelectedProject({ background: true });
    }

    async function handleAssetCreate(event) {
      event.preventDefault();

      if (!state.selectedProject) {
        return;
      }

      const form = findClosestTarget(event, "#asset-create-form");

      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const formData = new FormData(form);

      try {
        await withAuthenticatedClient(() =>
          apiClient.assets.createForProject(state.accessToken, state.selectedProject.id, {
            originalFilename: String(formData.get("originalFilename") ?? "").trim(),
            contentType: String(formData.get("contentType") ?? "").trim(),
            byteSize: Number(formData.get("byteSize") ?? 0),
            kind: String(formData.get("kind") ?? "image"),
            status: String(formData.get("status") ?? "draft")
          })
        );

        form.reset();
        state.assetPage = 1;
        setMessage("Asset record created. Lifecycle state can now evolve independently.", "success");
        await loadProjects({ focusProjectId: state.selectedProject.id });
      } catch (error) {
        setMessage(errorMessage(error, "Could not create the asset record."), "danger");
      }
    }

    function handleUploadInputChange(event) {
      const input = findClosestTarget(event, "#asset-upload-input");

      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      const file = input.files?.[0];

      if (!file) {
        return;
      }

      rememberPendingUpload(file);
      setMessage("Upload staged. Submit it to persist the source object in storage.", "neutral");
      render();
    }

    function handleUploadKindChange(event) {
      const select = findClosestTarget(event, "#asset-upload-kind");

      if (!(select instanceof HTMLSelectElement)) {
        return;
      }

      state.uploadKind = select.value;
      render();
    }

    function handleUploadDragEnter(event) {
      event.preventDefault();
      state.uploadDragActive = true;
      render();
    }

    function handleUploadDragOver(event) {
      event.preventDefault();

      if (!state.uploadDragActive) {
        state.uploadDragActive = true;
        render();
      }
    }

    function handleUploadDragLeave(event) {
      event.preventDefault();
      const dropzone = findClosestTarget(event, "[data-upload-dropzone]");
      const nextTarget = event.relatedTarget;

      if (
        dropzone instanceof HTMLElement &&
        nextTarget instanceof Node &&
        dropzone.contains(nextTarget)
      ) {
        return;
      }

      state.uploadDragActive = false;
      render();
    }

    function handleUploadDrop(event) {
      event.preventDefault();
      state.uploadDragActive = false;
      const file = event.dataTransfer?.files?.[0];

      if (!file) {
        setMessage("Drop a supported file into the upload zone to continue.", "danger");
        render();
        return;
      }

      rememberPendingUpload(file);
      setMessage("Upload staged from drag and drop. Submit when ready.", "neutral");
      render();
    }

    async function handleAssetUpload(event) {
      event.preventDefault();

      if (!state.selectedProject || !state.pendingUploadFile || state.uploadBusy) {
        return;
      }

      const projectId = state.selectedProject.id;
      state.uploadBusy = true;
      state.uploadProgress = 0;
      setMessage("Uploading source asset to object storage...", "neutral");
      render();

      try {
        const asset = await withAuthenticatedClient(() =>
          apiClient.assets.uploadToProject(state.accessToken, projectId, {
            file: state.pendingUploadFile,
            kind: state.uploadKind,
            onProgress(progress) {
              state.uploadProgress = progress;
              render();
            }
          })
        );

        clearPendingUpload();
        setMessage(
          \`Uploaded \${asset.originalFilename} into MinIO and linked it to the selected project.\`,
          "success"
        );
        await loadProjects({ focusProjectId: projectId });
      } catch (error) {
        setMessage(errorMessage(error, "Could not upload the selected asset."), "danger");
      } finally {
        state.uploadBusy = false;

        if (!state.pendingUploadFile) {
          state.uploadProgress = 0;
        }

        render();
      }
    }

    async function handleAssetStatusSubmit(event) {
      event.preventDefault();

      if (!state.selectedProject) {
        return;
      }

      const form = findClosestTarget(event, "[data-asset-status-form]");

      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const assetId = form.dataset.assetId;
      const formData = new FormData(form);

      if (!assetId) {
        return;
      }

      try {
        await withAuthenticatedClient(() =>
          apiClient.assets.updateForProject(
            state.accessToken,
            state.selectedProject.id,
            assetId,
            {
              status: String(formData.get("status") ?? "draft")
            }
          )
        );

        setMessage("Asset lifecycle state updated.", "success");
        await loadProjects({ focusProjectId: state.selectedProject.id });
      } catch (error) {
        setMessage(errorMessage(error, "Could not update the asset state."), "danger");
      }
    }

    async function handleAssetDownload(event) {
      if (!state.selectedProject) {
        return;
      }

      const button = findClosestTarget(event, "[data-asset-download]");

      if (!(button instanceof HTMLElement)) {
        return;
      }

      const assetId = button.dataset.assetId;
      const fallbackFilename = button.dataset.filename;

      if (!assetId) {
        return;
      }

      try {
        setMessage("Preparing the source download...", "neutral");
        render();
        const result = await withAuthenticatedClient(() =>
          apiClient.assets.downloadFromProject(
            state.accessToken,
            state.selectedProject.id,
            assetId
          )
        );

        saveDownloadedBlob(
          result.blob,
          result.filename || fallbackFilename || "asset-download"
        );
        setMessage("Source download started in the browser.", "success");
      } catch (error) {
        setMessage(errorMessage(error, "Could not download the stored asset."), "danger");
      } finally {
        render();
      }
    }

    async function handleAssetProcess(event) {
      if (!state.selectedProject) {
        return;
      }

      const button = findClosestTarget(event, "[data-asset-process]");

      if (!(button instanceof HTMLElement)) {
        return;
      }

      const assetId = button.dataset.assetId;

      if (!assetId) {
        return;
      }

      try {
        const job = await withAuthenticatedClient(() =>
          apiClient.jobs.createForAsset(
            state.accessToken,
            state.selectedProject.id,
            assetId,
            {}
          )
        );

        state.activeSection = "jobs";
        state.jobsPage = 1;
        setMessage(
          \`Queued \${job.kind} for the selected asset. The worker will process it asynchronously.\`,
          "success"
        );
        await loadProjects({ focusProjectId: state.selectedProject.id });
      } catch (error) {
        setMessage(errorMessage(error, "Could not queue the processing job."), "danger");
      }
    }

    async function handleJobRetry(event) {
      if (!state.selectedProject) {
        return;
      }

      const button = findClosestTarget(event, "[data-job-retry]");

      if (!(button instanceof HTMLElement)) {
        return;
      }

      const jobId = button.dataset.jobId;

      if (!jobId) {
        return;
      }

      try {
        await withAuthenticatedClient(() =>
          apiClient.jobs.retryByProject(
            state.accessToken,
            state.selectedProject.id,
            jobId
          )
        );

        setMessage("Failed job requeued for another processing attempt.", "success");
        await loadProjects({ focusProjectId: state.selectedProject.id });
      } catch (error) {
        setMessage(errorMessage(error, "Could not retry the failed job."), "danger");
      }
    }

    async function handleJobDownloadThumbnail(event) {
      if (!state.selectedProject) {
        return;
      }

      const button = findClosestTarget(event, "[data-job-thumbnail]");

      if (!(button instanceof HTMLElement)) {
        return;
      }

      const jobId = button.dataset.jobId;
      const fallbackFilename = button.dataset.filename;

      if (!jobId) {
        return;
      }

      try {
        setMessage("Preparing the processed thumbnail download...", "neutral");
        render();
        const result = await withAuthenticatedClient(() =>
          apiClient.jobs.downloadThumbnail(
            state.accessToken,
            state.selectedProject.id,
            jobId
          )
        );

        saveDownloadedBlob(
          result.blob,
          result.filename || fallbackFilename || "thumbnail.png"
        );
        setMessage("Processed thumbnail download started in the browser.", "success");
      } catch (error) {
        setMessage(
          errorMessage(error, "Could not download the processed thumbnail."),
          "danger"
        );
      } finally {
        render();
      }
    }

    async function handlePaginationClick(event) {
      const button = findClosestTarget(event, "[data-pagination-target]");

      if (!(button instanceof HTMLElement)) {
        return;
      }

      const target = button.dataset.paginationTarget;
      const direction = button.dataset.direction;

      if (!target || !direction) {
        return;
      }

      if (target === "projects" && state.projects) {
        const nextPage =
          direction === "next" ? state.projectsPage + 1 : state.projectsPage - 1;

        if (nextPage < 1 || nextPage > state.projects.totalPages) {
          return;
        }

        state.projectsPage = nextPage;
        await loadProjects({ background: true });
        return;
      }

      if (target === "assets" && state.assets) {
        const nextPage =
          direction === "next" ? state.assetPage + 1 : state.assetPage - 1;

        if (nextPage < 1 || nextPage > state.assets.totalPages) {
          return;
        }

        state.assetPage = nextPage;
        await loadSelectedProject({ background: true });
        return;
      }

      if (target === "jobs" && state.jobs) {
        const nextPage =
          direction === "next" ? state.jobsPage + 1 : state.jobsPage - 1;

        if (nextPage < 1 || nextPage > state.jobs.totalPages) {
          return;
        }

        state.jobsPage = nextPage;
        await loadSelectedProject({ background: true });
      }
    }

${workspaceViewModuleSource}

${shellViewModuleSource}

    function handleDelegatedClick(event) {
      const authModeElement = findClosestTarget(event, "[data-auth-mode]");

      if (authModeElement instanceof HTMLElement) {
        state.authMode = authModeElement.dataset.authMode;
        setMessage(
          state.authMode === "signup"
            ? "Create an account and the workspace shell will open immediately."
            : "Sign in with an existing account.",
          "neutral"
        );
        render();
        return;
      }

      const sectionElement = findClosestTarget(event, "[data-section]");

      if (sectionElement instanceof HTMLElement) {
        state.activeSection = sectionElement.dataset.section;
        render();
        return;
      }

      if (findClosestTarget(event, "#logout-button")) {
        void handleLogout();
        return;
      }

      if (findClosestTarget(event, "#project-delete-button")) {
        void handleProjectDelete();
        return;
      }

      if (findClosestTarget(event, "#jobs-refresh-button")) {
        void handleJobsRefresh();
        return;
      }

      const projectElement = findClosestTarget(event, "[data-project-id]");

      if (projectElement instanceof HTMLElement) {
        void handleProjectSelection(event);
        return;
      }

      if (findClosestTarget(event, "[data-pagination-target]")) {
        void handlePaginationClick(event);
        return;
      }

      if (findClosestTarget(event, "[data-asset-download]")) {
        void handleAssetDownload(event);
        return;
      }

      if (findClosestTarget(event, "[data-asset-process]")) {
        void handleAssetProcess(event);
        return;
      }

      if (findClosestTarget(event, "[data-job-retry]")) {
        void handleJobRetry(event);
        return;
      }

      if (findClosestTarget(event, "[data-job-thumbnail]")) {
        void handleJobDownloadThumbnail(event);
      }
    }

    function handleDelegatedSubmit(event) {
      if (findClosestTarget(event, "#auth-form")) {
        void submitAuth(event);
        return;
      }

      if (findClosestTarget(event, "#projects-filter-form")) {
        void handleProjectsFilterSubmit(event);
        return;
      }

      if (findClosestTarget(event, "#project-create-form")) {
        void handleProjectCreate(event);
        return;
      }

      if (findClosestTarget(event, "#project-edit-form")) {
        void handleProjectUpdate(event);
        return;
      }

      if (findClosestTarget(event, "#asset-filter-form")) {
        void handleAssetFilterSubmit(event);
        return;
      }

      if (findClosestTarget(event, "#jobs-filter-form")) {
        void handleJobFilterSubmit(event);
        return;
      }

      if (findClosestTarget(event, "#asset-create-form")) {
        void handleAssetCreate(event);
        return;
      }

      if (findClosestTarget(event, "#asset-upload-form")) {
        void handleAssetUpload(event);
        return;
      }

      if (findClosestTarget(event, "[data-asset-status-form]")) {
        void handleAssetStatusSubmit(event);
      }
    }

    function handleDelegatedChange(event) {
      if (findClosestTarget(event, "#asset-upload-input")) {
        handleUploadInputChange(event);
        return;
      }

      if (findClosestTarget(event, "#asset-upload-kind")) {
        handleUploadKindChange(event);
      }
    }

    function handleDelegatedDragEnter(event) {
      if (findClosestTarget(event, "[data-upload-dropzone]")) {
        handleUploadDragEnter(event);
      }
    }

    function handleDelegatedDragOver(event) {
      if (findClosestTarget(event, "[data-upload-dropzone]")) {
        handleUploadDragOver(event);
      }
    }

    function handleDelegatedDragLeave(event) {
      if (findClosestTarget(event, "[data-upload-dropzone]")) {
        handleUploadDragLeave(event);
      }
    }

    function handleDelegatedDrop(event) {
      if (findClosestTarget(event, "[data-upload-dropzone]")) {
        handleUploadDrop(event);
      }
    }

    window.addEventListener("beforeunload", () => {
      disconnectRealtime("idle");
    });

    if (appElement) {
      appElement.addEventListener("click", handleDelegatedClick);
      appElement.addEventListener("submit", handleDelegatedSubmit);
      appElement.addEventListener("change", handleDelegatedChange);
      appElement.addEventListener("dragenter", handleDelegatedDragEnter);
      appElement.addEventListener("dragover", handleDelegatedDragOver);
      appElement.addEventListener("dragleave", handleDelegatedDragLeave);
      appElement.addEventListener("drop", handleDelegatedDrop);
    }

    renderNow();
    void restoreSession();
  `;
}

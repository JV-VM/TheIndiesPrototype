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

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
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
          suppressRender: true
        }).finally(() => {
          render();
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
          suppressRender: true
        }).finally(() => {
          render();
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

      state.assetsBusy = true;
      state.jobsBusy = true;

      if (!options.suppressRender) {
        render();
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
        state.assetsBusy = false;
        state.jobsBusy = false;

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

      state.projectsBusy = true;

      if (!options.suppressRender) {
        render();
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
          await loadSelectedProject({ suppressRender: true });
        } else {
          state.selectedProject = null;
          state.assets = null;
          state.jobs = null;
          stopFallbackPolling();
        }
      } catch (error) {
        setMessage(errorMessage(error, "Could not load projects."), "danger");
      } finally {
        state.projectsBusy = false;

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

      const formData = new FormData(event.currentTarget);
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
      const formData = new FormData(event.currentTarget);
      state.projectsQuery = String(formData.get("query") ?? "").trim();
      state.projectsPage = 1;
      await loadProjects();
    }

    async function handleProjectCreate(event) {
      event.preventDefault();
      const form = event.currentTarget;
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

      const formData = new FormData(event.currentTarget);

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
      const projectId = event.currentTarget.dataset.projectId;

      if (!projectId || projectId === state.selectedProjectId) {
        return;
      }

      state.selectedProjectId = projectId;
      state.assetPage = 1;
      state.jobsPage = 1;
      state.activeSection = "projects";
      clearPendingUpload();
      syncRealtimeProjectSubscription();
      await loadSelectedProject();
    }

    async function handleAssetFilterSubmit(event) {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      state.assetQuery = String(formData.get("query") ?? "").trim();
      state.assetStatus = String(formData.get("status") ?? "all");
      state.assetKind = String(formData.get("kind") ?? "all");
      state.assetPage = 1;
      await loadSelectedProject();
    }

    async function handleJobFilterSubmit(event) {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      state.jobsStatus = String(formData.get("status") ?? "all");
      state.jobsPage = 1;
      await loadSelectedProject();
    }

    async function handleJobsRefresh() {
      await loadSelectedProject();
    }

    async function handleAssetCreate(event) {
      event.preventDefault();

      if (!state.selectedProject) {
        return;
      }

      const form = event.currentTarget;
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
      const file = event.currentTarget.files?.[0];

      if (!file) {
        return;
      }

      rememberPendingUpload(file);
      setMessage("Upload staged. Submit it to persist the source object in storage.", "neutral");
      render();
    }

    function handleUploadKindChange(event) {
      state.uploadKind = event.currentTarget.value;
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
      const nextTarget = event.relatedTarget;

      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
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

      const assetId = event.currentTarget.dataset.assetId;
      const formData = new FormData(event.currentTarget);

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

      const assetId = event.currentTarget.dataset.assetId;
      const fallbackFilename = event.currentTarget.dataset.filename;

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

      const assetId = event.currentTarget.dataset.assetId;

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

      const jobId = event.currentTarget.dataset.jobId;

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

      const jobId = event.currentTarget.dataset.jobId;
      const fallbackFilename = event.currentTarget.dataset.filename;

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
      const target = event.currentTarget.dataset.paginationTarget;
      const direction = event.currentTarget.dataset.direction;

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
        await loadProjects();
        return;
      }

      if (target === "assets" && state.assets) {
        const nextPage =
          direction === "next" ? state.assetPage + 1 : state.assetPage - 1;

        if (nextPage < 1 || nextPage > state.assets.totalPages) {
          return;
        }

        state.assetPage = nextPage;
        await loadSelectedProject();
        return;
      }

      if (target === "jobs" && state.jobs) {
        const nextPage =
          direction === "next" ? state.jobsPage + 1 : state.jobsPage - 1;

        if (nextPage < 1 || nextPage > state.jobs.totalPages) {
          return;
        }

        state.jobsPage = nextPage;
        await loadSelectedProject();
      }
    }

    function renderInfrastructure() {
      if (!state.infrastructure) {
        return '<p class="muted-note">Infrastructure status is unavailable from the browser right now.</p>';
      }

      return \`<div class="chip-cluster">\${state.infrastructure.dependencies
        .map(
          (dependency) => \`
            <span class="dependency-chip" data-status="\${dependency.status}">
              <strong>\${escapeHtml(dependency.name)}</strong>
              <span>\${dependency.latencyMs}ms</span>
            </span>
          \`
        )
        .join("")}</div>\`;
    }

    function renderLifecycleChips(counts) {
      return \`<div class="chip-cluster">\${assetLifecycleStatuses
        .map(
          (status) => \`
            <span class="summary-chip" data-status="\${status}">
              <strong>\${status}</strong>
              <span>\${counts[status] ?? 0}</span>
            </span>
          \`
        )
        .join("")}</div>\`;
    }

    function renderProjectsList() {
      if (!state.projects || state.projects.items.length === 0) {
        return \`
          <div class="empty-state">
            <strong>No projects yet</strong>
            <p>Create the first workspace entry for this account and uploads, jobs, and derived outputs will attach to it immediately.</p>
          </div>
        \`;
      }

      return \`<div class="project-stack">\${state.projects.items
        .map(
          (project) => \`
            <button class="project-card" type="button" data-project-id="\${project.id}" data-active="\${project.id === state.selectedProjectId}">
              <div class="project-card-head">
                <div>
                  <strong>\${escapeHtml(project.name)}</strong>
                  <p>\${escapeHtml(project.description ?? "No description yet.")}</p>
                </div>
                <span class="code-pill">\${project.assetCount} assets</span>
              </div>
              \${renderLifecycleChips(project.assetStatusCounts)}
              <p class="muted-note">Updated \${escapeHtml(formatDate(project.updatedAt))}</p>
            </button>
          \`
        )
        .join("")}</div>\`;
    }

    function renderAssetList() {
      if (!state.selectedProject) {
        return \`
          <div class="empty-state">
            <strong>Select a project</strong>
            <p>Project details and asset inventory appear here once a workspace entry is active.</p>
          </div>
        \`;
      }

      if (!state.assets || state.assets.items.length === 0) {
        return \`
          <div class="empty-state">
            <strong>No asset records yet</strong>
            <p>This project is ready for source uploads or manual draft metadata. Add the first asset below to start the lifecycle history.</p>
          </div>
        \`;
      }

      return \`<div class="asset-list">\${state.assets.items
        .map(
          (asset) => \`
            <article class="asset-row">
              <div class="asset-row-head">
                <div>
                  <strong>\${escapeHtml(asset.originalFilename)}</strong>
                  <p>\${escapeHtml(asset.contentType)} • \${escapeHtml(asset.kind)} • \${escapeHtml(formatBytes(asset.byteSize))}</p>
                </div>
                <span class="summary-chip" data-status="\${asset.status}">
                  <strong>\${asset.status}</strong>
                  <span>\${escapeHtml(formatDate(asset.updatedAt))}</span>
                </span>
              </div>
              <p class="muted-note">
                \${asset.objectKey
                  ? \`Stored source object: <span class="code-pill">\${escapeHtml(asset.objectKey)}</span>\`
                  : "No source object stored yet. This record is still metadata-only."}
              </p>
              <form data-asset-status-form="true" data-asset-id="\${asset.id}">
                <div class="field-grid">
                  <label>
                    Lifecycle Status
                    <select name="status">
                      \${assetLifecycleStatuses
                        .map(
                          (status) => \`
                            <option value="\${status}" \${asset.status === status ? "selected" : ""}>\${status}</option>
                          \`
                        )
                        .join("")}
                    </select>
                  </label>
                </div>
                <div class="inline-actions">
                  <button class="ghost-button" type="submit">Apply Status</button>
                  \${asset.objectKey && asset.kind === "image"
                    ? \`<button class="ghost-button" type="button" data-asset-process="true" data-asset-id="\${asset.id}" \${asset.status === "queued" || asset.status === "processing" ? "disabled" : ""}>Queue Thumbnail Job</button>\`
                    : ""}
                  \${asset.objectKey
                    ? \`<button class="ghost-button" type="button" data-asset-download="true" data-asset-id="\${asset.id}" data-filename="\${escapeHtml(asset.originalFilename)}">Download Source</button>\`
                    : ""}
                </div>
              </form>
            </article>
          \`
        )
        .join("")}</div>\`;
    }

    function renderJobsList() {
      if (!state.selectedProject) {
        return \`
          <div class="empty-state">
            <strong>Select a project</strong>
            <p>Queued and completed processing jobs will appear here once a project is active.</p>
          </div>
        \`;
      }

      if (!state.jobs || state.jobs.items.length === 0) {
        return \`
          <div class="empty-state">
            <strong>No jobs yet</strong>
            <p>Queue a thumbnail generation job from the asset inventory to start the first worker pipeline.</p>
          </div>
        \`;
      }

      return \`<div class="asset-list">\${state.jobs.items
        .map((job) => {
          const thumbnail = job.result?.outputs?.[0] ?? null;

          return \`
            <article class="asset-row">
              <div class="asset-row-head">
                <div>
                  <strong>\${escapeHtml(job.payload?.originalFilename ?? job.assetId)}</strong>
                  <p>\${escapeHtml(job.kind)} • attempts \${job.attempts}/\${job.maxAttempts}</p>
                </div>
                <span class="summary-chip" data-status="\${job.status}">
                  <strong>\${job.status}</strong>
                  <span>\${escapeHtml(formatDate(job.updatedAt))}</span>
                </span>
              </div>
              <p class="muted-note">
                Queue: <span class="code-pill">\${escapeHtml(job.queueName)}</span>
                • Job ID: <span class="code-pill">\${escapeHtml(job.id)}</span>
              </p>
              \${job.failureReason
                ? \`<p class="message" data-tone="danger">\${escapeHtml(job.failureReason)}</p>\`
                : ""}
              \${thumbnail
                ? \`<p class="muted-note">Thumbnail stored at <span class="code-pill">\${escapeHtml(thumbnail.objectKey)}</span></p>\`
                : ""}
              <div class="inline-actions">
                \${job.status === "failed"
                  ? \`<button class="ghost-button" type="button" data-job-retry="true" data-job-id="\${job.id}">Retry Job</button>\`
                  : ""}
                \${thumbnail
                  ? \`<button class="ghost-button" type="button" data-job-thumbnail="true" data-job-id="\${job.id}" data-filename="\${escapeHtml(thumbnail.filename)}">Download Thumbnail</button>\`
                  : ""}
              </div>
            </article>
          \`;
        })
        .join("")}</div>\`;
    }

    function renderRealtimeNotifications() {
      if (state.notifications.length === 0) {
        return \`
          <div class="empty-state">
            <strong>No delivery notifications yet</strong>
            <p>Realtime completion and failure notices for the selected account will collect here once jobs start moving through the worker.</p>
          </div>
        \`;
      }

      return \`<div class="asset-list">\${state.notifications
        .map(
          (notification) => \`
            <article class="asset-row">
              <div class="asset-row-head">
                <div>
                  <strong>\${escapeHtml(notification.title)}</strong>
                  <p>\${escapeHtml(notification.message)}</p>
                </div>
                <span class="summary-chip" data-status="\${notification.level === "danger" ? "failed" : notification.level === "success" ? "completed" : "queued"}">
                  <strong>\${escapeHtml(notification.level)}</strong>
                  <span>\${escapeHtml(formatDate(notification.occurredAt))}</span>
                </span>
              </div>
            </article>
          \`
        )
        .join("")}</div>\`;
    }

    function renderRealtimePanel() {
      const projectLabel = state.realtimeProjectId
        ? \`Project \${state.realtimeProjectId}\`
        : "All projects";

      return \`
        <section class="content-card">
          <div class="list-header">
            <div>
              <strong>Live Delivery</strong>
              <p>Authenticated socket updates now flow from the worker through the API and reconcile the selected project without manual refresh.</p>
            </div>
            <span class="code-pill">\${escapeHtml(realtimeStatusLabel())}</span>
          </div>
          <div class="chip-cluster">
            <span class="summary-chip" data-status="\${state.realtimeStatus === "connected" ? "completed" : state.realtimeFallbackActive ? "queued" : "draft"}">
              <strong>Status</strong>
              <span>\${escapeHtml(realtimeStatusValue())}</span>
            </span>
            <span class="summary-chip" data-status="\${state.realtimeFallbackActive ? "queued" : "uploaded"}">
              <strong>Fallback</strong>
              <span>\${escapeHtml(state.realtimeFallbackActive ? \`Polling \${Math.round(state.realtimeFallbackPollIntervalMs / 1000)}s\` : "Socket only")}</span>
            </span>
            <span class="summary-chip" data-status="uploaded">
              <strong>Subscription</strong>
              <span>\${escapeHtml(projectLabel)}</span>
            </span>
          </div>
          <p class="muted-note">
            Endpoint <span class="code-pill">\${escapeHtml(buildRealtimeSocketUrl())}</span>
            • Connection <span class="code-pill">\${escapeHtml(state.realtimeConnectionId ?? "pending")}</span>
          </p>
          <p class="muted-note">
            Last signal:
            \${escapeHtml(state.realtimeLastEventLabel)}
            \${state.realtimeLastEventAt ? \` • \${escapeHtml(formatDate(state.realtimeLastEventAt))}\` : ""}
          </p>
          \${renderRealtimeNotifications()}
        </section>
      \`;
    }

    function renderUploadPanel() {
      const selectedFile = state.pendingUploadFile;
      const progressMarkup =
        state.uploadBusy || state.uploadProgress > 0
          ? \`
              <div class="upload-progress" aria-live="polite">
                <div class="upload-progress-bar">
                  <span style="width: \${Math.max(state.uploadProgress, 6)}%"></span>
                </div>
                <p class="muted-note">
                  \${state.uploadBusy
                    ? \`Uploading \${state.uploadProgress}%\`
                    : "Upload ready."}
                </p>
              </div>
            \`
          : "";

      return \`
        <form id="asset-upload-form">
          <strong>Upload Source Asset</strong>
          <div class="upload-dropzone" data-upload-dropzone="true" data-drag="\${state.uploadDragActive}">
            <input
              id="asset-upload-input"
              class="visually-hidden"
              type="file"
              accept=".gif,.jpeg,.jpg,.json,.md,.mov,.mp3,.mp4,.ogg,.pdf,.png,.svg,.txt,.wav,.webm,.webp"
            />
            <p>
              Drop one supported file here or
              <label class="upload-picker" for="asset-upload-input">browse from disk</label>.
            </p>
            <p class="muted-note">
              Supported categories: image, audio, video, and document. Current limit: 25 MB per file.
            </p>
            \${selectedFile
              ? \`
                  <div class="upload-meta">
                    <span class="code-pill">\${escapeHtml(selectedFile.name)}</span>
                    <span class="code-pill">\${escapeHtml(selectedFile.type || "application/octet-stream")}</span>
                    <span class="code-pill">\${escapeHtml(formatBytes(selectedFile.size))}</span>
                  </div>
                \`
              : ""}
          </div>
          <div class="field-grid">
            <label>
              Asset Kind
              <select id="asset-upload-kind" name="kind">
                \${assetKinds
                  .map(
                    (kind) => \`
                      <option value="\${kind}" \${state.uploadKind === kind ? "selected" : ""}>\${kind}</option>
                    \`
                  )
                  .join("")}
              </select>
            </label>
          </div>
          \${progressMarkup}
          <div class="form-actions">
            <button class="primary-button" type="submit" \${!selectedFile || state.uploadBusy ? "disabled" : ""}>
              \${state.uploadBusy ? "Uploading..." : selectedFile ? "Upload To Storage" : "Choose A File First"}
            </button>
          </div>
        </form>
      \`;
    }

    function renderOverviewSection() {
      const projectTotal = state.projects?.totalItems ?? 0;
      const selectedProjectAssets = state.selectedProject?.assetCount ?? 0;
      const lifecycleCoverage = state.selectedProject
        ? countLifecycleCoverage(state.selectedProject.assetStatusCounts)
        : 0;

      return \`
        <div class="content-grid">
          <div class="content-card">
            <strong>Project Inventory</strong>
            <div class="status-value">\${projectTotal}</div>
            <p>Projects are now persisted per user and paginated through protected API routes.</p>
          </div>
          <div class="content-card">
            <strong>Selected Assets</strong>
            <div class="status-value">\${selectedProjectAssets}</div>
            <p>Asset records now carry either metadata-only drafts or real source objects stored behind the API boundary.</p>
          </div>
          <div class="content-card">
            <strong>Lifecycle Coverage</strong>
            <div class="status-value">\${lifecycleCoverage}/\${assetLifecycleStatuses.length}</div>
            <p>Status transitions now include upload, queued execution, processing, and terminal worker outcomes.</p>
          </div>
        </div>
        <div class="content-card">
          <strong>Selected Project Snapshot</strong>
          <p>
            \${state.selectedProject
              ? escapeHtml(state.selectedProject.name) + " is currently active, with " + escapeHtml(String(state.selectedProject.assetCount)) + " tracked asset records."
              : "No project is selected yet. Create or choose a project to inspect its asset inventory."}
          </p>
          \${state.selectedProject ? renderLifecycleChips(state.selectedProject.assetStatusCounts) : ""}
        </div>
      \`;
    }

    function renderJobsSection() {
      return \`
        <div class="workspace-grid">
          <section class="workspace-pane workspace-stack">
            <div class="list-header">
              <div>
                <strong>Job Queue</strong>
                <p>Review queued, active, completed, and failed worker activity for the selected project.</p>
              </div>
              <span class="code-pill">\${state.jobs ? state.jobs.totalItems : 0} total</span>
            </div>
            <form id="jobs-filter-form">
              <div class="field-grid">
                <label>
                  Status
                  <select name="status">
                    <option value="all" \${state.jobsStatus === "all" ? "selected" : ""}>All statuses</option>
                    \${jobLifecycleStatuses
                      .map(
                        (status) => \`
                          <option value="\${status}" \${state.jobsStatus === status ? "selected" : ""}>\${status}</option>
                        \`
                      )
                      .join("")}
                  </select>
                </label>
              </div>
              <div class="form-actions">
                <button class="ghost-button" type="submit">Apply Job Filter</button>
                <button class="ghost-button" type="button" id="jobs-refresh-button">Refresh Jobs</button>
              </div>
            </form>
            \${state.jobsBusy ? '<p class="muted-note">Refreshing job queue...</p>' : ""}
            \${renderJobsList()}
            <div class="pagination">
              <button class="ghost-button" type="button" data-pagination-target="jobs" data-direction="prev" \${!state.jobs || state.jobsPage <= 1 ? "disabled" : ""}>Previous</button>
              <span class="muted-note">Page \${state.jobsPage} of \${state.jobs?.totalPages ?? 1}</span>
              <button class="ghost-button" type="button" data-pagination-target="jobs" data-direction="next" \${!state.jobs || state.jobsPage >= state.jobs.totalPages ? "disabled" : ""}>Next</button>
            </div>
          </section>
          <section class="workspace-pane workspace-stack">
            <div class="content-card">
              <strong>Worker Pipeline</strong>
              <p>
                The first distributed pipeline now reads uploaded image sources from MinIO, generates thumbnails with Sharp, stores the derived object back in MinIO, and persists job outcomes in PostgreSQL.
              </p>
            </div>
            <div class="content-card">
              <strong>Project Context</strong>
              <p>
                \${state.selectedProject
                  ? escapeHtml(state.selectedProject.name) + " currently has " + escapeHtml(String(state.selectedProject.assetCount)) + " assets available for processing."
                  : "Select a project from the Projects section to inspect its processing queue."}
              </p>
            </div>
          </section>
        </div>
      \`;
    }

    function renderProjectsSection() {
      return \`
        <div class="workspace-grid">
          <section class="workspace-pane workspace-stack">
            <div class="list-header">
              <div>
                <strong>Projects</strong>
                <p>Search, create, and switch between user-scoped workspaces.</p>
              </div>
              <span class="code-pill">\${state.projects ? state.projects.totalItems : 0} total</span>
            </div>
            <form id="projects-filter-form">
              <label>
                Search Projects
                <input type="search" name="query" value="\${escapeHtml(state.projectsQuery)}" placeholder="Filter by name or description" />
              </label>
              <div class="form-actions">
                <button class="ghost-button" type="submit">Apply Filter</button>
              </div>
            </form>
            <form id="project-create-form" class="section-divider">
              <strong>Create Project</strong>
              <label>
                Project Name
                <input type="text" name="name" placeholder="Prototype Workspace" required />
              </label>
              <label>
                Description
                <textarea name="description" placeholder="What this workspace is for"></textarea>
              </label>
              <div class="form-actions">
                <button class="primary-button" type="submit">Create Project</button>
              </div>
            </form>
            <div class="section-divider">
              \${state.projectsBusy ? '<p class="muted-note">Refreshing projects...</p>' : ""}
              \${renderProjectsList()}
            </div>
            <div class="pagination">
              <button class="ghost-button" type="button" data-pagination-target="projects" data-direction="prev" \${!state.projects || state.projectsPage <= 1 ? "disabled" : ""}>Previous</button>
              <span class="muted-note">Page \${state.projectsPage} of \${state.projects?.totalPages ?? 1}</span>
              <button class="ghost-button" type="button" data-pagination-target="projects" data-direction="next" \${!state.projects || state.projectsPage >= state.projects.totalPages ? "disabled" : ""}>Next</button>
            </div>
          </section>
          <section class="workspace-pane workspace-stack">
            \${state.selectedProject
              ? \`
                <div class="list-header">
                  <div>
                    <strong>\${escapeHtml(state.selectedProject.name)}</strong>
                    <p>Project detail, editable metadata, and its current asset inventory.</p>
                  </div>
                  <span class="code-pill">\${state.selectedProject.assetCount} assets</span>
                </div>
                \${renderLifecycleChips(state.selectedProject.assetStatusCounts)}
                <form id="project-edit-form">
                  <label>
                    Project Name
                    <input type="text" name="name" value="\${escapeHtml(state.selectedProject.name)}" required />
                  </label>
                  <label>
                    Description
                    <textarea name="description">\${escapeHtml(state.selectedProject.description ?? "")}</textarea>
                  </label>
                  <div class="project-actions">
                    <button class="primary-button" type="submit">Save Project</button>
                    <button class="ghost-button" type="button" id="project-delete-button">Delete Project</button>
                  </div>
                </form>
                <div class="section-divider workspace-stack">
                  <div class="list-header">
                    <div>
                      <strong>Asset Inventory</strong>
                      <p>Upload source files into MinIO, filter the resulting inventory, and keep manual draft records when needed.</p>
                    </div>
                    <span class="code-pill">\${state.assets ? state.assets.totalItems : 0} visible</span>
                  </div>
                  <form id="asset-filter-form">
                    <div class="field-grid">
                      <label>
                        Search Assets
                        <input type="search" name="query" value="\${escapeHtml(state.assetQuery)}" placeholder="Filename" />
                      </label>
                      <label>
                        Status
                        <select name="status">
                          <option value="all" \${state.assetStatus === "all" ? "selected" : ""}>All statuses</option>
                          \${assetLifecycleStatuses
                            .map(
                              (status) => \`
                                <option value="\${status}" \${state.assetStatus === status ? "selected" : ""}>\${status}</option>
                              \`
                            )
                            .join("")}
                        </select>
                      </label>
                      <label>
                        Kind
                        <select name="kind">
                          <option value="all" \${state.assetKind === "all" ? "selected" : ""}>All kinds</option>
                          \${assetKinds
                            .map(
                              (kind) => \`
                                <option value="\${kind}" \${state.assetKind === kind ? "selected" : ""}>\${kind}</option>
                              \`
                            )
                            .join("")}
                        </select>
                      </label>
                    </div>
                    <div class="form-actions">
                      <button class="ghost-button" type="submit">Apply Asset Filters</button>
                    </div>
                  </form>
                  \${renderUploadPanel()}
                  <form id="asset-create-form">
                    <strong>Create Manual Draft Record</strong>
                    <div class="field-grid">
                      <label>
                        Filename
                        <input type="text" name="originalFilename" placeholder="cover-art.png" required />
                      </label>
                      <label>
                        Content Type
                        <input type="text" name="contentType" placeholder="image/png" required />
                      </label>
                      <label>
                        Size In Bytes
                        <input type="number" name="byteSize" min="0" step="1" value="0" required />
                      </label>
                      <label>
                        Kind
                        <select name="kind">
                          \${assetKinds
                            .map((kind) => \`<option value="\${kind}">\${kind}</option>\`)
                            .join("")}
                        </select>
                      </label>
                      <label>
                        Initial Status
                        <select name="status">
                          \${assetLifecycleStatuses
                            .map(
                              (status) => \`
                                <option value="\${status}" \${status === "draft" ? "selected" : ""}>\${status}</option>
                              \`
                            )
                            .join("")}
                        </select>
                      </label>
                    </div>
                    <div class="form-actions">
                      <button class="primary-button" type="submit">Add Asset Record</button>
                    </div>
                  </form>
                  \${state.assetsBusy ? '<p class="muted-note">Refreshing asset inventory...</p>' : ""}
                  \${renderAssetList()}
                  <div class="pagination">
                    <button class="ghost-button" type="button" data-pagination-target="assets" data-direction="prev" \${!state.assets || state.assetPage <= 1 ? "disabled" : ""}>Previous</button>
                    <span class="muted-note">Page \${state.assetPage} of \${state.assets?.totalPages ?? 1}</span>
                    <button class="ghost-button" type="button" data-pagination-target="assets" data-direction="next" \${!state.assets || state.assetPage >= state.assets.totalPages ? "disabled" : ""}>Next</button>
                  </div>
                </div>
              \`
              : \`
                <div class="empty-state">
                  <strong>No active project selected</strong>
                  <p>Create a project or choose one from the left column to unlock asset inventory management for this account.</p>
                </div>
              \`}
          </section>
        </div>
      \`;
    }

    function renderActiveSection() {
      switch (state.activeSection) {
        case "projects":
          return renderProjectsSection();
        case "jobs":
          return renderJobsSection();
        default:
          return renderOverviewSection();
      }
    }

    function renderSignedOut() {
      return \`
        <section class="hero-shell">
          <section class="hero-panel">
            <span class="eyebrow">Phase 7 Live Sync</span>
            <h1>Projects, uploads, worker jobs, and live delivery now move as one protected workflow.</h1>
            <p>
              The prototype now supports protected project CRUD, drag-and-drop uploads,
              BullMQ-backed worker execution, Sharp thumbnail generation, authenticated output download,
              and WebSocket-backed status delivery with reconnect and polling fallback.
            </p>
            <div class="hero-grid">
              <article class="hero-blade">
                <strong>Project Scope</strong>
                <p>User-owned projects can now be created, updated, filtered, and removed.</p>
              </article>
              <article class="hero-blade">
                <strong>Asset Storage</strong>
                <p>Supported source files now move through the API into MinIO with persisted object keys.</p>
              </article>
              <article class="hero-blade">
                <strong>Async Execution</strong>
                <p>Uploaded images can now be queued for thumbnail generation and tracked through persisted job states.</p>
              </article>
              <article class="hero-blade">
                <strong>Live Status</strong>
                <p>Completion and failure notifications now reconcile the frontend without relying on manual refresh.</p>
              </article>
            </div>
            <div class="status-strip">
              <strong>Dependency Status</strong>
              \${renderInfrastructure()}
            </div>
          </section>
          <aside class="auth-panel">
            <span class="mini-label">Prototype Access</span>
            <div>
              <h2>\${state.authMode === "signup" ? "Create an account" : "Sign in"}</h2>
              <p>Use any valid email and a password with at least eight characters.</p>
            </div>
            <div class="mode-switch">
              <button class="mode-button" type="button" data-auth-mode="signin" data-active="\${state.authMode === "signin"}">Sign In</button>
              <button class="mode-button" type="button" data-auth-mode="signup" data-active="\${state.authMode === "signup"}">Register</button>
            </div>
            <form id="auth-form">
              <label>
                Email
                <input type="email" name="email" placeholder="creator@studio.test" autocomplete="email" required />
              </label>
              <label>
                Password
                <input type="password" name="password" placeholder="minimum 8 characters" autocomplete="\${state.authMode === "signup" ? "new-password" : "current-password"}" required />
              </label>
              <div class="form-actions">
                <button class="primary-button" type="submit" \${state.busy ? "disabled" : ""}>
                  \${state.busy ? "Working..." : state.authMode === "signup" ? "Register And Enter" : "Sign In And Enter"}
                </button>
              </div>
            </form>
            <p class="message" data-tone="\${state.messageTone}">\${escapeHtml(state.message)}</p>
          </aside>
        </section>
      \`;
    }

    function renderSignedIn() {
      return \`
        <section class="shell">
          <aside class="shell-sidebar">
            <span class="eyebrow">Workspace Shell</span>
            <div>
              <h3>\${escapeHtml(state.user.email)}</h3>
              <p class="shell-nav-note">
                This account now owns projects, uploaded assets, and queue-visible worker workflows.
              </p>
            </div>
            <div class="shell-nav">
              <button class="shell-link" type="button" data-section="overview" data-active="\${state.activeSection === "overview"}">
                <span>Overview</span>
                <span class="code-pill">01</span>
              </button>
              <button class="shell-link" type="button" data-section="projects" data-active="\${state.activeSection === "projects"}">
                <span>Projects</span>
                <span class="code-pill">02</span>
              </button>
              <button class="shell-link" type="button" data-section="jobs" data-active="\${state.activeSection === "jobs"}">
                <span>Jobs</span>
                <span class="code-pill">03</span>
              </button>
            </div>
            <div class="status-strip">
              <strong>Infrastructure</strong>
              \${renderInfrastructure()}
            </div>
            <button class="ghost-button" type="button" id="logout-button">Sign Out</button>
          </aside>
          <section class="shell-main">
            <div class="shell-header">
              <div>
                <span class="mini-label">Protected Experience</span>
                <h2>Identity, projects, and processing state now stay synchronized inside one modular shell.</h2>
              </div>
              <span class="session-pill">Access token present • \${escapeHtml(realtimeStatusLabel().toLowerCase())}</span>
            </div>
            <div class="status-grid">
              <div class="status-strip">
                <strong>User Scope</strong>
                <div class="status-value">\${state.projects?.totalItems ?? 0}</div>
                <p>Project list results are now filtered, paginated, and enforced per account.</p>
              </div>
              <div class="status-strip">
                <strong>Stored Assets</strong>
                <div class="status-value">\${state.selectedProject?.assetCount ?? 0}</div>
                <p>Asset counts and lifecycle summaries update on the currently active project after uploads and worker jobs complete.</p>
              </div>
              <div class="status-strip">
                <strong>Queue Runtime</strong>
                <div class="status-value">\${escapeHtml(realtimeStatusValue())}</div>
                <p>Live updates now travel over <span class="code-pill">\${escapeHtml(buildRealtimeSocketUrl())}</span> with automatic resync and polling fallback.</p>
              </div>
            </div>
            \${renderRealtimePanel()}
            \${renderActiveSection()}
            <section>
              <span class="mini-label">Feature Map</span>
              <div class="feature-grid">
                \${featureCards
                  .map(
                    (feature) => \`
                      <article class="feature-card">
                        <strong>\${feature.label}</strong>
                        <p>\${feature.responsibility}</p>
                        <p><span class="code-pill">\${feature.nextPhase}</span></p>
                      </article>
                    \`
                  )
                  .join("")}
              </div>
            </section>
            <p class="message" data-tone="\${state.messageTone}">\${escapeHtml(state.message)}</p>
          </section>
        </section>
      \`;
    }

    function render() {
      appElement.innerHTML = state.user ? renderSignedIn() : renderSignedOut();
      document.body.dataset.auth = state.user ? "true" : "false";

      document.querySelectorAll("[data-auth-mode]").forEach((element) => {
        element.addEventListener("click", () => {
          state.authMode = element.dataset.authMode;
          setMessage(
            state.authMode === "signup"
              ? "Create an account and the workspace shell will open immediately."
              : "Sign in with an existing account.",
            "neutral"
          );
          render();
        });
      });

      document.querySelectorAll("[data-section]").forEach((element) => {
        element.addEventListener("click", () => {
          state.activeSection = element.dataset.section;
          render();
        });
      });

      document.querySelectorAll("[data-project-id]").forEach((element) => {
        element.addEventListener("click", handleProjectSelection);
      });

      document
        .querySelectorAll("[data-pagination-target]")
        .forEach((element) => {
          element.addEventListener("click", handlePaginationClick);
        });

      document
        .querySelectorAll("[data-asset-status-form]")
        .forEach((element) => {
          element.addEventListener("submit", handleAssetStatusSubmit);
        });
      document
        .querySelectorAll("[data-asset-download]")
        .forEach((element) => {
          element.addEventListener("click", handleAssetDownload);
        });
      document
        .querySelectorAll("[data-asset-process]")
        .forEach((element) => {
          element.addEventListener("click", handleAssetProcess);
        });
      document
        .querySelectorAll("[data-job-retry]")
        .forEach((element) => {
          element.addEventListener("click", handleJobRetry);
        });
      document
        .querySelectorAll("[data-job-thumbnail]")
        .forEach((element) => {
          element.addEventListener("click", handleJobDownloadThumbnail);
        });
      document
        .querySelectorAll("[data-upload-dropzone]")
        .forEach((element) => {
          element.addEventListener("dragenter", handleUploadDragEnter);
          element.addEventListener("dragover", handleUploadDragOver);
          element.addEventListener("dragleave", handleUploadDragLeave);
          element.addEventListener("drop", handleUploadDrop);
        });

      document.getElementById("auth-form")?.addEventListener("submit", submitAuth);
      document.getElementById("logout-button")?.addEventListener("click", handleLogout);
      document
        .getElementById("projects-filter-form")
        ?.addEventListener("submit", handleProjectsFilterSubmit);
      document
        .getElementById("project-create-form")
        ?.addEventListener("submit", handleProjectCreate);
      document
        .getElementById("project-edit-form")
        ?.addEventListener("submit", handleProjectUpdate);
      document
        .getElementById("project-delete-button")
        ?.addEventListener("click", handleProjectDelete);
      document
        .getElementById("asset-filter-form")
        ?.addEventListener("submit", handleAssetFilterSubmit);
      document
        .getElementById("jobs-filter-form")
        ?.addEventListener("submit", handleJobFilterSubmit);
      document
        .getElementById("jobs-refresh-button")
        ?.addEventListener("click", handleJobsRefresh);
      document
        .getElementById("asset-create-form")
        ?.addEventListener("submit", handleAssetCreate);
      document
        .getElementById("asset-upload-form")
        ?.addEventListener("submit", handleAssetUpload);
      document
        .getElementById("asset-upload-input")
        ?.addEventListener("change", handleUploadInputChange);
      document
        .getElementById("asset-upload-kind")
        ?.addEventListener("change", handleUploadKindChange);
    }

    window.addEventListener("beforeunload", () => {
      disconnectRealtime("idle");
    });

    render();
    void restoreSession();
  `;
}

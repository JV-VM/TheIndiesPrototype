export const realtimeRuntimeModuleSource = `
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
`;

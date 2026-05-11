export const sessionRuntimeModuleSource = `
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
        syncProjectEditDraft(true);
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

        const previousProjectId = state.selectedProject?.id ?? null;
        state.selectedProject = project;
        if (previousProjectId !== project.id) {
          syncProjectEditDraft(true);
        }
        state.assets = assets;
        pruneAssetItemStatusDrafts();
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
`;

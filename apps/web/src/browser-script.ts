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
      createApiClient
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
      assetPageSize: 6
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
      state.projectsPage = 1;
      state.assetPage = 1;
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

    function countLifecycleCoverage(counts) {
      return assetLifecycleStatuses.filter((status) => counts[status] > 0).length;
    }

    function handleSignedOutState(message) {
      persistToken(null);
      state.user = null;
      clearWorkspaceState();
      document.body.dataset.auth = "false";
      setMessage(message, "neutral");
    }

    function applySession(payload) {
      persistToken(payload.accessToken);
      state.user = payload.user;
      document.body.dataset.auth = "true";
      setMessage("Authenticated session active.", "success");
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
        return;
      }

      state.assetsBusy = true;

      if (!options.suppressRender) {
        render();
      }

      try {
        const [project, assets] = await withAuthenticatedClient(() =>
          Promise.all([
            apiClient.projects.get(state.accessToken, state.selectedProjectId),
            apiClient.assets.listByProject(state.accessToken, state.selectedProjectId, {
              query: state.assetQuery,
              page: state.assetPage,
              pageSize: state.assetPageSize,
              status: normalizeFilterValue(state.assetStatus),
              kind: normalizeFilterValue(state.assetKind)
            })
          ])
        );

        state.selectedProject = project;
        state.assets = assets;
      } catch (error) {
        setMessage(errorMessage(error, "Could not load project details."), "danger");
      } finally {
        state.assetsBusy = false;

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

        if (state.selectedProjectId) {
          await loadSelectedProject({ suppressRender: true });
        } else {
          state.selectedProject = null;
          state.assets = null;
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
      state.activeSection = "projects";
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
            <p>Create the first workspace entry for this account and Phase 4 asset records will attach to it immediately.</p>
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
            <p>This project is ready for draft metadata. Add the first asset record below to start the lifecycle history.</p>
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
                </div>
              </form>
            </article>
          \`
        )
        .join("")}</div>\`;
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
            <p>Asset records exist before uploads, so metadata and lifecycle state are already first-class.</p>
          </div>
          <div class="content-card">
            <strong>Lifecycle Coverage</strong>
            <div class="status-value">\${lifecycleCoverage}/\${assetLifecycleStatuses.length}</div>
            <p>Status transitions now exist ahead of queue execution and object storage upload work.</p>
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
                      <p>Filter draft records and advance lifecycle state before upload and processing phases.</p>
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
                  <form id="asset-create-form">
                    <strong>Create Asset Record</strong>
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
          return \`
            <div class="content-card">
              <strong>Jobs</strong>
              <p>
                Queue execution still lands in the next distributed phase, but it will now inherit stable project and asset identifiers instead of raw placeholder records.
              </p>
              <p>
                Current workspace baseline: \${escapeHtml(String(state.projects?.totalItems ?? 0))} projects and \${escapeHtml(String(state.selectedProject?.assetCount ?? 0))} assets ready for queue attachment.
              </p>
            </div>
          \`;
        default:
          return renderOverviewSection();
      }
    }

    function renderSignedOut() {
      return \`
        <section class="hero-shell">
          <section class="hero-panel">
            <span class="eyebrow">Phase 4 Workspace</span>
            <h1>Projects and asset records now live behind a real user boundary.</h1>
            <p>
              The prototype now supports protected project CRUD, paginated asset inventories,
              lifecycle tracking, and frontend workspace state on top of the Phase 3 auth foundation.
            </p>
            <div class="hero-grid">
              <article class="hero-blade">
                <strong>Project Scope</strong>
                <p>User-owned projects can now be created, updated, filtered, and removed.</p>
              </article>
              <article class="hero-blade">
                <strong>Asset Inventory</strong>
                <p>Asset records now exist before upload so metadata and status transitions are already modeled.</p>
              </article>
              <article class="hero-blade">
                <strong>Next Layer</strong>
                <p>Phase 5 can focus on upload and object storage because the domain model is already active.</p>
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
                This account now owns projects, draft asset metadata, and future queue-visible workflows.
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
                <h2>Identity, projects, and asset inventory now share one modular shell.</h2>
              </div>
              <span class="session-pill">Access token present • refresh cookie managed server-side</span>
            </div>
            <div class="status-grid">
              <div class="status-strip">
                <strong>User Scope</strong>
                <div class="status-value">\${state.projects?.totalItems ?? 0}</div>
                <p>Project list results are now filtered, paginated, and enforced per account.</p>
              </div>
              <div class="status-strip">
                <strong>Selected Project</strong>
                <div class="status-value">\${state.selectedProject?.assetCount ?? 0}</div>
                <p>Asset counts and lifecycle summaries update on the currently active project.</p>
              </div>
              <div class="status-strip">
                <strong>WebSocket Target</strong>
                <div class="status-value">Prepared</div>
                <p>The future realtime base remains tracked as <span class="code-pill">\${escapeHtml(config.wsBaseUrl)}</span>.</p>
              </div>
            </div>
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
        .getElementById("asset-create-form")
        ?.addEventListener("submit", handleAssetCreate);
    }

    render();
    void restoreSession();
  `;
}

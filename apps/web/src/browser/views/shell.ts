export const shellViewModuleSource = `
    function renderShellNav() {
      return \`
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
      \`;
    }

    function renderSignedInHeader() {
      return \`
        <div class="shell-header">
          <div>
            <span class="mini-label">Protected Experience</span>
            <h2>Identity, projects, and processing state now stay synchronized inside one modular shell.</h2>
          </div>
          <span class="session-pill">Access token present • \${escapeHtml(realtimeStatusLabel().toLowerCase())}</span>
        </div>
      \`;
    }

    function renderSignedInStatusGrid() {
      return \`
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
      \`;
    }

    function renderFeatureMap() {
      return \`
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
      \`;
    }

    function renderMessageBanner() {
      return \`<p class="message" data-tone="\${state.messageTone}">\${escapeHtml(state.message)}</p>\`;
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

    function renderSignedInShell() {
      return \`
        <section class="shell" data-shell-root="true">
          <aside class="shell-sidebar">
            <span class="eyebrow">Workspace Shell</span>
            <div>
              <h3>\${escapeHtml(state.user.email)}</h3>
              <p class="shell-nav-note">
                This account now owns projects, uploaded assets, and queue-visible worker workflows.
              </p>
            </div>
            <div id="shell-nav-slot">\${renderShellNav()}</div>
            <div class="status-strip">
              <strong>Infrastructure</strong>
              <div id="shell-infra-slot">\${renderInfrastructure()}</div>
            </div>
            <button class="ghost-button" type="button" id="logout-button">Sign Out</button>
          </aside>
          <section class="shell-main">
            <div id="shell-header-slot">\${renderSignedInHeader()}</div>
            <div id="shell-status-grid-slot">\${renderSignedInStatusGrid()}</div>
            <div id="shell-realtime-slot">\${renderRealtimePanel()}</div>
            <div id="shell-active-section-slot">\${renderActiveSection()}</div>
            <div id="shell-feature-map-slot">\${renderFeatureMap()}</div>
            <div id="shell-message-slot">\${renderMessageBanner()}</div>
          </section>
        </section>
      \`;
    }

    function setSlotMarkup(id, markup) {
      const element = document.getElementById(id);

      if (!element || element.innerHTML === markup) {
        return;
      }

      element.innerHTML = markup;
    }

    function setElementHidden(id, hidden) {
      const element = document.getElementById(id);

      if (!element || element.hidden === hidden) {
        return;
      }

      element.hidden = hidden;
    }

    function syncInputValue(id, value) {
      const element = document.getElementById(id);

      if (!(element instanceof HTMLInputElement) || element.value === value) {
        return;
      }

      element.value = value;
    }

    function syncTextareaValue(id, value) {
      const element = document.getElementById(id);

      if (!(element instanceof HTMLTextAreaElement) || element.value === value) {
        return;
      }

      element.value = value;
    }

    function syncSelectValue(id, value) {
      const element = document.getElementById(id);

      if (!(element instanceof HTMLSelectElement) || element.value === value) {
        return;
      }

      element.value = value;
    }

    function syncActiveSectionSlot() {
      const activeSectionSlot = document.getElementById("shell-active-section-slot");

      if (!activeSectionSlot) {
        return;
      }

      if (state.activeSection === "projects") {
        const currentRoot = activeSectionSlot.firstElementChild;

        if (
          !(currentRoot instanceof HTMLElement) ||
          currentRoot.dataset.activeSectionRoot !== "projects"
        ) {
          activeSectionSlot.innerHTML = renderProjectsSection();
        }

        setSlotMarkup("projects-left-header-slot", renderProjectsLeftHeader());
        setSlotMarkup("projects-left-filter-slot", renderProjectsFilterForm());
        setSlotMarkup("projects-left-create-slot", renderProjectCreateForm());
        setSlotMarkup("projects-left-list-slot", renderProjectsLeftList());
        setSlotMarkup("projects-left-pagination-slot", renderProjectsPagination());
        syncInputValue("projects-filter-query", state.projectsQuery);
        setSlotMarkup("projects-right-empty-slot", renderProjectEmptyState());
        setElementHidden("projects-right-empty-slot", Boolean(state.selectedProject));
        setElementHidden("projects-right-detail-slot", !state.selectedProject);
        setElementHidden("projects-right-assets-shell-slot", !state.selectedProject);
        setSlotMarkup("projects-right-header-slot", renderProjectsRightHeader());
        setSlotMarkup("projects-right-chips-slot", renderProjectsRightChips());
        setSlotMarkup("projects-right-edit-slot", renderProjectEditForm());
        syncInputValue("project-edit-name", state.selectedProject?.name ?? "");
        syncTextareaValue(
          "project-edit-description",
          state.selectedProject?.description ?? ""
        );
        setSlotMarkup("projects-right-assets-header-slot", renderProjectAssetsHeader());
        setSlotMarkup("projects-right-assets-filter-slot", renderAssetFilterForm());
        syncInputValue("asset-filter-query", state.assetQuery);
        syncSelectValue("asset-filter-status", state.assetStatus);
        syncSelectValue("asset-filter-kind", state.assetKind);
        setSlotMarkup(
          "projects-right-assets-upload-slot",
          state.selectedProject ? renderUploadPanel() : ""
        );
        setSlotMarkup("projects-right-assets-create-slot", renderAssetCreateForm());
        setSlotMarkup("projects-right-assets-list-slot", renderAssetsListSection());
        setSlotMarkup("projects-right-assets-pagination-slot", renderAssetsPagination());
        return;
      }

      if (state.activeSection === "jobs") {
        const currentRoot = activeSectionSlot.firstElementChild;

        if (
          !(currentRoot instanceof HTMLElement) ||
          currentRoot.dataset.activeSectionRoot !== "jobs"
        ) {
          activeSectionSlot.innerHTML = renderJobsSection();
        }

        setSlotMarkup("jobs-left-header-slot", renderJobsLeftHeader());
        setSlotMarkup("jobs-left-filter-slot", renderJobsFilterForm());
        setSlotMarkup("jobs-left-list-slot", renderJobsLeftList());
        setSlotMarkup("jobs-left-pagination-slot", renderJobsPagination());
        setSlotMarkup("jobs-right-content-slot", renderJobsRightContent());
        return;
      }

      setSlotMarkup("shell-active-section-slot", renderOverviewSection());
    }

    function syncSignedInShell() {
      const viewportSnapshot = readViewportSnapshot();

      setSlotMarkup("shell-nav-slot", renderShellNav());
      setSlotMarkup("shell-infra-slot", renderInfrastructure());
      setSlotMarkup("shell-header-slot", renderSignedInHeader());
      setSlotMarkup("shell-status-grid-slot", renderSignedInStatusGrid());
      setSlotMarkup("shell-realtime-slot", renderRealtimePanel());
      syncActiveSectionSlot();
      setSlotMarkup("shell-message-slot", renderMessageBanner());

      restoreViewportSnapshot(viewportSnapshot);
    }

    function renderNow() {
      if (!appElement) {
        return;
      }

      if (state.user) {
        const shellRoot = appElement.querySelector('[data-shell-root="true"]');

        if (!shellRoot) {
          appElement.innerHTML = renderSignedInShell();
          renderedMarkup = "__signed_in_shell__";
        }

        syncSignedInShell();
        document.body.dataset.auth = "true";
        return;
      }

      const nextMarkup = renderSignedOut();

      if (nextMarkup !== renderedMarkup) {
        appElement.innerHTML = nextMarkup;
        renderedMarkup = nextMarkup;
      }

      document.body.dataset.auth = "false";
    }

    function render() {
      if (renderFrameId !== null) {
        return;
      }

      renderFrameId = window.requestAnimationFrame(() => {
        renderFrameId = null;
        renderNow();
      });
    }
`;

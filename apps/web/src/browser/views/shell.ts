export const shellViewModuleSource = `
    function renderShellNav() {
      return \`
        <div class="shell-nav">
          <button class="shell-link" type="button" data-section="overview" data-active="\${state.activeSection === "overview"}">
            <span>Overview</span>
            <span class="code-pill">01</span>
          </button>
          <button class="shell-link" type="button" data-section="projects" data-active="\${state.activeSection === "projects"}">
            <span>Library</span>
            <span class="code-pill">02</span>
          </button>
          <button class="shell-link" type="button" data-section="jobs" data-active="\${state.activeSection === "jobs"}">
            <span>Queue</span>
            <span class="code-pill">03</span>
          </button>
        </div>
      \`;
    }

    function renderSignedInHeader() {
      return \`
        <div class="shell-header">
          <div>
            <span class="mini-label">Workspace</span>
            <h2>Move from project setup to asset processing without leaving the same working surface.</h2>
          </div>
          <span class="session-pill">\${escapeHtml(state.user.email)} • \${escapeHtml(realtimeStatusLabel().toLowerCase())}</span>
        </div>
      \`;
    }

    function renderSignedInStatusGrid() {
      return \`
        <div class="status-grid">
          <div class="status-strip">
            <strong>Projects</strong>
            <div class="status-value">\${state.projects?.totalItems ?? 0}</div>
            <p>Switch between workspaces, rename them, and keep every asset flow scoped to this account.</p>
          </div>
          <div class="status-strip">
            <strong>Active Assets</strong>
            <div class="status-value">\${state.selectedProject?.assetCount ?? 0}</div>
            <p>Uploads, manual drafts, and lifecycle changes update on the selected project as work moves forward.</p>
          </div>
          <div class="status-strip">
            <strong>Live Sync</strong>
            <div class="status-value">\${escapeHtml(realtimeStatusValue())}</div>
            <p>Job progress and delivery notices stay current through the socket layer, with polling fallback if needed.</p>
          </div>
        </div>
      \`;
    }

    function renderFeatureMap() {
      return \`
        <section>
          <span class="mini-label">System Map</span>
          <div class="feature-grid">
            \${featureCards
              .map(
                (feature) => \`
                  <article class="feature-card">
                    <strong>\${feature.label}</strong>
                    <p>\${feature.responsibility}</p>
                    <p class="muted-note"><span class="code-pill">\${feature.nextPhase}</span></p>
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
                Projects, uploads, and queue activity stay connected here.
              </p>
            </div>
            <div id="shell-nav-slot">\${renderShellNav()}</div>
            <div class="status-strip">
              <strong>Runtime</strong>
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

    function ensureSlotMarkup(id, markup) {
      const element = document.getElementById(id);

      if (!element || element.innerHTML !== "") {
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

    function syncTextContent(id, value) {
      const element = document.getElementById(id);

      if (!element || element.textContent === value) {
        return;
      }

      element.textContent = value;
    }

    function syncDisabledState(id, disabled) {
      const element = document.getElementById(id);

      if (!(element instanceof HTMLButtonElement) || element.disabled === disabled) {
        return;
      }

      element.disabled = disabled;
    }

    function syncDataAttribute(id, key, value) {
      const element = document.getElementById(id);

      if (!(element instanceof HTMLElement)) {
        return;
      }

      if (element.dataset[key] === value) {
        return;
      }

      element.dataset[key] = value;
    }

    function syncUploadPanel() {
      ensureSlotMarkup(
        "projects-right-assets-upload-slot",
        state.selectedProject ? renderUploadPanel() : ""
      );
      setSlotMarkup("asset-upload-meta-slot", renderUploadMeta());
      setSlotMarkup("asset-upload-progress-slot", renderUploadProgress());
      syncSelectValue("asset-upload-kind", state.uploadKind);
      syncDataAttribute(
        "asset-upload-dropzone",
        "drag",
        state.uploadDragActive ? "true" : "false"
      );

      const selectedFile = Boolean(state.pendingUploadFile);
      const submitLabel = state.uploadBusy
        ? "Uploading..."
        : selectedFile
          ? "Upload To Storage"
          : "Choose A File First";

      syncTextContent("asset-upload-submit-button", submitLabel);
      syncDisabledState(
        "asset-upload-submit-button",
        !selectedFile || state.uploadBusy
      );
    }

    function syncAssetsPagination() {
      ensureSlotMarkup(
        "projects-right-assets-pagination-slot",
        renderAssetsPagination()
      );
      syncTextContent(
        "assets-pagination-label",
        \`Page \${state.assetPage} of \${state.assets?.totalPages ?? 1}\`
      );
      syncDisabledState(
        "assets-pagination-prev-button",
        !state.assets || state.assetPage <= 1
      );
      syncDisabledState(
        "assets-pagination-next-button",
        !state.assets || state.assetPage >= state.assets.totalPages
      );
    }

    function syncAssetCreateForm() {
      ensureSlotMarkup(
        "projects-right-assets-create-slot",
        renderAssetCreateForm()
      );
      syncInputValue(
        "asset-create-original-filename",
        state.assetCreateDraftOriginalFilename
      );
      syncInputValue(
        "asset-create-content-type",
        state.assetCreateDraftContentType
      );
      syncInputValue("asset-create-byte-size", state.assetCreateDraftByteSize);
      syncSelectValue("asset-create-kind", state.assetCreateDraftKind);
      syncSelectValue("asset-create-status", state.assetCreateDraftStatus);
    }

    function syncAssetRows() {
      const emptyStateSlot = document.getElementById(
        "projects-right-assets-empty-state-slot"
      );
      const itemsContainer = document.getElementById(
        "projects-right-assets-items-container"
      );

      if (!(emptyStateSlot instanceof HTMLElement) || !(itemsContainer instanceof HTMLElement)) {
        return;
      }

      const items = state.assets?.items ?? [];
      const showEmpty = !state.selectedProject || items.length === 0;

      setSlotMarkup(
        "projects-right-assets-empty-state-slot",
        showEmpty ? renderAssetListEmptyState() : ""
      );
      setElementHidden("projects-right-assets-empty-state-slot", !showEmpty);
      setElementHidden("projects-right-assets-items-container", showEmpty);

      if (showEmpty) {
        if (itemsContainer.innerHTML !== "") {
          itemsContainer.innerHTML = "";
        }
        return;
      }

      const expectedIds = new Set(items.map((asset) => asset.id));
      const existingSlots = Array.from(itemsContainer.children);

      for (const slot of existingSlots) {
        if (!(slot instanceof HTMLElement)) {
          continue;
        }

        const assetId = slot.dataset.assetRowId;

        if (!assetId || expectedIds.has(assetId)) {
          continue;
        }

        slot.remove();
      }

      for (const asset of items) {
        const slotId = \`asset-row-slot-\${asset.id}\`;
        const markup = renderAssetRow(asset);
        let rowSlot = document.getElementById(slotId);

        if (!(rowSlot instanceof HTMLElement)) {
          rowSlot = document.createElement("div");
          rowSlot.id = slotId;
          rowSlot.dataset.assetRowId = asset.id;
        }

        if (rowSlot.innerHTML !== markup) {
          rowSlot.innerHTML = markup;
        }

        if (rowSlot.parentElement !== itemsContainer) {
          itemsContainer.append(rowSlot);
          continue;
        }

        if (itemsContainer.children.item(items.indexOf(asset)) !== rowSlot) {
          itemsContainer.append(rowSlot);
        }
      }
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
        ensureSlotMarkup("projects-left-filter-slot", renderProjectsFilterForm());
        ensureSlotMarkup("projects-left-create-slot", renderProjectCreateForm());
        setSlotMarkup("projects-left-list-slot", renderProjectsLeftList());
        setSlotMarkup("projects-left-pagination-slot", renderProjectsPagination());
        syncInputValue("projects-filter-query", state.projectsQueryDraft);
        setSlotMarkup("projects-right-empty-slot", renderProjectEmptyState());
        setElementHidden("projects-right-empty-slot", Boolean(state.selectedProject));
        setElementHidden("projects-right-detail-slot", !state.selectedProject);
        setElementHidden("projects-right-assets-shell-slot", !state.selectedProject);
        setSlotMarkup("projects-right-header-slot", renderProjectsRightHeader());
        setSlotMarkup("projects-right-chips-slot", renderProjectsRightChips());
        ensureSlotMarkup("projects-right-edit-slot", renderProjectEditForm());
        syncInputValue("project-edit-name", state.projectEditDraftName);
        syncTextareaValue(
          "project-edit-description",
          state.projectEditDraftDescription
        );
        setSlotMarkup("projects-right-assets-header-slot", renderProjectAssetsHeader());
        ensureSlotMarkup(
          "projects-right-assets-filter-slot",
          renderAssetFilterForm()
        );
        syncInputValue("asset-filter-query", state.assetQueryDraft);
        syncSelectValue("asset-filter-status", state.assetStatusDraft);
        syncSelectValue("asset-filter-kind", state.assetKindDraft);
        syncTextContent(
          "projects-right-assets-count-pill",
          \`\${state.assets ? state.assets.totalItems : 0} visible\`
        );
        syncUploadPanel();
        syncAssetCreateForm();
        ensureSlotMarkup(
          "projects-right-assets-list-slot",
          renderAssetsListSection()
        );
        setSlotMarkup(
          "projects-right-assets-refresh-slot",
          state.assetsBusy ? '<p class="muted-note">Refreshing asset inventory...</p>' : ""
        );
        syncAssetRows();
        syncAssetsPagination();
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
        ensureSlotMarkup("jobs-left-filter-slot", renderJobsFilterForm());
        setSlotMarkup("jobs-left-list-slot", renderJobsLeftList());
        setSlotMarkup("jobs-left-pagination-slot", renderJobsPagination());
        syncSelectValue("jobs-filter-status", state.jobsStatusDraft);
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

export const workspaceViewModuleSource = `
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

    function renderJobsLeftPane() {
      return \`
        <div id="jobs-left-header-slot">\${renderJobsLeftHeader()}</div>
        <div id="jobs-left-filter-slot">\${renderJobsFilterForm()}</div>
        <div id="jobs-left-list-slot">\${renderJobsLeftList()}</div>
        <div id="jobs-left-pagination-slot">\${renderJobsPagination()}</div>
      \`;
    }

    function renderJobsLeftHeader() {
      return \`
        <div class="list-header">
          <div>
            <strong>Job Queue</strong>
            <p>Review queued, active, completed, and failed worker activity for the selected project.</p>
          </div>
          <span class="code-pill">\${state.jobs ? state.jobs.totalItems : 0} total</span>
        </div>
      \`;
    }

    function renderJobsFilterForm() {
      return \`
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
      \`;
    }

    function renderJobsLeftList() {
      return \`
        \${state.jobsBusy ? '<p class="muted-note">Refreshing job queue...</p>' : ""}
        \${renderJobsList()}
      \`;
    }

    function renderJobsPagination() {
      return \`
        <div class="pagination">
          <button class="ghost-button" type="button" data-pagination-target="jobs" data-direction="prev" \${!state.jobs || state.jobsPage <= 1 ? "disabled" : ""}>Previous</button>
          <span class="muted-note">Page \${state.jobsPage} of \${state.jobs?.totalPages ?? 1}</span>
          <button class="ghost-button" type="button" data-pagination-target="jobs" data-direction="next" \${!state.jobs || state.jobsPage >= state.jobs.totalPages ? "disabled" : ""}>Next</button>
        </div>
      \`;
    }

    function renderJobsRightPane() {
      return \`
        <div id="jobs-right-content-slot">\${renderJobsRightContent()}</div>
      \`;
    }

    function renderJobsRightContent() {
      return \`
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
      \`;
    }

    function renderJobsSection() {
      return \`
        <div class="workspace-grid" data-active-section-root="jobs">
          <section id="jobs-left-slot" class="workspace-pane workspace-stack">\${renderJobsLeftPane()}</section>
          <section id="jobs-right-slot" class="workspace-pane workspace-stack">\${renderJobsRightPane()}</section>
        </div>
      \`;
    }

    function renderProjectsLeftPane() {
      return \`
        <div id="projects-left-header-slot">\${renderProjectsLeftHeader()}</div>
        <div id="projects-left-filter-slot">\${renderProjectsFilterForm()}</div>
        <div id="projects-left-create-slot">\${renderProjectCreateForm()}</div>
        <div id="projects-left-list-slot">\${renderProjectsLeftList()}</div>
        <div id="projects-left-pagination-slot">\${renderProjectsPagination()}</div>
      \`;
    }

    function renderProjectsLeftHeader() {
      return \`
        <div class="list-header">
          <div>
            <strong>Projects</strong>
            <p>Search, create, and switch between user-scoped workspaces.</p>
          </div>
          <span class="code-pill">\${state.projects ? state.projects.totalItems : 0} total</span>
        </div>
      \`;
    }

    function renderProjectsFilterForm() {
      return \`
        <form id="projects-filter-form">
          <label>
            Search Projects
            <input id="projects-filter-query" type="search" name="query" placeholder="Filter by name or description" autocomplete="off" />
          </label>
          <div class="form-actions">
            <button class="ghost-button" type="submit">Apply Filter</button>
          </div>
        </form>
      \`;
    }

    function renderProjectCreateForm() {
      return \`
        <form id="project-create-form" class="section-divider">
          <strong>Create Project</strong>
          <label>
            Project Name
            <input type="text" name="name" placeholder="Prototype Workspace" autocomplete="off" required />
          </label>
          <label>
            Description
            <textarea name="description" placeholder="What this workspace is for" autocomplete="off"></textarea>
          </label>
          <div class="form-actions">
            <button class="primary-button" type="submit">Create Project</button>
          </div>
        </form>
      \`;
    }

    function renderProjectsLeftList() {
      return \`
        <div class="section-divider">
          \${state.projectsBusy ? '<p class="muted-note">Refreshing projects...</p>' : ""}
          \${renderProjectsList()}
        </div>
      \`;
    }

    function renderProjectsPagination() {
      return \`
        <div class="pagination">
          <button class="ghost-button" type="button" data-pagination-target="projects" data-direction="prev" \${!state.projects || state.projectsPage <= 1 ? "disabled" : ""}>Previous</button>
          <span class="muted-note">Page \${state.projectsPage} of \${state.projects?.totalPages ?? 1}</span>
          <button class="ghost-button" type="button" data-pagination-target="projects" data-direction="next" \${!state.projects || state.projectsPage >= state.projects.totalPages ? "disabled" : ""}>Next</button>
        </div>
      \`;
    }

    function renderProjectsRightPane() {
      return \`
        <div id="projects-right-empty-slot">\${renderProjectEmptyState()}</div>
        <div id="projects-right-detail-slot" \${state.selectedProject ? "" : "hidden"}>
          <div id="projects-right-header-slot">\${renderProjectsRightHeader()}</div>
          <div id="projects-right-chips-slot">\${renderProjectsRightChips()}</div>
          <div id="projects-right-edit-slot">\${renderProjectEditForm()}</div>
          <div id="projects-right-assets-shell-slot" class="section-divider workspace-stack" \${state.selectedProject ? "" : "hidden"}>
            <div id="projects-right-assets-header-slot">\${renderProjectAssetsHeader()}</div>
            <div id="projects-right-assets-filter-slot">\${renderAssetFilterForm()}</div>
            <div id="projects-right-assets-upload-slot">\${state.selectedProject ? renderUploadPanel() : ""}</div>
            <div id="projects-right-assets-create-slot">\${renderAssetCreateForm()}</div>
            <div id="projects-right-assets-list-slot">\${renderAssetsListSection()}</div>
            <div id="projects-right-assets-pagination-slot">\${renderAssetsPagination()}</div>
          </div>
        </div>
      \`;
    }

    function renderProjectEmptyState() {
      if (state.selectedProject) {
        return "";
      }

      return \`
        <div class="empty-state">
          <strong>No active project selected</strong>
          <p>Create a project or choose one from the left column to unlock asset inventory management for this account.</p>
        </div>
      \`;
    }

    function renderProjectsRightHeader() {
      if (!state.selectedProject) {
        return "";
      }

      return \`
        <div class="list-header">
          <div>
            <strong>\${escapeHtml(state.selectedProject.name)}</strong>
            <p>Project detail, editable metadata, and its current asset inventory.</p>
          </div>
          <span class="code-pill">\${state.selectedProject.assetCount} assets</span>
        </div>
      \`;
    }

    function renderProjectsRightChips() {
      return state.selectedProject
        ? renderLifecycleChips(state.selectedProject.assetStatusCounts)
        : "";
    }

    function renderProjectEditForm() {
      if (!state.selectedProject) {
        return "";
      }

      return \`
        <form id="project-edit-form">
          <label>
            Project Name
            <input id="project-edit-name" type="text" name="name" autocomplete="off" required />
          </label>
          <label>
            Description
            <textarea id="project-edit-description" name="description" autocomplete="off"></textarea>
          </label>
          <div class="project-actions">
            <button class="primary-button" type="submit">Save Project</button>
            <button class="ghost-button" type="button" id="project-delete-button">Delete Project</button>
          </div>
        </form>
      \`;
    }

    function renderProjectAssetsHeader() {
      if (!state.selectedProject) {
        return "";
      }

      return \`
        <div class="list-header">
          <div>
            <strong>Asset Inventory</strong>
            <p>Upload source files into MinIO, filter the resulting inventory, and keep manual draft records when needed.</p>
          </div>
          <span class="code-pill">\${state.assets ? state.assets.totalItems : 0} visible</span>
        </div>
      \`;
    }

    function renderAssetFilterForm() {
      if (!state.selectedProject) {
        return "";
      }

      return \`
        <form id="asset-filter-form">
          <div class="field-grid">
            <label>
              Search Assets
              <input id="asset-filter-query" type="search" name="query" placeholder="Filename" autocomplete="off" />
            </label>
            <label>
              Status
              <select id="asset-filter-status" name="status">
                <option value="all">All statuses</option>
                \${assetLifecycleStatuses
                  .map(
                    (status) => \`<option value="\${status}">\${status}</option>\`
                  )
                  .join("")}
              </select>
            </label>
            <label>
              Kind
              <select id="asset-filter-kind" name="kind">
                <option value="all">All kinds</option>
                \${assetKinds
                  .map(
                    (kind) => \`<option value="\${kind}">\${kind}</option>\`
                  )
                  .join("")}
              </select>
            </label>
          </div>
          <div class="form-actions">
            <button class="ghost-button" type="submit">Apply Asset Filters</button>
          </div>
        </form>
      \`;
    }

    function renderAssetCreateForm() {
      if (!state.selectedProject) {
        return "";
      }

      return \`
        <form id="asset-create-form">
          <strong>Create Manual Draft Record</strong>
          <div class="field-grid">
            <label>
              Filename
              <input type="text" name="originalFilename" placeholder="cover-art.png" autocomplete="off" required />
            </label>
            <label>
              Content Type
              <input type="text" name="contentType" placeholder="image/png" autocomplete="off" required />
            </label>
            <label>
              Size In Bytes
              <input type="number" name="byteSize" min="0" step="1" value="0" autocomplete="off" required />
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
      \`;
    }

    function renderAssetsListSection() {
      if (!state.selectedProject) {
        return "";
      }

      return \`
        \${state.assetsBusy ? '<p class="muted-note">Refreshing asset inventory...</p>' : ""}
        \${renderAssetList()}
      \`;
    }

    function renderAssetsPagination() {
      if (!state.selectedProject) {
        return "";
      }

      return \`
        <div class="pagination">
          <button class="ghost-button" type="button" data-pagination-target="assets" data-direction="prev" \${!state.assets || state.assetPage <= 1 ? "disabled" : ""}>Previous</button>
          <span class="muted-note">Page \${state.assetPage} of \${state.assets?.totalPages ?? 1}</span>
          <button class="ghost-button" type="button" data-pagination-target="assets" data-direction="next" \${!state.assets || state.assetPage >= state.assets.totalPages ? "disabled" : ""}>Next</button>
        </div>
      \`;
    }

    function renderProjectsSection() {
      return \`
        <div class="workspace-grid" data-active-section-root="projects">
          <section id="projects-left-slot" class="workspace-pane workspace-stack">\${renderProjectsLeftPane()}</section>
          <section id="projects-right-slot" class="workspace-pane workspace-stack">\${renderProjectsRightPane()}</section>
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
`;

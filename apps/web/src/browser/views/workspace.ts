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
            <p>Create a workspace to start collecting uploads, drafts, and processing history.</p>
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

    function renderAssetListEmptyState() {
      if (!state.selectedProject) {
        return \`
          <div class="empty-state">
            <strong>Select a project</strong>
            <p>Choose a workspace to manage its files, drafts, and queue activity.</p>
          </div>
        \`;
      }

      return \`
        <div class="empty-state">
          <strong>No assets yet</strong>
          <p>Upload a source file or add a quick draft record to start the pipeline.</p>
        </div>
      \`;
    }

    function renderAssetRow(asset) {
      return \`
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
              ? \`Stored source: <span class="code-pill">\${escapeHtml(asset.objectKey)}</span>\`
              : "Metadata-only draft. Upload a file when you are ready to process it."}
          </p>
          <form data-asset-status-form="true" data-asset-id="\${asset.id}">
            <div class="field-grid">
              <label>
                Status
                <select name="status">
                  \${assetLifecycleStatuses
                    .map(
                      (status) => \`
                        <option value="\${status}" \${(state.assetItemStatusDrafts[asset.id] ?? asset.status) === status ? "selected" : ""}>\${status}</option>
                      \`
                    )
                    .join("")}
                </select>
              </label>
            </div>
            <div class="inline-actions">
              <button class="ghost-button" type="submit">Apply Status</button>
              \${asset.objectKey && asset.kind === "image"
                ? \`<button class="ghost-button" type="button" data-asset-process="true" data-asset-id="\${asset.id}" \${asset.status === "queued" || asset.status === "processing" ? "disabled" : ""}>Generate Thumbnail</button>\`
                : ""}
              \${asset.objectKey
                ? \`<button class="ghost-button" type="button" data-asset-download="true" data-asset-id="\${asset.id}" data-filename="\${escapeHtml(asset.originalFilename)}">Download Source</button>\`
                : ""}
            </div>
          </form>
        </article>
      \`;
    }

    function renderJobsList() {
      if (!state.selectedProject) {
        return \`
          <div class="empty-state">
            <strong>Select a project</strong>
            <p>Choose a workspace to review queue progress and finished outputs.</p>
          </div>
        \`;
      }

      if (!state.jobs || state.jobs.items.length === 0) {
        return \`
          <div class="empty-state">
            <strong>No jobs yet</strong>
            <p>Trigger thumbnail generation from the asset list to start the first run.</p>
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
                  <p>\${escapeHtml(job.kind)} • attempt \${job.attempts}/\${job.maxAttempts}</p>
                </div>
                <span class="summary-chip" data-status="\${job.status}">
                  <strong>\${job.status}</strong>
                  <span>\${escapeHtml(formatDate(job.updatedAt))}</span>
                </span>
              </div>
              <p class="muted-note">
                Queue <span class="code-pill">\${escapeHtml(job.queueName)}</span>
                • Job <span class="code-pill">\${escapeHtml(job.id)}</span>
              </p>
              \${job.failureReason
                ? \`<p class="message" data-tone="danger">\${escapeHtml(job.failureReason)}</p>\`
                : ""}
              \${thumbnail
                ? \`<p class="muted-note">Output <span class="code-pill">\${escapeHtml(thumbnail.objectKey)}</span></p>\`
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
            <strong>No activity yet</strong>
            <p>Completion and failure notices will appear here as jobs move through the queue.</p>
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
              <p>Processing updates appear here automatically while you work inside the shell.</p>
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
            Socket <span class="code-pill">\${escapeHtml(buildRealtimeSocketUrl())}</span>
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
      return \`
        <form id="asset-upload-form" class="workspace-subsection">
          <div class="subsection-head">
            <div>
              <strong>Upload Source Asset</strong>
              <p>Bring a real file into the workspace and keep it ready for processing.</p>
            </div>
            <span class="summary-chip" data-status="uploaded">Storage</span>
          </div>
          <div id="asset-upload-dropzone" class="upload-dropzone" data-upload-dropzone="true" data-drag="false">
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
              Supports image, audio, video, and document files up to 25 MB.
            </p>
            <div id="asset-upload-meta-slot"></div>
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
          <div id="asset-upload-progress-slot"></div>
          <div class="form-actions">
            <button id="asset-upload-submit-button" class="primary-button" type="submit">Choose A File First</button>
          </div>
        </form>
      \`;
    }

    function renderUploadMeta() {
      const selectedFile = state.pendingUploadFile;

      if (!selectedFile) {
        return "";
      }

      return \`
        <div class="upload-meta">
          <span class="code-pill">\${escapeHtml(selectedFile.name)}</span>
          <span class="code-pill">\${escapeHtml(selectedFile.type || "application/octet-stream")}</span>
          <span class="code-pill">\${escapeHtml(formatBytes(selectedFile.size))}</span>
        </div>
      \`;
    }

    function renderUploadProgress() {
      if (!state.uploadBusy && state.uploadProgress <= 0) {
        return "";
      }

      return \`
        <div class="upload-progress" aria-live="polite">
          <div class="upload-progress-bar">
            <span style="width: \${Math.max(state.uploadProgress, 6)}%"></span>
          </div>
          <p class="muted-note">
            \${state.uploadBusy ? \`Uploading \${state.uploadProgress}%\` : "Upload ready."}
          </p>
        </div>
      \`;
    }

    function renderOverviewSection() {
      const projectTotal = state.projects?.totalItems ?? 0;
      const selectedProjectAssets = state.selectedProject?.assetCount ?? 0;
      const lifecycleCoverage = state.selectedProject
        ? countLifecycleCoverage(state.selectedProject.assetStatusCounts)
        : 0;
      const selectedProjectName = state.selectedProject
        ? escapeHtml(state.selectedProject.name)
        : "No project selected";

      return \`
        <div class="content-grid">
          <div class="content-card">
            <strong>Projects</strong>
            <div class="status-value">\${projectTotal}</div>
            <p>Keep separate workspaces for campaigns, releases, or content batches.</p>
          </div>
          <div class="content-card">
            <strong>Active Assets</strong>
            <div class="status-value">\${selectedProjectAssets}</div>
            <p>The current workspace keeps both uploaded sources and metadata-only drafts in one place.</p>
          </div>
          <div class="content-card">
            <strong>Pipeline Coverage</strong>
            <div class="status-value">\${lifecycleCoverage}/\${assetLifecycleStatuses.length}</div>
            <p>Status moves from draft to completed as assets flow through upload and processing.</p>
          </div>
        </div>
        <div class="content-grid">
          <div class="content-card">
            <strong>Current Focus</strong>
            <p>\${selectedProjectName}</p>
            <p class="muted-note">
              \${state.selectedProject
                ? \`This workspace currently tracks \${escapeHtml(String(state.selectedProject.assetCount))} assets.\`
                : "Choose a workspace to unlock uploads, drafts, and jobs."}
            </p>
            \${state.selectedProject ? renderLifecycleChips(state.selectedProject.assetStatusCounts) : ""}
          </div>
          <div class="content-card">
            <strong>Recommended Flow</strong>
            <div class="workflow-list">
              <div class="workflow-step">
                <span class="code-pill">01</span>
                <p>Create or select a project.</p>
              </div>
              <div class="workflow-step">
                <span class="code-pill">02</span>
                <p>Upload a file or create a draft asset.</p>
              </div>
              <div class="workflow-step">
                <span class="code-pill">03</span>
                <p>Generate a thumbnail and monitor the queue.</p>
              </div>
            </div>
          </div>
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
            <strong>Processing Queue</strong>
            <p>Review active work, finished runs, and failures for the current project.</p>
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
              <select id="jobs-filter-status" name="status">
                <option value="all">All statuses</option>
                \${jobLifecycleStatuses
                  .map(
                    (status) => \`<option value="\${status}">\${status}</option>\`
                  )
                  .join("")}
              </select>
            </label>
          </div>
          <div class="form-actions">
            <button class="ghost-button" type="submit">Filter Queue</button>
            <button class="ghost-button" type="button" id="jobs-refresh-button">Refresh</button>
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
      const items = state.jobs?.items ?? [];
      const activeCount = items.filter((job) => job.status === "active").length;
      const queuedCount = items.filter((job) => job.status === "queued").length;
      const completedCount = items.filter((job) => job.status === "completed").length;
      const failedCount = items.filter((job) => job.status === "failed").length;

      return \`
        <div class="content-card">
          <strong>Queue Snapshot</strong>
          <div class="chip-cluster">
            <span class="summary-chip" data-status="processing"><strong>Active</strong><span>\${activeCount}</span></span>
            <span class="summary-chip" data-status="queued"><strong>Queued</strong><span>\${queuedCount}</span></span>
            <span class="summary-chip" data-status="completed"><strong>Done</strong><span>\${completedCount}</span></span>
            <span class="summary-chip" data-status="failed"><strong>Failed</strong><span>\${failedCount}</span></span>
          </div>
          <p>The worker currently reads source images, creates thumbnails, stores outputs, and writes the result back to the project history.</p>
        </div>
        <div class="content-card">
          <strong>What To Watch</strong>
          <p>
            \${state.selectedProject
              ? escapeHtml(state.selectedProject.name) + " currently has " + escapeHtml(String(state.selectedProject.assetCount)) + " assets available for processing."
              : "Select a project from the Library section to inspect its queue."}
          </p>
          <div class="workflow-list">
            <div class="workflow-step">
              <span class="code-pill">A</span>
              <p>Queued jobs are waiting for the worker.</p>
            </div>
            <div class="workflow-step">
              <span class="code-pill">B</span>
              <p>Completed jobs expose a thumbnail download.</p>
            </div>
            <div class="workflow-step">
              <span class="code-pill">C</span>
              <p>Failed jobs can be retried from the list.</p>
            </div>
          </div>
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
            <strong>Workspace Library</strong>
            <p>Create, search, and switch between your active projects.</p>
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
            <button class="ghost-button" type="submit">Filter Library</button>
          </div>
        </form>
      \`;
    }

    function renderProjectCreateForm() {
      return \`
        <form id="project-create-form" class="section-divider workspace-subsection">
          <div class="subsection-head">
            <div>
              <strong>Create Project</strong>
              <p>Start a new workspace for a release, client, or content batch.</p>
            </div>
          </div>
          <label>
            Project Name
            <input type="text" name="name" placeholder="Prototype Workspace" autocomplete="off" required />
          </label>
          <label>
            Description
            <textarea name="description" placeholder="Short note about what this project is for" autocomplete="off"></textarea>
          </label>
          <div class="form-actions">
            <button class="primary-button" type="submit">Create Workspace</button>
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
          <strong>No workspace selected</strong>
          <p>Pick a project from the library to edit details, upload files, and manage processing.</p>
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
            <p>Edit the workspace, then move straight into uploads and queue-ready assets.</p>
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
        <form id="project-edit-form" class="workspace-subsection">
          <div class="subsection-head">
            <div>
              <strong>Project Settings</strong>
              <p>Keep the workspace title and summary aligned with the work it contains.</p>
            </div>
          </div>
          <div class="field-grid">
            <label>
              Project Name
              <input id="project-edit-name" type="text" name="name" autocomplete="off" required />
            </label>
            <label class="field-span-2">
              Description
              <textarea id="project-edit-description" name="description" autocomplete="off"></textarea>
            </label>
          </div>
          <div class="project-actions">
            <button class="primary-button" type="submit">Save Project</button>
            <button class="ghost-button" type="button" id="project-delete-button">Delete Project</button>
          </div>
        </form>
      \`;
    }

    function renderProjectAssetsHeader() {
      return \`
        <div class="list-header">
          <div>
            <strong>Asset Inventory</strong>
            <p>Upload source files, keep draft placeholders, and move each asset through the workflow.</p>
          </div>
          <span id="projects-right-assets-count-pill" class="code-pill">0 visible</span>
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
              <input id="asset-filter-query" type="search" name="query" placeholder="Search by filename" autocomplete="off" />
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
            <button class="ghost-button" type="submit">Filter Assets</button>
          </div>
        </form>
      \`;
    }

    function renderAssetCreateForm() {
      if (!state.selectedProject) {
        return "";
      }

      return \`
        <form id="asset-create-form" class="workspace-subsection">
          <div class="subsection-head">
            <div>
              <strong>Create Draft Asset</strong>
              <p>Add metadata first when the real source file is not ready yet.</p>
            </div>
            <span class="summary-chip" data-status="draft">Draft</span>
          </div>
          <div class="field-grid">
            <label>
              Filename
              <input id="asset-create-original-filename" type="text" name="originalFilename" placeholder="cover-art.png" autocomplete="off" required />
            </label>
            <label>
              Content Type
              <input id="asset-create-content-type" type="text" name="contentType" placeholder="image/png" autocomplete="off" required />
            </label>
            <label>
              Size In Bytes
              <input id="asset-create-byte-size" type="number" name="byteSize" min="0" step="1" value="0" autocomplete="off" required />
            </label>
            <label>
              Kind
              <select id="asset-create-kind" name="kind">
                \${assetKinds
                  .map((kind) => \`<option value="\${kind}">\${kind}</option>\`)
                  .join("")}
              </select>
            </label>
            <label>
              Initial Status
              <select id="asset-create-status" name="status">
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
            <button class="primary-button" type="submit">Add Draft Asset</button>
          </div>
        </form>
      \`;
    }

    function renderAssetsListSection() {
      return \`
        <div id="projects-right-assets-refresh-slot"></div>
        <div id="projects-right-assets-body-slot">
          <div id="projects-right-assets-empty-state-slot"></div>
          <div id="projects-right-assets-items-container" class="asset-list"></div>
        </div>
      \`;
    }

    function renderAssetsPagination() {
      return \`
        <div class="pagination">
          <button id="assets-pagination-prev-button" class="ghost-button" type="button" data-pagination-target="assets" data-direction="prev">Previous</button>
          <span id="assets-pagination-label" class="muted-note">Page 1 of 1</span>
          <button id="assets-pagination-next-button" class="ghost-button" type="button" data-pagination-target="assets" data-direction="next">Next</button>
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

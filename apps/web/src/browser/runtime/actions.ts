export const actionsRuntimeModuleSource = `
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
      state.projectsQueryDraft = state.projectsQuery;
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

        state.projectEditDraftProjectId = project.id;
        state.projectEditDraftName = project.name;
        state.projectEditDraftDescription = project.description ?? "";
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
      state.assetQueryDraft = state.assetQuery;
      state.assetStatusDraft = state.assetStatus;
      state.assetKindDraft = state.assetKind;
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
      state.jobsStatusDraft = state.jobsStatus;
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
        state.assetCreateDraftOriginalFilename = "";
        state.assetCreateDraftContentType = "";
        state.assetCreateDraftByteSize = "0";
        state.assetCreateDraftKind = "image";
        state.assetCreateDraftStatus = "draft";
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

        delete state.assetItemStatusDrafts[assetId];
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
`;

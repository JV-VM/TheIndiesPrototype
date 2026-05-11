export const eventRuntimeModuleSource = `
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
      const assetFilterStatus = findClosestTarget(event, "#asset-filter-status");

      if (assetFilterStatus instanceof HTMLSelectElement) {
        state.assetStatusDraft = assetFilterStatus.value;
        return;
      }

      const assetFilterKind = findClosestTarget(event, "#asset-filter-kind");

      if (assetFilterKind instanceof HTMLSelectElement) {
        state.assetKindDraft = assetFilterKind.value;
        return;
      }

      const assetCreateKind = findClosestTarget(event, "#asset-create-kind");

      if (assetCreateKind instanceof HTMLSelectElement) {
        state.assetCreateDraftKind = assetCreateKind.value;
        return;
      }

      const assetCreateStatus = findClosestTarget(event, "#asset-create-status");

      if (assetCreateStatus instanceof HTMLSelectElement) {
        state.assetCreateDraftStatus = assetCreateStatus.value;
        return;
      }

      const jobsFilterStatus = findClosestTarget(event, "#jobs-filter-status");

      if (jobsFilterStatus instanceof HTMLSelectElement) {
        state.jobsStatusDraft = jobsFilterStatus.value;
        return;
      }

      const assetStatusForm = findClosestTarget(event, "[data-asset-status-form]");

      if (assetStatusForm instanceof HTMLFormElement) {
        const select = assetStatusForm.querySelector('select[name="status"]');

        if (select instanceof HTMLSelectElement && assetStatusForm.dataset.assetId) {
          state.assetItemStatusDrafts[assetStatusForm.dataset.assetId] = select.value;
        }

        return;
      }

      if (findClosestTarget(event, "#asset-upload-input")) {
        handleUploadInputChange(event);
        return;
      }

      if (findClosestTarget(event, "#asset-upload-kind")) {
        handleUploadKindChange(event);
      }
    }

    function handleDelegatedInput(event) {
      const projectsFilterInput = findClosestTarget(event, "#projects-filter-query");

      if (projectsFilterInput instanceof HTMLInputElement) {
        state.projectsQueryDraft = projectsFilterInput.value;
        return;
      }

      const assetFilterInput = findClosestTarget(event, "#asset-filter-query");

      if (assetFilterInput instanceof HTMLInputElement) {
        state.assetQueryDraft = assetFilterInput.value;
        return;
      }

      const assetCreateOriginalFilename = findClosestTarget(
        event,
        "#asset-create-original-filename"
      );

      if (assetCreateOriginalFilename instanceof HTMLInputElement) {
        state.assetCreateDraftOriginalFilename =
          assetCreateOriginalFilename.value;
        return;
      }

      const assetCreateContentType = findClosestTarget(
        event,
        "#asset-create-content-type"
      );

      if (assetCreateContentType instanceof HTMLInputElement) {
        state.assetCreateDraftContentType = assetCreateContentType.value;
        return;
      }

      const assetCreateByteSize = findClosestTarget(event, "#asset-create-byte-size");

      if (assetCreateByteSize instanceof HTMLInputElement) {
        state.assetCreateDraftByteSize = assetCreateByteSize.value;
        return;
      }

      const projectNameInput = findClosestTarget(event, "#project-edit-name");

      if (projectNameInput instanceof HTMLInputElement) {
        state.projectEditDraftName = projectNameInput.value;
        return;
      }

      const projectDescriptionInput = findClosestTarget(
        event,
        "#project-edit-description"
      );

      if (projectDescriptionInput instanceof HTMLTextAreaElement) {
        state.projectEditDraftDescription = projectDescriptionInput.value;
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
      appElement.addEventListener("input", handleDelegatedInput);
      appElement.addEventListener("dragenter", handleDelegatedDragEnter);
      appElement.addEventListener("dragover", handleDelegatedDragOver);
      appElement.addEventListener("dragleave", handleDelegatedDragLeave);
      appElement.addEventListener("drop", handleDelegatedDrop);
    }

    renderNow();
    void restoreSession();
`;

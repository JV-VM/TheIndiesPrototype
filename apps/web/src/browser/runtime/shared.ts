export const sharedRuntimeModuleSource = `
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
      state.projectsQueryDraft = state.projectsQuery;
      state.projectEditDraftProjectId = null;
      state.projectEditDraftName = "";
      state.projectEditDraftDescription = "";
      state.assets = null;
      state.assetQueryDraft = state.assetQuery;
      state.assetStatusDraft = state.assetStatus;
      state.assetKindDraft = state.assetKind;
      state.assetItemStatusDrafts = {};
      state.assetCreateDraftOriginalFilename = "";
      state.assetCreateDraftContentType = "";
      state.assetCreateDraftByteSize = "0";
      state.assetCreateDraftKind = "image";
      state.assetCreateDraftStatus = "draft";
      state.jobs = null;
      state.jobsStatusDraft = state.jobsStatus;
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

    function syncProjectEditDraft(force = false) {
      const nextProjectId = state.selectedProject?.id ?? null;

      if (!nextProjectId) {
        state.projectEditDraftProjectId = null;
        state.projectEditDraftName = "";
        state.projectEditDraftDescription = "";
        return;
      }

      if (!force && state.projectEditDraftProjectId === nextProjectId) {
        return;
      }

      state.projectEditDraftProjectId = nextProjectId;
      state.projectEditDraftName = state.selectedProject?.name ?? "";
      state.projectEditDraftDescription =
        state.selectedProject?.description ?? "";
    }

    function pruneAssetItemStatusDrafts() {
      if (!state.assets) {
        state.assetItemStatusDrafts = {};
        return;
      }

      const visibleAssetIds = new Set(state.assets.items.map((asset) => asset.id));

      state.assetItemStatusDrafts = Object.fromEntries(
        Object.entries(state.assetItemStatusDrafts).filter(([assetId]) =>
          visibleAssetIds.has(assetId)
        )
      );
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
`;

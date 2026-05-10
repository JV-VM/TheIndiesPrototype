import {
  authRoutes,
  projectAssetRoutes,
  projectRoutes,
  realtimeRoutes
} from "@tip/contracts";
import {
  assetKinds,
  assetLifecycleStatuses,
  jobLifecycleStatuses
} from "@tip/types";

const browserContract = {
  authRoutes,
  projectRoutes,
  projectAssetRoutes,
  realtimeRoutes,
  assetKinds,
  assetLifecycleStatuses,
  jobLifecycleStatuses
};

export function renderApiClientModule(): string {
  return `
    const contract = ${JSON.stringify(browserContract)};

    export const assetKinds = contract.assetKinds;
    export const assetLifecycleStatuses = contract.assetLifecycleStatuses;
    export const jobLifecycleStatuses = contract.jobLifecycleStatuses;
    export const realtimeRoutes = contract.realtimeRoutes;

    function buildProjectPath(projectId) {
      return \`\${contract.projectRoutes.collection}/\${encodeURIComponent(projectId)}\`;
    }

    function buildProjectAssetCollectionPath(projectId) {
      return \`\${buildProjectPath(projectId)}/assets\`;
    }

    function buildProjectAssetPath(projectId, assetId) {
      return \`\${buildProjectAssetCollectionPath(projectId)}/\${encodeURIComponent(assetId)}\`;
    }

    function buildProjectAssetUploadPath(projectId, params) {
      return \`\${buildProjectAssetCollectionPath(projectId)}/upload\${buildQueryString(params)}\`;
    }

    function buildProjectAssetSourcePath(projectId, assetId) {
      return \`\${buildProjectAssetPath(projectId, assetId)}/source\`;
    }

    function buildProjectJobCollectionPath(projectId) {
      return \`\${buildProjectPath(projectId)}/jobs\`;
    }

    function buildProjectJobPath(projectId, jobId) {
      return \`\${buildProjectJobCollectionPath(projectId)}/\${encodeURIComponent(jobId)}\`;
    }

    function buildAssetJobCollectionPath(projectId, assetId) {
      return \`\${buildProjectAssetPath(projectId, assetId)}/jobs\`;
    }

    function buildProjectJobRetryPath(projectId, jobId) {
      return \`\${buildProjectJobPath(projectId, jobId)}/retry\`;
    }

    function buildProjectJobThumbnailPath(projectId, jobId) {
      return \`\${buildProjectJobPath(projectId, jobId)}/thumbnail\`;
    }

    function buildQueryString(params = {}) {
      const searchParams = new URLSearchParams();

      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === "") {
          continue;
        }

        searchParams.set(key, String(value));
      }

      const queryString = searchParams.toString();
      return queryString.length > 0 ? \`?\${queryString}\` : "";
    }

    function createApiError(status, payload) {
      const error = new Error(
        payload?.error?.message ?? payload?.details ?? "Request failed."
      );
      error.status = status;
      error.payload = payload;
      return error;
    }

    function toError(response, payload) {
      return createApiError(response.status, payload);
    }

    async function parseJsonResponse(response) {
      const text = await response.text();
      return text.length > 0 ? JSON.parse(text) : {};
    }

    function parseContentDispositionFilename(header) {
      if (!header) {
        return null;
      }

      const utf8Match = header.match(/filename\\*=UTF-8''([^;]+)/i);

      if (utf8Match?.[1]) {
        return decodeURIComponent(utf8Match[1]);
      }

      const asciiMatch = header.match(/filename="([^"]+)"/i);
      return asciiMatch?.[1] ?? null;
    }

    export function createApiClient(config) {
      async function request(path, init = {}) {
        const headers = new Headers(init.headers ?? {});

        if (init.accessToken) {
          headers.set("authorization", \`Bearer \${init.accessToken}\`);
        }

        if (init.body !== undefined) {
          headers.set("content-type", "application/json");
        }

        const response = await fetch(\`\${config.apiBaseUrl}\${path}\`, {
          method: init.method ?? "GET",
          credentials: "include",
          headers,
          body: init.body !== undefined ? JSON.stringify(init.body) : undefined
        });

        const payload = await parseJsonResponse(response);

        if (!response.ok) {
          throw toError(response, payload);
        }

        return payload;
      }

      async function requestBlob(path, init = {}) {
        const headers = new Headers(init.headers ?? {});

        if (init.accessToken) {
          headers.set("authorization", \`Bearer \${init.accessToken}\`);
        }

        const response = await fetch(\`\${config.apiBaseUrl}\${path}\`, {
          method: init.method ?? "GET",
          credentials: "include",
          headers
        });

        if (!response.ok) {
          const payload = await parseJsonResponse(response);
          throw toError(response, payload);
        }

        return {
          blob: await response.blob(),
          contentType:
            response.headers.get("content-type") ?? "application/octet-stream",
          filename: parseContentDispositionFilename(
            response.headers.get("content-disposition")
          )
        };
      }

      function uploadBinary(path, init = {}) {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(init.method ?? "POST", \`\${config.apiBaseUrl}\${path}\`);
          xhr.withCredentials = true;

          if (init.accessToken) {
            xhr.setRequestHeader("authorization", \`Bearer \${init.accessToken}\`);
          }

          if (init.contentType) {
            xhr.setRequestHeader("content-type", init.contentType);
          }

          xhr.upload.addEventListener("progress", (event) => {
            if (!init.onProgress || !event.lengthComputable || event.total <= 0) {
              return;
            }

            init.onProgress(Math.round((event.loaded / event.total) * 100));
          });

          xhr.addEventListener("load", () => {
            const text = xhr.responseText ?? "";
            const payload = text.length > 0 ? JSON.parse(text) : {};

            if (xhr.status < 200 || xhr.status >= 300) {
              reject(createApiError(xhr.status, payload));
              return;
            }

            resolve(payload);
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload."));
          });

          xhr.send(init.body ?? null);
        });
      }

      return {
        auth: {
          register(payload) {
            return request(contract.authRoutes.register, {
              method: "POST",
              body: payload
            });
          },
          login(payload) {
            return request(contract.authRoutes.login, {
              method: "POST",
              body: payload
            });
          },
          refresh() {
            return request(contract.authRoutes.refresh, {
              method: "POST"
            });
          },
          logout() {
            return request(contract.authRoutes.logout, {
              method: "POST"
            });
          },
          me(accessToken) {
            return request(contract.authRoutes.me, {
              method: "GET",
              accessToken
            });
          }
        },
        projects: {
          list(accessToken, filters = {}) {
            return request(
              \`\${contract.projectRoutes.collection}\${buildQueryString(filters)}\`,
              {
                method: "GET",
                accessToken
              }
            );
          },
          create(accessToken, payload) {
            return request(contract.projectRoutes.collection, {
              method: "POST",
              accessToken,
              body: payload
            });
          },
          get(accessToken, projectId) {
            return request(buildProjectPath(projectId), {
              method: "GET",
              accessToken
            });
          },
          update(accessToken, projectId, payload) {
            return request(buildProjectPath(projectId), {
              method: "PATCH",
              accessToken,
              body: payload
            });
          },
          remove(accessToken, projectId) {
            return request(buildProjectPath(projectId), {
              method: "DELETE",
              accessToken
            });
          }
        },
        assets: {
          listByProject(accessToken, projectId, filters = {}) {
            return request(
              \`\${buildProjectAssetCollectionPath(projectId)}\${buildQueryString(filters)}\`,
              {
                method: "GET",
                accessToken
              }
            );
          },
          createForProject(accessToken, projectId, payload) {
            return request(buildProjectAssetCollectionPath(projectId), {
              method: "POST",
              accessToken,
              body: payload
            });
          },
          updateForProject(accessToken, projectId, assetId, payload) {
            return request(buildProjectAssetPath(projectId, assetId), {
              method: "PATCH",
              accessToken,
              body: payload
            });
          },
          uploadToProject(accessToken, projectId, payload) {
            return uploadBinary(
              buildProjectAssetUploadPath(projectId, {
                kind: payload.kind,
                filename: payload.file.name
              }),
              {
                method: "POST",
                accessToken,
                contentType: payload.file.type || "application/octet-stream",
                body: payload.file,
                onProgress: payload.onProgress
              }
            );
          },
          downloadFromProject(accessToken, projectId, assetId) {
            return requestBlob(buildProjectAssetSourcePath(projectId, assetId), {
              method: "GET",
              accessToken
            });
          }
        },
        jobs: {
          listByProject(accessToken, projectId, filters = {}) {
            return request(
              \`\${buildProjectJobCollectionPath(projectId)}\${buildQueryString(filters)}\`,
              {
                method: "GET",
                accessToken
              }
            );
          },
          getByProject(accessToken, projectId, jobId) {
            return request(buildProjectJobPath(projectId, jobId), {
              method: "GET",
              accessToken
            });
          },
          createForAsset(accessToken, projectId, assetId, payload = {}) {
            return request(buildAssetJobCollectionPath(projectId, assetId), {
              method: "POST",
              accessToken,
              body: payload
            });
          },
          retryByProject(accessToken, projectId, jobId) {
            return request(buildProjectJobRetryPath(projectId, jobId), {
              method: "POST",
              accessToken,
              body: {}
            });
          },
          downloadThumbnail(accessToken, projectId, jobId) {
            return requestBlob(buildProjectJobThumbnailPath(projectId, jobId), {
              method: "GET",
              accessToken
            });
          }
        }
      };
    }
  `;
}

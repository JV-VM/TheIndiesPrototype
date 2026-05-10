import { authRoutes, projectRoutes } from "@tip/contracts";
import { assetKinds, assetLifecycleStatuses } from "@tip/types";

const browserContract = {
  authRoutes,
  projectRoutes,
  assetKinds,
  assetLifecycleStatuses
};

export function renderApiClientModule(): string {
  return `
    const contract = ${JSON.stringify(browserContract)};

    export const assetKinds = contract.assetKinds;
    export const assetLifecycleStatuses = contract.assetLifecycleStatuses;

    function buildProjectPath(projectId) {
      return \`\${contract.projectRoutes.collection}/\${encodeURIComponent(projectId)}\`;
    }

    function buildProjectAssetCollectionPath(projectId) {
      return \`\${buildProjectPath(projectId)}/assets\`;
    }

    function buildProjectAssetPath(projectId, assetId) {
      return \`\${buildProjectAssetCollectionPath(projectId)}/\${encodeURIComponent(assetId)}\`;
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

    function toError(response, payload) {
      const error = new Error(
        payload?.error?.message ?? payload?.details ?? "Request failed."
      );
      error.status = response.status;
      error.payload = payload;
      return error;
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

        const text = await response.text();
        const payload = text.length > 0 ? JSON.parse(text) : {};

        if (!response.ok) {
          throw toError(response, payload);
        }

        return payload;
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
          }
        }
      };
    }
  `;
}

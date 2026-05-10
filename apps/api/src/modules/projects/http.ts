import type { IncomingMessage, ServerResponse } from "node:http";

import type { RuntimeConfig } from "../../config/runtime.js";
import { requireAuthenticatedUser } from "../../http/authenticated-user.js";
import { readJsonBody } from "../../http/request-body.js";
import { readQueryParams } from "../../http/query-params.js";
import { createApiHeaders, sendEmpty, sendJson } from "../../http/response.js";
import type { AssetsService } from "../assets/service.js";
import type { AuthService } from "../auth/service.js";
import {
  createAssetSchema,
  createProjectSchema,
  listProjectAssetsQuerySchema,
  listProjectsQuerySchema,
  updateAssetSchema,
  updateProjectSchema
} from "./schemas.js";
import type { ProjectsService } from "./service.js";

interface ProjectsHttpContext {
  config: RuntimeConfig;
  authService: AuthService;
  projectsService: ProjectsService;
  assetsService: AssetsService;
}

export async function handleProjectsRequest(
  request: IncomingMessage,
  response: ServerResponse,
  context: ProjectsHttpContext
): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (!url.pathname.startsWith("/projects")) {
    return false;
  }

  const baseHeaders = createApiHeaders(request, context.config);

  if (request.method === "OPTIONS") {
    sendEmpty(response, 204, baseHeaders);
    return true;
  }

  const user = await requireAuthenticatedUser(request, context.authService);
  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

  if (segments.length === 1) {
    if (request.method === "GET") {
      const filters = readQueryParams(url, listProjectsQuerySchema);
      const projects = await context.projectsService.listProjects(
        user.id,
        filters
      );
      sendJson(response, 200, projects, baseHeaders);
      return true;
    }

    if (request.method === "POST") {
      const payload = await readJsonBody(request, createProjectSchema);
      const project = await context.projectsService.createProject(
        user.id,
        payload
      );
      sendJson(response, 201, project, baseHeaders);
      return true;
    }
  }

  if (segments.length === 2) {
    const projectId = segments[1];

    if (!projectId) {
      return false;
    }

    if (request.method === "GET") {
      const project = await context.projectsService.getProject(
        user.id,
        projectId
      );
      sendJson(response, 200, project, baseHeaders);
      return true;
    }

    if (request.method === "PATCH") {
      const payload = await readJsonBody(request, updateProjectSchema);
      const project = await context.projectsService.updateProject(
        user.id,
        projectId,
        {
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.description !== undefined
            ? {
                description: payload.description
              }
            : {})
        }
      );
      sendJson(response, 200, project, baseHeaders);
      return true;
    }

    if (request.method === "DELETE") {
      const result = await context.projectsService.deleteProject(
        user.id,
        projectId
      );
      sendJson(response, 200, result, baseHeaders);
      return true;
    }
  }

  if (segments.length === 3 && segments[2] === "assets") {
    const projectId = segments[1];

    if (!projectId) {
      return false;
    }

    if (request.method === "GET") {
      const filters = readQueryParams(url, listProjectAssetsQuerySchema);
      const assets = await context.assetsService.listProjectAssets(
        user.id,
        projectId,
        filters
      );
      sendJson(response, 200, assets, baseHeaders);
      return true;
    }

    if (request.method === "POST") {
      const payload = await readJsonBody(request, createAssetSchema);
      const asset = await context.assetsService.createProjectAsset(
        user.id,
        projectId,
        {
          kind: payload.kind,
          status: payload.status,
          originalFilename: payload.originalFilename,
          contentType: payload.contentType,
          byteSize: payload.byteSize,
          ...(payload.metadata !== undefined
            ? {
                metadata: payload.metadata
              }
            : {})
        }
      );
      sendJson(response, 201, asset, baseHeaders);
      return true;
    }
  }

  if (segments.length === 4 && segments[2] === "assets") {
    const projectId = segments[1];
    const assetId = segments[3];

    if (!projectId || !assetId) {
      return false;
    }

    if (request.method === "PATCH") {
      const payload = await readJsonBody(request, updateAssetSchema);
      const asset = await context.assetsService.updateProjectAsset(
        user.id,
        projectId,
        assetId,
        {
          ...(payload.kind !== undefined ? { kind: payload.kind } : {}),
          ...(payload.status !== undefined ? { status: payload.status } : {}),
          ...(payload.originalFilename !== undefined
            ? {
                originalFilename: payload.originalFilename
              }
            : {}),
          ...(payload.contentType !== undefined
            ? {
                contentType: payload.contentType
              }
            : {}),
          ...(payload.byteSize !== undefined
            ? {
                byteSize: payload.byteSize
              }
            : {}),
          ...(payload.metadata !== undefined
            ? {
                metadata: payload.metadata
              }
            : {})
        }
      );
      sendJson(response, 200, asset, baseHeaders);
      return true;
    }
  }

  sendJson(
    response,
    404,
    {
      error: {
        code: "route_not_found",
        message: "The requested project route does not exist."
      }
    },
    baseHeaders
  );
  return true;
}

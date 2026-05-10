import type { IncomingMessage, ServerResponse } from "node:http";

import type { RuntimeConfig } from "../../config/runtime.js";
import { requireAuthenticatedUser } from "../../http/authenticated-user.js";
import { readJsonBody } from "../../http/request-body.js";
import { readQueryParams } from "../../http/query-params.js";
import {
  createApiHeaders,
  sendBuffer,
  sendEmpty,
  sendJson
} from "../../http/response.js";
import { enforceWriteRateLimit } from "../../http/write-rate-limit.js";
import { sanitizeAssetFilename } from "../assets/upload-policy.js";
import type { AuthService } from "../auth/service.js";
import {
  enqueueAssetJobSchema,
  listProjectJobsQuerySchema
} from "./schemas.js";
import type { JobsService } from "./service.js";

interface JobsHttpContext {
  config: RuntimeConfig;
  authService: AuthService;
  jobsService: JobsService;
}

const JOB_WRITE_RATE_LIMIT_MAX_HITS = 30;

export async function handleJobsRequest(
  request: IncomingMessage,
  response: ServerResponse,
  context: JobsHttpContext
): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (!url.pathname.startsWith("/projects/")) {
    return false;
  }

  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

  const matchesJobsRoute =
    (segments.length === 3 && segments[2] === "jobs") ||
    (segments.length === 4 && segments[2] === "jobs") ||
    (segments.length === 5 && segments[2] === "jobs") ||
    (segments.length === 5 &&
      segments[2] === "assets" &&
      segments[4] === "jobs");

  if (!matchesJobsRoute) {
    return false;
  }

  const baseHeaders = createApiHeaders(request, context.config);

  if (request.method === "OPTIONS") {
    sendEmpty(response, 204, baseHeaders);
    return true;
  }

  if (request.method === "POST") {
    const allowed = enforceWriteRateLimit(request, response, {
      scope: "job-write",
      maxHits: JOB_WRITE_RATE_LIMIT_MAX_HITS,
      baseHeaders
    });

    if (!allowed) {
      return true;
    }
  }

  const user = await requireAuthenticatedUser(request, context.authService);

  if (
    segments.length === 3 &&
    segments[2] === "jobs" &&
    request.method === "GET"
  ) {
    const projectId = segments[1];

    if (!projectId) {
      return false;
    }

    const filters = readQueryParams(url, listProjectJobsQuerySchema);
    const jobs = await context.jobsService.listProjectJobs(
      user.id,
      projectId,
      filters
    );
    sendJson(response, 200, jobs, baseHeaders);
    return true;
  }

  if (
    segments.length === 4 &&
    segments[2] === "jobs" &&
    request.method === "GET"
  ) {
    const projectId = segments[1];
    const jobId = segments[3];

    if (!projectId || !jobId) {
      return false;
    }

    const job = await context.jobsService.getProjectJob(
      user.id,
      projectId,
      jobId
    );
    sendJson(response, 200, job, baseHeaders);
    return true;
  }

  if (
    segments.length === 5 &&
    segments[2] === "assets" &&
    segments[4] === "jobs" &&
    request.method === "POST"
  ) {
    const projectId = segments[1];
    const assetId = segments[3];

    if (!projectId || !assetId) {
      return false;
    }

    const payload = await readJsonBody(request, enqueueAssetJobSchema);
    const job = await context.jobsService.enqueueProjectAssetJob(
      user.id,
      projectId,
      assetId,
      {
        kind: payload.kind
      }
    );
    sendJson(response, 201, job, baseHeaders);
    return true;
  }

  if (
    segments.length === 5 &&
    segments[2] === "jobs" &&
    segments[4] === "retry" &&
    request.method === "POST"
  ) {
    const projectId = segments[1];
    const jobId = segments[3];

    if (!projectId || !jobId) {
      return false;
    }

    const job = await context.jobsService.retryProjectJob(
      user.id,
      projectId,
      jobId
    );
    sendJson(response, 201, job, baseHeaders);
    return true;
  }

  if (
    segments.length === 5 &&
    segments[2] === "jobs" &&
    segments[4] === "thumbnail" &&
    request.method === "GET"
  ) {
    const projectId = segments[1];
    const jobId = segments[3];

    if (!projectId || !jobId) {
      return false;
    }

    const thumbnail = await context.jobsService.readProjectJobThumbnail(
      user.id,
      projectId,
      jobId
    );

    sendBuffer(response, 200, thumbnail.object.body, thumbnail.contentType, {
      ...baseHeaders,
      "content-disposition": createAttachmentDisposition(thumbnail.filename),
      "cache-control": "private, no-store"
    });
    return true;
  }

  sendJson(
    response,
    404,
    {
      error: {
        code: "route_not_found",
        message: "The requested job route does not exist."
      }
    },
    baseHeaders
  );
  return true;
}

function createAttachmentDisposition(filename: string): string {
  const asciiFilename = sanitizeAssetFilename(filename).replaceAll('"', "");

  return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

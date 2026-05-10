import { createServer } from "node:http";

import { createCorrelationId, createLogger } from "@tip/shared";

import { backendModules } from "./app.js";
import { readRuntimeConfig } from "./config/runtime.js";
import { formatErrorResponse } from "./http/error-response.js";
import { readClientIp } from "./http/request-metadata.js";
import { assignRequestId } from "./http/request-trace.js";
import { createApiHeaders, sendEmpty, sendJson } from "./http/response.js";
import { checkRuntimeDependencies } from "./infrastructure/health/check-runtime-dependencies.js";
import { prisma } from "./infrastructure/database/prisma-client.js";
import { createRuntimeAdapters } from "./infrastructure/runtime.js";
import { AssetsService } from "./modules/assets/service.js";
import { handleAuthRequest } from "./modules/auth/http.js";
import { AuthService } from "./modules/auth/service.js";
import { handleJobsRequest } from "./modules/jobs/http.js";
import { JobsService } from "./modules/jobs/service.js";
import { handleProjectsRequest } from "./modules/projects/http.js";
import { ProjectsService } from "./modules/projects/service.js";
import { RealtimeService } from "./modules/realtime/service.js";

const config = readRuntimeConfig();
const logger = createLogger(config.serviceName, {
  runtime: "api"
});
const adapters = createRuntimeAdapters(config);
const authService = new AuthService(prisma, config);
const projectsService = new ProjectsService(prisma);
const assetsService = new AssetsService(prisma, {
  adapter: adapters.storage,
  bucket: config.minioBucket
});
const jobsService = new JobsService(
  prisma,
  adapters.jobQueue,
  {
    adapter: adapters.storage
  },
  adapters.realtimeEvents
);
const realtimeService = new RealtimeService(
  config,
  authService,
  adapters.realtimeEvents
);

if (process.env.TIP_DRY_RUN === "1") {
  logger.info("dry run complete", {
    architecture: "backend modular monolith",
    modules: backendModules.map((module) => module.name),
    dependencies: ["postgres", "redis", "minio"]
  });
  console.log(
    JSON.stringify({
      service: config.serviceName,
      architecture: "backend modular monolith",
      modules: backendModules.map((module) => module.name),
      dependencies: ["postgres", "redis", "minio"]
    })
  );
  process.exit(0);
}

async function handleRequest(
  request: import("node:http").IncomingMessage,
  response: import("node:http").ServerResponse
): Promise<void> {
  const baseHeaders = createApiHeaders(request, config);

  if (await handleAuthRequest(request, response, { config, authService })) {
    return;
  }

  if (
    await handleJobsRequest(request, response, {
      config,
      authService,
      jobsService
    })
  ) {
    return;
  }

  if (
    await handleProjectsRequest(request, response, {
      config,
      authService,
      projectsService,
      assetsService
    })
  ) {
    return;
  }

  if (request.method === "OPTIONS") {
    sendEmpty(response, 204, baseHeaders);
    return;
  }

  if (request.url === "/health") {
    sendJson(
      response,
      200,
      {
        service: config.serviceName,
        status: "ok",
        phase: "phase-8-operational-hardening"
      },
      baseHeaders
    );
    return;
  }

  if (request.url === "/ready") {
    const readiness = await checkRuntimeDependencies(
      config.serviceName,
      adapters
    );
    sendJson(
      response,
      readiness.status === "ok" ? 200 : 503,
      readiness,
      baseHeaders
    );
    return;
  }

  if (request.url === "/modules") {
    sendJson(
      response,
      200,
      {
        modules: backendModules
      },
      baseHeaders
    );
    return;
  }

  sendJson(
    response,
    200,
    {
      service: config.serviceName,
      architecture: "backend modular monolith",
      moduleCount: backendModules.length,
      readinessEndpoint: "/ready"
    },
    baseHeaders
  );
}

await realtimeService.start();
logger.info("realtime event bus ready");

const server = createServer((request, response) => {
  const requestId = createCorrelationId(request.headers["x-request-id"]);
  assignRequestId(request, requestId);
  const startedAt = performance.now();
  const pathname = safeReadPathname(request.url);
  const requestLogger = logger.child({
    requestId,
    method: request.method ?? "UNKNOWN",
    path: pathname,
    clientIp: readClientIp(request)
  });

  requestLogger.info("request.received");
  response.on("finish", () => {
    requestLogger.info("request.completed", {
      statusCode: response.statusCode,
      durationMs: Math.round(performance.now() - startedAt)
    });
  });

  void handleRequest(request, response).catch((error: unknown) => {
    const formatted = formatErrorResponse(error, request, config);
    const baseHeaders = createApiHeaders(request, config);

    if (formatted.logLevel === "warn") {
      requestLogger.warn("request.failed", {
        statusCode: formatted.statusCode,
        errorCode: formatted.payload.error.code,
        errorCategory: formatted.payload.error.category
      });
    } else {
      requestLogger.error("request.failed", error, {
        statusCode: formatted.statusCode,
        errorCode: formatted.payload.error.code,
        errorCategory: formatted.payload.error.category
      });
    }

    sendJson(response, formatted.statusCode, formatted.payload, baseHeaders);
  });
});

server.on("upgrade", (request, socket, head) => {
  const requestId = createCorrelationId(request.headers["x-request-id"]);
  assignRequestId(request, requestId);
  const upgradeLogger = logger.child({
    requestId,
    path: safeReadPathname(request.url),
    clientIp: readClientIp(request)
  });

  if (realtimeService.handleUpgrade(request, socket, head)) {
    upgradeLogger.info("realtime.upgrade.accepted");
    return;
  }

  upgradeLogger.warn("realtime.upgrade.rejected");
  socket.destroy();
});

server.listen(config.port, () => {
  logger.info("server.listening", {
    port: config.port,
    webOrigin: config.webOrigin
  });
});

function safeReadPathname(rawUrl: string | undefined): string {
  try {
    return new URL(rawUrl ?? "/", "http://localhost").pathname;
  } catch {
    return "/";
  }
}

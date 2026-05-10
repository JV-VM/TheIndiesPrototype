import { createServer } from "node:http";

import { backendModules } from "./app.js";
import { readRuntimeConfig } from "./config/runtime.js";
import { HttpError } from "./http/errors.js";
import { createApiHeaders, sendEmpty, sendJson } from "./http/response.js";
import { checkRuntimeDependencies } from "./infrastructure/health/check-runtime-dependencies.js";
import { prisma } from "./infrastructure/database/prisma-client.js";
import { createRuntimeAdapters } from "./infrastructure/runtime.js";
import { AssetsService } from "./modules/assets/service.js";
import { handleAuthRequest } from "./modules/auth/http.js";
import { AuthService } from "./modules/auth/service.js";
import { handleProjectsRequest } from "./modules/projects/http.js";
import { ProjectsService } from "./modules/projects/service.js";

const config = readRuntimeConfig();
const adapters = createRuntimeAdapters(config);
const authService = new AuthService(prisma, config);
const projectsService = new ProjectsService(prisma);
const assetsService = new AssetsService(prisma);

if (process.env.TIP_DRY_RUN === "1") {
  console.log(
    JSON.stringify(
      {
        service: config.serviceName,
        architecture: "backend modular monolith",
        modules: backendModules.map((module) => module.name),
        dependencies: ["postgres", "redis", "minio"]
      },
      null,
      2
    )
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
        phase: "phase-4-projects-and-assets"
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

const server = createServer((request, response) => {
  void handleRequest(request, response).catch((error: unknown) => {
    const baseHeaders = createApiHeaders(request, config);

    if (error instanceof HttpError) {
      sendJson(
        response,
        error.statusCode,
        {
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        },
        baseHeaders
      );
      return;
    }

    sendJson(
      response,
      500,
      {
        service: config.serviceName,
        status: "error",
        details:
          error instanceof Error ? error.message : "Unknown request failure."
      },
      baseHeaders
    );
  });
});

server.listen(config.port, () => {
  console.log(
    `[api] placeholder server listening on http://localhost:${config.port}`
  );
});

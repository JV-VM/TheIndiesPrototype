import { createServer } from "node:http";

import { createCorrelationId, createLogger } from "@tip/shared";

import { renderApiClientModule } from "./api-client.js";
import { renderPage } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const apiBaseUrl = process.env.TIP_API_BASE_URL ?? "http://localhost:13001";
const apiInternalUrl =
  process.env.TIP_API_INTERNAL_URL ?? "http://localhost:13001";
const wsBaseUrl = process.env.TIP_WS_BASE_URL ?? "ws://localhost:13001";
const logger = createLogger("tip-web", {
  runtime: "web"
});

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  `connect-src 'self' ${apiBaseUrl} ${wsBaseUrl}`,
  "font-src 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'"
].join("; ");

if (process.env.TIP_DRY_RUN === "1") {
  const html = renderPage({ apiBaseUrl, wsBaseUrl });
  logger.info("dry run complete", {
    renderedBytes: html.length
  });
  process.exit(0);
}

const server = createServer((request, response) => {
  const startedAt = performance.now();
  const requestId = createCorrelationId(request.headers["x-request-id"]);
  const url = new URL(request.url ?? "/", "http://localhost");
  const requestLogger = logger.child({
    requestId,
    method: request.method ?? "GET",
    path: url.pathname
  });

  response.on("finish", () => {
    requestLogger.info("request.completed", {
      statusCode: response.statusCode,
      durationMs: Math.round(performance.now() - startedAt)
    });
  });

  if (url.pathname === "/api-client.js") {
    response.writeHead(200, {
      "content-type": "text/javascript; charset=utf-8",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "cache-control": "no-store",
      "x-request-id": requestId
    });
    response.end(renderApiClientModule());
    return;
  }

  if (url.pathname === "/health") {
    sendJson(response, 200, requestId, {
      service: "tip-web",
      status: "ok",
      phase: "phase-8-operational-hardening"
    });
    return;
  }

  if (url.pathname === "/ready") {
    void sendReadinessResponse(response, requestId, requestLogger);
    return;
  }

  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "content-security-policy": contentSecurityPolicy,
    "x-request-id": requestId
  });
  response.end(renderPage({ apiBaseUrl, wsBaseUrl }));
});

server.listen(port, () => {
  logger.info("server.listening", {
    port,
    apiBaseUrl,
    apiInternalUrl,
    wsBaseUrl
  });
});

async function sendReadinessResponse(
  response: import("node:http").ServerResponse,
  requestId: string,
  requestLogger: ReturnType<typeof logger.child>
): Promise<void> {
  try {
    const upstreamResponse = await fetch(`${apiInternalUrl}/ready`);
    const payload = (await upstreamResponse.json()) as Record<string, unknown>;

    sendJson(response, upstreamResponse.ok ? 200 : 503, requestId, {
      service: "tip-web",
      status: upstreamResponse.ok ? "ok" : "degraded",
      checkedAt: new Date().toISOString(),
      upstream: {
        url: `${apiInternalUrl}/ready`,
        statusCode: upstreamResponse.status,
        payload
      }
    });
  } catch (error) {
    requestLogger.error("readiness.check_failed", error);
    sendJson(response, 503, requestId, {
      service: "tip-web",
      status: "degraded",
      checkedAt: new Date().toISOString(),
      upstream: {
        url: `${apiInternalUrl}/ready`,
        statusCode: 503,
        error:
          error instanceof Error ? error.message : "Unknown upstream failure."
      }
    });
  }
}

function sendJson(
  response: import("node:http").ServerResponse,
  statusCode: number,
  requestId: string,
  payload: unknown
): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-request-id": requestId
  });
  response.end(JSON.stringify(payload, null, 2));
}

import { createServer } from "node:http";
import { access, readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { createCorrelationId, createLogger } from "@tip/shared";

import { renderApiClientModule } from "./api-client.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const apiBaseUrl = process.env.TIP_API_BASE_URL ?? "http://localhost:13001";
const apiInternalUrl = readHttpUrl(
  "TIP_API_INTERNAL_URL",
  "TIP_API_INTERNAL_HOSTPORT",
  "http://localhost:13001"
);
const wsBaseUrl = process.env.TIP_WS_BASE_URL ?? "ws://localhost:13001";
const frontendFoundationBasePath = "/frontend-foundation";
const browserAppBasePath = "/";
const appRootDirectory = fileURLToPath(new URL("../..", import.meta.url));
const browserBuildDirectory = join(appRootDirectory, "dist", "browser");
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
  logger.info("dry run complete", {
    browserBuildDirectory,
    browserAppBasePath
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

  if (shouldRedirectFrontendFoundationRequest(url.pathname)) {
    const redirectLocation = normalizeFrontendFoundationPath(url.pathname);

    response.writeHead(308, {
      location: redirectLocation,
      "cache-control": "no-store",
      "x-request-id": requestId
    });
    response.end();
    return;
  }

  if (isFrontendFoundationRequest(url.pathname)) {
    void sendBrowserAppResponse(response, requestId, normalizeFrontendFoundationPath(url.pathname));
    return;
  }

  void sendBrowserAppResponse(response, requestId, url.pathname);
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

function readHttpUrl(
  urlVariableName: string,
  hostPortVariableName: string,
  fallback: string
): string {
  const explicitUrl = process.env[urlVariableName];
  if (explicitUrl) {
    return explicitUrl;
  }

  const hostPort = process.env[hostPortVariableName];
  if (hostPort) {
    return `http://${hostPort}`;
  }

  return fallback;
}

function isFrontendFoundationRequest(pathname: string): boolean {
  return (
    pathname === frontendFoundationBasePath ||
    pathname.startsWith(`${frontendFoundationBasePath}/`)
  );
}

function shouldRedirectFrontendFoundationRequest(pathname: string): boolean {
  return pathname === frontendFoundationBasePath;
}

function normalizeFrontendFoundationPath(pathname: string): string {
  const rewrittenPath = pathname
    .slice(frontendFoundationBasePath.length)
    .replace(/^\/+/, "");

  return rewrittenPath.length === 0 ? browserAppBasePath : `/${rewrittenPath}`;
}

async function sendBrowserAppResponse(
  response: import("node:http").ServerResponse,
  requestId: string,
  pathname: string
): Promise<void> {
  const relativePath = pathname
    .slice(browserAppBasePath.length)
    .replace(/^\/+/, "");

  const shouldServeIndex =
    relativePath.length === 0 ||
    (!relativePath.includes(".") && !pathname.endsWith(".js"));

  const candidatePath = normalize(join(browserBuildDirectory, relativePath));
  const isWithinBrowserBuild =
    candidatePath === browserBuildDirectory ||
    candidatePath.startsWith(`${browserBuildDirectory}/`);

  if (!isWithinBrowserBuild) {
    response.writeHead(404, {
      "content-type": "text/plain; charset=utf-8",
      "x-request-id": requestId
    });
    response.end("Not found.");
    return;
  }

  if (!shouldServeIndex) {
    const assetBuffer = await readStaticFile(candidatePath);

    if (assetBuffer) {
      response.writeHead(200, {
        "content-type": contentTypeForPath(candidatePath),
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        "x-request-id": requestId
      });
      response.end(assetBuffer);
      return;
    }
  }

  const indexFilePath = join(browserBuildDirectory, "index.html");
  const indexHtml = await readStaticTextFile(indexFilePath);

  if (!indexHtml) {
    response.writeHead(503, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-request-id": requestId
    });
    response.end(`<!doctype html>
<html lang="en">
  <body style="font-family: sans-serif; background: #06111d; color: #f3f7fb; padding: 32px;">
    <h1>Frontend foundation build not found.</h1>
    <p>Run <code>pnpm --filter @tip/web build</code> to generate the Angular Phase 0 and Phase 1 assets.</p>
  </body>
</html>`);
    return;
  }

  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "content-security-policy": contentSecurityPolicy,
    "x-frame-options": "DENY",
    "x-request-id": requestId
  });
  response.end(injectFrontendRuntimeConfig(indexHtml));
}

async function readStaticFile(
  filePath: string,
  encoding?: BufferEncoding
): Promise<Buffer | string | null> {
  try {
    await access(filePath);
    return await readFile(filePath, encoding ? { encoding } : undefined);
  } catch {
    return null;
  }
}

async function readStaticTextFile(filePath: string): Promise<string | null> {
  const file = await readStaticFile(filePath, "utf8");

  return typeof file === "string" ? file : null;
}

function injectFrontendRuntimeConfig(indexHtml: string): string {
  const runtimeConfig = JSON.stringify({
    apiBaseUrl,
    wsBaseUrl,
    foundationBasePath: browserAppBasePath
  }).replace(/</g, "\\u003c");

  return indexHtml.replace(
    "</head>",
    `<script>window.__TIP_FRONTEND_CONFIG__=${runtimeConfig};</script></head>`
  );
}

function contentTypeForPath(pathname: string): string {
  switch (extname(pathname)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".woff2":
      return "font/woff2";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

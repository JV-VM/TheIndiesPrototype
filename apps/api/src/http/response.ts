import type { IncomingMessage, ServerResponse } from "node:http";

import type { RuntimeConfig } from "../config/runtime.js";
import { readRequestId } from "./request-trace.js";

export function createApiHeaders(
  request: IncomingMessage,
  config: RuntimeConfig
): Record<string, string> {
  const headers: Record<string, string> = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-site",
    "content-security-policy":
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  };
  const requestId = readRequestId(request);

  const origin = request.headers.origin;

  if (origin && origin === config.webOrigin) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-credentials"] = "true";
    headers["access-control-allow-headers"] =
      "content-type, authorization, x-request-id";
    headers["access-control-allow-methods"] =
      "GET, POST, PATCH, DELETE, OPTIONS";
    headers["access-control-expose-headers"] =
      "x-request-id, retry-after, x-ratelimit-remaining, x-ratelimit-reset";
    headers.vary = "Origin";
  }

  if (config.isProduction) {
    headers["strict-transport-security"] =
      "max-age=31536000; includeSubDomains";
  }

  if (requestId) {
    headers["x-request-id"] = requestId;
  }

  return headers;
}

export function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
  headers: Record<string, string> = {}
): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    ...headers
  });
  response.end(JSON.stringify(payload, null, 2));
}

export function sendEmpty(
  response: ServerResponse,
  statusCode: number,
  headers: Record<string, string> = {}
): void {
  response.writeHead(statusCode, headers);
  response.end();
}

export function sendBuffer(
  response: ServerResponse,
  statusCode: number,
  body: Buffer,
  contentType: string,
  headers: Record<string, string> = {}
): void {
  response.writeHead(statusCode, {
    "content-type": contentType,
    "content-length": String(body.byteLength),
    ...headers
  });
  response.end(body);
}

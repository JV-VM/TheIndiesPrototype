import type { IncomingMessage, ServerResponse } from "node:http";

import type { RuntimeConfig } from "../config/runtime.js";

export function createApiHeaders(
  request: IncomingMessage,
  config: RuntimeConfig
): Record<string, string> {
  const headers: Record<string, string> = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "content-security-policy":
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  };

  const origin = request.headers.origin;

  if (origin && origin === config.webOrigin) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-credentials"] = "true";
    headers["access-control-allow-headers"] = "content-type, authorization";
    headers["access-control-allow-methods"] =
      "GET, POST, PATCH, DELETE, OPTIONS";
    headers.vary = "Origin";
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

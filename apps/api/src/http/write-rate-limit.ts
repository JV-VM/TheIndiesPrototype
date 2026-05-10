import type { IncomingMessage, ServerResponse } from "node:http";

import { HttpError } from "./errors.js";
import { readClientIp } from "./request-metadata.js";
import { sendJson } from "./response.js";
import { checkRateLimit } from "../modules/auth/rate-limit.js";

const WRITE_RATE_LIMIT_WINDOW_MS = 60_000;

export interface WriteRateLimitOptions {
  scope: string;
  maxHits: number;
  baseHeaders: Record<string, string>;
}

export function enforceWriteRateLimit(
  request: IncomingMessage,
  response: ServerResponse,
  options: WriteRateLimitOptions
): boolean {
  const rateLimit = checkRateLimit(
    `${options.scope}:${readClientIp(request)}`,
    options.maxHits,
    WRITE_RATE_LIMIT_WINDOW_MS
  );

  if (rateLimit.allowed) {
    return true;
  }

  const error = new HttpError(
    429,
    "Too many write operations were attempted from this client. Try again shortly.",
    "write_rate_limited"
  );

  sendJson(
    response,
    error.statusCode,
    {
      error: {
        code: error.code,
        message: error.message
      }
    },
    {
      ...options.baseHeaders,
      "retry-after": String(rateLimit.retryAfterSeconds),
      "x-ratelimit-remaining": String(rateLimit.remaining),
      "x-ratelimit-reset": new Date(rateLimit.resetAt).toISOString()
    }
  );

  return false;
}

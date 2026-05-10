import type { IncomingMessage } from "node:http";

import { toErrorMessage } from "@tip/shared";

import type { RuntimeConfig } from "../config/runtime.js";
import { HttpError } from "./errors.js";
import { readRequestId } from "./request-trace.js";

export type OperationalErrorCategory =
  | "validation"
  | "authentication"
  | "authorization"
  | "not_found"
  | "conflict"
  | "rate_limit"
  | "dependency"
  | "internal";

export interface FormattedErrorResponse {
  statusCode: number;
  logLevel: "warn" | "error";
  payload: {
    error: {
      code: string;
      category: OperationalErrorCategory;
      message: string;
      details?: unknown;
    };
    meta: {
      requestId: string | null;
      occurredAt: string;
      operational: boolean;
    };
  };
}

export function formatErrorResponse(
  error: unknown,
  request: IncomingMessage,
  config: RuntimeConfig
): FormattedErrorResponse {
  const requestId = readRequestId(request);

  if (error instanceof HttpError) {
    return {
      statusCode: error.statusCode,
      logLevel: error.statusCode >= 500 ? "error" : "warn",
      payload: {
        error: {
          code: error.code,
          category: toErrorCategory(error.statusCode),
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {})
        },
        meta: {
          requestId,
          occurredAt: new Date().toISOString(),
          operational: error.statusCode < 500
        }
      }
    };
  }

  return {
    statusCode: 500,
    logLevel: "error",
    payload: {
      error: {
        code: "internal_server_error",
        category: "internal",
        message: config.isProduction
          ? "An unexpected server error occurred."
          : toErrorMessage(error)
      },
      meta: {
        requestId,
        occurredAt: new Date().toISOString(),
        operational: false
      }
    }
  };
}

function toErrorCategory(statusCode: number): OperationalErrorCategory {
  if (
    statusCode === 400 ||
    statusCode === 413 ||
    statusCode === 415 ||
    statusCode === 422
  ) {
    return "validation";
  }

  if (statusCode === 401) {
    return "authentication";
  }

  if (statusCode === 403) {
    return "authorization";
  }

  if (statusCode === 404) {
    return "not_found";
  }

  if (statusCode === 409) {
    return "conflict";
  }

  if (statusCode === 429) {
    return "rate_limit";
  }

  if (statusCode === 502 || statusCode === 503) {
    return "dependency";
  }

  return "internal";
}

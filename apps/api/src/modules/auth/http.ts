import type { IncomingMessage, ServerResponse } from "node:http";

import type { RuntimeConfig } from "../../config/runtime.js";
import { HttpError } from "../../http/errors.js";
import { readJsonBody } from "../../http/request-body.js";
import { readBearerToken, readClientIp } from "../../http/request-metadata.js";
import { createApiHeaders, sendEmpty, sendJson } from "../../http/response.js";
import {
  clearRefreshTokenCookie,
  createRefreshTokenCookie,
  readRefreshTokenCookie
} from "./cookies.js";
import { checkRateLimit } from "./rate-limit.js";
import type { AuthService } from "./service.js";
import { loginSchema, registerSchema } from "./schemas.js";

interface AuthHttpContext {
  config: RuntimeConfig;
  authService: AuthService;
}

const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;
const AUTH_RATE_LIMIT_MAX_HITS = 12;

export async function handleAuthRequest(
  request: IncomingMessage,
  response: ServerResponse,
  context: AuthHttpContext
): Promise<boolean> {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (!url.pathname.startsWith("/auth")) {
    return false;
  }

  const baseHeaders = createApiHeaders(request, context.config);

  if (request.method === "OPTIONS") {
    sendEmpty(response, 204, baseHeaders);
    return true;
  }

  switch (`${request.method} ${url.pathname}`) {
    case "POST /auth/register":
      await handleRegister(request, response, context, baseHeaders);
      return true;
    case "POST /auth/login":
      await handleLogin(request, response, context, baseHeaders);
      return true;
    case "POST /auth/refresh":
      await handleRefresh(request, response, context, baseHeaders);
      return true;
    case "POST /auth/logout":
      await handleLogout(request, response, context, baseHeaders);
      return true;
    case "GET /auth/me":
      await handleMe(request, response, context, baseHeaders);
      return true;
    default:
      sendJson(
        response,
        404,
        {
          error: {
            code: "route_not_found",
            message: "The requested auth route does not exist."
          }
        },
        baseHeaders
      );
      return true;
  }
}

async function handleRegister(
  request: IncomingMessage,
  response: ServerResponse,
  context: AuthHttpContext,
  baseHeaders: Record<string, string>
): Promise<void> {
  const rateLimit = applyAuthRateLimit(
    request,
    "register",
    response,
    baseHeaders
  );

  if (!rateLimit.allowed) {
    return;
  }

  const input = await readJsonBody(request, registerSchema);
  const session = await context.authService.register(input);

  sendJson(
    response,
    201,
    {
      accessToken: session.accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
      user: session.user
    },
    {
      ...baseHeaders,
      ...createRateLimitHeaders(rateLimit),
      "set-cookie": createRefreshTokenCookie(
        session.refreshToken,
        session.refreshTokenMaxAgeSeconds,
        context.config.isProduction
      )
    }
  );
}

async function handleLogin(
  request: IncomingMessage,
  response: ServerResponse,
  context: AuthHttpContext,
  baseHeaders: Record<string, string>
): Promise<void> {
  const rateLimit = applyAuthRateLimit(request, "login", response, baseHeaders);

  if (!rateLimit.allowed) {
    return;
  }

  const input = await readJsonBody(request, loginSchema);
  const session = await context.authService.login(input);

  sendJson(
    response,
    200,
    {
      accessToken: session.accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
      user: session.user
    },
    {
      ...baseHeaders,
      ...createRateLimitHeaders(rateLimit),
      "set-cookie": createRefreshTokenCookie(
        session.refreshToken,
        session.refreshTokenMaxAgeSeconds,
        context.config.isProduction
      )
    }
  );
}

async function handleRefresh(
  request: IncomingMessage,
  response: ServerResponse,
  context: AuthHttpContext,
  baseHeaders: Record<string, string>
): Promise<void> {
  const rateLimit = applyAuthRateLimit(
    request,
    "refresh",
    response,
    baseHeaders
  );

  if (!rateLimit.allowed) {
    return;
  }

  const refreshToken = readRefreshTokenCookie(request);

  if (!refreshToken) {
    throw new HttpError(
      401,
      "No refresh token cookie was provided.",
      "missing_refresh_cookie"
    );
  }

  const session = await context.authService.refresh(refreshToken);

  sendJson(
    response,
    200,
    {
      accessToken: session.accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
      user: session.user
    },
    {
      ...baseHeaders,
      ...createRateLimitHeaders(rateLimit),
      "set-cookie": createRefreshTokenCookie(
        session.refreshToken,
        session.refreshTokenMaxAgeSeconds,
        context.config.isProduction
      )
    }
  );
}

async function handleLogout(
  request: IncomingMessage,
  response: ServerResponse,
  context: AuthHttpContext,
  baseHeaders: Record<string, string>
): Promise<void> {
  const refreshToken = readRefreshTokenCookie(request);
  await context.authService.logout(refreshToken);

  sendJson(
    response,
    200,
    {
      ok: true
    },
    {
      ...baseHeaders,
      "set-cookie": clearRefreshTokenCookie(context.config.isProduction)
    }
  );
}

async function handleMe(
  request: IncomingMessage,
  response: ServerResponse,
  context: AuthHttpContext,
  baseHeaders: Record<string, string>
): Promise<void> {
  const accessToken = readBearerToken(request);

  if (!accessToken) {
    throw new HttpError(
      401,
      "No bearer token was provided.",
      "missing_access_token"
    );
  }

  const user = await context.authService.getUserFromAccessToken(accessToken);
  sendJson(
    response,
    200,
    {
      user
    },
    baseHeaders
  );
}

function applyAuthRateLimit(
  request: IncomingMessage,
  routeName: string,
  response: ServerResponse,
  baseHeaders: Record<string, string>
) {
  const rateLimit = checkRateLimit(
    `${routeName}:${readClientIp(request)}`,
    AUTH_RATE_LIMIT_MAX_HITS,
    AUTH_RATE_LIMIT_WINDOW_MS
  );

  if (!rateLimit.allowed) {
    sendJson(
      response,
      429,
      {
        error: {
          code: "rate_limited",
          message:
            "Too many auth attempts were made from this client. Try again shortly."
        }
      },
      {
        ...baseHeaders,
        ...createRateLimitHeaders(rateLimit),
        "retry-after": String(rateLimit.retryAfterSeconds)
      }
    );
  }

  return rateLimit;
}

function createRateLimitHeaders(rateLimit: {
  remaining: number;
  resetAt: number;
}): Record<string, string> {
  return {
    "x-ratelimit-remaining": String(rateLimit.remaining),
    "x-ratelimit-reset": new Date(rateLimit.resetAt).toISOString()
  };
}

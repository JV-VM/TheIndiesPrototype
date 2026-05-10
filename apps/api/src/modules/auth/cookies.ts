import { parse, serialize } from "cookie";

const REFRESH_TOKEN_COOKIE_NAME = "tip_refresh_token";

export function readRefreshTokenCookie(
  request: import("node:http").IncomingMessage
): string | null {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies = parse(cookieHeader);
  return cookies[REFRESH_TOKEN_COOKIE_NAME] ?? null;
}

export function createRefreshTokenCookie(
  token: string,
  maxAgeSeconds: number,
  secure: boolean
): string {
  return serialize(REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/auth",
    maxAge: maxAgeSeconds,
    expires: new Date(Date.now() + maxAgeSeconds * 1000)
  });
}

export function clearRefreshTokenCookie(secure: boolean): string {
  return serialize(REFRESH_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/auth",
    maxAge: 0,
    expires: new Date(0)
  });
}

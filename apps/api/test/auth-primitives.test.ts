import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeConfig } from "../src/config/runtime.js";
import {
  clearRefreshTokenCookie,
  createRefreshTokenCookie,
  readRefreshTokenCookie
} from "../src/modules/auth/cookies.js";
import { hashPassword, verifyPassword } from "../src/modules/auth/password.js";
import { checkRateLimit } from "../src/modules/auth/rate-limit.js";
import { hashToken } from "../src/modules/auth/token-hash.js";
import {
  issueAccessToken,
  issueRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} from "../src/modules/auth/tokens.js";

const runtimeConfig: RuntimeConfig = {
  nodeEnv: "test",
  isProduction: false,
  serviceName: "tip-api",
  port: 3001,
  webOrigin: "http://localhost:13000",
  databaseUrl: "postgresql://tip:tip@localhost:5432/tip",
  redisUrl: "redis://localhost:6379",
  minioEndpoint: "http://localhost:9000",
  minioRegion: "us-east-1",
  minioBucket: "tip-assets",
  minioAccessKey: "tipminio",
  minioSecretKey: "tipminiosecret",
  jwtAccessSecret: "test-access-secret",
  jwtRefreshSecret: "test-refresh-secret",
  accessTokenTtlSeconds: 900,
  refreshTokenTtlSeconds: 60 * 60 * 24 * 7
};

test("password hashing stores a non-plaintext value and verifies correctly", async () => {
  const password = "Prototype123!";
  const passwordHash = await hashPassword(password);

  assert.notEqual(passwordHash, password);
  assert.equal(await verifyPassword(password, passwordHash), true);
  assert.equal(await verifyPassword("wrong-password", passwordHash), false);
});

test("access and refresh tokens round-trip through verification", () => {
  const accessToken = issueAccessToken(runtimeConfig, {
    id: "user_123",
    email: "creator@example.com"
  });
  const refreshToken = issueRefreshToken(
    runtimeConfig,
    "user_123",
    "session_123"
  );
  const rotatedRefreshToken = issueRefreshToken(
    runtimeConfig,
    "user_123",
    "session_123"
  );

  const accessClaims = verifyAccessToken(runtimeConfig, accessToken.token);
  const refreshClaims = verifyRefreshToken(runtimeConfig, refreshToken.token);

  assert.equal(accessClaims.sub, "user_123");
  assert.equal(accessClaims.email, "creator@example.com");
  assert.equal(accessClaims.type, "access");
  assert.equal(refreshClaims.sub, "user_123");
  assert.equal(refreshClaims.sessionId, "session_123");
  assert.equal(refreshClaims.type, "refresh");
  assert.notEqual(refreshToken.token, rotatedRefreshToken.token);
});

test("refresh token cookies are serialized and cleared for auth endpoints", () => {
  const cookie = createRefreshTokenCookie("refresh-token", 300, false);
  const cookieHeader = cookie.split(";")[0];

  assert.ok(cookie.includes("HttpOnly"));
  assert.ok(cookie.includes("SameSite=Lax"));
  assert.ok(cookie.includes("Path=/auth"));
  assert.equal(
    readRefreshTokenCookie({
      headers: {
        cookie: cookieHeader
      }
    } as import("node:http").IncomingMessage),
    "refresh-token"
  );

  const clearedCookie = clearRefreshTokenCookie(false);
  assert.ok(clearedCookie.includes("Max-Age=0"));
});

test("token hashes are deterministic and fixed-width", () => {
  assert.equal(hashToken("abc123"), hashToken("abc123"));
  assert.notEqual(hashToken("abc123"), hashToken("different"));
  assert.equal(hashToken("abc123").length, 64);
});

test("auth rate limiting blocks requests after the configured window budget", () => {
  const key = `auth-test-${Date.now()}`;

  const first = checkRateLimit(key, 2, 10_000);
  const second = checkRateLimit(key, 2, 10_000);
  const third = checkRateLimit(key, 2, 10_000);

  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 1);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
  assert.ok(third.retryAfterSeconds >= 1);
});

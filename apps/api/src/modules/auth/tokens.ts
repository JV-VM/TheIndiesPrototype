import { randomUUID } from "node:crypto";

import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

import type { RuntimeConfig } from "../../config/runtime.js";
import { HttpError } from "../../http/errors.js";

const { JsonWebTokenError, TokenExpiredError } = jwt;

interface BaseTokenClaims extends JwtPayload {
  sub: string;
  type: "access" | "refresh";
}

export interface AccessTokenClaims extends BaseTokenClaims {
  type: "access";
  email: string;
}

export interface RefreshTokenClaims extends BaseTokenClaims {
  type: "refresh";
  sessionId: string;
}

export function issueAccessToken(
  config: RuntimeConfig,
  user: { id: string; email: string }
): { token: string; expiresAt: string } {
  const expiresAt = new Date(
    Date.now() + config.accessTokenTtlSeconds * 1000
  ).toISOString();

  const token = jwt.sign(
    {
      type: "access",
      email: user.email
    },
    config.jwtAccessSecret,
    {
      subject: user.id,
      expiresIn: config.accessTokenTtlSeconds,
      issuer: config.serviceName,
      audience: config.webOrigin
    }
  );

  return {
    token,
    expiresAt
  };
}

export function issueRefreshToken(
  config: RuntimeConfig,
  userId: string,
  sessionId: string
): { token: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlSeconds * 1000);

  const token = jwt.sign(
    {
      type: "refresh",
      sessionId
    },
    config.jwtRefreshSecret,
    {
      subject: userId,
      expiresIn: config.refreshTokenTtlSeconds,
      issuer: config.serviceName,
      audience: config.webOrigin,
      jwtid: randomUUID()
    }
  );

  return {
    token,
    expiresAt
  };
}

export function verifyAccessToken(
  config: RuntimeConfig,
  token: string
): AccessTokenClaims {
  return verifyToken(config.jwtAccessSecret, token, "access", config.webOrigin);
}

export function verifyRefreshToken(
  config: RuntimeConfig,
  token: string
): RefreshTokenClaims {
  return verifyToken(
    config.jwtRefreshSecret,
    token,
    "refresh",
    config.webOrigin
  );
}

function verifyToken<TClaims extends AccessTokenClaims | RefreshTokenClaims>(
  secret: string,
  token: string,
  expectedType: TClaims["type"],
  audience: string
): TClaims {
  try {
    const payload = jwt.verify(token, secret, {
      audience
    });

    if (typeof payload !== "object" || payload.type !== expectedType) {
      throw new HttpError(
        401,
        "Provided token is invalid for this endpoint.",
        "invalid_token"
      );
    }

    return payload as TClaims;
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      throw error;
    }

    if (error instanceof TokenExpiredError) {
      throw new HttpError(401, "Provided token has expired.", "token_expired");
    }

    if (error instanceof JsonWebTokenError) {
      throw new HttpError(401, "Provided token is invalid.", "invalid_token");
    }

    throw error;
  }
}

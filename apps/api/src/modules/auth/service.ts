import type { PrismaClient, User } from "@prisma/client";
import type { AuthSessionPayload, AuthUser } from "@tip/types";

import type { RuntimeConfig } from "../../config/runtime.js";
import { HttpError } from "../../http/errors.js";
import { hashPassword, verifyPassword } from "./password.js";
import { hashToken } from "./token-hash.js";
import {
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  ensureDemoWorkspace
} from "./demo-workspace.js";
import {
  issueAccessToken,
  issueRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} from "./tokens.js";
import type { LoginInput, RegisterInput } from "./schemas.js";

interface SessionBundle extends AuthSessionPayload {
  refreshToken: string;
  refreshTokenMaxAgeSeconds: number;
}

export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: RuntimeConfig
  ) {}

  async register(input: RegisterInput): Promise<SessionBundle> {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: input.email
      }
    });

    if (existingUser) {
      throw new HttpError(
        409,
        "An account with that email already exists.",
        "email_taken"
      );
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash
      }
    });

    return this.createSessionBundle(user);
  }

  async login(input: LoginInput): Promise<SessionBundle> {
    if (
      input.email === DEMO_USER_EMAIL &&
      input.password === DEMO_USER_PASSWORD
    ) {
      await ensureDemoWorkspace(this.prisma);
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email: input.email
      }
    });

    if (!user) {
      throw new HttpError(
        401,
        "Email or password is incorrect.",
        "invalid_credentials"
      );
    }

    const passwordMatches = await verifyPassword(
      input.password,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw new HttpError(
        401,
        "Email or password is incorrect.",
        "invalid_credentials"
      );
    }

    return this.createSessionBundle(user);
  }

  async refresh(refreshToken: string): Promise<SessionBundle> {
    const claims = verifyRefreshToken(this.config, refreshToken);
    const session = await this.prisma.session.findUnique({
      where: {
        id: claims.sessionId
      },
      include: {
        user: true
      }
    });

    if (!session || session.userId !== claims.sub) {
      throw new HttpError(
        401,
        "Session could not be restored.",
        "invalid_session"
      );
    }

    if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new HttpError(
        401,
        "Session is no longer active.",
        "session_revoked"
      );
    }

    const incomingTokenHash = hashToken(refreshToken);

    if (session.refreshTokenHash !== incomingTokenHash) {
      await this.prisma.session.update({
        where: {
          id: session.id
        },
        data: {
          revokedAt: new Date()
        }
      });

      throw new HttpError(
        401,
        "Refresh token rotation failed validation.",
        "refresh_token_rejected"
      );
    }

    return this.rotateSessionBundle(session.id, session.user);
  }

  async logout(refreshToken: string | null): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const claims = verifyRefreshToken(this.config, refreshToken);

      await this.prisma.session.updateMany({
        where: {
          id: claims.sessionId
        },
        data: {
          revokedAt: new Date()
        }
      });
    } catch {
      // Logging out should stay idempotent even if the token is already invalid.
    }
  }

  async getUserFromAccessToken(accessToken: string): Promise<AuthUser> {
    const claims = verifyAccessToken(this.config, accessToken);
    const user = await this.prisma.user.findUnique({
      where: {
        id: claims.sub
      }
    });

    if (!user) {
      throw new HttpError(
        401,
        "Access token subject no longer exists.",
        "invalid_token"
      );
    }

    return mapAuthUser(user);
  }

  private async createSessionBundle(user: User): Promise<SessionBundle> {
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: "pending",
        expiresAt: new Date(
          Date.now() + this.config.refreshTokenTtlSeconds * 1000
        )
      }
    });

    return this.rotateSessionBundle(session.id, user);
  }

  private async rotateSessionBundle(
    sessionId: string,
    user: User
  ): Promise<SessionBundle> {
    const refreshToken = issueRefreshToken(this.config, user.id, sessionId);
    const accessToken = issueAccessToken(this.config, user);

    await this.prisma.session.update({
      where: {
        id: sessionId
      },
      data: {
        refreshTokenHash: hashToken(refreshToken.token),
        expiresAt: refreshToken.expiresAt,
        revokedAt: null
      }
    });

    return {
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: refreshToken.token,
      refreshTokenMaxAgeSeconds: this.config.refreshTokenTtlSeconds,
      user: mapAuthUser(user)
    };
  }
}

function mapAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString()
  };
}

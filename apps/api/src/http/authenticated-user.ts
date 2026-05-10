import type { AuthUser } from "@tip/types";

import type { AuthService } from "../modules/auth/service.js";
import { HttpError } from "./errors.js";
import { readBearerToken } from "./request-metadata.js";

export async function requireAuthenticatedUser(
  request: import("node:http").IncomingMessage,
  authService: AuthService
): Promise<AuthUser> {
  const accessToken = readBearerToken(request);

  if (!accessToken) {
    throw new HttpError(
      401,
      "A bearer token is required for this route.",
      "missing_access_token"
    );
  }

  return authService.getUserFromAccessToken(accessToken);
}

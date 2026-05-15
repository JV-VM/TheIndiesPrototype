import "@angular/compiler";

import assert from "node:assert/strict";
import test from "node:test";

import {
  createEnvironmentInjector,
  Injector,
  runInInjectionContext,
  type EnvironmentInjector,
  type Provider
} from "@angular/core";
import type { AuthSessionPayload } from "@tip/types";

import { AuthService } from "../src/app/core/auth/auth.service";
import { ApiClientService } from "../src/app/core/http/api-client.service";
import { NoticeService } from "../src/app/core/ui/notice.service";
import { ProjectsWorkspaceService } from "../src/app/features/projects/projects-workspace.service";
import { Router } from "@angular/router";
import { TokenStorageService } from "../src/app/core/auth/token-storage.service";

interface AuthHarness {
  service: AuthService;
  injector: EnvironmentInjector;
  apiClient: {
    auth: {
      login: (payload: { email: string; password: string }) => Promise<AuthSessionPayload>;
      register: (payload: { email: string; password: string }) => Promise<AuthSessionPayload>;
      logout: () => Promise<{ ok: true }>;
      refresh: () => Promise<AuthSessionPayload>;
      me: () => Promise<{ user: AuthSessionPayload["user"] }>;
    };
  };
  routerCalls: string[];
  tokenWrites: Array<string | null>;
  notices: Array<{ tone: string; text: string }>;
  projectResetCount: number;
}

function createHarness(): AuthHarness {
  const notices: Array<{ tone: string; text: string }> = [];
  const routerCalls: string[] = [];
  const tokenWrites: Array<string | null> = [];
  let projectResetCount = 0;

  const payload: AuthSessionPayload = {
    accessToken: "access-token",
    accessTokenExpiresAt: "2026-05-15T19:00:00.000Z",
    user: {
      id: "user_1",
      email: "creator@studio.test",
      createdAt: "2026-05-15T18:00:00.000Z",
      updatedAt: "2026-05-15T18:00:00.000Z"
    }
  };

  const apiClient = {
    auth: {
      login: async () => payload,
      register: async () => payload,
      logout: async () => ({ ok: true }),
      refresh: async () => payload,
      me: async () => ({ user: payload.user })
    }
  };

  const providers: Provider[] = [
    { provide: ApiClientService, useValue: apiClient },
    {
      provide: TokenStorageService,
      useValue: {
        read: () => null,
        write: (token: string | null) => {
          tokenWrites.push(token);
        }
      }
    },
    {
      provide: NoticeService,
      useValue: {
        setNeutral: (text: string) => {
          notices.push({ tone: "neutral", text });
        },
        setSuccess: (text: string) => {
          notices.push({ tone: "success", text });
        },
        setDanger: (text: string) => {
          notices.push({ tone: "danger", text });
        },
        clear: () => undefined
      }
    },
    {
      provide: Router,
      useValue: {
        navigateByUrl: async (url: string) => {
          routerCalls.push(url);
          return true;
        }
      }
    },
    {
      provide: ProjectsWorkspaceService,
      useValue: {
        reset: () => {
          projectResetCount += 1;
        }
      }
    }
  ];

  const injector = createEnvironmentInjector(providers, Injector.NULL);
  const service = runInInjectionContext(injector, () => new AuthService());

  return {
    service,
    injector,
    apiClient,
    routerCalls,
    tokenWrites,
    notices,
    get projectResetCount() {
      return projectResetCount;
    }
  };
}

test("AuthService login applies the authenticated session and persists the token", async () => {
  const harness = createHarness();

  try {
    await harness.service.login({
      email: "creator@studio.test",
      password: "Prototype123!"
    });

    assert.equal(harness.service.accessToken(), "access-token");
    assert.equal(harness.service.user()?.email, "creator@studio.test");
    assert.equal(harness.service.status(), "authenticated");
    assert.deepEqual(harness.tokenWrites, ["access-token"]);
    assert.deepEqual(harness.notices.at(-1), {
      tone: "success",
      text: "Signed in. Workspace access is active."
    });
  } finally {
    harness.injector.destroy();
  }
});

test("AuthService handleUnauthorized clears state, resets the workspace, and redirects", async () => {
  const harness = createHarness();

  try {
    await harness.service.login({
      email: "creator@studio.test",
      password: "Prototype123!"
    });

    await harness.service.handleUnauthorized();

    assert.equal(harness.service.accessToken(), null);
    assert.equal(harness.service.user(), null);
    assert.equal(harness.service.status(), "signed-out");
    assert.equal(harness.projectResetCount, 1);
    assert.deepEqual(harness.routerCalls, ["/auth"]);
    assert.equal(harness.tokenWrites.at(-1), null);
    assert.deepEqual(harness.notices.at(-1), {
      tone: "neutral",
      text: "Session expired. Sign in again to continue."
    });
  } finally {
    harness.injector.destroy();
  }
});

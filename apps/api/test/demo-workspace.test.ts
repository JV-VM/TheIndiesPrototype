import assert from "node:assert/strict";
import test from "node:test";

import {
  DEMO_PROJECT_ID,
  DEMO_USER_EMAIL,
  ensureDemoWorkspace
} from "../src/modules/auth/demo-workspace.js";

test("ensureDemoWorkspace upserts the seeded demo records", async () => {
  const calls: string[] = [];
  const prisma = {
    user: {
      upsert: async (input: { where: { email: string } }) => {
        calls.push(`user:${input.where.email}`);
        return {
          id: "demo-user-id",
          email: DEMO_USER_EMAIL
        };
      }
    },
    project: {
      upsert: async (input: { where: { id: string } }) => {
        calls.push(`project:${input.where.id}`);
        return {};
      }
    },
    asset: {
      upsert: async (input: { where: { id: string } }) => {
        calls.push(`asset:${input.where.id}`);
        return {};
      }
    }
  } as const;

  const user = await ensureDemoWorkspace(
    prisma as Parameters<typeof ensureDemoWorkspace>[0]
  );

  assert.equal(user.email, DEMO_USER_EMAIL);
  assert.deepEqual(calls, [
    `user:${DEMO_USER_EMAIL}`,
    `project:${DEMO_PROJECT_ID}`,
    "asset:tip-demo-asset-cover",
    "asset:tip-demo-asset-trailer"
  ]);
});

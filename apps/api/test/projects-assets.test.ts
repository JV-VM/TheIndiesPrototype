import assert from "node:assert/strict";
import test from "node:test";

import { HttpError } from "../src/http/errors.js";
import { AssetsService } from "../src/modules/assets/service.js";
import {
  createAssetSchema,
  updateProjectSchema
} from "../src/modules/projects/schemas.js";
import { ProjectsService } from "../src/modules/projects/service.js";

test("ProjectsService returns project_not_found for records owned by another user", async () => {
  const service = new ProjectsService({
    project: {
      findFirst: async () => null
    },
    asset: {
      groupBy: async () => []
    }
  } as never);

  await assert.rejects(
    () => service.getProject("user_a", "project_1"),
    (error: unknown) =>
      error instanceof HttpError && error.code === "project_not_found"
  );
});

test("ProjectsService maps grouped asset counts into project summaries", async () => {
  const service = new ProjectsService({
    project: {
      count: async () => 1,
      findMany: async () => [
        {
          id: "project_1",
          name: "Demo Project",
          description: "Prototype flow",
          userId: "user_a",
          createdAt: new Date("2026-05-10T00:00:00.000Z"),
          updatedAt: new Date("2026-05-10T01:00:00.000Z"),
          _count: {
            assets: 2
          }
        }
      ]
    },
    asset: {
      groupBy: async () => [
        {
          projectId: "project_1",
          status: "draft",
          _count: {
            _all: 1
          }
        },
        {
          projectId: "project_1",
          status: "completed",
          _count: {
            _all: 1
          }
        }
      ]
    }
  } as never);

  const result = await service.listProjects("user_a", {
    query: "",
    page: 1,
    pageSize: 6
  });

  assert.equal(result.totalItems, 1);
  assert.equal(result.items[0]?.assetCount, 2);
  assert.equal(result.items[0]?.assetStatusCounts.draft, 1);
  assert.equal(result.items[0]?.assetStatusCounts.completed, 1);
});

test("AssetsService returns asset_not_found when a user crosses project ownership boundaries", async () => {
  const service = new AssetsService({
    project: {
      findFirst: async () => ({ id: "project_1" })
    },
    asset: {
      findFirst: async () => null
    }
  } as never);

  await assert.rejects(
    () =>
      service.updateProjectAsset("user_a", "project_1", "asset_1", {
        status: "completed"
      }),
    (error: unknown) =>
      error instanceof HttpError && error.code === "asset_not_found"
  );
});

test("Phase 4 schemas reject empty project updates and invalid asset payloads", () => {
  const emptyProjectUpdate = updateProjectSchema.safeParse({});
  const invalidAsset = createAssetSchema.safeParse({
    kind: "image",
    status: "draft",
    originalFilename: "",
    contentType: "image/png",
    byteSize: -1
  });

  assert.equal(emptyProjectUpdate.success, false);
  assert.equal(invalidAsset.success, false);
});

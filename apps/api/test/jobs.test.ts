import assert from "node:assert/strict";
import test from "node:test";

import { HttpError } from "../src/http/errors.js";
import { JobsService } from "../src/modules/jobs/service.js";

test("JobsService.enqueueProjectAssetJob queues a thumbnail generation job", async () => {
  let capturedPayload: Record<string, unknown> | null = null;
  const createdAt = new Date("2026-05-10T00:00:00.000Z");
  const updatedAt = new Date("2026-05-10T00:00:01.000Z");

  const service = new JobsService(
    {
      asset: {
        findFirst: async () => ({
          id: "asset_1",
          projectId: "project_1",
          userId: "user_a",
          kind: "image",
          status: "uploaded",
          objectKey: "projects/project_1/assets/asset_1/source/cover.png",
          originalFilename: "cover.png",
          contentType: "image/png",
          byteSize: BigInt(1024)
        }),
        update: async () => undefined
      },
      job: {
        findFirst: async () => null,
        create: async () => ({
          id: "job_1",
          assetId: "asset_1",
          projectId: "project_1",
          userId: "user_a",
          kind: "thumbnail_generation",
          status: "queued",
          queueName: "asset-processing",
          attempts: 0,
          maxAttempts: 3,
          failureReason: null,
          payload: null,
          result: null,
          startedAt: null,
          completedAt: null,
          createdAt,
          updatedAt
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "job_1",
          assetId: "asset_1",
          projectId: "project_1",
          userId: "user_a",
          kind: "thumbnail_generation",
          status: "queued",
          queueName: "asset-processing",
          attempts: 0,
          maxAttempts: 3,
          failureReason: null,
          payload: data.payload ?? null,
          result: null,
          startedAt: null,
          completedAt: null,
          createdAt,
          updatedAt
        }),
        findUnique: async () => ({
          id: "job_1",
          assetId: "asset_1",
          projectId: "project_1",
          userId: "user_a",
          kind: "thumbnail_generation",
          status: "queued",
          queueName: "asset-processing",
          attempts: 0,
          maxAttempts: 3,
          failureReason: null,
          payload: capturedPayload,
          result: null,
          startedAt: null,
          completedAt: null,
          createdAt,
          updatedAt
        })
      },
      project: {
        findFirst: async () => ({ id: "project_1" })
      }
    } as never,
    {
      enqueueJob: async ({ payload }) => {
        capturedPayload = payload as Record<string, unknown>;
      }
    }
  );

  const job = await service.enqueueProjectAssetJob(
    "user_a",
    "project_1",
    "asset_1",
    {}
  );

  assert.equal(job.id, "job_1");
  assert.equal(job.status, "queued");
  assert.equal(job.payload?.jobId, "job_1");
  assert.equal(job.payload?.sourceObjectKey.includes("source/cover.png"), true);
});

test("JobsService.retryProjectJob creates a new queued job from a failed attempt", async () => {
  let capturedPayload: Record<string, unknown> | null = null;
  const createdAt = new Date("2026-05-10T00:00:00.000Z");

  const service = new JobsService(
    {
      asset: {
        findFirst: async () => ({
          id: "asset_1",
          projectId: "project_1",
          userId: "user_a",
          kind: "image",
          status: "failed",
          objectKey: "projects/project_1/assets/asset_1/source/cover.png",
          originalFilename: "cover.png",
          contentType: "image/png",
          byteSize: BigInt(1024)
        }),
        update: async () => undefined
      },
      job: {
        findFirst: async () => ({
          id: "job_failed_1",
          assetId: "asset_1",
          projectId: "project_1",
          userId: "user_a",
          kind: "thumbnail_generation",
          status: "failed",
          queueName: "asset-processing",
          attempts: 3,
          maxAttempts: 3,
          failureReason: "broken image",
          payload: null,
          result: null,
          startedAt: null,
          completedAt: createdAt,
          createdAt,
          updatedAt: createdAt
        }),
        create: async () => ({
          id: "job_retry_1",
          assetId: "asset_1",
          projectId: "project_1",
          userId: "user_a",
          kind: "thumbnail_generation",
          status: "queued",
          queueName: "asset-processing",
          attempts: 0,
          maxAttempts: 3,
          failureReason: null,
          payload: null,
          result: null,
          startedAt: null,
          completedAt: null,
          createdAt,
          updatedAt: createdAt
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "job_retry_1",
          assetId: "asset_1",
          projectId: "project_1",
          userId: "user_a",
          kind: "thumbnail_generation",
          status: "queued",
          queueName: "asset-processing",
          attempts: 0,
          maxAttempts: 3,
          failureReason: null,
          payload: data.payload ?? null,
          result: null,
          startedAt: null,
          completedAt: null,
          createdAt,
          updatedAt: createdAt
        }),
        findUnique: async () => ({
          id: "job_retry_1",
          assetId: "asset_1",
          projectId: "project_1",
          userId: "user_a",
          kind: "thumbnail_generation",
          status: "queued",
          queueName: "asset-processing",
          attempts: 0,
          maxAttempts: 3,
          failureReason: null,
          payload: capturedPayload,
          result: null,
          startedAt: null,
          completedAt: null,
          createdAt,
          updatedAt: createdAt
        })
      },
      project: {
        findFirst: async () => ({ id: "project_1" })
      }
    } as never,
    {
      enqueueJob: async ({ payload }) => {
        capturedPayload = payload as Record<string, unknown>;
      }
    }
  );

  const job = await service.retryProjectJob(
    "user_a",
    "project_1",
    "job_failed_1"
  );

  assert.equal(job.id, "job_retry_1");
  assert.equal(job.payload?.retryOfJobId, "job_failed_1");
});

test("JobsService rejects unsupported assets for thumbnail processing", async () => {
  const service = new JobsService(
    {
      asset: {
        findFirst: async () => ({
          id: "asset_1",
          projectId: "project_1",
          userId: "user_a",
          kind: "document",
          status: "uploaded",
          objectKey: "projects/project_1/assets/asset_1/source/brief.txt",
          originalFilename: "brief.txt",
          contentType: "text/plain",
          byteSize: BigInt(24)
        })
      },
      job: {
        findFirst: async () => null
      },
      project: {
        findFirst: async () => ({ id: "project_1" })
      }
    } as never,
    {
      enqueueJob: async () => undefined
    }
  );

  await assert.rejects(
    () => service.enqueueProjectAssetJob("user_a", "project_1", "asset_1", {}),
    (error: unknown) =>
      error instanceof HttpError &&
      error.code === "asset_processing_not_supported"
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import { HttpError } from "../src/http/errors.js";
import { AssetsService } from "../src/modules/assets/service.js";
import { validateAssetUpload } from "../src/modules/assets/upload-policy.js";

test("validateAssetUpload normalizes MIME types and sanitizes source filenames", () => {
  const result = validateAssetUpload({
    kind: "document",
    contentType: "text/plain; charset=utf-8",
    byteSize: 128,
    maxBytes: 1024,
    originalFilename: " ../Pitch Deck Final!!.txt "
  });

  assert.equal(result.contentType, "text/plain");
  assert.equal(result.sanitizedFilename, "pitch-deck-final.txt");
});

test("validateAssetUpload rejects incompatible MIME types", () => {
  assert.throws(
    () =>
      validateAssetUpload({
        kind: "image",
        contentType: "video/mp4",
        byteSize: 128,
        maxBytes: 1024,
        originalFilename: "teaser.mp4"
      }),
    (error: unknown) =>
      error instanceof HttpError && error.code === "unsupported_media_type"
  );
});

test("AssetsService.uploadProjectAsset persists object storage metadata", async () => {
  let storedObjectKey = "";
  let storedContentType = "";

  const service = new AssetsService(
    {
      project: {
        findFirst: async () => ({ id: "project_1" })
      },
      asset: {
        create: async () => ({
          id: "asset_1",
          projectId: "project_1",
          userId: "user_a",
          kind: "image",
          status: "draft",
          originalFilename: "Cover Art.png",
          contentType: "image/png",
          byteSize: BigInt(4),
          objectKey: null,
          metadata: null,
          createdAt: new Date("2026-05-10T00:00:00.000Z"),
          updatedAt: new Date("2026-05-10T00:00:00.000Z")
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "asset_1",
          projectId: "project_1",
          userId: "user_a",
          kind: "image",
          status: data.status,
          originalFilename: "Cover Art.png",
          contentType: "image/png",
          byteSize: BigInt(4),
          objectKey: data.objectKey ?? null,
          metadata: data.metadata ?? null,
          createdAt: new Date("2026-05-10T00:00:00.000Z"),
          updatedAt: new Date("2026-05-10T00:00:01.000Z")
        })
      }
    } as never,
    {
      bucket: "tip-assets",
      adapter: {
        putObject: async (input) => {
          storedObjectKey = input.objectKey;
          storedContentType = input.contentType;
        },
        getObject: async () => {
          throw new Error("not used");
        },
        checkHealth: async () => ({
          name: "minio",
          status: "healthy",
          latencyMs: 1,
          details: "ok"
        })
      }
    }
  );

  const result = await service.uploadProjectAsset("user_a", "project_1", {
    kind: "image",
    originalFilename: "Cover Art.png",
    contentType: "image/png",
    byteSize: 4,
    body: Buffer.from("tip!")
  });

  assert.equal(
    storedObjectKey,
    "projects/project_1/assets/asset_1/source/cover-art.png"
  );
  assert.equal(storedContentType, "image/png");
  assert.equal(result.status, "uploaded");
  assert.equal(result.objectKey, storedObjectKey);
  assert.equal(result.metadata?.storageBucket, "tip-assets");
});

test("AssetsService.readProjectAssetSource rejects assets without a source object", async () => {
  const service = new AssetsService(
    {
      project: {
        findFirst: async () => ({ id: "project_1" })
      },
      asset: {
        findFirst: async () => ({
          id: "asset_1",
          originalFilename: "brief.txt",
          contentType: "text/plain",
          byteSize: BigInt(12),
          objectKey: null
        })
      }
    } as never,
    {
      bucket: "tip-assets",
      adapter: {
        putObject: async () => undefined,
        getObject: async () => {
          throw new Error("not used");
        },
        checkHealth: async () => ({
          name: "minio",
          status: "healthy",
          latencyMs: 1,
          details: "ok"
        })
      }
    }
  );

  await assert.rejects(
    () => service.readProjectAssetSource("user_a", "project_1", "asset_1"),
    (error: unknown) =>
      error instanceof HttpError && error.code === "asset_source_unavailable"
  );
});

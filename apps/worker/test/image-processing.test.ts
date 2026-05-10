import assert from "node:assert/strict";
import test from "node:test";

import { generateThumbnailDerivative } from "../src/processors/image-processing.js";
import sharp from "sharp";

test("generateThumbnailDerivative renders a PNG thumbnail output", async () => {
  const tinyPng = await sharp({
    create: {
      width: 1,
      height: 1,
      channels: 4,
      background: {
        r: 220,
        g: 90,
        b: 40,
        alpha: 1
      }
    }
  })
    .png()
    .toBuffer();

  const result = await generateThumbnailDerivative({
    payload: {
      jobId: "job_1",
      assetId: "asset_1",
      projectId: "project_1",
      ownerId: "user_a",
      sourceObjectKey: "projects/project_1/assets/asset_1/source/source.png",
      originalFilename: "source.png",
      sourceContentType: "image/png",
      sourceByteSize: tinyPng.byteLength
    },
    sourceBody: tinyPng
  });

  assert.equal(result.result.outputs.length, 1);
  assert.equal(result.result.outputs[0]?.kind, "thumbnail");
  assert.equal(result.result.outputs[0]?.contentType, "image/png");
  assert.equal(
    result.result.outputs[0]?.objectKey,
    "projects/project_1/assets/asset_1/derived/source-thumbnail.png"
  );
  assert.equal(result.body.byteLength > 0, true);
});

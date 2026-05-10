import assert from "node:assert/strict";
import test from "node:test";

import { buildFailureTransition } from "../src/runtime/job-state.js";

test("buildFailureTransition keeps retriable failures queued", () => {
  const transition = buildFailureTransition({
    attemptsMade: 1,
    maxAttempts: 3
  });

  assert.equal(transition.jobStatus, "queued");
  assert.equal(transition.assetStatus, "queued");
  assert.equal(transition.completedAt, null);
});

test("buildFailureTransition marks terminal failures as failed", () => {
  const transition = buildFailureTransition({
    attemptsMade: 3,
    maxAttempts: 3
  });

  assert.equal(transition.jobStatus, "failed");
  assert.equal(transition.assetStatus, "failed");
  assert.equal(transition.completedAt instanceof Date, true);
});

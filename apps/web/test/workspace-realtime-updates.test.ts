import assert from "node:assert/strict";
import test from "node:test";

import type {
  ProjectAssetCollection,
  ProjectJobCollection,
  ProjectJobUpdateEvent
} from "@tip/types";

import {
  applyRealtimeJobUpdateToAssets,
  applyRealtimeJobUpdateToJobs
} from "../src/app/features/realtime/realtime-updates";

function createRealtimeEvent(
  overrides?: Partial<ProjectJobUpdateEvent>
): ProjectJobUpdateEvent {
  return {
    type: "job.updated",
    eventId: "event_1",
    occurredAt: "2026-05-15T18:55:00.000Z",
    source: "worker",
    userId: "user_1",
    projectId: "project_1",
    assetId: "asset_1",
    jobId: "job_1",
    jobKind: "thumbnail_generation",
    jobStatus: "completed",
    assetStatus: "completed",
    attempts: 1,
    maxAttempts: 3,
    failureReason: null,
    refreshProjectState: true,
    ...overrides
  };
}

test("applyRealtimeJobUpdateToAssets updates the matching asset status", () => {
  const collection: ProjectAssetCollection = {
    projectId: "project_1",
    items: [
      {
        id: "asset_1",
        projectId: "project_1",
        ownerId: "user_1",
        kind: "image",
        status: "processing",
        originalFilename: "cover-art.png",
        contentType: "image/png",
        byteSize: 2048,
        objectKey: "projects/project_1/assets/asset_1/source/cover-art.png",
        metadata: null,
        createdAt: "2026-05-15T18:00:00.000Z",
        updatedAt: "2026-05-15T18:30:00.000Z"
      }
    ],
    page: 1,
    pageSize: 6,
    totalItems: 1,
    totalPages: 1,
    query: "",
    kind: null,
    status: null
  };

  const updated = applyRealtimeJobUpdateToAssets(
    collection,
    createRealtimeEvent()
  );

  assert.equal(updated?.items[0]?.status, "completed");
  assert.equal(updated?.items[0]?.updatedAt, "2026-05-15T18:55:00.000Z");
});

test("applyRealtimeJobUpdateToJobs updates existing jobs and prepends new realtime jobs", () => {
  const collection: ProjectJobCollection = {
    projectId: "project_1",
    items: [
      {
        id: "job_1",
        assetId: "asset_1",
        projectId: "project_1",
        ownerId: "user_1",
        kind: "thumbnail_generation",
        status: "active",
        queueName: "asset-processing",
        attempts: 1,
        maxAttempts: 3,
        failureReason: null,
        payload: null,
        result: null,
        startedAt: "2026-05-15T18:40:00.000Z",
        completedAt: null,
        createdAt: "2026-05-15T18:40:00.000Z",
        updatedAt: "2026-05-15T18:40:00.000Z"
      }
    ],
    page: 1,
    pageSize: 6,
    totalItems: 1,
    totalPages: 1,
    status: null
  };

  const updatedExisting = applyRealtimeJobUpdateToJobs(
    collection,
    createRealtimeEvent()
  );

  assert.equal(updatedExisting?.items[0]?.status, "completed");
  assert.equal(updatedExisting?.items[0]?.completedAt, "2026-05-15T18:55:00.000Z");

  const withQueuedJob = applyRealtimeJobUpdateToJobs(
    updatedExisting,
    createRealtimeEvent({
      eventId: "event_2",
      jobId: "job_2",
      assetId: "asset_2",
      jobStatus: "queued",
      assetStatus: "queued",
      occurredAt: "2026-05-15T18:57:00.000Z"
    })
  );

  assert.equal(withQueuedJob?.items[0]?.id, "job_2");
  assert.equal(withQueuedJob?.items[0]?.status, "queued");
  assert.equal(withQueuedJob?.totalItems, 2);
});

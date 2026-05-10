import assert from "node:assert/strict";
import test from "node:test";

import {
  parseProjectRealtimeEvent,
  parseRealtimeClientMessage,
  shouldDeliverProjectRealtimeEvent
} from "../src/modules/realtime/protocol.js";

test("parseRealtimeClientMessage accepts authenticate payloads", () => {
  const message = parseRealtimeClientMessage(
    JSON.stringify({
      type: "authenticate",
      accessToken: "access-token-value",
      projectId: "project_1"
    })
  );

  assert.deepEqual(message, {
    type: "authenticate",
    accessToken: "access-token-value",
    projectId: "project_1"
  });
});

test("parseRealtimeClientMessage rejects malformed JSON", () => {
  assert.throws(
    () => parseRealtimeClientMessage("{not-json"),
    /Realtime message is not valid JSON/
  );
});

test("parseProjectRealtimeEvent accepts notification payloads", () => {
  const event = parseProjectRealtimeEvent(
    JSON.stringify({
      type: "notification.created",
      eventId: "event_1",
      occurredAt: "2026-05-10T12:00:00.000Z",
      source: "worker",
      userId: "user_1",
      projectId: "project_1",
      assetId: "asset_1",
      jobId: "job_1",
      level: "success",
      title: "Processing completed",
      message: "cover-art.png finished thumbnail generation.",
      refreshProjectState: true
    })
  );

  assert.equal(event.type, "notification.created");
  assert.equal(event.projectId, "project_1");
  assert.equal(event.level, "success");
});

test("shouldDeliverProjectRealtimeEvent filters project subscriptions", () => {
  assert.equal(shouldDeliverProjectRealtimeEvent(null, "project_1"), true);
  assert.equal(
    shouldDeliverProjectRealtimeEvent("project_1", "project_1"),
    true
  );
  assert.equal(
    shouldDeliverProjectRealtimeEvent("project_2", "project_1"),
    false
  );
});

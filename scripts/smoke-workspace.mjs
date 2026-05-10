import assert from "node:assert/strict";
import { WebSocket } from "ws";

const apiBaseUrl =
  process.env.TIP_API_PUBLIC_ORIGIN ?? "http://localhost:13001";
const wsBaseUrl =
  process.env.TIP_API_PUBLIC_WS_ORIGIN ?? "ws://localhost:13001";
const email = `phase7-${Date.now()}@theindiesprototype.local`;
const password = "Prototype123!";
const imagePayload = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVR4nGO4E6XxH4QZYAwAVLgJdQuRUMkAAAAASUVORK5CYII=",
  "base64"
);

let refreshCookie = "";
let accessToken = "";

async function main() {
  const registration = await requestJson("/auth/register", {
    method: "POST",
    json: {
      email,
      password
    }
  });

  assert.equal(registration.status, 201);
  accessToken = registration.body.accessToken;

  const createdProject = await requestJson("/projects", {
    method: "POST",
    token: accessToken,
    json: {
      name: "Workspace Smoke",
      description: "Phase 7 smoke test project."
    }
  });

  assert.equal(createdProject.status, 201);
  assert.equal(createdProject.body.name, "Workspace Smoke");
  const projectId = createdProject.body.id;

  const updatedProject = await requestJson(`/projects/${projectId}`, {
    method: "PATCH",
    token: accessToken,
    json: {
      name: "Workspace Smoke Revised",
      description: "Updated through the protected project API."
    }
  });

  assert.equal(updatedProject.status, 200);
  assert.equal(updatedProject.body.name, "Workspace Smoke Revised");

  const projectList = await requestJson(
    "/projects?query=Workspace&page=1&pageSize=6",
    {
      method: "GET",
      token: accessToken
    }
  );

  assert.equal(projectList.status, 200);
  assert.equal(
    projectList.body.items.some((project) => project.id === projectId),
    true
  );

  const uploadedAsset = await requestBinary(
    `/projects/${projectId}/assets/upload?kind=image&filename=cover-art.png`,
    {
      method: "POST",
      token: accessToken,
      contentType: "image/png",
      body: imagePayload
    }
  );

  assert.equal(uploadedAsset.status, 201);
  assert.equal(uploadedAsset.body.status, "uploaded");
  assert.equal(uploadedAsset.body.objectKey.includes(projectId), true);
  const assetId = uploadedAsset.body.id;
  const realtimeSession = await openRealtimeSession(projectId);

  try {
    const createdJob = await requestJson(
      `/projects/${projectId}/assets/${assetId}/jobs`,
      {
        method: "POST",
        token: accessToken,
        json: {}
      }
    );

    assert.equal(createdJob.status, 201);
    assert.equal(createdJob.body.status, "queued");
    const jobId = createdJob.body.id;

    const realtimeOutcome = await waitForRealtimeJobSignals(
      realtimeSession,
      jobId
    );
    assert.equal(realtimeOutcome.statuses.includes("queued"), true);
    assert.equal(realtimeOutcome.statuses.includes("completed"), true);
    assert.equal(realtimeOutcome.notificationLevel, "success");

    const completedJob = await requestJson(
      `/projects/${projectId}/jobs/${jobId}`,
      {
        method: "GET",
        token: accessToken
      }
    );

    assert.equal(completedJob.status, 200);
    assert.equal(completedJob.body.status, "completed");
    assert.equal(completedJob.body.result.outputs.length, 1);

    const assetList = await requestJson(
      `/projects/${projectId}/assets?status=completed&page=1&pageSize=6`,
      {
        method: "GET",
        token: accessToken
      }
    );

    assert.equal(assetList.status, 200);
    assert.equal(assetList.body.items.length, 1);
    assert.equal(assetList.body.items[0].id, assetId);
    assert.equal(
      assetList.body.items[0].objectKey,
      uploadedAsset.body.objectKey
    );

    const jobList = await requestJson(
      `/projects/${projectId}/jobs?status=completed&page=1&pageSize=6`,
      {
        method: "GET",
        token: accessToken
      }
    );

    assert.equal(jobList.status, 200);
    assert.equal(jobList.body.items.length, 1);
    assert.equal(jobList.body.items[0].id, jobId);

    const downloadedThumbnail = await requestBinary(
      `/projects/${projectId}/jobs/${jobId}/thumbnail`,
      {
        method: "GET",
        token: accessToken
      }
    );

    assert.equal(downloadedThumbnail.status, 200);
    assert.equal(downloadedThumbnail.contentType.includes("image/png"), true);
    assert.equal(downloadedThumbnail.body.byteLength > 0, true);

    const projectDetail = await requestJson(`/projects/${projectId}`, {
      method: "GET",
      token: accessToken
    });

    assert.equal(projectDetail.status, 200);
    assert.equal(projectDetail.body.assetStatusCounts.completed, 1);
    assert.equal(projectDetail.body.assetCount, 1);

    console.log(
      JSON.stringify(
        {
          status: "ok",
          apiBaseUrl,
          wsBaseUrl,
          user: email,
          projectId,
          assetId,
          jobId,
          realtimeStatuses: realtimeOutcome.statuses
        },
        null,
        2
      )
    );
  } finally {
    closeRealtimeSession(realtimeSession);
  }
}

async function requestJson(pathname, options) {
  const headers = {
    "content-type": "application/json"
  };

  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }

  if (options.cookie) {
    headers.cookie = options.cookie;
  }

  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    method: options.method,
    headers,
    credentials: "include",
    body: options.json ? JSON.stringify(options.json) : undefined
  });

  updateCookieJar(response);
  const text = await response.text();
  const body = text.length === 0 ? null : JSON.parse(text);

  if (!accessToken && body?.accessToken) {
    accessToken = body.accessToken;
  }

  return {
    status: response.status,
    body
  };
}

async function requestBinary(pathname, options) {
  const headers = {};

  if (options.token) {
    headers.authorization = `Bearer ${options.token}`;
  }

  if (options.cookie) {
    headers.cookie = options.cookie;
  }

  if (options.contentType) {
    headers["content-type"] = options.contentType;
  }

  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    method: options.method,
    headers,
    credentials: "include",
    body: options.body
  });

  updateCookieJar(response);
  const contentType = response.headers.get("content-type") ?? "";
  const bodyBuffer = Buffer.from(await response.arrayBuffer());
  const body = contentType.includes("application/json")
    ? JSON.parse(bodyBuffer.toString("utf8"))
    : bodyBuffer;

  return {
    status: response.status,
    body,
    contentType
  };
}

async function openRealtimeSession(projectId) {
  const socket = new WebSocket(`${wsBaseUrl}/realtime`);
  const messages = [];

  socket.addEventListener("message", (event) => {
    const payload = parseRealtimePayload(event.data);

    if (payload) {
      messages.push(payload);
    }
  });

  await waitForSocketOpen(socket);
  await waitForSocketMessage(
    messages,
    (message) => message.type === "ready",
    5_000,
    "socket ready"
  );

  socket.send(
    JSON.stringify({
      type: "authenticate",
      accessToken,
      projectId
    })
  );

  await waitForSocketMessage(
    messages,
    (message) => message.type === "authenticated",
    5_000,
    "socket authentication"
  );
  await waitForSocketMessage(
    messages,
    (message) =>
      message.type === "subscribed" && message.projectId === projectId,
    5_000,
    "project subscription"
  );

  return {
    socket,
    messages,
    projectId
  };
}

async function waitForRealtimeJobSignals(session, jobId) {
  const startedAt = Date.now();
  const seenStatuses = new Set();
  let successNotification = null;

  while (Date.now() - startedAt < 15_000) {
    for (const message of session.messages) {
      if (message.type !== "event") {
        continue;
      }

      if (
        message.event.type === "job.updated" &&
        message.event.jobId === jobId
      ) {
        seenStatuses.add(message.event.jobStatus);

        if (message.event.jobStatus === "failed") {
          throw new Error(
            `Realtime job event failed: ${message.event.failureReason ?? "Unknown worker failure"}`
          );
        }
      }

      if (
        message.event.type === "notification.created" &&
        message.event.jobId === jobId &&
        message.event.level === "success"
      ) {
        successNotification = message.event;
      }
    }

    if (
      seenStatuses.has("queued") &&
      seenStatuses.has("completed") &&
      successNotification
    ) {
      return {
        statuses: Array.from(seenStatuses),
        notificationLevel: successNotification.level
      };
    }

    await sleep(100);
  }

  throw new Error(
    `Timed out waiting for realtime job updates. Seen statuses: ${Array.from(seenStatuses).join(", ") || "none"}`
  );
}

async function waitForSocketOpen(socket) {
  if (socket.readyState === WebSocket.OPEN) {
    return;
  }

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for websocket open."));
    }, 5_000);

    socket.addEventListener(
      "open",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      {
        once: true
      }
    );
    socket.addEventListener(
      "error",
      () => {
        clearTimeout(timeout);
        reject(new Error("Realtime websocket failed to open."));
      },
      {
        once: true
      }
    );
  });
}

async function waitForSocketMessage(messages, predicate, timeoutMs, label) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const foundMessage = messages.find(predicate);

    if (foundMessage) {
      return foundMessage;
    }

    await sleep(50);
  }

  throw new Error(`Timed out waiting for ${label}.`);
}

function parseRealtimePayload(rawData) {
  const text =
    typeof rawData === "string"
      ? rawData
      : rawData instanceof ArrayBuffer
        ? Buffer.from(rawData).toString("utf8")
        : Buffer.from(rawData).toString("utf8");

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function closeRealtimeSession(session) {
  if (
    session.socket.readyState === WebSocket.OPEN ||
    session.socket.readyState === WebSocket.CONNECTING
  ) {
    session.socket.close(1000, "smoke_complete");
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function updateCookieJar(response) {
  const setCookieHeader = response.headers.get("set-cookie");

  if (!setCookieHeader) {
    return;
  }

  const nextCookie = setCookieHeader.split(";")[0];

  if (nextCookie) {
    refreshCookie = nextCookie;
  }
}

main().catch((error) => {
  console.error("[smoke-workspace] failed");
  console.error(error);
  process.exit(1);
});

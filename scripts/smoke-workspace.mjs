import assert from "node:assert/strict";

const apiBaseUrl =
  process.env.TIP_API_PUBLIC_ORIGIN ?? "http://localhost:13001";
const email = `phase4-${Date.now()}@theindiesprototype.local`;
const password = "Prototype123!";

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
      description: "Phase 4 smoke test project."
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

  const createdAsset = await requestJson(`/projects/${projectId}/assets`, {
    method: "POST",
    token: accessToken,
    json: {
      kind: "image",
      status: "draft",
      originalFilename: "cover-art.png",
      contentType: "image/png",
      byteSize: 2048
    }
  });

  assert.equal(createdAsset.status, 201);
  assert.equal(createdAsset.body.status, "draft");
  const assetId = createdAsset.body.id;

  const updatedAsset = await requestJson(
    `/projects/${projectId}/assets/${assetId}`,
    {
      method: "PATCH",
      token: accessToken,
      json: {
        status: "completed"
      }
    }
  );

  assert.equal(updatedAsset.status, 200);
  assert.equal(updatedAsset.body.status, "completed");

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
        user: email,
        projectId,
        assetId
      },
      null,
      2
    )
  );
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

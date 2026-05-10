import assert from "node:assert/strict";

const apiBaseUrl =
  process.env.TIP_API_PUBLIC_ORIGIN ?? "http://localhost:13001";
const email = `phase3-${Date.now()}@theindiesprototype.local`;
const password = "Prototype123!";

let refreshCookie = "";
let revokedRefreshCookie = "";

async function main() {
  const registerPayload = await requestJson("/auth/register", {
    method: "POST",
    json: {
      email,
      password
    }
  });

  assert.equal(registerPayload.status, 201);
  assert.equal(registerPayload.body.user.email, email);
  assert.ok(registerPayload.body.accessToken);
  assert.ok(refreshCookie.includes("tip_refresh_token="));
  revokedRefreshCookie = refreshCookie;

  const mePayload = await requestJson("/auth/me", {
    method: "GET",
    token: registerPayload.body.accessToken
  });

  assert.equal(mePayload.status, 200);
  assert.equal(mePayload.body.user.email, email);

  const refreshPayload = await requestJson("/auth/refresh", {
    method: "POST",
    cookie: refreshCookie
  });

  assert.equal(refreshPayload.status, 200);
  assert.equal(refreshPayload.body.user.email, email);
  assert.ok(refreshPayload.body.accessToken);
  assert.notEqual(refreshCookie, revokedRefreshCookie);

  const logoutPayload = await requestJson("/auth/logout", {
    method: "POST",
    cookie: refreshCookie
  });

  assert.equal(logoutPayload.status, 200);
  assert.equal(logoutPayload.body.ok, true);

  const revokedRefreshPayload = await requestJson("/auth/refresh", {
    method: "POST",
    cookie: revokedRefreshCookie
  });

  assert.equal(revokedRefreshPayload.status, 401);
  assert.equal(revokedRefreshPayload.body.error.code, "session_revoked");

  console.log(
    JSON.stringify(
      {
        status: "ok",
        apiBaseUrl,
        user: email
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
    body: options.json ? JSON.stringify(options.json) : undefined
  });

  updateCookieJar(response);
  const text = await response.text();
  const body = text.length === 0 ? null : JSON.parse(text);

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
  console.error("[smoke-auth] failed");
  console.error(error);
  process.exit(1);
});

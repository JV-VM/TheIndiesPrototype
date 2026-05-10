import { createServer } from "node:http";

import { renderApiClientModule } from "./api-client.js";
import { renderPage } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const apiBaseUrl = process.env.TIP_API_BASE_URL ?? "http://localhost:13001";
const wsBaseUrl = process.env.TIP_WS_BASE_URL ?? "ws://localhost:13001";

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  `connect-src 'self' ${apiBaseUrl} ${wsBaseUrl}`,
  "font-src 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'"
].join("; ");

if (process.env.TIP_DRY_RUN === "1") {
  const html = renderPage({ apiBaseUrl, wsBaseUrl });
  console.log(`[web] dry run complete - rendered ${html.length} bytes of HTML`);
  process.exit(0);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (url.pathname === "/api-client.js") {
    response.writeHead(200, {
      "content-type": "text/javascript; charset=utf-8",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "cache-control": "no-store"
    });
    response.end(renderApiClientModule());
    return;
  }

  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "content-security-policy": contentSecurityPolicy
  });
  response.end(renderPage({ apiBaseUrl, wsBaseUrl }));
});

server.listen(port, () => {
  console.log(`[web] placeholder server listening on http://localhost:${port}`);
});

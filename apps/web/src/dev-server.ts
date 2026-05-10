import { createServer } from "node:http";

import { renderPage } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

if (process.env.TIP_DRY_RUN === "1") {
  const html = renderPage();
  console.log(`[web] dry run complete - rendered ${html.length} bytes of HTML`);
  process.exit(0);
}

const server = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(renderPage());
});

server.listen(port, () => {
  console.log(`[web] placeholder server listening on http://localhost:${port}`);
});

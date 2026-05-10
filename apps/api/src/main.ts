import { createServer } from "node:http";

import { backendModules } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "3001", 10);

if (process.env.TIP_DRY_RUN === "1") {
  console.log(
    JSON.stringify(
      {
        service: "tip-api",
        architecture: "backend modular monolith",
        modules: backendModules.map((module) => module.name)
      },
      null,
      2
    )
  );
  process.exit(0);
}

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8"
    });
    response.end(
      JSON.stringify({
        service: "tip-api",
        status: "ok",
        phase: "foundation"
      })
    );
    return;
  }

  if (request.url === "/modules") {
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8"
    });
    response.end(JSON.stringify({ modules: backendModules }, null, 2));
    return;
  }

  response.writeHead(200, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(
    JSON.stringify({
      service: "tip-api",
      architecture: "backend modular monolith",
      moduleCount: backendModules.length
    })
  );
});

server.listen(port, () => {
  console.log(`[api] placeholder server listening on http://localhost:${port}`);
});

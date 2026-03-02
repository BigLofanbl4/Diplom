import http from "node:http";

import { hostname, port } from "./server/config.js";
import { routes } from "./server/routes.js";
import { sendJson } from "./server/utils/http.js";
import { matchRoute } from "./server/utils/router.js";

const server = http.createServer((req, res) => {
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchRoute(route.path, pathname);
    if (params) {
      try {
        return route.handler(req, res, params);
      } catch (error) {
        console.error(error.detail);
        return;
      }
    }
  }

  return sendJson(res, 404, { detail: "Not Found" });
});

server.listen(port, hostname, () => {
  console.log(`server started at http://${hostname}:${port}`);
});

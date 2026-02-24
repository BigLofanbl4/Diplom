import http from "node:http";

import { hostname, port } from "./my_server/config.js";
import { routes } from "./my_server/routes.js";
import { sendJson } from "./my_server/utils/http.js";
import { matchRoute } from "./my_server/utils/router.js";

const server = http.createServer((req, res) => {
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchRoute(route.path, pathname);
    if (params) return route.handler(req, res, params);
  }

  return sendJson(res, 404, { detail: "Not Found" });
});

server.listen(port, hostname, () => {
  console.log(`server started at http://${hostname}:${port}`);
});

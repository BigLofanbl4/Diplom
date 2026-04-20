import { db, nextId } from "../db.js";
import { parseBody, sendJson, sendNoContent } from "../utils/http.js";
import { normalizeNullableField } from "../utils/normalize.js";
import { requireRole } from "./auth.js";

const MANAGER_UPDATABLE_FIELDS = new Set([
  "login",
  "password",
  "first_name",
  "last_name",
  "phone",
]);

export function getManagers(req, res) {
  if (!requireRole(req, res, ["admin"])) return;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const search = url.searchParams.get("search");

  let managerList = db.managers.map((manager) => serializeManager(manager));

  if (search) {
    managerList = managerList.filter((manager) => {
      const fullName = `${manager.last_name} ${manager.first_name}`.toLowerCase();
      return fullName.includes(search.toLowerCase());
    });
  }

  return sendJson(res, 200, {
    data: managerList,
    meta: {
      totals: managerList.length,
      search,
    },
  });
}

export function getManagerById(req, res, params) {
  if (!requireRole(req, res, ["admin"])) return;

  const managerId = Number(params.id);
  const managerRecord = db.managers.find((manager) => manager.id === managerId);

  if (!managerRecord) {
    return sendJson(res, 404, { detail: "Manager not found" });
  }

  return sendJson(res, 200, serializeManager(managerRecord));
}

export async function createManager(req, res) {
  if (!requireRole(req, res, ["admin"])) return;

  const payload = await parseBody(req);
  if (!payload.login || !payload.password || !payload.first_name || !payload.last_name) {
    return sendJson(res, 400, { detail: "Missing required fields" });
  }

  const existingUser = db.users.find((user) => user.login === payload.login);
  if (existingUser) {
    return sendJson(res, 400, { detail: "User already exists" });
  }

  const userId = nextId("users");
  const managerId = nextId("managers");

  const userRecord = {
    id: userId,
    login: payload.login,
    password: payload.password,
    role: "manager",
  };

  const managerRecord = {
    id: managerId,
    user_id: userId,
    first_name: payload.first_name,
    last_name: payload.last_name,
    phone: normalizeNullableField(payload.phone),
  };

  db.users.push(userRecord);
  db.managers.push(managerRecord);

  return sendJson(res, 201, serializeManager(managerRecord));
}

export async function updateManager(req, res, params) {
  if (!requireRole(req, res, ["admin"])) return;

  const managerId = Number(params.id);
  const managerRecord = db.managers.find((manager) => manager.id === managerId);
  if (!managerRecord) {
    return sendJson(res, 404, { detail: "Manager not found" });
  }

  const userRecord = db.users.find((user) => user.id === managerRecord.user_id);
  if (!userRecord) {
    return sendJson(res, 404, { detail: "User not found" });
  }

  const payload = await parseBody(req);

  if (payload.login !== undefined) {
    const loginOwner = db.users.find((user) => user.login === payload.login);
    if (loginOwner && loginOwner.id !== userRecord.id) {
      return sendJson(res, 400, { detail: "User already exists" });
    }
  }

  for (const key in payload) {
    if (!MANAGER_UPDATABLE_FIELDS.has(key)) continue;

    if (key === "login" || key === "password") {
      userRecord[key] = payload[key];
      continue;
    }

    if (key === "phone") {
      managerRecord.phone = normalizeNullableField(payload.phone);
      continue;
    }

    managerRecord[key] = payload[key];
  }

  return sendJson(res, 200, serializeManager(managerRecord));
}

export function deleteManager(req, res, params) {
  if (!requireRole(req, res, ["admin"])) return;

  const managerId = Number(params.id);
  const managerRecord = db.managers.find((manager) => manager.id === managerId);
  if (!managerRecord) {
    return sendJson(res, 404, { detail: "Manager not found" });
  }

  db.managers = db.managers.filter((manager) => manager.id !== managerId);
  db.users = db.users.filter((user) => user.id !== managerRecord.user_id);

  return sendNoContent(res, 204);
}

function serializeManager(managerRecord) {
  const userRecord = db.users.find((user) => user.id === managerRecord.user_id);
  if (!userRecord) {
    throw { detail: "User data not found" };
  }

  return {
    ...managerRecord,
    login: userRecord.login,
  };
}
